import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import type { CardData } from '../content'
import { buildAtlas, tileOffset, BACK_TILE, ATLAS_COLS, ATLAS_ROWS } from './atlas'
import { loadRapier, type Rapier, type RigidBody, type World } from './physics'

export type PerfSample = { fps: number; min: number; frameMs: number; physicsMs: number; text: string }

/** Where the pile should sit on screen, in NDC (-1..1), measured from the DOM so text keeps its own space. */
export type PileTarget = { x: number; y: number }

export type HeroSceneOptions = {
  cards: CardData[]
  lang: 'cs' | 'en'
  reducedMotion: boolean
  onLand: (price: number, cardIndex: number) => void
  onFirstFrame?: () => void
  onPerf?: (s: PerfSample) => void
  getPileTarget?: () => PileTarget | null
  seed?: number
  debug?: boolean
}

export type HeroSceneHandle = { dispose: () => void; relayout: () => void }

// Card = 1.6 × 1.0 × 0.035 units (payment-card ratio). World gravity 9.81 so a drop from ~7 units takes ~1.2 s.
const CARD_W = 1.6
const CARD_H = 1.0
const CARD_T = 0.035
const CARD_R = 0.085
const G = 9.81
const FIXED_DT = 1 / 60

type Slot = {
  body: RigidBody | null
  card: number
  state: 'free' | 'falling' | 'resting' | 'draining'
  drainT: number
  drainFrom: THREE.Matrix4
  // Pose used by the simple (pre-Rapier) integrator and as the handoff source.
  pos: THREE.Vector3
  quat: THREE.Quaternion
  vel: THREE.Vector3
  angVel: THREE.Vector3
  restQuat: THREE.Quaternion
  restY: number
}

function mulberry32(a: number) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function cardGeometry() {
  const s = new THREE.Shape()
  const w = CARD_W / 2, h = CARD_H / 2, r = CARD_R
  s.moveTo(-w + r, -h)
  s.lineTo(w - r, -h); s.absarc(w - r, -h + r, r, -Math.PI / 2, 0, false)
  s.lineTo(w, h - r); s.absarc(w - r, h - r, r, 0, Math.PI / 2, false)
  s.lineTo(-w + r, h); s.absarc(-w + r, h - r, r, Math.PI / 2, Math.PI, false)
  s.lineTo(-w, -h + r); s.absarc(-w + r, -h + r, r, Math.PI, Math.PI * 1.5, false)
  const bevel = 0.006
  const depth = CARD_T - bevel * 2
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 6 })
  g.translate(0, 0, -depth / 2)
  g.computeBoundingSphere()
  return g
}

function floorTexture(): THREE.CanvasTexture {
  // Floor: near-black with a soft lift under the pile and a darker drain disc the cards sink into.
  const c = document.createElement('canvas')
  c.width = c.height = 512
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#0B0B0E'
  ctx.fillRect(0, 0, 512, 512)
  const lift = ctx.createRadialGradient(256, 256, 20, 256, 256, 250)
  lift.addColorStop(0, '#15151A')
  lift.addColorStop(0.55, '#0E0E12')
  lift.addColorStop(1, '#0B0B0E')
  ctx.fillStyle = lift
  ctx.fillRect(0, 0, 512, 512)
  const drain = ctx.createRadialGradient(256, 256, 0, 256, 256, 92)
  drain.addColorStop(0, '#040405')
  drain.addColorStop(0.7, '#07070A')
  drain.addColorStop(0.92, 'rgba(28,28,34,0.5)')
  drain.addColorStop(1, 'rgba(28,28,34,0)')
  ctx.fillStyle = drain
  ctx.fillRect(0, 0, 512, 512)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

export async function createHeroScene(canvas: HTMLCanvasElement, opts: HeroSceneOptions): Promise<HeroSceneHandle> {
  const rand = mulberry32(opts.seed ?? (Math.random() * 1e9) | 0)
  const isMobile = window.innerWidth < 900 || window.matchMedia('(hover: none) and (pointer: coarse)').matches
  const lowPower = isMobile || (navigator.hardwareConcurrency || 8) <= 4
  const MAX_CARDS = lowPower ? 40 : 60
  const PILE_MAX = lowPower ? 14 : 18
  const SPAWN_EVERY = 0.9
  // Review-only overrides: ?shadow=2048|1536|1024|vsm|pcf|off  ?dpr=1.5 (default: PCF soft 2048 desktop / 1024 mobile)
  const q = new URLSearchParams(window.location.search)
  const shadowOpt = q.get('shadow')
  const shadowSize = shadowOpt === '2048' ? 2048 : shadowOpt === '1024' ? 1024 : shadowOpt === '1536' ? 1536 : lowPower ? 1024 : 2048
  const shadowType = shadowOpt === 'vsm' ? THREE.VSMShadowMap : THREE.PCFShadowMap
  const shadowsOn = shadowOpt !== 'off'
  const dprCap = q.get('dpr') ? Number(q.get('dpr')) : lowPower ? 1.75 : 2

  const atlas = await buildAtlas(opts.cards, opts.lang, lowPower ? 448 : 640)

  // ---------- renderer ----------
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance', stencil: false })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.NeutralToneMapping
  renderer.toneMappingExposure = 1.0
  renderer.shadowMap.enabled = shadowsOn
  renderer.shadowMap.type = shadowType
  renderer.setClearColor(0x0a0a0c, 1)

  const scene = new THREE.Scene()
  scene.fog = new THREE.Fog(0x0a0a0c, 9, 26)
  const pmrem = new THREE.PMREMGenerator(renderer)
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environmentIntensity = 0.32
  pmrem.dispose()

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 60)

  // ---------- lights ----------
  const key = new THREE.DirectionalLight(0xfff4e6, 1.8)
  key.position.set(2.5, 8, 3.5)
  key.castShadow = true
  key.shadow.mapSize.set(shadowSize, shadowSize)
  key.shadow.camera.near = 1
  key.shadow.camera.far = 20
  key.shadow.camera.left = key.shadow.camera.bottom = -5
  key.shadow.camera.right = key.shadow.camera.top = 5
  key.shadow.bias = -0.0004
  key.shadow.normalBias = 0.02
  key.shadow.radius = 3
  key.shadow.blurSamples = 6
  scene.add(key, key.target)
  const rim = new THREE.DirectionalLight(0xc9d6ff, 1.1)
  rim.position.set(-4, 3, -6)
  scene.add(rim)
  scene.add(new THREE.HemisphereLight(0x2a2a33, 0x050506, 0.7))

  // ---------- floor ----------
  const floorMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: floorTexture(), roughness: 0.96, metalness: 0 })
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), floorMat)
  floor.rotation.x = -Math.PI / 2
  floor.receiveShadow = true
  scene.add(floor)
  // Same lit material without the map so the 14-unit textured floor blends seamlessly into the horizon.
  const farMat = new THREE.MeshStandardMaterial({ color: 0x0b0b0e, roughness: 0.96, metalness: 0 })
  const far = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), farMat)
  far.rotation.x = -Math.PI / 2
  far.position.y = -0.002
  far.receiveShadow = true
  scene.add(far)

  // ---------- cards ----------
  const geo = cardGeometry()
  const tiles = new Float32Array(MAX_CARDS * 2)
  geo.setAttribute('aTile', new THREE.InstancedBufferAttribute(tiles, 2))
  const mat = new THREE.MeshPhysicalMaterial({
    color: 0x1c1c22,
    map: atlas,
    roughness: 0.52,
    metalness: 0.12,
    clearcoat: 0.75,
    clearcoatRoughness: 0.28,
    envMapIntensity: 0.38,
  })
  const [bx, by] = tileOffset(BACK_TILE)
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTileScale = { value: new THREE.Vector2(1 / ATLAS_COLS, 1 / ATLAS_ROWS) }
    shader.uniforms.uBackTile = { value: new THREE.Vector2(bx, by) }
    shader.uniforms.uCardSize = { value: new THREE.Vector2(CARD_W, CARD_H) }
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec2 aTile; varying vec2 vTile; varying vec2 vCardUv; varying vec3 vObjN; uniform vec2 uCardSize;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvTile = aTile; vCardUv = position.xy / uCardSize + 0.5; vObjN = normal;')
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vTile; varying vec2 vCardUv; varying vec3 vObjN; uniform vec2 uTileScale; uniform vec2 uBackTile;')
      .replace('#include <map_fragment>', `
        float face = step(0.92, abs(vObjN.z));
        vec2 tile = vObjN.z > 0.0 ? vTile : uBackTile;
        vec2 tuv = clamp(vCardUv, 0.002, 0.998) * uTileScale + tile;
        vec4 texel = texture2D(map, tuv);
        diffuseColor.rgb = mix(diffuseColor.rgb * 1.25, texel.rgb, face);
      `)
  }
  const cards = new THREE.InstancedMesh(geo, mat, MAX_CARDS)
  cards.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  cards.castShadow = true
  cards.receiveShadow = true
  cards.frustumCulled = false
  scene.add(cards)

  const hidden = new THREE.Matrix4().makeScale(0, 0, 0).setPosition(0, -50, 0)
  for (let i = 0; i < MAX_CARDS; i++) cards.setMatrixAt(i, hidden)
  cards.instanceMatrix.needsUpdate = true

  // ---------- state ----------
  const slots: Slot[] = Array.from({ length: MAX_CARDS }, () => ({
    body: null, card: 0, state: 'free', drainT: 0, drainFrom: new THREE.Matrix4(),
    pos: new THREE.Vector3(), quat: new THREE.Quaternion(), vel: new THREE.Vector3(), angVel: new THREE.Vector3(),
    restQuat: new THREE.Quaternion(), restY: 0,
  }))
  let pileX = 2.45, pileZ = 0.4
  let portraitMode = false
  let nextCard = 0
  const order = opts.cards.map((_, i) => i)
  for (let i = order.length - 1; i > 0; i--) { const j = (rand() * (i + 1)) | 0; [order[i], order[j]] = [order[j], order[i]] }

  const tilt = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2)
  const tmpQ = new THREE.Quaternion()
  const tmpE = new THREE.Euler()
  const tmpM = new THREE.Matrix4()
  const tmpV = new THREE.Vector3()
  const one = new THREE.Vector3(1, 1, 1)

  // Physics: null until Rapier has loaded; the simple integrator runs meanwhile.
  let R: Rapier | null = null
  let world: World | null = null
  let pointerBody: RigidBody | null = null

  function activeCount(filter?: Slot['state']) {
    let n = 0
    for (const s of slots) if (filter ? s.state === filter : s.state !== 'free') n++
    return n
  }

  function makeBody(slot: Slot, ccd: boolean) {
    if (!R || !world) return
    const desc = R.RigidBodyDesc.dynamic()
      .setTranslation(slot.pos.x, slot.pos.y, slot.pos.z)
      .setRotation({ x: slot.quat.x, y: slot.quat.y, z: slot.quat.z, w: slot.quat.w })
      .setLinvel(slot.vel.x, slot.vel.y, slot.vel.z)
      .setAngvel({ x: slot.angVel.x, y: slot.angVel.y, z: slot.angVel.z })
      .setLinearDamping(0.08)
      .setAngularDamping(0.9)
      .setCcdEnabled(ccd)
    const body = world.createRigidBody(desc)
    world.createCollider(R.ColliderDesc.cuboid(CARD_W / 2, CARD_H / 2, CARD_T / 2).setFriction(0.85).setRestitution(0.08).setDensity(1.2), body)
    slot.body = body
  }

  function spawn(height = 7.2) {
    const idx = slots.findIndex((s) => s.state === 'free')
    if (idx < 0) return null
    const slot = slots[idx]
    const card = order[nextCard++ % order.length]
    slot.card = card
    slot.state = 'falling'
    const [tx, ty] = tileOffset(card)
    tiles[idx * 2] = tx; tiles[idx * 2 + 1] = ty
    ;(geo.getAttribute('aTile') as THREE.InstancedBufferAttribute).needsUpdate = true

    // Mostly readable: yaw within ±35° of facing the camera, one in seven lands upside-down.
    const yaw = opts.debug ? 0 : (rand() - 0.5) * 1.2 + (rand() < 0.14 ? Math.PI : 0)
    if (opts.debug) tmpE.set(0, 0, 0)
    else tmpE.set((rand() - 0.5) * 0.9, yaw, (rand() - 0.5) * 0.5)
    slot.quat.setFromEuler(tmpE).multiply(tilt)
    slot.restQuat.setFromEuler(tmpE.set(0, yaw, 0)).multiply(tilt)
    if (portraitMode && !opts.debug) {
      // Mobile: spawn in the top-right corner above the pile and arc in, so the fall never crosses the copy.
      slot.pos.set(pileX + 2.2 + (rand() - 0.5) * 0.4, height, pileZ - 1.4 + (rand() - 0.5) * 0.5)
      slot.vel.set(-1.9 + (rand() - 0.5) * 0.4, -0.4, 1.3 + (rand() - 0.5) * 0.3)
    } else {
      slot.pos.set(pileX + (opts.debug ? 0 : (rand() - 0.5) * 1.1), height, pileZ + (opts.debug ? 0 : (rand() - 0.5) * 0.7))
      slot.vel.set(0, -0.6, 0)
    }
    slot.angVel.set((rand() - 0.5) * 2.5, (rand() - 0.5) * 2, (rand() - 0.5) * 2.5)
    if (opts.debug) slot.angVel.set(0, 0, 0)
    slot.restY = CARD_T / 2 + activeCount('resting') * CARD_T
    if (R) makeBody(slot, true)
    return slot
  }

  function removeBody(slot: Slot) {
    if (slot.body && world) { world.removeRigidBody(slot.body); slot.body = null }
  }

  function readPose(slot: Slot) {
    if (slot.body) {
      const t = slot.body.translation(), r = slot.body.rotation()
      slot.pos.set(t.x, t.y, t.z)
      slot.quat.set(r.x, r.y, r.z, r.w)
    }
  }

  function startDrain() {
    // Lowest resting card sinks into the drain; the pile above settles down onto it.
    let best: Slot | null = null, bestY = Infinity
    for (const s of slots) {
      if (s.state !== 'resting') continue
      readPose(s)
      if (s.pos.y < bestY) { bestY = s.pos.y; best = s }
    }
    if (!best) return
    best.drainFrom.compose(best.pos, best.quat, one)
    removeBody(best)
    best.state = 'draining'
    best.drainT = 0
  }

  // Simple integrator: gravity, tumble, settle flat on an estimated stack height. Runs until Rapier is ready.
  function simpleStep(dt: number) {
    for (const s of slots) {
      if (s.state !== 'falling') continue
      s.vel.y -= G * dt
      s.pos.addScaledVector(s.vel, dt)
      const len = s.angVel.length()
      if (len > 1e-4) {
        tmpQ.setFromAxisAngle(tmpV.copy(s.angVel).divideScalar(len), len * dt)
        s.quat.premultiply(tmpQ)
      }
      const h = s.pos.y - s.restY
      if (h < 1.2) s.quat.slerp(s.restQuat, Math.min(1, dt * 6 * (1.3 - h)))
      if (h <= 0) {
        s.pos.y = s.restY
        s.vel.set(0, 0, 0)
        s.angVel.set(0, 0, 0)
        s.quat.copy(s.restQuat)
        s.state = 'resting'
        opts.onLand(opts.cards[s.card].price, s.card)
      }
    }
  }

  async function adoptRapier() {
    const Rr = await loadRapier()
    if (disposed) return
    R = Rr
    world = new R.World({ x: 0, y: -G, z: 0 })
    world.timestep = FIXED_DT
    world.createCollider(R.ColliderDesc.cuboid(30, 0.5, 30).setTranslation(0, -0.5, 0).setFriction(0.8))
    pointerBody = world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(0, -10, 0))
    world.createCollider(R.ColliderDesc.ball(0.34), pointerBody)
    // Hand over every card at its current pose; resting ones get a hair of clearance so they settle, not explode.
    const resting = slots.filter((s) => s.state === 'resting').sort((a, b) => a.pos.y - b.pos.y)
    resting.forEach((s, i) => { s.pos.y = CARD_T / 2 + i * (CARD_T + 0.004); s.vel.set(0, 0, 0); s.angVel.set(0, 0, 0) })
    for (const s of slots) if (s.state === 'falling' || s.state === 'resting') makeBody(s, s.state === 'falling')
  }

  // ---------- pointer ----------
  const raycaster = new THREE.Raycaster()
  const ndc = new THREE.Vector2()
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.3)
  const hit = new THREE.Vector3()
  let pointerActive = false
  const onMove = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect()
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
    raycaster.setFromCamera(ndc, camera)
    if (raycaster.ray.intersectPlane(plane, hit)) {
      pointerActive = true
      pointerBody?.setNextKinematicTranslation({ x: hit.x, y: 0.3, z: hit.z })
    }
  }
  const onLeave = () => { pointerActive = false; pointerBody?.setNextKinematicTranslation({ x: 0, y: -10, z: 0 }) }
  const onDown = (e: PointerEvent) => {
    onMove(e)
    raycaster.setFromCamera(ndc, camera)
    const hits = raycaster.intersectObject(cards, false)
    const h = hits.find((x) => x.instanceId !== undefined && slots[x.instanceId!].body)
    if (!h) return
    const slot = slots[h.instanceId!]
    const b = slot.body!
    b.wakeUp()
    const t = b.translation()
    const dx = t.x - hit.x, dz = t.z - hit.z
    b.applyImpulse({ x: dx * 2.5, y: 5.5 + rand() * 2, z: dz * 2.5 }, true)
    b.applyTorqueImpulse({ x: (rand() - 0.5) * 1.2, y: (rand() - 0.5) * 0.6, z: (rand() - 0.5) * 1.2 }, true)
    if (slot.state === 'resting') slot.state = 'falling'
  }
  canvas.addEventListener('pointermove', onMove, { passive: true })
  canvas.addEventListener('pointerleave', onLeave)
  canvas.addEventListener('pointerdown', onDown)

  // ---------- layout ----------
  const pilePoint = new THREE.Vector3()
  function layout() {
    const w = canvas.clientWidth || window.innerWidth
    const h = canvas.clientHeight || window.innerHeight
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    const portrait = camera.aspect < 0.9
    portraitMode = portrait
    let target = opts.getPileTarget?.() ?? null
    if (portrait) {
      camera.fov = 38
      pileX = 0.15; pileZ = 0.6
      camera.position.set(pileX, 6.4, pileZ + 9.0)
      target ??= { x: 0, y: -0.45 }
    } else {
      camera.fov = 32
      pileX = 2.45; pileZ = 0.4
      camera.position.set(pileX - 0.5, 4.3, pileZ + 8.4)
      target ??= { x: 0.5, y: -0.25 }
    }
    floor.position.set(pileX, 0, pileZ)
    key.target.position.set(pileX, 0, pileZ)
    key.position.set(pileX + 2.2, 8, pileZ + 3.2)
    camera.updateProjectionMatrix()

    // Aim the camera so the pile's centre lands on the DOM-derived target: shift the look-at point until it does.
    pilePoint.set(pileX, 0.35, pileZ)
    const dist = camera.position.distanceTo(pilePoint)
    const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * dist
    const halfW = halfH * camera.aspect
    let lx = pileX, ly = 0.6
    for (let i = 0; i < 10; i++) {
      camera.lookAt(lx, ly, pileZ)
      camera.updateMatrixWorld()
      tmpV.copy(pilePoint).project(camera)
      const ex = target.x - tmpV.x, ey = target.y - tmpV.y
      if (Math.abs(ex) < 0.002 && Math.abs(ey) < 0.002) break
      lx -= ex * halfW
      ly -= ey * halfH
    }
  }
  layout()
  const ro = new ResizeObserver(() => layout())
  ro.observe(canvas)

  // ---------- loop ----------
  let raf = 0
  let last = performance.now()
  let acc = 0
  let spawnClock = 0.2
  let firstFrame = false
  let disposed = false
  const startedAt = performance.now()
  const perf = { frames: 0, t0: performance.now(), worst: 0, physMs: 0, renderMs: 0, minFps: 999 }
  // Adaptive quality: after a 3 s warm-up, step down (DPR → shadows → pile size) whenever a 2 s window averages under 40/30/24 fps.
  const adapt = { t0: performance.now(), frames: 0, level: 0, note: '' }
  let pileMax = PILE_MAX
  function degrade() {
    adapt.level++
    if (adapt.level === 1) { renderer.setPixelRatio(1); layout(); adapt.note = 'dpr 1' }
    else if (adapt.level === 2) { renderer.shadowMap.enabled = false; mat.needsUpdate = true; floorMat.needsUpdate = true; farMat.needsUpdate = true; adapt.note = 'dpr 1, no shadows' }
    else if (adapt.level === 3) { pileMax = Math.min(pileMax, 8); adapt.note = 'dpr 1, no shadows, pile 8' }
  }

  function syncInstances(dt: number) {
    let restingCount = 0
    for (let i = 0; i < slots.length; i++) {
      const s = slots[i]
      if (s.state === 'free') continue
      if (s.state === 'draining') {
        s.drainT += dt / 0.9
        const k = Math.min(1, s.drainT)
        const e = k * k * k
        tmpM.copy(s.drainFrom)
        tmpV.setFromMatrixPosition(tmpM)
        tmpV.y -= e * 1.6
        tmpM.setPosition(tmpV)
        cards.setMatrixAt(i, tmpM)
        if (k >= 1) { s.state = 'free'; cards.setMatrixAt(i, hidden) }
        continue
      }
      readPose(s)
      tmpM.compose(s.pos, s.quat, one)
      cards.setMatrixAt(i, tmpM)
      if (s.body && s.state === 'falling') {
        const vy = s.body.linvel().y
        if (s.pos.y < 2.6 && vy > -1.2) { s.state = 'resting'; opts.onLand(opts.cards[s.card].price, s.card) }
      }
      if (s.state === 'resting') {
        restingCount++
        if (s.pos.y < -2 || Math.abs(s.pos.x - pileX) > 6 || Math.abs(s.pos.z - pileZ) > 6) { removeBody(s); s.state = 'free'; cards.setMatrixAt(i, hidden) }
      }
    }
    cards.instanceMatrix.needsUpdate = true
    return restingCount
  }

  function frame(now: number) {
    if (disposed) return
    raf = requestAnimationFrame(frame)
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now
    const p0 = performance.now()
    if (world) {
      acc += dt
      let steps = 0
      while (acc >= FIXED_DT && steps < 3) { world.step(); acc -= FIXED_DT; steps++ }
      if (steps === 3) acc = 0
    } else {
      simpleStep(dt)
    }
    const physMs = performance.now() - p0

    spawnClock -= dt
    const resting = syncInstances(dt)
    if (spawnClock <= 0) {
      spawnClock = SPAWN_EVERY + (rand() - 0.5) * 0.3
      spawn()
      if (world && resting >= pileMax) startDrain()
    }
    if (!pointerActive) pointerBody?.setNextKinematicTranslation({ x: 0, y: -10, z: 0 })

    const r0 = performance.now()
    renderer.render(scene, camera)
    const renderMs = performance.now() - r0
    if (!firstFrame) {
      firstFrame = true
      opts.onFirstFrame?.()
      // Text and the first card are on screen; now fetch the physics engine and let it take over.
      adoptRapier().catch((err) => console.error('[hero] rapier failed, staying on the simple integrator', err))
    }

    adapt.frames++
    if (now - adapt.t0 >= 2000) {
      const fps = (adapt.frames * 1000) / (now - adapt.t0)
      const started = now - startedAt > 3000
      if (started && adapt.level < 3 && fps < [40, 30, 24][adapt.level]) degrade()
      adapt.t0 = now; adapt.frames = 0
    }

    if (opts.onPerf) {
      perf.frames++
      perf.physMs += physMs
      perf.renderMs += renderMs
      perf.worst = Math.max(perf.worst, dt * 1000)
      const el = now - perf.t0
      if (el >= 1000) {
        const fps = (perf.frames * 1000) / el
        perf.minFps = Math.min(perf.minFps, fps)
        const text = `fps ${fps.toFixed(0)} (min ${perf.minFps.toFixed(0)})\nframe max ${perf.worst.toFixed(1)} ms\nphysics ${(perf.physMs / perf.frames).toFixed(2)} ms · render ${(perf.renderMs / perf.frames).toFixed(2)} ms (${world ? 'rapier' : 'simple'})\ncards ${activeCount()} · dpr ${renderer.getPixelRatio().toFixed(2)} · ${lowPower ? 'low' : 'high'} · shadow ${shadowsOn ? shadowSize + (shadowType === THREE.VSMShadowMap ? ' vsm' : ' pcf') : 'off'}\n${renderer.info.render.triangles} tris · ${renderer.info.render.calls} calls${adapt.note ? `\nadapted: ${adapt.note}` : ''}`
        opts.onPerf({ fps, min: perf.minFps, frameMs: perf.worst, physicsMs: perf.physMs / perf.frames, text })
        perf.frames = 0; perf.physMs = 0; perf.renderMs = 0; perf.worst = 0; perf.t0 = now
      }
    }
  }

  if (opts.reducedMotion) {
    // Static pile, no physics download: cards stacked flat with a little scatter, counted once.
    let sum = 0
    for (let i = 0; i < PILE_MAX; i++) {
      const s = spawn(0)
      if (!s) break
      s.pos.set(pileX + (rand() - 0.5) * 0.9, CARD_T / 2 + i * CARD_T, pileZ + (rand() - 0.5) * 0.5)
      s.quat.copy(s.restQuat)
      s.state = 'resting'
      sum += opts.cards[s.card].price
    }
    syncInstances(0)
    renderer.render(scene, camera)
    opts.onLand(sum, -1)
    opts.onFirstFrame?.()
    ro.disconnect()
    new ResizeObserver(() => { layout(); renderer.render(scene, camera) }).observe(canvas)
  } else {
    spawn(6.5)
    raf = requestAnimationFrame(frame)
  }

  const onVisibility = () => { last = performance.now(); acc = 0 }
  document.addEventListener('visibilitychange', onVisibility)

  return {
    relayout: () => { layout(); if (opts.reducedMotion) renderer.render(scene, camera) },
    dispose() {
      disposed = true
      cancelAnimationFrame(raf)
      ro.disconnect()
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerleave', onLeave)
      canvas.removeEventListener('pointerdown', onDown)
      document.removeEventListener('visibilitychange', onVisibility)
      world?.free()
      geo.dispose(); mat.dispose(); atlas.dispose(); floorMat.map?.dispose(); floorMat.dispose(); farMat.dispose(); floor.geometry.dispose(); far.geometry.dispose()
      scene.environment?.dispose()
      renderer.dispose()
    },
  }
}

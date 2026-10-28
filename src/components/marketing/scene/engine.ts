import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import type { CardData } from '../content'
import { buildAtlas, tileOffset, BACK_TILE, ATLAS_COLS, ATLAS_ROWS } from './atlas'
import { loadRapier, type RigidBody } from './physics'

export type PerfSample = { fps: number; min: number; frameMs: number; physicsMs: number; text: string }

export type HeroSceneOptions = {
  cards: CardData[]
  lang: 'cs' | 'en'
  reducedMotion: boolean
  onLand: (price: number, cardIndex: number) => void
  onFirstFrame?: () => void
  onPerf?: (s: PerfSample) => void
  seed?: number
  debug?: boolean
}

export type HeroSceneHandle = { dispose: () => void }

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

  const [R, atlas] = await Promise.all([loadRapier(), buildAtlas(opts.cards, opts.lang, lowPower ? 448 : 640)])

  // ---------- renderer ----------
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance', stencil: false })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowPower ? 1.75 : 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.NeutralToneMapping
  renderer.toneMappingExposure = 1.0
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.VSMShadowMap
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
  key.shadow.mapSize.set(lowPower ? 1024 : 2048, lowPower ? 1024 : 2048)
  key.shadow.camera.near = 1
  key.shadow.camera.far = 20
  key.shadow.camera.left = key.shadow.camera.bottom = -5
  key.shadow.camera.right = key.shadow.camera.top = 5
  key.shadow.bias = -0.0004
  key.shadow.normalBias = 0.02
  key.shadow.radius = 4
  key.shadow.blurSamples = 10
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

  // ---------- physics ----------
  const world = new R.World({ x: 0, y: -G, z: 0 })
  world.timestep = FIXED_DT
  world.createCollider(R.ColliderDesc.cuboid(30, 0.5, 30).setTranslation(0, -0.5, 0).setFriction(0.8))

  const slots: Slot[] = Array.from({ length: MAX_CARDS }, () => ({ body: null, card: 0, state: 'free', drainT: 0, drainFrom: new THREE.Matrix4() }))
  let pileX = 1.3, pileZ = 0.1
  let nextCard = 0
  const order = opts.cards.map((_, i) => i)
  for (let i = order.length - 1; i > 0; i--) { const j = (rand() * (i + 1)) | 0; [order[i], order[j]] = [order[j], order[i]] }

  const tilt = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2)
  const tmpQ = new THREE.Quaternion()
  const tmpE = new THREE.Euler()
  const tmpM = new THREE.Matrix4()
  const tmpV = new THREE.Vector3()
  const one = new THREE.Vector3(1, 1, 1)

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

    if (opts.debug) tmpE.set(0, 0, 0)
    else {
      // Mostly readable: yaw within ±35° of facing the camera, one in seven lands upside-down.
      const yaw = (rand() - 0.5) * 1.2 + (rand() < 0.14 ? Math.PI : 0)
      tmpE.set((rand() - 0.5) * 0.9, yaw, (rand() - 0.5) * 0.5)
    }
    tmpQ.setFromEuler(tmpE).multiply(tilt)
    const x = pileX + (opts.debug ? 0 : (rand() - 0.5) * 1.7)
    const z = pileZ + (opts.debug ? 0 : (rand() - 0.5) * 0.9)
    const bodyDesc = R.RigidBodyDesc.dynamic()
      .setTranslation(x, height, z)
      .setRotation({ x: tmpQ.x, y: tmpQ.y, z: tmpQ.z, w: tmpQ.w })
      .setLinvel(0, -0.6, 0)
      .setAngvel(opts.debug ? { x: 0, y: 0, z: 0 } : { x: (rand() - 0.5) * 2.5, y: (rand() - 0.5) * 2, z: (rand() - 0.5) * 2.5 })
      .setLinearDamping(0.08)
      .setAngularDamping(0.9)
      .setCcdEnabled(true)
    const body = world.createRigidBody(bodyDesc)
    world.createCollider(R.ColliderDesc.cuboid(CARD_W / 2, CARD_H / 2, CARD_T / 2).setFriction(0.85).setRestitution(0.08).setDensity(1.2), body)
    slot.body = body
    return slot
  }

  function removeBody(slot: Slot) {
    if (slot.body) { world.removeRigidBody(slot.body); slot.body = null }
  }

  function startDrain() {
    // Lowest resting card sinks into the drain; the pile above settles down onto it.
    let best: Slot | null = null, bestY = Infinity
    for (const s of slots) {
      if (s.state !== 'resting' || !s.body) continue
      const y = s.body.translation().y
      if (y < bestY) { bestY = y; best = s }
    }
    if (!best || !best.body) return
    const t = best.body.translation(), r = best.body.rotation()
    best.drainFrom.compose(tmpV.set(t.x, t.y, t.z), tmpQ.set(r.x, r.y, r.z, r.w), one)
    removeBody(best)
    best.state = 'draining'
    best.drainT = 0
  }

  // ---------- pointer ----------
  const pointerBody = world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(0, -10, 0))
  world.createCollider(R.ColliderDesc.ball(0.34), pointerBody)
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
      pointerBody.setNextKinematicTranslation({ x: hit.x, y: 0.3, z: hit.z })
    }
  }
  const onLeave = () => { pointerActive = false; pointerBody.setNextKinematicTranslation({ x: 0, y: -10, z: 0 }) }
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
  function layout() {
    const w = canvas.clientWidth || window.innerWidth
    const h = canvas.clientHeight || window.innerHeight
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    const portrait = camera.aspect < 0.9
    if (portrait) {
      camera.fov = 38
      camera.position.set(0.15, 5.8, 8.2)
      camera.lookAt(0.1, 1.55, 0)
      pileX = 0.15; pileZ = 0.6
      floor.position.set(0.15, 0, 0.6)
      key.target.position.set(0.15, 0, 0.6)
    } else {
      camera.fov = 32
      camera.position.set(0.6, 4.3, 8.6)
      camera.lookAt(1.0, 1.35, 0)
      pileX = 2.45; pileZ = 0.4
      floor.position.set(2.45, 0, 0.4)
      key.target.position.set(2.45, 0, 0.4)
    }
    key.position.set(pileX + 2.2, 8, pileZ + 3.2)
    camera.updateProjectionMatrix()
  }
  layout()
  const ro = new ResizeObserver(layout)
  ro.observe(canvas)

  // ---------- loop ----------
  let raf = 0
  let last = performance.now()
  let acc = 0
  let spawnClock = 0.2
  let firstFrame = false
  let disposed = false
  const perf = { frames: 0, t0: performance.now(), worst: 0, physMs: 0, minFps: 999 }

  function syncInstances(dt: number) {
    let restingCount = 0
    for (let i = 0; i < slots.length; i++) {
      const s = slots[i]
      if (s.state === 'free') continue
      if (s.state === 'draining') {
        s.drainT += dt / 0.9
        const k = Math.min(1, s.drainT)
        const e = k * k * k // expo-ish in
        tmpM.copy(s.drainFrom)
        tmpV.setFromMatrixPosition(tmpM)
        tmpV.y -= e * 1.6
        tmpM.setPosition(tmpV)
        cards.setMatrixAt(i, tmpM)
        if (k >= 1) { s.state = 'free'; cards.setMatrixAt(i, hidden) }
        continue
      }
      const b = s.body!
      const t = b.translation(), r = b.rotation()
      tmpM.compose(tmpV.set(t.x, t.y, t.z), tmpQ.set(r.x, r.y, r.z, r.w), one)
      cards.setMatrixAt(i, tmpM)
      if (s.state === 'falling') {
        const vy = b.linvel().y
        if (t.y < 2.6 && vy > -1.2) { s.state = 'resting'; opts.onLand(opts.cards[s.card].price, s.card) }
      }
      if (s.state === 'resting') {
        restingCount++
        if (t.y < -2 || Math.abs(t.x - pileX) > 6 || Math.abs(t.z - pileZ) > 6) { removeBody(s); s.state = 'free'; cards.setMatrixAt(i, hidden) }
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
    acc += dt
    const p0 = performance.now()
    let steps = 0
    while (acc >= FIXED_DT && steps < 3) {
      world.step()
      acc -= FIXED_DT
      steps++
    }
    if (steps === 3) acc = 0
    const physMs = performance.now() - p0

    spawnClock -= dt
    const resting = syncInstances(dt)
    if (spawnClock <= 0) {
      spawnClock = SPAWN_EVERY + (rand() - 0.5) * 0.3
      spawn()
      if (resting >= PILE_MAX) startDrain()
    }
    if (!pointerActive) pointerBody.setNextKinematicTranslation({ x: 0, y: -10, z: 0 })

    renderer.render(scene, camera)
    if (!firstFrame) { firstFrame = true; opts.onFirstFrame?.() }

    if (opts.onPerf) {
      perf.frames++
      perf.physMs += physMs
      perf.worst = Math.max(perf.worst, dt * 1000)
      const el = now - perf.t0
      if (el >= 1000) {
        const fps = (perf.frames * 1000) / el
        perf.minFps = Math.min(perf.minFps, fps)
        const text = `fps ${fps.toFixed(0)} (min ${perf.minFps.toFixed(0)})\nframe max ${perf.worst.toFixed(1)} ms\nphysics ${(perf.physMs / perf.frames).toFixed(2)} ms/frame\ncards ${slots.filter((s) => s.state !== 'free').length} · dpr ${renderer.getPixelRatio().toFixed(2)} · ${lowPower ? 'low' : 'high'}\n${renderer.info.render.triangles} tris · ${renderer.info.render.calls} calls`
        opts.onPerf({ fps, min: perf.minFps, frameMs: perf.worst, physicsMs: perf.physMs / perf.frames, text })
        perf.frames = 0; perf.physMs = 0; perf.worst = 0; perf.t0 = now
      }
    }
  }

  if (opts.reducedMotion) {
    // Static pile: simulate offline, render once, count once.
    for (let i = 0; i < PILE_MAX; i++) spawn(1.5 + i * 0.9)
    for (let i = 0; i < 900; i++) world.step()
    let sum = 0
    for (const s of slots) if (s.state !== 'free') { s.state = 'resting'; sum += opts.cards[s.card].price }
    syncInstances(0)
    renderer.render(scene, camera)
    opts.onLand(sum, -1)
    opts.onFirstFrame?.()
    const reRender = () => { layout(); renderer.render(scene, camera) }
    ro.disconnect(); new ResizeObserver(reRender).observe(canvas)
  } else {
    spawn(6.5)
    raf = requestAnimationFrame(frame)
  }

  const onVisibility = () => { last = performance.now(); acc = 0 }
  document.addEventListener('visibilitychange', onVisibility)

  return {
    dispose() {
      disposed = true
      cancelAnimationFrame(raf)
      ro.disconnect()
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerleave', onLeave)
      canvas.removeEventListener('pointerdown', onDown)
      document.removeEventListener('visibilitychange', onVisibility)
      world.free()
      geo.dispose(); mat.dispose(); atlas.dispose(); floorMat.map?.dispose(); floorMat.dispose(); farMat.dispose(); floor.geometry.dispose(); far.geometry.dispose()
      scene.environment?.dispose()
      renderer.dispose()
    },
  }
}

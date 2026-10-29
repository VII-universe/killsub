import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import type { CardData } from '../content'
import { buildAtlas, atlasFontsReady, tileOffset, BACK_TILE, WRAPPED_TILE, ATLAS_COLS, ATLAS_ROWS, type WrappedFace } from './atlas'
import { CARD_W, CARD_H, CARD_T, G, cardGeometry, floorTexture, mulberry32 } from './common'
import { loadRapier, type Rapier, type RigidBody, type World } from './physics'

export type PerfSample = { fps: number; min: number; frameMs: number; physicsMs: number; text: string }
export type PileTarget = { x: number; y: number }

/** Scroll state the page measures every frame: each value is 0..1 progress of that phase. */
export type ScrollState = {
  hero: number      // 0 at top, 1 when the hero has scrolled away
  timeline: number  // 0..1 through the (sticky) timeline section
  timelineEnter: number // 0..1 while the section scrolls into view
  overview: number
  wrapped: number
  closing: number
  wrappedExit: number
  /** Where the overview column / wrapped card / closing drain should sit on screen (NDC), measured from the DOM. */
  columnTarget?: PileTarget | null
  wrappedTarget?: PileTarget | null
  drainTarget?: PileTarget | null
}

export type JourneyOptions = {
  cards: CardData[]
  lang: 'cs' | 'en'
  reducedMotion: boolean
  onLand: (price: number, cardIndex: number) => void
  onFirstFrame?: () => void
  onPerf?: (s: PerfSample) => void
  getPileTarget?: () => PileTarget | null
  /** Screen positions (canvas px) of the timeline cards that currently have a notification, keyed by card index. */
  onTimeline?: (info: { day: number; positions: Record<number, { x: number; y: number; falling: number }> }) => void
  onBackground?: (hex: string) => void
  wrapped?: WrappedFace
  noAdapt?: boolean
  seed?: number
  debug?: boolean
}

export type JourneyHandle = { dispose: () => void; relayout: () => void; setScroll: (s: ScrollState) => void; setCallbacks: (c: Partial<Pick<JourneyOptions, 'onTimeline' | 'onPerf' | 'onBackground' | 'onLand' | 'getPileTarget'>>) => void }

const FIXED_DT = 1 / 60
const DAYS = 30
const DAY_GAP = 1.15

type Slot = {
  body: RigidBody | null
  card: number
  state: 'free' | 'falling' | 'resting' | 'draining' | 'journey'
  drainT: number
  drainFrom: THREE.Matrix4
  pos: THREE.Vector3
  quat: THREE.Quaternion
  vel: THREE.Vector3
  angVel: THREE.Vector3
  restQuat: THREE.Quaternion
  restY: number
  // journey: frozen pile pose + per-card stagger
  pilePos: THREE.Vector3
  pileQuat: THREE.Quaternion
  jitter: number
}

type Pose = { p: THREE.Vector3; q: THREE.Quaternion; s: number }

function smooth(t: number) { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t) }
function range(v: number, a: number, b: number) { return smooth((v - a) / (b - a)) }

export async function createJourney(canvas: HTMLCanvasElement, opts: JourneyOptions): Promise<JourneyHandle> {
  const rand = mulberry32(opts.seed ?? (Math.random() * 1e9) | 0)
  const isMobile = window.innerWidth < 900 || window.matchMedia('(hover: none) and (pointer: coarse)').matches
  const lowPower = isMobile || (navigator.hardwareConcurrency || 8) <= 4
  const MAX_CARDS = lowPower ? 40 : 60
  const PILE_MAX = lowPower ? 14 : 18
  const SPAWN_EVERY = 0.9
  const q = new URLSearchParams(window.location.search)
  const shadowOpt = q.get('shadow')
  const shadowSize = shadowOpt === '2048' ? 2048 : shadowOpt === '1024' ? 1024 : shadowOpt === '1536' ? 1536 : lowPower ? 1024 : 2048
  const shadowType = shadowOpt === 'vsm' ? THREE.VSMShadowMap : THREE.PCFShadowMap
  const shadowsOn = shadowOpt !== 'off'
  const dprCap = q.get('dpr') ? Number(q.get('dpr')) : lowPower ? 1.75 : 2

  // First atlas never waits for web fonts (the first card must fall within ~3 s on slow 4G); if they were not in yet, it is redrawn and swapped once they load.
  const fontsWereReady = atlasFontsReady()
  let atlas = await buildAtlas(opts.cards, opts.lang, lowPower ? 448 : 640, opts.wrapped, false)

  // ---------- renderer ----------
  {
    const dpr0 = Math.min(window.devicePixelRatio || 1, dprCap)
    canvas.width = Math.floor((canvas.clientWidth || window.innerWidth) * dpr0)
    canvas.height = Math.floor((canvas.clientHeight || window.innerHeight) * dpr0)
  }
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance', stencil: false })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.debug.checkShaderErrors = false
  renderer.toneMapping = THREE.NeutralToneMapping
  renderer.shadowMap.enabled = shadowsOn
  renderer.shadowMap.type = shadowType
  const bg = new THREE.Color(0x0a0a0c)
  renderer.setClearColor(bg, 1)

  const scene = new THREE.Scene()
  scene.fog = new THREE.Fog(0x0a0a0c, 9, 26)
  const pmrem = new THREE.PMREMGenerator(renderer)
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environmentIntensity = 0.32
  pmrem.dispose()
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 80)

  // ---------- lights ----------
  const key = new THREE.DirectionalLight(0xfff4e6, 1.8)
  key.position.set(2.5, 8, 3.5)
  key.castShadow = true
  key.shadow.mapSize.set(shadowSize, shadowSize)
  key.shadow.camera.near = 1; key.shadow.camera.far = 30
  key.shadow.camera.left = key.shadow.camera.bottom = -7
  key.shadow.camera.right = key.shadow.camera.top = 7
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02
  scene.add(key, key.target)
  const rim = new THREE.DirectionalLight(0xc9d6ff, 1.1)
  rim.position.set(-4, 3, -6)
  scene.add(rim)
  scene.add(new THREE.HemisphereLight(0x2a2a33, 0x050506, 0.7))

  // ---------- floor (hero pile + closing drain), far plane, month bar ----------
  const floorMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: floorTexture(), roughness: 0.96, metalness: 0 })
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), floorMat)
  floor.rotation.x = -Math.PI / 2
  floor.receiveShadow = true
  scene.add(floor)
  const farMat = new THREE.MeshStandardMaterial({ color: 0x0b0b0e, roughness: 0.96, metalness: 0 })
  const far = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600), farMat)
  far.rotation.x = -Math.PI / 2
  far.position.y = -0.002
  far.receiveShadow = true
  scene.add(far)

  // Month bar: 30 slabs with day numbers, far away along +x so it never shows in the hero.
  const BAR_ORIGIN = new THREE.Vector3(120, 0, 0)
  const bar = new THREE.Group()
  bar.position.copy(BAR_ORIGIN)
  scene.add(bar)
  {
    const slabGeo = new THREE.BoxGeometry(DAY_GAP - 0.12, 0.04, 1.6)
    const slabMat = new THREE.MeshStandardMaterial({ color: 0x121216, roughness: 0.9, metalness: 0 })
    const slabs = new THREE.InstancedMesh(slabGeo, slabMat, DAYS)
    slabs.receiveShadow = true
    const m = new THREE.Matrix4()
    for (let d = 0; d < DAYS; d++) { m.makeTranslation(d * DAY_GAP, 0.03, 0); slabs.setMatrixAt(d, m) }
    bar.add(slabs)
    // Day numbers: one canvas strip, one plane per day sampling its cell.
    const c = document.createElement('canvas'); c.width = 64 * DAYS; c.height = 64
    const ctx = c.getContext('2d')!
    ctx.fillStyle = 'rgba(0,0,0,0)'; ctx.clearRect(0, 0, c.width, 64)
    const mono = getComputedStyle(document.documentElement).getPropertyValue('--font-mk-mono').split(',')[0].trim() || 'monospace'
    ctx.font = `500 30px ${mono}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#ECE9E2'
    for (let d = 0; d < DAYS; d++) ctx.fillText(String(d + 1), d * 64 + 32, 32)
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace
    const planeGeo = new THREE.PlaneGeometry(0.5, 0.5)
    for (let d = 0; d < DAYS; d++) {
      const t = tex.clone(); t.needsUpdate = true; t.repeat.set(1 / DAYS, 1); t.offset.set(d / DAYS, 0)
      const mat = new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0.55, depthWrite: false })
      const p = new THREE.Mesh(planeGeo, mat)
      p.rotation.x = -Math.PI / 2
      p.position.set(d * DAY_GAP, 0.07, 1.25)
      bar.add(p)
    }
  }

  // ---------- cards (instanced) ----------
  const geo = cardGeometry()
  const tiles = new Float32Array(MAX_CARDS * 2)
  geo.setAttribute('aTile', new THREE.InstancedBufferAttribute(tiles, 2))
  const backs = new Float32Array(MAX_CARDS * 2)
  { const [bx0, by0] = tileOffset(BACK_TILE); for (let i = 0; i < MAX_CARDS; i++) { backs[i * 2] = bx0; backs[i * 2 + 1] = by0 } }
  const backAttr = new THREE.InstancedBufferAttribute(backs, 2)
  geo.setAttribute('aBack', backAttr)
  const mat = new THREE.MeshPhysicalMaterial({ color: 0x1c1c22, map: atlas, roughness: 0.52, metalness: 0.12, clearcoat: 0.75, clearcoatRoughness: 0.28, envMapIntensity: 0.38 })
  const [bx, by] = tileOffset(BACK_TILE)
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTileScale = { value: new THREE.Vector2(1 / ATLAS_COLS, 1 / ATLAS_ROWS) }
    shader.uniforms.uBackTile = { value: new THREE.Vector2(bx, by) }
    shader.uniforms.uCardSize = { value: new THREE.Vector2(CARD_W, CARD_H) }
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec2 aTile; attribute vec2 aBack; varying vec2 vTile; varying vec2 vBack; varying vec2 vCardUv; varying vec3 vObjN; uniform vec2 uCardSize;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvTile = aTile; vBack = aBack; vCardUv = position.xy / uCardSize + 0.5; vObjN = normal;')
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vTile; varying vec2 vBack; varying vec2 vCardUv; varying vec3 vObjN; uniform vec2 uTileScale; uniform vec2 uBackTile;')
      .replace('#include <map_fragment>', `
        float face = step(0.92, abs(vObjN.z));
        vec2 tile = vObjN.z > 0.0 ? vTile : vBack;
        vec2 cuv = vObjN.z > 0.0 ? vCardUv : vec2(1.0 - vCardUv.x, vCardUv.y);
        vec2 tuv = clamp(cuv, 0.002, 0.998) * uTileScale + tile;
        vec4 texel = texture2D(map, tuv);
        diffuseColor.rgb = mix(diffuseColor.rgb * 1.25, texel.rgb, face);
      `)
  }
  if (!fontsWereReady) {
    document.fonts.ready.then(async () => {
      if (disposed) return
      const fresh = await buildAtlas(opts.cards, opts.lang, lowPower ? 448 : 640, opts.wrapped, true)
      if (disposed) { fresh.dispose(); return }
      const old = atlas; atlas = fresh; mat.map = fresh; old.dispose()
    }).catch(() => {})
  }
  const cards = new THREE.InstancedMesh(geo, mat, MAX_CARDS)
  cards.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  cards.castShadow = true; cards.receiveShadow = true; cards.frustumCulled = false
  scene.add(cards)
  const hidden = new THREE.Matrix4().makeScale(0, 0, 0).setPosition(0, -50, 0)
  for (let i = 0; i < MAX_CARDS; i++) cards.setMatrixAt(i, hidden)
  cards.instanceMatrix.needsUpdate = true

  // ---------- state ----------
  const slots: Slot[] = Array.from({ length: MAX_CARDS }, () => ({
    body: null, card: 0, state: 'free', drainT: 0, drainFrom: new THREE.Matrix4(),
    pos: new THREE.Vector3(), quat: new THREE.Quaternion(), vel: new THREE.Vector3(), angVel: new THREE.Vector3(),
    restQuat: new THREE.Quaternion(), restY: 0, pilePos: new THREE.Vector3(), pileQuat: new THREE.Quaternion(), jitter: 0,
  }))
  let pileX = 2.45, pileZ = 0.4
  let portraitMode = false
  let nextCard = 0
  const order = opts.cards.map((_, i) => i)
  for (let i = order.length - 1; i > 0; i--) { const j = (rand() * (i + 1)) | 0; [order[i], order[j]] = [order[j], order[i]] }

  const tilt = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2)
  const tmpQ = new THREE.Quaternion(), tmpE = new THREE.Euler(), tmpM = new THREE.Matrix4(), tmpV = new THREE.Vector3(), tmpV2 = new THREE.Vector3()
  const one = new THREE.Vector3(1, 1, 1)

  let R: Rapier | null = null
  let world: World | null = null
  let pointerBody: RigidBody | null = null

  function activeCount(filter?: Slot['state']) { let n = 0; for (const s of slots) if (filter ? s.state === filter : s.state !== 'free') n++; return n }

  function makeBody(slot: Slot, ccd: boolean) {
    if (!R || !world) return
    const desc = R.RigidBodyDesc.dynamic()
      .setTranslation(slot.pos.x, slot.pos.y, slot.pos.z)
      .setRotation({ x: slot.quat.x, y: slot.quat.y, z: slot.quat.z, w: slot.quat.w })
      .setLinvel(slot.vel.x, slot.vel.y, slot.vel.z)
      .setAngvel({ x: slot.angVel.x, y: slot.angVel.y, z: slot.angVel.z })
      .setLinearDamping(0.08).setAngularDamping(0.9).setCcdEnabled(ccd)
    const body = world.createRigidBody(desc)
    world.createCollider(R.ColliderDesc.cuboid(CARD_W / 2, CARD_H / 2, CARD_T / 2).setFriction(0.85).setRestitution(0.08).setDensity(1.2), body)
    slot.body = body
  }

  function spawn(height = 7.2, cardIndex?: number) {
    const idx = slots.findIndex((s) => s.state === 'free')
    if (idx < 0) return null
    const slot = slots[idx]
    const card = cardIndex ?? order[nextCard++ % order.length]
    slot.card = card
    slot.state = 'falling'
    const [tx, ty] = tileOffset(card)
    tiles[idx * 2] = tx; tiles[idx * 2 + 1] = ty
    ;(geo.getAttribute('aTile') as THREE.InstancedBufferAttribute).needsUpdate = true
    const yaw = opts.debug ? 0 : (rand() - 0.5) * 1.2 + (rand() < 0.14 ? Math.PI : 0)
    if (opts.debug) tmpE.set(0, 0, 0); else tmpE.set((rand() - 0.5) * 0.9, yaw, (rand() - 0.5) * 0.5)
    slot.quat.setFromEuler(tmpE).multiply(tilt)
    slot.restQuat.setFromEuler(tmpE.set(0, yaw, 0)).multiply(tilt)
    if (portraitMode && !opts.debug) {
      slot.pos.set(pileX + 2.2 + (rand() - 0.5) * 0.4, height, pileZ - 1.4 + (rand() - 0.5) * 0.5)
      slot.vel.set(-1.9 + (rand() - 0.5) * 0.4, -0.4, 1.3 + (rand() - 0.5) * 0.3)
    } else {
      slot.pos.set(pileX + (opts.debug ? 0 : (rand() - 0.5) * 1.1), height, pileZ + (opts.debug ? 0 : (rand() - 0.5) * 0.7))
      slot.vel.set(0, -0.6, 0)
    }
    slot.angVel.set((rand() - 0.5) * 2.5, (rand() - 0.5) * 2, (rand() - 0.5) * 2.5)
    if (opts.debug) slot.angVel.set(0, 0, 0)
    slot.restY = CARD_T / 2 + activeCount('resting') * CARD_T
    slot.jitter = rand()
    if (R) makeBody(slot, true)
    return slot
  }
  function removeBody(slot: Slot) { if (slot.body && world) { world.removeRigidBody(slot.body); slot.body = null } }
  function readPose(slot: Slot) {
    if (slot.body) { const t = slot.body.translation(), r = slot.body.rotation(); slot.pos.set(t.x, t.y, t.z); slot.quat.set(r.x, r.y, r.z, r.w) }
  }
  function startDrain() {
    let best: Slot | null = null, bestY = Infinity
    for (const s of slots) { if (s.state !== 'resting') continue; readPose(s); if (s.pos.y < bestY) { bestY = s.pos.y; best = s } }
    if (!best) return
    best.drainFrom.compose(best.pos, best.quat, one)
    removeBody(best); best.state = 'draining'; best.drainT = 0
  }
  function simpleStep(dt: number) {
    for (const s of slots) {
      if (s.state !== 'falling') continue
      s.vel.y -= G * dt
      s.pos.addScaledVector(s.vel, dt)
      const len = s.angVel.length()
      if (len > 1e-4) { tmpQ.setFromAxisAngle(tmpV.copy(s.angVel).divideScalar(len), len * dt); s.quat.premultiply(tmpQ) }
      const h = s.pos.y - s.restY
      if (h < 1.2) s.quat.slerp(s.restQuat, Math.min(1, dt * 6 * (1.3 - h)))
      if (h <= 0) { s.pos.y = s.restY; s.vel.set(0, 0, 0); s.angVel.set(0, 0, 0); s.quat.copy(s.restQuat); s.state = 'resting'; opts.onLand(opts.cards[s.card].price, s.card) }
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
    const resting = slots.filter((s) => s.state === 'resting').sort((a, b) => a.pos.y - b.pos.y)
    resting.forEach((s, i) => { s.pos.y = CARD_T / 2 + i * (CARD_T + 0.004); s.vel.set(0, 0, 0); s.angVel.set(0, 0, 0) })
    for (const s of slots) if (s.state === 'falling' || s.state === 'resting') makeBody(s, s.state === 'falling')
  }

  // ---------- pointer (hero only) ----------
  const raycaster = new THREE.Raycaster(), ndc = new THREE.Vector2()
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.3), hit = new THREE.Vector3()
  let pointerActive = false
  const onMove = (e: PointerEvent) => {
    if (journeyOn) return
    const r = canvas.getBoundingClientRect()
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
    raycaster.setFromCamera(ndc, camera)
    if (raycaster.ray.intersectPlane(plane, hit)) { pointerActive = true; pointerBody?.setNextKinematicTranslation({ x: hit.x, y: 0.3, z: hit.z }) }
  }
  const onLeave = () => { pointerActive = false; pointerBody?.setNextKinematicTranslation({ x: 0, y: -10, z: 0 }) }
  const onDown = (e: PointerEvent) => {
    if (journeyOn) return
    onMove(e)
    raycaster.setFromCamera(ndc, camera)
    const hits = raycaster.intersectObject(cards, false)
    const h = hits.find((x) => x.instanceId !== undefined && slots[x.instanceId!].body)
    if (!h) return
    const slot = slots[h.instanceId!], b = slot.body!
    b.wakeUp()
    const t = b.translation(); const dx = t.x - hit.x, dz = t.z - hit.z
    b.applyImpulse({ x: dx * 2.5, y: 5.5 + rand() * 2, z: dz * 2.5 }, true)
    b.applyTorqueImpulse({ x: (rand() - 0.5) * 1.2, y: (rand() - 0.5) * 0.6, z: (rand() - 0.5) * 1.2 }, true)
    if (slot.state === 'resting') slot.state = 'falling'
  }
  canvas.addEventListener('pointermove', onMove, { passive: true })
  canvas.addEventListener('pointerleave', onLeave)
  canvas.addEventListener('pointerdown', onDown)

  // ---------- camera keyframes ----------
  type Cam = { pos: THREE.Vector3; look: THREE.Vector3; fov: number }
  const camHero: Cam = { pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 32 }
  const pilePoint = new THREE.Vector3()
  function aimAt(cam: Cam, point: THREE.Vector3, target: PileTarget) {
    // Shift the look-at until `point` projects to the DOM-derived NDC target.
    const dist = cam.pos.distanceTo(point)
    const halfH = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * dist, halfW = halfH * camera.aspect
    let lx = point.x, ly = point.y
    camera.fov = cam.fov; camera.updateProjectionMatrix(); camera.position.copy(cam.pos)
    for (let i = 0; i < 10; i++) {
      camera.lookAt(lx, ly, point.z); camera.updateMatrixWorld()
      tmpV.copy(point).project(camera)
      const ex = target.x - tmpV.x, ey = target.y - tmpV.y
      if (Math.abs(ex) < 0.002 && Math.abs(ey) < 0.002) break
      lx -= ex * halfW; ly -= ey * halfH
    }
    cam.look.set(lx, ly, point.z)
  }
  let sizedW = 0, sizedH = 0, sizedDpr = 0
  function layout() {
    const w = canvas.clientWidth || window.innerWidth, h = canvas.clientHeight || window.innerHeight
    const dprNow = renderer.getPixelRatio()
    if (w !== sizedW || h !== sizedH || dprNow !== sizedDpr) { renderer.setSize(w, h, false); sizedW = w; sizedH = h; sizedDpr = dprNow }
    camera.aspect = w / h
    portraitMode = camera.aspect < 0.9
    let target = opts.getPileTarget?.() ?? null
    if (portraitMode) { pileX = 0.15; pileZ = 0.6; camHero.fov = 38; camHero.pos.set(pileX, 6.4, pileZ + 9.0); target ??= { x: 0, y: -0.45 } }
    else { pileX = 2.45; pileZ = 0.4; camHero.fov = 32; camHero.pos.set(pileX - 0.5, 4.3, pileZ + 8.4); target ??= { x: 0.5, y: -0.25 } }
    floor.position.set(pileX, 0, pileZ)
    key.target.position.set(pileX, 0, pileZ)
    key.position.set(pileX + 2.2, 8, pileZ + 3.2)
    pilePoint.set(pileX, 0.35, pileZ)
    aimAt(camHero, pilePoint, target)
  }
  layout()
  const ro = new ResizeObserver(() => layout())
  ro.observe(canvas)

  // ---------- journey ----------
  let journeyOn = false
  let scroll: ScrollState = { hero: 0, timeline: 0, timelineEnter: 0, overview: 0, wrapped: 0, wrappedExit: 0, closing: 0 }
  const journeyCards: Slot[] = [] // one per subscription, in content order
  const barSlots = opts.cards.map((c) => c.day - 1)
  // Only a few cards get the full notification choreography so the bar never shows more than one or two at once.
  const featured = new Set(opts.cards.map((c, i) => [c.day, i] as const).sort((a, b) => a[0] - b[0]).filter((_, k) => k % 4 === 1).map((x) => x[1]))
  const poseA: Pose = { p: new THREE.Vector3(), q: new THREE.Quaternion(), s: 1 }
  const poseB: Pose = { p: new THREE.Vector3(), q: new THREE.Quaternion(), s: 1 }
  const upright = new THREE.Quaternion() // card facing +z (toward a camera at +z)
  const flat = tilt.clone()
  const lean = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -0.18)

  function enterJourney() {
    if (journeyOn) return
    journeyOn = true
    pointerBody?.setNextKinematicTranslation({ x: 0, y: -10, z: 0 })
    // Freeze the pile and pick one physical card per subscription (spawn the missing ones in place).
    for (const s of slots) if (s.state === 'falling' || s.state === 'resting') { readPose(s); removeBody(s); s.pilePos.copy(s.pos); s.pileQuat.copy(s.quat) }
    journeyCards.length = 0
    const used = new Set<Slot>()
    opts.cards.forEach((_, ci) => {
      let s = slots.find((x) => !used.has(x) && x.state !== 'free' && x.state !== 'draining' && x.card === ci)
      if (!s) {
        s = spawn(0, ci) ?? undefined
        if (s) { removeBody(s); s.pos.set(pileX + (rand() - 0.5) * 0.6, CARD_T / 2 + 0.3 + rand() * 0.3, pileZ + (rand() - 0.5) * 0.4); s.quat.copy(s.restQuat); s.pilePos.copy(s.pos); s.pileQuat.copy(s.quat) }
      }
      if (s) { used.add(s); s.state = 'journey'; journeyCards.push(s) }
    })
    if (journeyCards[0] && opts.wrapped) { const i0 = slots.indexOf(journeyCards[0]); const [wx, wy] = tileOffset(WRAPPED_TILE); backs[i0 * 2] = wx; backs[i0 * 2 + 1] = wy; backAttr.needsUpdate = true }
    // Everything else sinks into the drain.
    for (const s of slots) if (!used.has(s) && s.state !== 'free' && s.state !== 'draining') { s.drainFrom.compose(s.pos, s.quat, one); s.state = 'draining'; s.drainT = 0 }
  }
  function leaveJourney() {
    if (!journeyOn) return
    journeyOn = false
    { const [bx0, by0] = tileOffset(BACK_TILE); for (const s of journeyCards) { const i = slots.indexOf(s); backs[i * 2] = bx0; backs[i * 2 + 1] = by0 } backAttr.needsUpdate = true }
    for (const s of journeyCards) { s.pos.copy(s.pilePos); s.quat.copy(s.pileQuat); s.vel.set(0, 0, 0); s.angVel.set(0, 0, 0); s.state = 'resting'; if (R) makeBody(s, false) }
    journeyCards.length = 0
  }

  // Pose generators per phase (world space). `ci` is the content card index, `k` its order in the list.
  function poseScatter(s: Slot, out: Pose) {
    out.p.set(s.pilePos.x + (s.jitter - 0.5) * 2, s.pilePos.y + 16 + s.jitter * 5, s.pilePos.z - 3 - s.jitter * 2)
    out.q.copy(s.pileQuat); out.s = 1
  }
  function poseBar(ci: number, s: Slot, out: Pose) {
    const d = barSlots[ci]
    const sc0 = portraitMode ? 0.72 : 1
    out.p.set(BAR_ORIGIN.x + d * DAY_GAP, (CARD_H / 2) * sc0 + 0.08, BAR_ORIGIN.z - 0.35)
    out.q.copy(upright).multiply(lean); out.s = sc0
    void s
  }
  const COLUMN = new THREE.Vector3(200, 0, 0)
  const COLUMN_N = 8
  function poseColumn(ci: number, out: Pose) {
    const k = Math.min(ci, COLUMN_N - 1)
    out.p.set(COLUMN.x, COLUMN.y + 0.9 - k * 0.34, COLUMN.z + k * 0.03)
    out.q.copy(upright); out.s = ci < COLUMN_N ? 1 : 0.0001
  }
  function poseWrapped(ci: number, out: Pose, flip: number, leave: number) {
    out.p.set(COLUMN.x + 10, COLUMN.y + 0.2 + leave * 9, COLUMN.z - ci * 0.02)
    out.q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI * flip); out.s = ci === 0 ? 1 : 0.0001
  }
  const DRAIN = new THREE.Vector3(300, 0, 0)
  let dropT = -1
  const onDrop = () => { if (dropT < 0) dropT = 0 }
  window.addEventListener('ks:drop', onDrop)
  function poseClosing(ci: number, out: Pose, t: number) {
    if (ci === 0) {
      // Hangs over the drain; on ks:drop it accelerates down through the floor (0.7 s).
      const k = Math.min(1, dropT / 0.7), e = k * k * k
      out.p.set(DRAIN.x, 1.15 + Math.sin(t * 1.1) * 0.05 * (1 - k) - e * 3.2, DRAIN.z)
      out.q.setFromEuler(new THREE.Euler(-0.95 - e * 0.6, Math.sin(t * 0.7) * 0.18 * (1 - k), Math.sin(t * 0.5) * 0.04)); out.s = 1
    }
    else { out.p.set(DRAIN.x, -5, DRAIN.z); out.q.copy(flat); out.s = 0.0001 }
  }
  function lerpPose(a: Pose, b: Pose, t: number, out: Pose) { out.p.lerpVectors(a.p, b.p, t); out.q.copy(a.q).slerp(b.q, t); out.s = a.s + (b.s - a.s) * t }

  // Camera keyframes per phase.
  const camBar: Cam = { pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 30 }
  const camColumn: Cam = { pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 30 }
  const camWrapped: Cam = { pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 30 }
  const camDrain: Cam = { pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 32 }
  function lerpCam(a: Cam, b: Cam, t: number, out: Cam) { out.pos.lerpVectors(a.pos, b.pos, t); out.look.lerpVectors(a.look, b.look, t); out.fov = a.fov + (b.fov - a.fov) * t }
  function applyCam(c: Cam) { camera.fov = c.fov; camera.position.copy(c.pos); camera.lookAt(c.look); camera.updateProjectionMatrix(); camera.updateMatrixWorld() }

  const bgHero = new THREE.Color(0x0a0a0c), bgWarm = new THREE.Color(0x0d0b0a), bgCold = new THREE.Color(0x0a0b0e), bgDrain = new THREE.Color(0x111116)
  let lastBgHex = ''

  // ---------- loop ----------
  let raf = 0, last = performance.now(), acc = 0, spawnClock = 0.2, firstFrame = false, disposed = false, time = 0
  const startedAt = performance.now()
  const perf = { frames: 0, t0: performance.now(), worst: 0, physMs: 0, renderMs: 0, minFps: 999 }
  const adapt = { t0: performance.now(), frames: 0, level: 0, note: '', bad: 0 }
  let pileMax = PILE_MAX
  let shadowFrozen = false
  function degrade() {
    if (opts.noAdapt) return
    adapt.level++
    if (adapt.level === 1) { renderer.setPixelRatio(1); layout(); adapt.note = 'dpr 1' }
    else if (adapt.level === 2) { renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = true; shadowFrozen = true; adapt.note = 'dpr 1, shadow frozen' }
    else if (adapt.level === 3) { pileMax = Math.min(pileMax, 8); adapt.note = 'dpr 1, no shadows, pile 8' }
  }

  const tlPositions: Record<number, { x: number; y: number; falling: number }> = {}
  function syncHero(dt: number) {
    let restingCount = 0
    for (let i = 0; i < slots.length; i++) {
      const s = slots[i]
      if (s.state === 'free' || s.state === 'journey') continue
      if (s.state === 'draining') {
        s.drainT += dt / 0.9
        const k = Math.min(1, s.drainT), e = k * k * k
        tmpM.copy(s.drainFrom); tmpV.setFromMatrixPosition(tmpM); tmpV.y -= e * 1.6; tmpM.setPosition(tmpV)
        cards.setMatrixAt(i, tmpM)
        if (k >= 1) { s.state = 'free'; cards.setMatrixAt(i, hidden) }
        continue
      }
      readPose(s)
      tmpM.compose(s.pos, s.quat, one)
      cards.setMatrixAt(i, tmpM)
      if (s.body && s.state === 'falling') { const vy = s.body.linvel().y; if (s.pos.y < 2.6 && vy > -1.2) { s.state = 'resting'; opts.onLand(opts.cards[s.card].price, s.card) } }
      if (s.state === 'resting') { restingCount++; if (s.pos.y < -2 || Math.abs(s.pos.x - pileX) > 6 || Math.abs(s.pos.z - pileZ) > 6) { removeBody(s); s.state = 'free'; cards.setMatrixAt(i, hidden) } }
    }
    return restingCount
  }

  function syncJourney() {
    const sc = scroll
    const w = canvas.clientWidth, h = canvas.clientHeight
    // Phase blend: 0 pile→scatter (hero exit), 1 scatter→bar, 2 bar travel, 3 bar→column, 4 column→wrapped, 5 wrapped→drain.
    const tScatter = range(sc.hero, 0.5, 0.78)
    const tBar = range(sc.timelineEnter, 0.35, 1)
    const tTravel = range(sc.timeline, 0.04, 0.86)
    const tExit = range(sc.timeline, 0.86, 1)
    const tLeaveW = range(sc.wrappedExit, 0.05, 0.6)
    const tColumn = range(sc.overview, 0, 0.6)
    const tWrap = range(sc.wrapped, 0.05, 0.5)
    const tFlip = range(sc.wrapped, 0.45, 0.9)
    const tDrain = range(sc.closing, 0.1, 0.7)
    const day = 1 + tTravel * (DAYS - 1)

    // Camera.
    const camT: Cam = { pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 32 }
    if (tColumn === 0 && tWrap === 0 && tDrain === 0) {
      // Hero → bar: the camera lifts with the scatter, then rides along the month.
      camT.pos.copy(camHero.pos); camT.look.copy(camHero.look); camT.fov = camHero.fov
      // After the last day the camera keeps rolling so the bar and its cards leave the frame before the next sections.
      const exitX = tExit * 16
      const bx0 = BAR_ORIGIN.x + (day - 1) * DAY_GAP + (portraitMode ? 0 : 1.6) + exitX
      camBar.pos.set(bx0, 6.2, BAR_ORIGIN.z + 11.5); camBar.look.set(bx0, 2.6, BAR_ORIGIN.z - 0.4); camBar.fov = portraitMode ? 46 : 30
      lerpCam(camT, camBar, tBar, camT)
    } else if (tWrap === 0 && tDrain === 0) {
      const colT = sc.columnTarget ?? { x: -0.45, y: 0 }
      camColumn.pos.set(COLUMN.x, COLUMN.y + 0.3, COLUMN.z + 13.5); camColumn.fov = portraitMode ? 40 : 30
      aimAt(camColumn, tmpV2.set(COLUMN.x, COLUMN.y - 0.6, COLUMN.z), colT)
      // Bar → column: from the bar's exit camera into the column camera (cards fly between).
      const bx0 = BAR_ORIGIN.x + (DAYS - 1) * DAY_GAP + (portraitMode ? 0 : 1.6) + 16
      camBar.pos.set(bx0, 6.2, BAR_ORIGIN.z + 11.5); camBar.look.set(bx0, 2.6, BAR_ORIGIN.z - 0.4)
      lerpCam(camBar, camColumn, smooth(tColumn), camT)
    } else if (tDrain === 0) {
      const wt = sc.wrappedTarget ?? { x: -0.4, y: 0 }
      camWrapped.pos.set(COLUMN.x + 10, COLUMN.y + 0.3, COLUMN.z + 5.6); camWrapped.fov = portraitMode ? 40 : 30
      aimAt(camWrapped, tmpV2.set(COLUMN.x + 10, COLUMN.y + 0.2, COLUMN.z), wt)
      lerpCam(camColumn, camWrapped, tWrap, camT)
    } else {
      const dtg = sc.drainTarget ?? { x: 0, y: 0.25 }
      camDrain.pos.set(DRAIN.x, 3.2, DRAIN.z + 8.0); camDrain.fov = 32
      aimAt(camDrain, tmpV2.set(DRAIN.x, 1.0, DRAIN.z), dtg)
      lerpCam(camWrapped, camDrain, tDrain, camT)
    }
    applyCam(camT)
    // No ground in the column and Wrapped phases: the cards float in the dark, nothing may cut through the view.
    const groundOn = tColumn === 0 || tDrain > 0
    floor.visible = groundOn; far.visible = groundOn; bar.visible = tColumn < 1
    floor.position.set(tDrain > 0 ? DRAIN.x : pileX, 0, tDrain > 0 ? DRAIN.z : pileZ)
    key.target.position.copy(floor.position); key.position.set(floor.position.x + 2.2, 8, floor.position.z + 3.2)

    // Background temperature.
    const bgc = tDrain > 0 ? bgHero.clone().lerp(bgDrain, tDrain) : tWrap > 0 ? bgCold.clone().lerp(bgWarm, tWrap) : tBar > 0 ? bgHero.clone().lerp(bgWarm, tBar * (1 - tColumn)).lerp(bgCold, tColumn) : bgHero
    renderer.setClearColor(bgc, 1); (scene.fog as THREE.Fog).color.copy(bgc)
    const hex = '#' + bgc.getHexString()
    if (hex !== lastBgHex) { lastBgHex = hex; opts.onBackground?.(hex) }

    // Cards.
    for (let k = 0; k < journeyCards.length; k++) {
      const s = journeyCards[k], ci = s.card, i = slots.indexOf(s)
      const jit = (s.jitter - 0.5) * 0.25
      // Segment A: pile → scatter → bar slot.
      poseA.p.copy(s.pilePos); poseA.q.copy(s.pileQuat); poseA.s = 1
      poseScatter(s, poseB); lerpPose(poseA, poseB, range(tScatter + jit, 0, 1), poseA)
      poseBar(ci, s, poseB); lerpPose(poseA, poseB, range(tBar + jit * 0.6, 0, 1), poseA)
      // Timeline: a card tips forward as the camera gets within 7 days, a notification catches it 7 days before its charge.
      const d = barSlots[ci] + 1
      const isFeatured = featured.has(ci)
      const approach = isFeatured ? range(day, d - 9, d - 7) : 0       // starts tipping
      const caught = range(day, d - 7, d - 6.2)        // notification lands, card springs back
      const fallAngle = approach * (1 - caught) * 0.55
      if (tBar > 0.99 && tColumn === 0) { tmpQ.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -fallAngle); poseA.q.copy(upright).multiply(lean).multiply(tmpQ) }
      // Segment B: bar → column → wrapped → drain.
      poseColumn(ci, poseB); lerpPose(poseA, poseB, range(tColumn + jit * 0.4, 0, 1), poseA)
      poseWrapped(ci, poseB, tFlip, tLeaveW); lerpPose(poseA, poseB, range(tWrap + jit * 0.3, 0, 1), poseA)
      poseClosing(ci, poseB, time); lerpPose(poseA, poseB, range(tDrain + jit * 0.2, 0, 1), poseA)
      tmpM.compose(poseA.p, poseA.q, tmpV.set(poseA.s, poseA.s, poseA.s))
      cards.setMatrixAt(i, tmpM)
      // Screen positions for DOM notifications (only while on the bar).
      if (tBar > 0.99 && tColumn === 0 && approach > 0 && caught < 1.001) {
        tmpV.copy(poseA.p).add(tmpV2.set(0, CARD_H / 2 + 0.1, 0)).project(camera)
        tlPositions[ci] = { x: ((tmpV.x + 1) / 2) * w, y: ((1 - tmpV.y) / 2) * h, falling: approach * (1 - caught) }
      } else delete tlPositions[ci]
    }
    opts.onTimeline?.({ day, positions: tlPositions })
  }

  function frame(now: number) {
    if (disposed) return
    raf = requestAnimationFrame(frame)
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now; time += dt
    if (dropT >= 0) dropT += dt
    const p0 = performance.now()
    if (!journeyOn) {
      if (world) { acc += dt; let steps = 0; while (acc >= FIXED_DT && steps < 3) { world.step(); acc -= FIXED_DT; steps++ } if (steps === 3) acc = 0 }
      else simpleStep(dt)
    }
    const physMs = performance.now() - p0

    if (scroll.hero > 0.5 && !journeyOn) enterJourney()
    if (scroll.hero < 0.42 && journeyOn) leaveJourney()

    if (!journeyOn) {
      spawnClock -= dt
      const resting = syncHero(dt)
      if (spawnClock <= 0 && scroll.hero < 0.3) { spawnClock = SPAWN_EVERY + (rand() - 0.5) * 0.3; spawn(); if (world && resting >= pileMax) startDrain() }
      if (!pointerActive) pointerBody?.setNextKinematicTranslation({ x: 0, y: -10, z: 0 })
      applyCam(camHero)
      floor.visible = true; far.visible = true; bar.visible = true
      floor.position.set(pileX, 0, pileZ)
      if (lastBgHex !== '#0a0a0c') { lastBgHex = '#0a0a0c'; renderer.setClearColor(bgHero, 1); (scene.fog as THREE.Fog).color.copy(bgHero); opts.onBackground?.('#0a0a0c') }
    } else {
      syncHero(dt) // keeps draining cards sinking
      syncJourney()
    }
    cards.instanceMatrix.needsUpdate = true

    if (shadowFrozen && (Math.floor(now / 250) !== Math.floor((now - dt * 1000) / 250))) renderer.shadowMap.needsUpdate = true
    const r0 = performance.now()
    renderer.render(scene, camera)
    const renderMs = performance.now() - r0
    if (!firstFrame) {
      firstFrame = true; opts.onFirstFrame?.()
      // The simple integrator carries the cards meanwhile; Rapier's wasm compile is a long task, so it waits for idle time.
      const go = () => adoptRapier().catch((err) => console.error('[journey] rapier failed', err))
      const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback
      window.setTimeout(() => (ric ? ric(go, { timeout: 4000 }) : go()), 1500)
    }

    adapt.frames++
    if (now - adapt.t0 >= 2000) {
      const fps = (adapt.frames * 1000) / (now - adapt.t0)
      const bad = now - startedAt > 3000 && adapt.level < 3 && fps < [32, 24, 18][adapt.level]
      adapt.bad = bad ? adapt.bad + 1 : 0
      if (adapt.bad >= 2) { degrade(); adapt.bad = 0 }
      adapt.t0 = now; adapt.frames = 0
    }
    if (opts.onPerf) {
      perf.frames++; perf.physMs += physMs; perf.renderMs += renderMs; perf.worst = Math.max(perf.worst, dt * 1000)
      const el = now - perf.t0
      if (el >= 1000) {
        const fps = (perf.frames * 1000) / el
        perf.minFps = Math.min(perf.minFps, fps)
        const text = `fps ${fps.toFixed(0)} (min ${perf.minFps.toFixed(0)})\nframe max ${perf.worst.toFixed(1)} ms\nphysics ${(perf.physMs / perf.frames).toFixed(2)} ms · render ${(perf.renderMs / perf.frames).toFixed(2)} ms (${world ? 'rapier' : 'simple'})\ncards ${activeCount()} · dpr ${renderer.getPixelRatio().toFixed(2)} · ${lowPower ? 'low' : 'high'} · shadow ${shadowsOn ? shadowSize + (shadowType === THREE.VSMShadowMap ? ' vsm' : ' pcf') : 'off'}\n${renderer.info.render.triangles} tris · ${renderer.info.render.calls} calls · phase ${journeyOn ? 'journey' : 'hero'}${adapt.note ? `\nadapted: ${adapt.note}` : ''}`
        opts.onPerf({ fps, min: perf.minFps, frameMs: perf.worst, physicsMs: perf.physMs / perf.frames, text })
        perf.frames = 0; perf.physMs = 0; perf.renderMs = 0; perf.worst = 0; perf.t0 = now
      }
    }
  }

  // Compile every shader program in parallel before the first frame instead of stalling the main thread.
  try { await renderer.compileAsync(scene, camera) } catch { /* falls back to lazy compile on first render */ }
  if (disposed) return { setCallbacks() {}, setScroll() {}, relayout() {}, dispose() {} }

  if (opts.reducedMotion) {
    let sum = 0
    for (let i = 0; i < PILE_MAX; i++) {
      const s = spawn(0); if (!s) break
      s.pos.set(pileX + (rand() - 0.5) * 0.9, CARD_T / 2 + i * CARD_T, pileZ + (rand() - 0.5) * 0.5); s.quat.copy(s.restQuat); s.state = 'resting'; sum += opts.cards[s.card].price
    }
    syncHero(0); cards.instanceMatrix.needsUpdate = true; applyCam(camHero); renderer.render(scene, camera)
    opts.onLand(sum, -1); opts.onFirstFrame?.()
  } else {
    spawn(4.3)
    raf = requestAnimationFrame(frame)
  }
  const onVisibility = () => { last = performance.now(); acc = 0 }
  document.addEventListener('visibilitychange', onVisibility)

  return {
    setCallbacks(c) { Object.assign(opts, c) },
    setScroll(s) { scroll = s; if (opts.reducedMotion) { if (s.hero > 0.5 && !journeyOn) enterJourney(); if (s.hero < 0.42 && journeyOn) leaveJourney(); if (journeyOn) syncJourney(); else { syncHero(0); applyCam(camHero) } cards.instanceMatrix.needsUpdate = true; renderer.render(scene, camera) } },
    relayout: () => { layout(); if (opts.reducedMotion) renderer.render(scene, camera) },
    dispose() {
      disposed = true
      cancelAnimationFrame(raf); ro.disconnect()
      canvas.removeEventListener('pointermove', onMove); canvas.removeEventListener('pointerleave', onLeave); canvas.removeEventListener('pointerdown', onDown)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('ks:drop', onDrop)
      world?.free()
      geo.dispose(); mat.dispose(); atlas.dispose(); floorMat.map?.dispose(); floorMat.dispose(); farMat.dispose(); floor.geometry.dispose(); far.geometry.dispose()
      bar.traverse((o) => { const m = o as THREE.Mesh; if (m.geometry) m.geometry.dispose(); const mm = m.material as THREE.Material | undefined; if (mm) { const mp = (mm as THREE.MeshBasicMaterial).map; mp?.dispose(); mm.dispose() } })
      scene.environment?.dispose()
      renderer.dispose()
    },
  }
}

import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import type { CardData } from '../content'
import { buildAtlas } from './atlas'
import { CARD_W, CARD_H, G, cardGeometry, cardMaterial, floorTexture, mulberry32 } from './common'
import { fragmentCard, type Fragment } from './voronoi'
import { loadRapier, type Rapier, type RigidBody, type World } from './physics'

export type KillSceneOptions = {
  cards: CardData[]
  lang: 'cs' | 'en'
  reducedMotion: boolean
  onFirstFrame?: () => void
  /** Called when a card is killed, with the card centre in canvas pixels. */
  onKilled: (index: number, at: { x: number; y: number }) => void
  /** Called every frame with each intact card's screen rect (canvas px) so DOM buttons can follow them. */
  onRects?: (rects: Array<{ x: number; y: number; w: number; h: number } | null>) => void
}

export type KillSceneHandle = {
  kill: (index: number) => void
  reset: () => void
  setHover: (index: number | null) => void
  pick: (clientX: number, clientY: number) => number | null
  dispose: () => void
}

type Shard = { mesh: THREE.Mesh; body: RigidBody | null; t: number; state: 'idle' | 'flying' | 'fading'; mat: THREE.MeshPhysicalMaterial }
type Card = { mesh: THREE.Mesh; mat: THREE.MeshPhysicalMaterial; alive: boolean; base: THREE.Vector3; phase: number; shards: Shard[]; fade: number; pop: number }

export async function createKillScene(canvas: HTMLCanvasElement, opts: KillSceneOptions): Promise<KillSceneHandle> {
  const rand = mulberry32(42)
  const isMobile = window.innerWidth < 900 || window.matchMedia('(hover: none) and (pointer: coarse)').matches
  const atlas = await buildAtlas(opts.cards, opts.lang, isMobile ? 448 : 640)

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance', stencil: false })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.75 : 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.NeutralToneMapping
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap
  renderer.setClearColor(0x000000, 0)

  const scene = new THREE.Scene()
  const pmrem = new THREE.PMREMGenerator(renderer)
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environmentIntensity = 0.22
  pmrem.dispose()
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 40)

  const key = new THREE.DirectionalLight(0xfff4e6, 1.1)
  key.position.set(2, 6, 4)
  key.castShadow = true
  key.shadow.mapSize.set(isMobile ? 1024 : 2048, isMobile ? 1024 : 2048)
  key.shadow.camera.near = 1; key.shadow.camera.far = 20
  key.shadow.camera.left = key.shadow.camera.bottom = -4
  key.shadow.camera.right = key.shadow.camera.top = 4
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02
  scene.add(key, key.target)
  const rim = new THREE.DirectionalLight(0xc9d6ff, 0.7)
  rim.position.set(-3, 2, -5)
  scene.add(rim)
  scene.add(new THREE.HemisphereLight(0x2a2a33, 0x050506, 0.5))

  // Floor only catches shadows and shards; it fades out radially so the page background shows through (alpha canvas).
  const alphaCanvas = document.createElement('canvas')
  alphaCanvas.width = alphaCanvas.height = 256
  {
    const ctx = alphaCanvas.getContext('2d')!
    const g = ctx.createRadialGradient(128, 128, 10, 128, 128, 128)
    g.addColorStop(0, '#fff'); g.addColorStop(0.55, '#aaa'); g.addColorStop(1, '#000')
    ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256)
  }
  const alphaMap = new THREE.CanvasTexture(alphaCanvas)
  const floorMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: floorTexture(), alphaMap, roughness: 0.96, metalness: 0, transparent: true })
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), floorMat)
  floor.rotation.x = -Math.PI / 2
  floor.receiveShadow = true
  scene.add(floor)

  // Strings the cards hang from: one thin segment per card, from high above to the card's top edge.
  const stringGeo = new THREE.BufferGeometry()
  const stringPos = new Float32Array(opts.cards.length * 6)
  stringGeo.setAttribute('position', new THREE.BufferAttribute(stringPos, 3))
  const strings = new THREE.LineSegments(stringGeo, new THREE.LineBasicMaterial({ color: 0xece9e2, transparent: true, opacity: 0.28 }))
  strings.frustumCulled = false
  scene.add(strings)

  const geo = cardGeometry()
  const fragments: Fragment[][] = opts.cards.map((_, i) => fragmentCard(100 + i, 16))
  const cards: Card[] = opts.cards.map((_, i) => {
    const mat = cardMaterial(atlas, { kind: 'single', tile: i })
    mat.transparent = true
    const mesh = new THREE.Mesh(geo, mat)
    mesh.castShadow = true
    mesh.receiveShadow = true
    scene.add(mesh)
    const shards: Shard[] = fragments[i].map((f) => {
      const smat = cardMaterial(atlas, { kind: 'single', tile: i, offset: f.centroid })
      const m = new THREE.Mesh(f.geometry, smat)
      m.castShadow = true
      m.visible = false
      scene.add(m)
      return { mesh: m, body: null, t: 0, state: 'idle', mat: smat }
    })
    return { mesh, mat, alive: true, base: new THREE.Vector3(), phase: rand() * Math.PI * 2, shards, fade: 1, pop: 1 }
  })

  // Physics (Rapier is already cached by the hero on most visits).
  let R: Rapier | null = null
  let world: World | null = null
  loadRapier().then((Rr) => {
    if (disposed) return
    R = Rr
    world = new R.World({ x: 0, y: -G, z: 0 })
    world.timestep = 1 / 60
    world.createCollider(R.ColliderDesc.cuboid(20, 0.5, 20).setTranslation(0, -0.5, 0).setFriction(0.7))
  }).catch((e) => console.error('[kill] rapier failed', e))

  // ---------- layout ----------
  let portrait = false
  function layout() {
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    portrait = camera.aspect < 1
    const n = cards.length
    if (portrait) {
      camera.fov = 30
      const gap = CARD_H + 0.28
      cards.forEach((c, i) => c.base.set(0, 0.65 + (n - 1 - i) * gap, 0))
      const mid = 0.65 + ((n - 1) * gap) / 2
      camera.position.set(0, mid + 0.4, 7.6)
      camera.lookAt(0, mid - 0.1, 0)
    } else {
      camera.fov = 30
      const gap = CARD_W + 0.45
      cards.forEach((c, i) => c.base.set((i - (n - 1) / 2) * gap, 1.05, 0))
      camera.position.set(0, 1.9, 7.3)
      camera.lookAt(0, 0.95, 0)
    }
    camera.updateProjectionMatrix()
  }
  layout()
  const ro = new ResizeObserver(layout)
  ro.observe(canvas)

  // ---------- interaction ----------
  const raycaster = new THREE.Raycaster()
  const ndc = new THREE.Vector2()
  let hover: number | null = null
  const hoverTilt = new THREE.Vector2()
  function pick(clientX: number, clientY: number): number | null {
    const r = canvas.getBoundingClientRect()
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1)
    raycaster.setFromCamera(ndc, camera)
    const hits = raycaster.intersectObjects(cards.filter((c) => c.alive).map((c) => c.mesh), false)
    if (!hits.length) return null
    const idx = cards.findIndex((c) => c.mesh === hits[0].object)
    hoverTilt.copy(ndc)
    return idx
  }

  const tmpV = new THREE.Vector3()
  const tmpQ = new THREE.Quaternion()
  const corners = [
    new THREE.Vector3(-CARD_W / 2, -CARD_H / 2, 0), new THREE.Vector3(CARD_W / 2, -CARD_H / 2, 0),
    new THREE.Vector3(CARD_W / 2, CARD_H / 2, 0), new THREE.Vector3(-CARD_W / 2, CARD_H / 2, 0),
  ]
  function cardRect(c: Card) {
    const w = canvas.clientWidth, h = canvas.clientHeight
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const k of corners) {
      tmpV.copy(k).applyMatrix4(c.mesh.matrixWorld).project(camera)
      const x = ((tmpV.x + 1) / 2) * w, y = ((1 - tmpV.y) / 2) * h
      minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y)
    }
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
  }

  function kill(index: number) {
    const c = cards[index]
    if (!c || !c.alive) return
    c.alive = false
    c.mesh.updateMatrixWorld()
    const rect = cardRect(c)
    opts.onKilled(index, { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 })
    if (opts.reducedMotion || !R || !world) {
      // Crossfade instead of shards.
      c.fade = 0.999
      return
    }
    c.mesh.visible = false
    const origin = c.mesh.position.clone()
    const rot = c.mesh.quaternion.clone()
    // Burst outward from the pointer/centre, a little forward (toward the viewer) and up.
    const hit = new THREE.Vector2(hoverTilt.x * 0.5, hoverTilt.y * 0.3)
    const frags = fragments[index]
    c.shards.forEach((s, k) => {
      const f = frags[k]
      const local = new THREE.Vector3(f.centroid[0], f.centroid[1], 0)
      const pos = local.clone().applyQuaternion(rot).add(origin)
      s.mesh.position.copy(pos)
      s.mesh.quaternion.copy(rot)
      s.mesh.scale.setScalar(1)
      s.mesh.visible = true
      s.state = 'flying'
      s.t = 0
      const dir = new THREE.Vector3(f.centroid[0] - hit.x, f.centroid[1] - hit.y, 0)
      const dist = Math.max(0.15, dir.length())
      dir.normalize()
      const speed = 2.2 + 1.6 / (dist * 3 + 0.4) + rand() * 0.8
      const vel = new THREE.Vector3(dir.x * speed, dir.y * speed * 0.8 + 1.4 + rand() * 1.2, 1.6 + rand() * 1.4).applyQuaternion(rot)
      const desc = R!.RigidBodyDesc.dynamic()
        .setTranslation(pos.x, pos.y, pos.z)
        .setRotation({ x: rot.x, y: rot.y, z: rot.z, w: rot.w })
        .setLinvel(vel.x, vel.y, vel.z)
        .setAngvel({ x: (rand() - 0.5) * 14, y: (rand() - 0.5) * 14, z: (rand() - 0.5) * 10 })
        .setLinearDamping(0.15)
        .setAngularDamping(0.6)
        .setCcdEnabled(true)
      const body = world!.createRigidBody(desc)
      const hull = R!.ColliderDesc.convexHull(f.points)
      if (hull) world!.createCollider(hull.setFriction(0.6).setRestitution(0.25).setDensity(1.2), body)
      s.body = body
    })
  }

  function clearShards(c: Card) {
    for (const s of c.shards) {
      if (s.body && world) world.removeRigidBody(s.body)
      s.body = null
      s.state = 'idle'
      s.mesh.visible = false
    }
  }

  function reset() {
    cards.forEach((c) => {
      clearShards(c)
      c.alive = true
      c.fade = 1
      c.pop = 0
      c.mesh.visible = true
      setFade(c.mat, 1)
    })
  }

  function setFade(mat: THREE.MeshPhysicalMaterial, v: number) {
    const sh = mat.userData.shader as { uniforms: { uFade: { value: number } } } | undefined
    if (sh) sh.uniforms.uFade.value = v
    mat.opacity = v
  }

  // ---------- loop ----------
  let raf = 0
  let disposed = false
  let last = performance.now()
  let acc = 0
  let firstFrame = false
  let t = 0
  const rects: Array<{ x: number; y: number; w: number; h: number } | null> = cards.map(() => null)

  function frame(now: number) {
    if (disposed) return
    raf = requestAnimationFrame(frame)
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now
    t += dt

    if (world) {
      acc += dt
      let steps = 0
      while (acc >= 1 / 60 && steps < 3) { world.step(); acc -= 1 / 60; steps++ }
      if (steps === 3) acc = 0
    }

    cards.forEach((c, i) => {
      if (c.alive || c.fade > 0) {
        // Hang and sway; the hovered card tilts toward the pointer.
        const sway = opts.reducedMotion ? 0 : 1
        c.mesh.position.set(c.base.x, c.base.y + Math.sin(t * 1.1 + c.phase) * 0.035 * sway, c.base.z)
        const hx = hover === i ? hoverTilt.x : 0, hy = hover === i ? hoverTilt.y : 0
        tmpQ.setFromEuler(new THREE.Euler(Math.sin(t * 0.8 + c.phase) * 0.05 * sway - hy * 0.12, Math.sin(t * 0.6 + c.phase) * 0.09 * sway + hx * 0.16, 0))
        c.mesh.quaternion.slerp(tmpQ, Math.min(1, dt * 8))
        if (c.pop < 1) { c.pop = Math.min(1, c.pop + dt / 0.6); const e = 1 - Math.pow(1 - c.pop, 3); c.mesh.scale.setScalar(e) } else c.mesh.scale.setScalar(1)
        if (!c.alive && c.fade > 0) { c.fade = Math.max(0, c.fade - dt / 0.5); setFade(c.mat, c.fade); if (c.fade === 0) c.mesh.visible = false }
      }
      c.mesh.updateMatrixWorld()
      rects[i] = c.alive ? cardRect(c) : null
      // String: anchor far above the card, down to its top edge (snaps away with the card).
      const top = c.alive ? tmpV.set(0, CARD_H / 2, 0).applyMatrix4(c.mesh.matrixWorld) : tmpV.set(c.base.x, 12, 0)
      stringPos[i * 6] = c.base.x; stringPos[i * 6 + 1] = 12; stringPos[i * 6 + 2] = 0
      stringPos[i * 6 + 3] = top.x; stringPos[i * 6 + 4] = top.y; stringPos[i * 6 + 5] = top.z
      for (const s of c.shards) {
        if (s.state === 'idle') continue
        s.t += dt
        if (s.body) {
          const p = s.body.translation(), r = s.body.rotation()
          s.mesh.position.set(p.x, p.y, p.z)
          s.mesh.quaternion.set(r.x, r.y, r.z, r.w)
        }
        if (s.state === 'flying' && (s.t > 1.5 || (s.body?.isSleeping() && s.t > 0.6))) { s.state = 'fading'; s.t = 0 }
        if (s.state === 'fading') {
          const k = Math.min(1, s.t / 0.45)
          s.mesh.scale.setScalar(1 - k * k)
          if (k >= 1) { if (s.body && world) world.removeRigidBody(s.body); s.body = null; s.state = 'idle'; s.mesh.visible = false }
        }
      }
    })
    stringGeo.attributes.position.needsUpdate = true
    opts.onRects?.(rects)

    renderer.render(scene, camera)
    if (!firstFrame) { firstFrame = true; opts.onFirstFrame?.() }
  }
  raf = requestAnimationFrame(frame)
  const onVisibility = () => { last = performance.now(); acc = 0 }
  document.addEventListener('visibilitychange', onVisibility)

  return {
    kill,
    reset,
    pick,
    setHover: (i) => { hover = i },
    dispose() {
      disposed = true
      cancelAnimationFrame(raf)
      ro.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      world?.free()
      cards.forEach((c) => { c.mat.dispose(); c.shards.forEach((s) => { s.mat.dispose(); s.mesh.geometry.dispose() }) })
      geo.dispose(); atlas.dispose(); floorMat.map?.dispose(); alphaMap.dispose(); floorMat.dispose(); floor.geometry.dispose(); stringGeo.dispose(); (strings.material as THREE.Material).dispose()
      scene.environment?.dispose()
      renderer.dispose()
    },
  }
}

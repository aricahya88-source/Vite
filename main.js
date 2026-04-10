import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0b1020)
scene.fog = new THREE.Fog(0x0b1020, 14, 28)

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  100
)
camera.position.set(7, 5.5, 10)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.target.set(0, 1.5, 0)
controls.autoRotate = false
controls.autoRotateSpeed = 1.0

const hemi = new THREE.HemisphereLight(0xbfd9ff, 0x4b3425, 1.25)
scene.add(hemi)

const dir = new THREE.DirectionalLight(0xffffff, 1.3)
dir.position.set(6, 10, 4)
dir.castShadow = true
dir.shadow.mapSize.width = 2048
dir.shadow.mapSize.height = 2048
dir.shadow.camera.near = 0.5
dir.shadow.camera.far = 30
scene.add(dir)

const fill = new THREE.DirectionalLight(0xffd6a5, 0.45)
fill.position.set(-5, 4, -6)
scene.add(fill)

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(60, 60),
  new THREE.MeshStandardMaterial({
    color: 0x172033,
    roughness: 0.95,
    metalness: 0.05,
  })
)
ground.rotation.x = -Math.PI / 2
ground.position.y = -0.75
ground.receiveShadow = true
scene.add(ground)

const grid = new THREE.GridHelper(30, 30, 0x385074, 0x24334d)
grid.position.y = -0.74
scene.add(grid)

const woodMaterial = new THREE.MeshStandardMaterial({
  color: 0xc08a54,
  roughness: 0.76,
  metalness: 0.06,
})

const woodHighlightMaterial = woodMaterial.clone()
woodHighlightMaterial.emissive = new THREE.Color(0x7a4e1c)
woodHighlightMaterial.emissiveIntensity = 0.35

let bridgeGroup = null
let animatedParts = []
let hoveredMesh = null

const raycaster = new THREE.Raycaster()
const pointer = new THREE.Vector2()
const clock = new THREE.Clock()

const ui = {
  modules: document.getElementById('modules'),
  arch: document.getElementById('arch'),
  tilt: document.getElementById('tilt'),
  modulesValue: document.getElementById('modulesValue'),
  archValue: document.getElementById('archValue'),
  tiltValue: document.getElementById('tiltValue'),
  assembleBtn: document.getElementById('assembleBtn'),
  autoRotateBtn: document.getElementById('autoRotateBtn'),
}

function stickGeometry(length = 3.0, thickness = 0.18, width = 0.24) {
  return new THREE.BoxGeometry(width, thickness, length)
}

function createStick(length, width = 0.22, thickness = 0.14) {
  const mesh = new THREE.Mesh(stickGeometry(length, thickness, width), woodMaterial)
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

function makeAnimated(mesh, delay = 0) {
  mesh.userData.targetPosition = mesh.position.clone()
  mesh.userData.targetQuaternion = mesh.quaternion.clone()

  const radius = 7 + Math.random() * 2
  const angle = Math.random() * Math.PI * 2

  mesh.position.set(
    Math.cos(angle) * radius,
    -3 - Math.random() * 1.5,
    Math.sin(angle) * radius
  )
  mesh.rotation.set(
    Math.random() * Math.PI,
    Math.random() * Math.PI,
    Math.random() * Math.PI
  )
  mesh.userData.delay = delay
  animatedParts.push(mesh)
}

function archY(t, archHeight) {
  return 0.4 + archHeight * (1 - t * t)
}

function buildBridge({ modules, archHeight, tiltDeg }) {
  if (bridgeGroup) {
    scene.remove(bridgeGroup)
  }

  bridgeGroup = new THREE.Group()
  animatedParts = []

  const laneWidth = 3.6
  const halfLane = laneWidth / 2
  const spacing = 1.2
  const stickLength = 3.0
  const sideLift = 0.55
  const tilt = THREE.MathUtils.degToRad(tiltDeg)

  const totalLength = (modules - 1) * spacing

  for (let i = 0; i < modules; i++) {
    const t = modules === 1 ? 0 : (i / (modules - 1)) * 2 - 1
    const z = i * spacing - totalLength / 2
    const yBase = archY(t, archHeight)

    const left = createStick(stickLength)
    left.position.set(-halfLane + 0.5, yBase, z)
    left.rotation.set(0, Math.PI / 2, tilt)
    bridgeGroup.add(left)
    makeAnimated(left, i * 0.06)

    const right = createStick(stickLength)
    right.position.set(halfLane - 0.5, yBase, z)
    right.rotation.set(0, Math.PI / 2, -tilt)
    bridgeGroup.add(right)
    makeAnimated(right, i * 0.06 + 0.04)

    const deck = createStick(laneWidth - 0.1, 0.26, 0.13)
    deck.position.set(0, yBase + sideLift, z)
    deck.rotation.set(0, 0, 0)
    bridgeGroup.add(deck)
    makeAnimated(deck, i * 0.06 + 0.08)

    if (i < modules - 1) {
      const zNext = (i + 1) * spacing - totalLength / 2
      const tNext = ((i + 1) / (modules - 1)) * 2 - 1
      const yNext = archY(tNext, archHeight)
      const avgY = (yBase + yNext) * 0.5 + 0.12
      const span = Math.sqrt((zNext - z) ** 2 + (yNext - yBase) ** 2)
      const slope = Math.atan2(yNext - yBase, zNext - z)

      const leftRail = createStick(span + 0.45, 0.16, 0.11)
      leftRail.position.set(-halfLane + 0.98, avgY, (z + zNext) * 0.5)
      leftRail.rotation.set(-slope, 0, 0)
      bridgeGroup.add(leftRail)
      makeAnimated(leftRail, i * 0.06 + 0.12)

      const rightRail = createStick(span + 0.45, 0.16, 0.11)
      rightRail.position.set(halfLane - 0.98, avgY, (z + zNext) * 0.5)
      rightRail.rotation.set(-slope, 0, 0)
      bridgeGroup.add(rightRail)
      makeAnimated(rightRail, i * 0.06 + 0.16)

      const cross = createStick(laneWidth + 0.85, 0.13, 0.11)
      cross.position.set(0, avgY + 0.3, (z + zNext) * 0.5)
      cross.rotation.set(0.48, 0, i % 2 === 0 ? 0.32 : -0.32)
      bridgeGroup.add(cross)
      makeAnimated(cross, i * 0.06 + 0.2)
    }
  }

  const baseBeam = createStick(totalLength + 2.4, 0.18, 0.14)
  baseBeam.position.set(0, -0.12, 0)
  baseBeam.rotation.set(Math.PI / 2, 0, 0)
  bridgeGroup.add(baseBeam)
  makeAnimated(baseBeam, modules * 0.08)

  scene.add(bridgeGroup)
}

function updateLabels() {
  ui.modulesValue.textContent = ui.modules.value
  ui.archValue.textContent = Number(ui.arch.value).toFixed(1)
  ui.tiltValue.textContent = `${ui.tilt.value}°`
}

function rebuild() {
  updateLabels()
  buildBridge({
    modules: Number(ui.modules.value),
    archHeight: Number(ui.arch.value),
    tiltDeg: Number(ui.tilt.value),
  })
}

ui.modules.addEventListener('input', rebuild)
ui.arch.addEventListener('input', rebuild)
ui.tilt.addEventListener('input', rebuild)
ui.assembleBtn.addEventListener('click', rebuild)
ui.autoRotateBtn.addEventListener('click', () => {
  controls.autoRotate = !controls.autoRotate
  ui.autoRotateBtn.textContent = `Auto rotate: ${controls.autoRotate ? 'on' : 'off'}`
})

window.addEventListener('pointermove', (event) => {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1
})

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

rebuild()

function animateAssembly(elapsedTime) {
  for (const mesh of animatedParts) {
    const delay = mesh.userData.delay || 0
    const duration = 0.75
    const p = THREE.MathUtils.clamp((elapsedTime - delay) / duration, 0, 1)
    const eased = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2

    mesh.position.lerp(mesh.userData.targetPosition, eased * 0.18)
    mesh.quaternion.slerp(mesh.userData.targetQuaternion, eased * 0.18)

    if (p > 0.999) {
      mesh.position.copy(mesh.userData.targetPosition)
      mesh.quaternion.copy(mesh.userData.targetQuaternion)
    }
  }
}

function updateHover() {
  raycaster.setFromCamera(pointer, camera)
  const intersects = raycaster.intersectObjects(bridgeGroup ? bridgeGroup.children : [], false)

  if (hoveredMesh && (!intersects.length || intersects[0].object !== hoveredMesh)) {
    hoveredMesh.material = woodMaterial
    hoveredMesh = null
  }

  if (intersects.length) {
    const next = intersects[0].object
    if (hoveredMesh !== next) {
      if (hoveredMesh) hoveredMesh.material = woodMaterial
      hoveredMesh = next
      hoveredMesh.material = woodHighlightMaterial
    }
  }
}

function animate() {
  requestAnimationFrame(animate)
  const elapsed = clock.getElapsedTime()

  animateAssembly(elapsed)
  updateHover()
  controls.update()
  renderer.render(scene, camera)
}

animate()

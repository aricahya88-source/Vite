import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'

const params = {
  modules: 4,
  arch: 1.3,
  supportAngle: 27,
  width: 1.65,
}

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0b1420)
scene.fog = new THREE.Fog(0x0b1420, 18, 34)

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100)
camera.position.set(6.8, 4.3, 8.8)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.1

document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.minDistance = 4
controls.maxDistance = 22
controls.target.set(0, 0.9, 0)

const ambientLight = new THREE.HemisphereLight(0xdff6ff, 0x142231, 1.45)
scene.add(ambientLight)

const keyLight = new THREE.DirectionalLight(0xfff7eb, 2.2)
keyLight.position.set(5, 8, 6)
keyLight.castShadow = true
keyLight.shadow.mapSize.set(2048, 2048)
keyLight.shadow.camera.left = -12
keyLight.shadow.camera.right = 12
keyLight.shadow.camera.top = 12
keyLight.shadow.camera.bottom = -12
scene.add(keyLight)

const rimLight = new THREE.DirectionalLight(0xb9e9ff, 0.9)
rimLight.position.set(-5, 4, -6)
scene.add(rimLight)

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(40, 40),
  new THREE.MeshStandardMaterial({
    color: 0x143145,
    roughness: 0.95,
    metalness: 0.02,
  }),
)
ground.rotation.x = -Math.PI / 2
ground.position.y = -1.45
ground.receiveShadow = true
scene.add(ground)

const grid = new THREE.GridHelper(34, 30, 0x5ca6bd, 0x2c5365)
grid.position.y = -1.42
grid.material.transparent = true
grid.material.opacity = 0.28
scene.add(grid)

const bridgeRoot = new THREE.Group()
scene.add(bridgeRoot)

const stickMeshes = []
const raycaster = new THREE.Raycaster()
const pointer = new THREE.Vector2(2, 2)
let hoveredStick = null
let time = 0

const STICK_BASE_LENGTH = 1.22
const STICK_WIDTH = 0.13
const STICK_THICKNESS = 0.03
const stickGeometry = new RoundedBoxGeometry(STICK_BASE_LENGTH, STICK_WIDTH, STICK_THICKNESS, 8, 0.03)

const ui = {
  moduleRange: document.querySelector('#moduleRange'),
  archRange: document.querySelector('#archRange'),
  tiltRange: document.querySelector('#tiltRange'),
  widthRange: document.querySelector('#widthRange'),
  moduleValue: document.querySelector('#moduleValue'),
  estimatedValue: document.querySelector('#estimatedValue'),
  archValue: document.querySelector('#archValue'),
  tiltValue: document.querySelector('#tiltValue'),
  widthValue: document.querySelector('#widthValue'),
  stickCountBadge: document.querySelector('#stickCountBadge'),
  minusBtn: document.querySelector('#minusBtn'),
  plusBtn: document.querySelector('#plusBtn'),
  rebuildBtn: document.querySelector('#rebuildBtn'),
  viewBtn: document.querySelector('#viewBtn'),
}

function woodMaterial() {
  const tone = [0xe8d3b1, 0xe0c79f, 0xd9bb8d, 0xefdbbc][Math.floor(Math.random() * 4)]
  return new THREE.MeshStandardMaterial({
    color: tone,
    roughness: 0.82,
    metalness: 0.03,
    emissive: 0x000000,
  })
}

function clearBridge() {
  const existingChildren = [...bridgeRoot.children]
  existingChildren.forEach((child) => {
    bridgeRoot.remove(child)
    child.traverse((node) => {
      if (node.isMesh && node.material) {
        node.material.dispose()
      }
    })
  })
  stickMeshes.length = 0
  hoveredStick = null
}

function addStick(group, start, end, extra = {}) {
  const direction = new THREE.Vector3().subVectors(end, start)
  const length = direction.length()
  if (length <= 0.001) return null

  const mesh = new THREE.Mesh(stickGeometry, woodMaterial())
  mesh.castShadow = true
  mesh.receiveShadow = true
  mesh.scale.set(length / STICK_BASE_LENGTH, 1, 1)
  mesh.position.copy(start).add(end).multiplyScalar(0.5)
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), direction.normalize())

  if (extra.lift) {
    mesh.position.y += extra.lift
  }

  if (extra.roll) {
    const rollQuat = new THREE.Quaternion().setFromAxisAngle(direction.normalize(), extra.roll)
    mesh.quaternion.multiply(rollQuat)
  }

  mesh.userData.baseEmissive = 0x000000
  mesh.userData.highlightEmissive = 0x3c2206
  group.add(mesh)
  stickMeshes.push(mesh)
  return mesh
}

function bridgeNodes(moduleCount, span, roofHeight) {
  const nodes = []
  const startX = -span / 2
  const step = span / moduleCount

  for (let i = 0; i <= moduleCount; i += 1) {
    const x = startX + i * step
    const peakFactor = 1 - Math.abs((x / (span / 2 || 1)))
    const y = 0.65 + roofHeight * Math.max(0, peakFactor)
    nodes.push({ x, y })
  }

  return nodes
}

function buildBridge() {
  clearBridge()

  const moduleCount = params.modules
  const span = moduleCount * 1.35
  const depth = params.width
  const sideZ = depth / 2
  const roofHeight = params.arch
  const footAngle = THREE.MathUtils.degToRad(params.supportAngle)
  const root = new THREE.Group()
  bridgeRoot.add(root)

  const nodes = bridgeNodes(moduleCount, span, roofHeight)
  const centerX = 0
  const deckY = 0.1
  const legLength = 1.08
  const endDrop = Math.sin(footAngle) * legLength
  const tipReach = Math.cos(footAngle) * legLength

  const makeVec = (x, y, z) => new THREE.Vector3(x, y, z)

  ;[-1, 1].forEach((zSign) => {
    const z = sideZ * zSign

    for (let i = 0; i < nodes.length - 1; i += 1) {
      const current = nodes[i]
      const next = nodes[i + 1]
      addStick(root, makeVec(current.x, deckY, z), makeVec(next.x, deckY, z))
      addStick(root, makeVec(current.x, current.y, z), makeVec(next.x, next.y, z))
    }

    nodes.forEach((node, index) => {
      const baseLift = index === 0 || index === nodes.length - 1 ? 0.06 : 0
      addStick(root, makeVec(node.x, deckY + baseLift, z), makeVec(node.x, node.y, z))
    })

    for (let i = 0; i < nodes.length - 1; i += 1) {
      const current = nodes[i]
      const next = nodes[i + 1]
      const center = (current.x + next.x) / 2
      const diagTop = i < moduleCount / 2 ? current : next
      addStick(root, makeVec(center, deckY + 0.02, z), makeVec(diagTop.x, diagTop.y, z))
    }

    const leftBase = makeVec(nodes[0].x, deckY, z)
    const rightBase = makeVec(nodes[nodes.length - 1].x, deckY, z)
    const leftTip = makeVec(nodes[0].x - tipReach, deckY - endDrop, z)
    const rightTip = makeVec(nodes[nodes.length - 1].x + tipReach, deckY - endDrop, z)

    addStick(root, leftTip, leftBase)
    addStick(root, rightBase, rightTip)

    const midLeftAnchor = makeVec(centerX - 0.25, deckY + 0.02, z)
    const midRightAnchor = makeVec(centerX + 0.25, deckY + 0.02, z)
    const leftUnder = leftTip.clone().lerp(midLeftAnchor, 0.96)
    const rightUnder = rightTip.clone().lerp(midRightAnchor, 0.96)

    addStick(root, leftTip, leftUnder, { lift: 0.02, roll: footAngle * 0.05 })
    addStick(root, rightUnder, rightTip, { lift: 0.02, roll: -footAngle * 0.05 })
  })

  for (let i = 0; i < moduleCount; i += 1) {
    const startX = nodes[i].x
    const endX = nodes[i + 1].x
    const midX = (startX + endX) / 2
    addStick(root, makeVec(midX, deckY + 0.01, -sideZ), makeVec(midX, deckY + 0.01, sideZ), { roll: Math.PI / 2 })
  }

  nodes.forEach((node, index) => {
    if (index === 0 || index === nodes.length - 1) return
    addStick(root, makeVec(node.x, node.y, -sideZ), makeVec(node.x, node.y, sideZ), { roll: Math.PI / 2 })
  })

  const leftRoofA = makeVec(nodes[1].x, nodes[1].y + 0.04, sideZ)
  const leftRoofB = makeVec(centerX, nodes[Math.floor(nodes.length / 2)].y + 0.28, 0)
  const rightRoofA = makeVec(centerX, nodes[Math.floor(nodes.length / 2)].y + 0.28, 0)
  const rightRoofB = makeVec(nodes[nodes.length - 2].x, nodes[nodes.length - 2].y + 0.04, sideZ)
  const leftRoofA2 = leftRoofA.clone().setZ(-sideZ)
  const rightRoofB2 = rightRoofB.clone().setZ(-sideZ)

  addStick(root, leftRoofA, leftRoofB)
  addStick(root, leftRoofA2, leftRoofB)
  addStick(root, rightRoofA, rightRoofB)
  addStick(root, rightRoofA, rightRoofB2)

  const underCrossA = makeVec(-span * 0.23, deckY - 0.24, -sideZ)
  const underCrossB = makeVec(span * 0.23, deckY - 0.24, sideZ)
  const underCrossC = makeVec(-span * 0.23, deckY - 0.24, sideZ)
  const underCrossD = makeVec(span * 0.23, deckY - 0.24, -sideZ)
  addStick(root, underCrossA, underCrossB)
  addStick(root, underCrossC, underCrossD)

  root.position.y = -0.15

  ui.stickCountBadge.textContent = `${stickMeshes.length} sticks`
  ui.estimatedValue.textContent = `perkiraan ${stickMeshes.length} stik`
}

function updateLabels() {
  ui.moduleValue.textContent = `${params.modules} segmen`
  ui.archValue.textContent = params.arch.toFixed(1)
  ui.tiltValue.textContent = `${params.supportAngle}°`
  ui.widthValue.textContent = params.width.toFixed(2)
}

function updateFromInputs() {
  params.modules = Number(ui.moduleRange.value)
  params.arch = Number(ui.archRange.value)
  params.supportAngle = Number(ui.tiltRange.value)
  params.width = Number(ui.widthRange.value)
  updateLabels()
  buildBridge()
}

ui.moduleRange.addEventListener('input', updateFromInputs)
ui.archRange.addEventListener('input', updateFromInputs)
ui.tiltRange.addEventListener('input', updateFromInputs)
ui.widthRange.addEventListener('input', updateFromInputs)
ui.rebuildBtn.addEventListener('click', buildBridge)

ui.minusBtn.addEventListener('click', () => {
  const nextValue = Math.max(Number(ui.moduleRange.min), Number(ui.moduleRange.value) - 1)
  ui.moduleRange.value = String(nextValue)
  updateFromInputs()
})

ui.plusBtn.addEventListener('click', () => {
  const nextValue = Math.min(Number(ui.moduleRange.max), Number(ui.moduleRange.value) + 1)
  ui.moduleRange.value = String(nextValue)
  updateFromInputs()
})

ui.viewBtn.addEventListener('click', () => {
  camera.position.set(0.1, 2.15, 11.5)
  controls.target.set(0, 0.6, 0)
  controls.update()
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

function handleHover() {
  raycaster.setFromCamera(pointer, camera)
  const hits = raycaster.intersectObjects(stickMeshes, false)
  const nextHovered = hits.length > 0 ? hits[0].object : null

  if (hoveredStick && hoveredStick !== nextHovered) {
    hoveredStick.material.emissive.setHex(hoveredStick.userData.baseEmissive)
  }

  if (nextHovered) {
    nextHovered.material.emissive.setHex(nextHovered.userData.highlightEmissive)
  }

  hoveredStick = nextHovered
}

function animate() {
  requestAnimationFrame(animate)
  time += 0.008
  handleHover()
  controls.update()

  bridgeRoot.rotation.y = Math.sin(time * 0.4) * 0.03
  bridgeRoot.position.y = Math.sin(time) * 0.02

  renderer.render(scene, camera)
}

updateLabels()
buildBridge()
animate()

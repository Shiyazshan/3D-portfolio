import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import {
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  Group,
  Matrix4,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  ShapeGeometry,
  Shape,
  TubeGeometry,
  Vector3,
} from 'three'

/**
 * Hair and spectacles for the avatar, generated from the avatar's own head mesh at load.
 *
 * Both are attached to the Head bone, so every nod and turn in the mocap clips moves
 * them exactly with the head — the same way an earring would be parented to an ear.
 * Everything is computed once (≈ a few ms), not per frame.
 */

/**
 * Bind-pose (rest pose) helpers. A skinned mesh stores, per bone, the inverse of that bone's
 * rest transform. Using it — instead of the bone's *current* world matrix — means the hair and
 * glasses are placed correctly even if an animation has already moved the head.
 */
function boneIndex(skinnedMesh, name) {
  const i = skinnedMesh.skeleton.bones.findIndex((b) => b.name === name)
  if (i < 0) throw new Error(`[avatar] bone "${name}" not found on ${skinnedMesh.name}`)
  return i
}
/** Mesh-space → bone-local matrix at rest. */
function meshToBoneRest(skinnedMesh, name) {
  return new Matrix4().multiplyMatrices(skinnedMesh.skeleton.boneInverses[boneIndex(skinnedMesh, name)], skinnedMesh.bindMatrix)
}
/** A bone's rest position in mesh space. */
function boneRestPosition(skinnedMesh, name) {
  const m = new Matrix4().copy(skinnedMesh.skeleton.boneInverses[boneIndex(skinnedMesh, name)]).invert()
  return new Vector3().setFromMatrixPosition(new Matrix4().multiplyMatrices(skinnedMesh.bindMatrixInverse, m))
}

/** Same hairline the build script paints on the scalp texture (texture v by distance from the face centre). */
export function hairlineV(ax) {
  if (ax < 0.2) return 0.2 + ax * 0.03
  if (ax < 0.32) return Math.min(0.206 + (ax - 0.2) * 0.65, 0.285)
  return Math.min(0.285 + (ax - 0.32) * 2.5, 0.4)
}

/** Smooth 3D value noise in [0, 1] — enough for organic hair locks without a noise library. */
function noise3(x, y, z) {
  const hash = (i, j, k) => {
    const h = Math.sin(i * 127.1 + j * 311.7 + k * 74.7) * 43758.5453
    return h - Math.floor(h)
  }
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z)
  const f = (t) => t * t * (3 - 2 * t)
  const u = f(x - xi), v = f(y - yi), w = f(z - zi)
  const lerp = (a, b, t) => a + (b - a) * t
  const c = (dx, dy, dz) => hash(xi + dx, yi + dy, zi + dz)
  return lerp(
    lerp(lerp(c(0, 0, 0), c(1, 0, 0), u), lerp(c(0, 1, 0), c(1, 1, 0), u), v),
    lerp(lerp(c(0, 0, 1), c(1, 0, 1), u), lerp(c(0, 1, 1), c(1, 1, 1), u), v),
    w,
  )
}

const smooth = (e0, e1, x) => {
  const t = Math.min(Math.max((x - e0) / (e1 - e0), 0), 1)
  return t * t * (3 - 2 * t)
}

/** Splits every triangle into four, `levels` times (keeps attributes interpolated). */
function subdivide(positions, normals, uvs, levels) {
  for (let l = 0; l < levels; l++) {
    const P = [], N = [], U = []
    for (let i = 0; i < positions.length; i += 9) {
      const tri = [0, 1, 2].map((k) => ({
        p: positions.slice(i + k * 3, i + k * 3 + 3),
        n: normals.slice(i + k * 3, i + k * 3 + 3),
        u: uvs.slice((i / 3 + k) * 2, (i / 3 + k) * 2 + 2),
      }))
      const mid = (a, b) => ({
        p: a.p.map((x, j) => (x + b.p[j]) / 2),
        n: a.n.map((x, j) => (x + b.n[j]) / 2),
        u: a.u.map((x, j) => (x + b.u[j]) / 2),
      })
      const [a, b, c] = tri
      const ab = mid(a, b), bc = mid(b, c), ca = mid(c, a)
      for (const t of [[a, ab, ca], [ab, b, bc], [ca, bc, c], [ab, bc, ca]]) for (const v of t) { P.push(...v.p); N.push(...v.n); U.push(...v.u) }
    }
    positions = P
    normals = N
    uvs = U
  }
  return { positions, normals, uvs }
}

/**
 * Voluminous, slightly wavy hair: the scalp part of the head mesh, subdivided and pushed
 * outward along its normals — thick on top with a lift at the front, tight at the sides,
 * fading to zero at the hairline so it blends into the painted scalp.
 */
export function createHair(headMesh, { boneName = 'Head', color = '#17110e', lite = false } = {}) {
  const headBone = headMesh.skeleton.getBoneByName(boneName)
  const geo = headMesh.geometry.index ? headMesh.geometry.toNonIndexed() : headMesh.geometry.clone()
  geo.computeVertexNormals()
  const pos = geo.attributes.position.array, nor = geo.attributes.normal.array, uv = geo.attributes.uv.array
  // Skull centre (bind pose): push outward radially from here. A direction that depends only on
  // position is continuous across triangles, so the shell has no cracks.
  const eyeL = boneRestPosition(headMesh, 'LeftEye'), eyeR = boneRestPosition(headMesh, 'RightEye')
  const eyeY = (eyeL.y + eyeR.y) / 2
  const centre = new Vector3(0, eyeY - 0.005, (eyeL.z + eyeR.z) / 2 - 0.068)

  const inHair = (u, v) => v < hairlineV(Math.abs(u - 0.5)) + 0.004
  const P = [], N = [], U = []
  for (let t = 0; t < pos.length / 9; t++) {
    let all = true
    for (let k = 0; k < 3; k++) {
      const vi = t * 3 + k
      if (!inHair(uv[vi * 2], uv[vi * 2 + 1])) { all = false; break }
    }
    if (!all) continue
    for (let k = 0; k < 3; k++) {
      const vi = t * 3 + k
      P.push(pos[vi * 3], pos[vi * 3 + 1], pos[vi * 3 + 2])
      N.push(nor[vi * 3], nor[vi * 3 + 1], nor[vi * 3 + 2])
      U.push(uv[vi * 2], uv[vi * 2 + 1])
    }
  }
  geo.dispose()

  const { positions, uvs } = subdivide(P, N, U, 2)
  const out = new Float32Array(positions.length)
  const colors = new Float32Array(positions.length)
  const base = new Color(color)
  const n = new Vector3()
  for (let i = 0, j = 0; i < positions.length; i += 3, j += 2) {
    const x = positions[i], y = positions[i + 1], z = positions[i + 2]
    n.set(x - centre.x, (y - centre.y) * 0.8, z - centre.z).normalize()
    const u = uvs[j], v = uvs[j + 1]
    // Uneven, natural hairline instead of a ruled edge.
    const line = hairlineV(Math.abs(u - 0.5)) + (noise3(u * 38, v * 10, 0) - 0.5) * 0.014
    const edge = smooth(0, 0.03, line - v) // 0 at the hairline → 1 inside
    const top = smooth(1.755, 1.83, y)
    const front = smooth(0.0, 0.1, z) * smooth(1.775, 1.82, y)
    const sides = smooth(0.045, 0.08, Math.abs(x)) * (1 - top)
    // Locks swept back: noise stretched along the front→back flow, plus broad waves across it.
    const locks = noise3(x * 55, y * 20, z * 14) - 0.5
    const wave = Math.sin(z * 70 + Math.abs(x) * 26 + locks * 3) * 0.5
    let thick = 0.003 + 0.024 * top + 0.017 * front - 0.0015 * sides
    thick += (0.006 * locks + 0.004 * wave) * (0.25 + top)
    thick *= edge
    out[i] = x + n.x * thick
    out[i + 1] = y + n.y * thick + 0.005 * front * edge
    out[i + 2] = z + n.z * thick + 0.004 * front * edge
    // Strand streaks: fine variation across the flow, long along it; slightly lighter tips on top.
    const streak = noise3(x * 420, y * 160, z * 40)
    const k = 0.62 + 0.55 * streak + 0.18 * top * noise3(x * 90, y * 30, z * 20)
    colors[i] = base.r * k
    colors[i + 1] = base.g * k
    colors[i + 2] = base.b * k
  }

  let hairGeo = new BufferGeometry()
  hairGeo.setAttribute('position', new BufferAttribute(out, 3))
  hairGeo.setAttribute('color', new BufferAttribute(colors, 3))
  hairGeo = mergeVertices(hairGeo, 1e-5) // weld shared corners → smooth shading
  hairGeo.computeVertexNormals()
  // Mesh space (rest pose) → Head bone local space, so the hair rides on the bone.
  hairGeo.applyMatrix4(meshToBoneRest(headMesh, boneName))

  // Lite (phones / slow GPUs): standard material, no sheen layer — visually almost identical at
  // portfolio camera distances and noticeably cheaper per pixel.
  const material = lite
    ? new MeshStandardMaterial({ vertexColors: true, roughness: 0.7, metalness: 0 })
    : new MeshPhysicalMaterial({
        vertexColors: true,
        roughness: 0.68,
        metalness: 0,
        sheen: 0.35,
        sheenRoughness: 0.5,
        sheenColor: new Color('#5a4636'),
      })
  const mesh = new Mesh(hairGeo, material)
  mesh.name = 'Hair'
  mesh.castShadow = true
  headBone.add(mesh)
  return mesh
}

/** Rounded-hexagon lens outline (like the reference's thin metal frames), centred at the origin. */
function lensOutline(w, h) {
  const pts = []
  const corners = [
    [-0.5, 0.18], [-0.34, 0.5], [0.36, 0.5], [0.5, 0.2], [0.42, -0.36], [0.22, -0.5], [-0.24, -0.5], [-0.44, -0.34],
  ].map(([x, y]) => new Vector3(x * w, y * h, 0))
  // round the corners with a closed Catmull-Rom spline
  const curve = new CatmullRomCurve3(corners, true, 'centripetal', 0.5)
  for (let i = 0; i < 64; i++) pts.push(curve.getPoint(i / 64))
  return new CatmullRomCurve3(pts, true, 'centripetal')
}

/** Thin metal spectacles positioned from the eye bones and attached to the Head bone. */
export function createGlasses(headMesh, { boneName = 'Head', frameColor = '#8f9298', lite = false } = {}) {
  const headBone = headMesh.skeleton.getBoneByName(boneName)
  const l = boneRestPosition(headMesh, 'LeftEye')
  const r = boneRestPosition(headMesh, 'RightEye')
  const ipd = l.distanceTo(r)
  const centre = l.clone().add(r).multiplyScalar(0.5)

  const lensW = ipd * 0.86
  const lensH = lensW * 0.78
  const tube = 0.00075
  const frameMat = new MeshStandardMaterial({ color: frameColor, metalness: 1, roughness: 0.28 })
  const lensMat = lite
    ? new MeshStandardMaterial({ color: '#ffffff', roughness: 0.05, transparent: true, opacity: 0.08, depthWrite: false })
    : new MeshPhysicalMaterial({ color: '#ffffff', metalness: 0, roughness: 0.04, transparent: true, opacity: 0.1, clearcoat: 1, depthWrite: false })

  const glasses = new Group()
  glasses.name = 'Glasses'
  const outline = lensOutline(lensW, lensH)
  const shape = new Shape(outline.getPoints(64).map((p) => ({ x: p.x, y: p.y })))
  const half = ipd / 2

  for (const side of [-1, 1]) {
    const frame = new Mesh(new TubeGeometry(outline, 96, tube, 6, true), frameMat)
    const lens = new Mesh(new ShapeGeometry(shape, 24), lensMat)
    // mirror the left lens so both outlines flare outward
    const g = new Group()
    g.add(frame, lens)
    g.scale.x = side
    g.position.set(side * half, 0, 0)
    g.rotation.y = side * 0.06 // gentle wrap around the face
    glasses.add(g)
  }

  // bridge: a small arch over the nose
  const bridge = new CatmullRomCurve3([
    new Vector3(-half + lensW * 0.5 - 0.001, lensH * 0.2, 0),
    new Vector3(0, lensH * 0.32, 0.002),
    new Vector3(half - lensW * 0.5 + 0.001, lensH * 0.2, 0),
  ])
  glasses.add(new Mesh(new TubeGeometry(bridge, 16, tube, 6, false), frameMat))

  // temples: from the outer hinge back over the ears
  for (const side of [-1, 1]) {
    const hx = side * (half + lensW * 0.5)
    const temple = new CatmullRomCurve3([
      new Vector3(hx, lensH * 0.18, -0.002),
      new Vector3(hx + side * 0.012, lensH * 0.2, -0.03),
      new Vector3(side * 0.077, lensH * 0.12, -0.075),
      new Vector3(side * 0.074, -0.004, -0.098),
    ])
    glasses.add(new Mesh(new TubeGeometry(temple, 32, tube * 1.15, 6, false), frameMat))
  }

  // In front of the eyes, resting on the nose bridge (mesh space), then expressed in the
  // Head bone's local space so it follows every head movement.
  glasses.position.set(centre.x, centre.y + 0.001, centre.z + 0.03)
  glasses.updateMatrix()
  glasses.matrix.premultiply(meshToBoneRest(headMesh, boneName))
  glasses.matrix.decompose(glasses.position, glasses.quaternion, glasses.scale)
  headBone.add(glasses)
  return glasses
}

/** Frees GPU resources created by createHair / createGlasses. */
export function disposeAccessory(object) {
  object?.traverse((o) => {
    if (o.isMesh) {
      o.geometry.dispose()
      o.material.dispose()
    }
  })
  object?.removeFromParent()
}

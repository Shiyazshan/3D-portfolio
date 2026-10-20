/**
 * Builds public/models/avatar.glb from a Ready Player Me avatar + RPM mocap clips.
 *
 *   npm run avatar:build
 *
 * Source files are downloaded into scripts/.avatar-src/ on first run (not committed):
 *   avatar  three.js examples — examples/models/gltf/readyplayer.me.glb (a Ready Player Me avatar)
 *   clips   readyplayerme/animation-library — masculine Walk + Standing Idle (motion capture)
 * The RPM animation licence allows use with Ready Player Me avatars only, which this is.
 *
 * 1. Merges the Walk and Idle clips into the avatar (bound by bone name) and strips
 *    the walk's forward root motion, so the app can drive position from the scroll.
 * 2. Restyles the outfit to match the reference: navy blazer, white shirt, navy
 *    trousers, brown shoes, dark hair, warm skin with a short beard; removes the hat,
 *    moustache and tailcoat tails.
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { mergeDocuments, prune, dedup, unpartition, textureCompress } from '@gltf-transform/functions'
import sharp from 'sharp'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const SRC_DIR = path.join(HERE, '.avatar-src')
const SOURCES = {
  avatar: 'https://raw.githubusercontent.com/mrdoob/three.js/r170/examples/models/gltf/readyplayer.me.glb',
  walk: 'https://raw.githubusercontent.com/readyplayerme/animation-library/master/masculine/glb/locomotion/M_Walk_001.glb',
  idle: 'https://raw.githubusercontent.com/readyplayerme/animation-library/master/masculine/glb/idle/M_Standing_Idle_001.glb',
}

async function source(name) {
  const file = path.join(SRC_DIR, `${name}.glb`)
  try {
    await fs.access(file)
  } catch {
    console.log(`downloading ${name}…`)
    const res = await fetch(SOURCES[name])
    if (!res.ok) throw new Error(`Download failed (${res.status}): ${SOURCES[name]}`)
    await fs.mkdir(SRC_DIR, { recursive: true })
    await fs.writeFile(file, Buffer.from(await res.arrayBuffer()))
  }
  return file
}

const AVATAR = process.argv[2] ?? (await source('avatar'))
const WALK = process.argv[3] ?? (await source('walk'))
const IDLE = process.argv[4] ?? (await source('idle'))
const OUT = process.argv[5] ?? path.join(HERE, '..', 'public', 'models', 'avatar.glb')
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
const doc = await io.read(AVATAR)
const root = doc.getRoot()

/* ---------------- helpers ---------------- */

/** Hairline as texture v for a given distance from the face centre line (|u − 0.5|). Shared with the 3D hair. */
export function hairlineV(ax) {
  if (ax < 0.2) return 0.2 + ax * 0.03
  if (ax < 0.32) return Math.min(0.206 + (ax - 0.2) * 0.65, 0.285)
  return Math.min(0.285 + (ax - 0.32) * 2.5, 0.4)
}

const findMesh = (name) => root.listNodes().find((n) => n.getName() === name && n.getMesh())

function rgb2hsv(r, g, b) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min
  let h = 0
  if (d) {
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  return [h, max ? d / max : 0, max]
}
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
const lum = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b
const clamp = (x) => (x < 0 ? 0 : x > 255 ? 255 : x)
const smooth = (e0, e1, x) => { const t = Math.min(Math.max((x - e0) / (e1 - e0), 0), 1); return t * t * (3 - 2 * t) }

/** Decode a texture to raw RGB, let fn edit pixels, re-encode as JPEG in place. */
async function editTexture(texture, fn) {
  const { data, info } = await sharp(Buffer.from(texture.getImage())).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  fn(data, info.width, info.height)
  const out = await sharp(data, { raw: { width: info.width, height: info.height, channels: 3 } }).jpeg({ quality: 88, mozjpeg: true }).toBuffer()
  texture.setImage(new Uint8Array(out)).setMimeType('image/jpeg')
}

/** Re-tint a pixel to `target` while keeping its shading (luminance relative to `ref`). */
function tint(data, i, target, ref, keep = 1) {
  const l = lum(data[i], data[i + 1], data[i + 2])
  const k = Math.pow(l / ref, keep)
  data[i] = clamp(target[0] * k); data[i + 1] = clamp(target[1] * k); data[i + 2] = clamp(target[2] * k)
}

/** Remove triangles of a mesh primitive for which keep(tri) returns false. */
function filterTriangles(meshNode, shouldRemove) {
  for (const prim of meshNode.getMesh().listPrimitives()) {
    const idx = prim.getIndices(), pos = prim.getAttribute('POSITION'), uv = prim.getAttribute('TEXCOORD_0')
    const src = idx.getArray(), kept = []
    const p = [[], [], []], t = [[], [], []]
    for (let i = 0; i < src.length; i += 3) {
      for (let k = 0; k < 3; k++) { pos.getElement(src[i + k], p[k]); uv?.getElement(src[i + k], t[k]) }
      if (!shouldRemove(p, t)) kept.push(src[i], src[i + 1], src[i + 2])
    }
    idx.setArray(new (src.constructor)(kept))
    console.log(`  ${meshNode.getName()}: removed ${(src.length - kept.length) / 3} of ${src.length / 3} triangles`)
  }
}


/* ---------------- 1. animations ---------------- */

// Merge order matters: Walk first, Idle second (renamed below).
for (const file of [WALK, IDLE]) mergeDocuments(doc, await io.read(file))
const avatarScene = root.listScenes()[0]
const avatarNodes = new Map()
avatarScene.traverse((n) => avatarNodes.set(n.getName(), n))

const anims = root.listAnimations()
anims[0].setName('Walk')
anims[1].setName('Idle')
for (const anim of anims) {
  for (const ch of anim.listChannels()) {
    const target = avatarNodes.get(ch.getTargetNode().getName())
    if (!target) { ch.dispose(); continue }
    ch.setTargetNode(target)
    // Hips translation: keep the vertical bob, remove forward/sideways travel (in-place cycle).
    if (target.getName() === 'Hips' && ch.getTargetPath() === 'translation') {
      const out = ch.getSampler().getOutput(), arr = out.getArray().slice()
      const x0 = arr[0], z0 = arr[2]
      const zEnd = arr[arr.length - 1]
      if (anim.getName() === 'Walk') console.log(`  walk root travel per loop: ${(zEnd - z0).toFixed(3)} m`)
      for (let i = 0; i < arr.length; i += 3) { arr[i] = x0; arr[i + 2] = z0 }
      out.setArray(arr)
    }
  }
}
// Drop the scenes/nodes that came with the clip files.
for (const scene of root.listScenes().slice(1)) {
  scene.traverse((n) => { if (!avatarNodes.has(n.getName()) || ![...avatarNodes.values()].includes(n)) n.dispose() })
  scene.dispose()
}
root.setDefaultScene(avatarScene)

/* ---------------- 2. geometry edits ---------------- */

// Moustache: the reference has a short beard instead (painted onto the skin below).
findMesh('Wolf3D_Beard')?.dispose()

// Hat + curly hair: removed entirely. The app generates short, voluminous hair from the
// head mesh at load (src/components/3d/avatarAccessories.js), matching the reference.
findMesh('Wolf3D_Headwear')?.dispose()

// Tailcoat → blazer: every triangle below hip level is part of the tails (all are at the back).
filterTriangles(findMesh('Wolf3D_Outfit_Top'), (p) => {
  const cy = (p[0][1] + p[1][1] + p[2][1]) / 3, cz = (p[0][2] + p[1][2] + p[2][2]) / 3
  return cy < 0.86 && cz < 0
})

/**
 * The jacket mesh is made of separate pieces (islands): coat, shirt, waistcoat, bow tie,
 * rose, cuffs and buttons. Label each island by where it sits on the body, then:
 *   bow tie + rose → removed   shirt + waistcoat + cuffs → plain white shirt   coat → navy blazer
 */
const topNode = findMesh('Wolf3D_Outfit_Top')
function islands(meshNode) {
  const prim = meshNode.getMesh().listPrimitives()[0]
  const idx = prim.getIndices().getArray(), pos = prim.getAttribute('POSITION'), n = pos.getCount(), p = []
  const parent = new Int32Array(n).map((_, i) => i)
  const find = (a) => { while (parent[a] !== a) a = parent[a] = parent[parent[a]]; return a }
  const union = (a, b) => { a = find(a); b = find(b); if (a !== b) parent[a] = b }
  const seen = new Map() // weld duplicated vertices at UV seams
  for (let i = 0; i < n; i++) { pos.getElement(i, p); const k = p.map((x) => x.toFixed(5)).join(); if (seen.has(k)) union(i, seen.get(k)); else seen.set(k, i) }
  for (let i = 0; i < idx.length; i += 3) { union(idx[i], idx[i + 1]); union(idx[i], idx[i + 2]) }
  const info = new Map()
  for (let i = 0; i < idx.length; i += 3) {
    const r = find(idx[i]); const c = info.get(r) ?? { tris: 0, min: [9, 9, 9], max: [-9, -9, -9] }
    for (let k = 0; k < 3; k++) { pos.getElement(idx[i + k], p); for (let j = 0; j < 3; j++) { c.min[j] = Math.min(c.min[j], p[j]); c.max[j] = Math.max(c.max[j], p[j]) } }
    c.tris++; info.set(r, c)
  }
  const largest = [...info.entries()].sort((a, b) => b[1].tris - a[1].tris)[0][0]
  const label = new Map()
  for (const [r, c] of info) {
    const cx = (c.min[0] + c.max[0]) / 2, w = c.max[0] - c.min[0], h = c.max[1] - c.min[1]
    let l = 'blazer'
    if (r === largest) l = 'blazer'
    else if (c.min[1] > 1.49 && Math.abs(cx) < 0.03 && w < 0.13 && h < 0.08) l = 'remove' // bow tie wings + knot
    else if (Math.abs(cx) > 0.09 && c.min[1] > 1.3 && c.max[1] < 1.48 && c.max[0] < 0.3 && c.min[0] > -0.3) l = 'remove' // lapel rose + leaves
    else if (c.max[0] < 0.12 && c.min[0] > -0.12) l = 'shirt' // shirt, waistcoat, its buttons
    else if (Math.abs(cx) > 0.38 && c.tris > 100) l = 'shirt' // cuffs
    label.set(r, l)
  }
  const counts = {}; for (const [r, l] of label) counts[l] = (counts[l] ?? 0) + info.get(r).tris
  console.log('  jacket islands:', JSON.stringify(counts))
  return (vertexIndex) => label.get(find(vertexIndex))
}
const topLabel = islands(topNode)
{
  const prim = topNode.getMesh().listPrimitives()[0]
  const idx = prim.getIndices(), src = idx.getArray(), kept = []
  for (let i = 0; i < src.length; i += 3) if (topLabel(src[i]) !== 'remove') kept.push(src[i], src[i + 1], src[i + 2])
  idx.setArray(new (src.constructor)(kept))
}

/** Rasterises each triangle's UVs into a label map: 1 = shirt, 2 = blazer. */
function labelMap(meshNode, size, labelOf) {
  const map = new Uint8Array(size * size)
  const prim = meshNode.getMesh().listPrimitives()[0]
  const idx = prim.getIndices().getArray(), uv = prim.getAttribute('TEXCOORD_0'), t = []
  for (let i = 0; i < idx.length; i += 3) {
    const value = labelOf(idx[i]) === 'shirt' ? 1 : 2
    const T = [0, 1, 2].map((k) => { uv.getElement(idx[i + k], t); return [t[0] * size, t[1] * size] })
    const [a, b, d] = T
    const minX = Math.max(0, Math.floor(Math.min(a[0], b[0], d[0])) - 1), maxX = Math.min(size - 1, Math.ceil(Math.max(a[0], b[0], d[0])) + 1)
    const minY = Math.max(0, Math.floor(Math.min(a[1], b[1], d[1])) - 1), maxY = Math.min(size - 1, Math.ceil(Math.max(a[1], b[1], d[1])) + 1)
    const area = (b[0] - a[0]) * (d[1] - a[1]) - (d[0] - a[0]) * (b[1] - a[1])
    if (!area) continue
    for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
      const px = x + 0.5, py = y + 0.5
      const w0 = ((b[0] - px) * (d[1] - py) - (d[0] - px) * (b[1] - py)) / area
      const w1 = ((d[0] - px) * (a[1] - py) - (a[0] - px) * (d[1] - py)) / area
      if (w0 > -0.03 && w1 > -0.03 && 1 - w0 - w1 > -0.03) map[y * size + x] = value === 1 || !map[y * size + x] ? value : map[y * size + x]
    }
  }
  return map
}

/* ---------------- 3. textures ---------------- */

const mat = (n) => findMesh(n).getMesh().listPrimitives()[0].getMaterial()
const BLAZER = hex('#262d3d'), SHIRT = hex('#eceef2'), TROUSERS = hex('#1f2638'), SHOES = hex('#5a2f1c'), HAIR = hex('#17110e')
// Light, warm-neutral tone: reads clearly against the dark scene without looking pale.
const SKIN = hex('#e3b896')

// Top: shirt islands → white cotton (keep only soft shading); coat → navy blazer.
{
  const tex = mat('Wolf3D_Outfit_Top').getBaseColorTexture()
  const size = (await sharp(Buffer.from(tex.getImage())).metadata()).width
  const map = labelMap(topNode, size, topLabel)
  await editTexture(tex, (d) => {
    for (let i = 0, px = 0; i < d.length; i += 3, px++) {
      if (map[px] === 1) {
        const l = Math.min(1.06, Math.max(0.86, Math.pow(lum(d[i], d[i + 1], d[i + 2]) / 170, 0.12)))
        d[i] = clamp(SHIRT[0] * l); d[i + 1] = clamp(SHIRT[1] * l); d[i + 2] = clamp(SHIRT[2] * l)
      } else tint(d, i, BLAZER, 150, 0.8)
    }
  })
}

// Trousers → navy (belt stays dark, buckle stays metallic).
await editTexture(mat('Wolf3D_Outfit_Bottom').getBaseColorTexture(), (d) => {
  for (let i = 0; i < d.length; i += 3) {
    const [h, s, v] = rgb2hsv(d[i], d[i + 1], d[i + 2])
    const fabric = (h < 40 || h > 300) && s > 0.12 && v > 0.35
    if (fabric) tint(d, i, TROUSERS, 165, 0.9)
  }
})

// Shoes → brown leather.
await editTexture(mat('Wolf3D_Outfit_Footwear').getBaseColorTexture(), (d) => {
  for (let i = 0; i < d.length; i += 3) tint(d, i, SHOES, 70, 0.9)
})

// Skin: warmer, deeper tone + short beard and moustache + dark scalp hair.
const skinTex = mat('Wolf3D_Head').getBaseColorTexture()
await editTexture(skinTex, (d, w, hgt) => {
  const noise = (x, y) => { const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453; return s - Math.floor(s) }
  for (let y = 0; y < hgt; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 3
      const u = x / w, v = y / hgt
      // Calibrated against the texture: brows v≈0.26–0.31, eyes 0.31, nostrils 0.42, lips 0.465–0.505,
      // chin 0.62, ears at u≈0.20 / 0.80 (v 0.29–0.43). Face centre line u = 0.5.
      const isBrow = v > 0.255 && v < 0.312 && Math.abs(u - 0.5) > 0.03 && Math.abs(u - 0.5) < 0.16 && lum(d[i], d[i + 1], d[i + 2]) < 105
      if (isBrow) { tint(d, i, HAIR, 70, 0.7); continue }
      tint(d, i, SKIN, 200, 0.85)

      const ax = Math.abs(u - 0.5)
      const mix = (a) => { d[i] = d[i] * (1 - a) + HAIR[0] * a; d[i + 1] = d[i + 1] * (1 - a) + HAIR[1] * a; d[i + 2] = d[i + 2] * (1 - a) + HAIR[2] * a }

      // Short boxed beard: from the mouth corners up to the sideburns, down to a neat neckline.
      const top = 0.472 - Math.max(0, ax - 0.09) * 0.42
      const jaw = Math.hypot((u - 0.5) / 0.3, (v - 0.4) / 0.225)
      const below = smooth(top - 0.012, top + 0.012, v)
      const inside = smooth(1.02, 0.95, jaw)
      const lips = smooth(1, 0.75, Math.hypot((u - 0.5) / 0.078, (v - 0.486) / 0.021))
      const moustache = smooth(1, 0.7, Math.hypot((u - 0.5) / 0.088, (v - 0.452) / 0.017))
      const beard = Math.max(below * inside * (1 - lips), moustache)
      if (beard > 0.01) mix(beard * (0.42 + 0.3 * noise(x, y)))

      // Hairline (measured from the mesh): front y≈1.795 → v≈0.20; above the ears v≈0.28;
      // behind the ears it drops to the nape (v≈0.40). Short sideburns in front of the ears.
      const scalp = Math.max(smooth(hairlineV(ax) + 0.01, hairlineV(ax) - 0.01, v),
        ax > 0.226 && ax < 0.252 && v < 0.4 ? smooth(0.4, 0.37, v) * 0.6 : 0)
      if (scalp > 0.01) mix(Math.min(1, scalp * (0.9 + 0.1 * noise(x * 0.5, y))))
    }
  }
})
// Hands/body use a 2×2 solid texture — tint it to the same skin tone.
await editTexture(mat('Wolf3D_Body').getBaseColorTexture(), (d) => {
  for (let i = 0; i < d.length; i += 3) tint(d, i, SKIN, 200, 0.85)
})

await doc.transform(
  prune(),
  dedup(),
  unpartition(),
  // WebP textures: same quality at roughly half the download size.
  textureCompress({ encoder: sharp, targetFormat: 'webp', quality: 86, resize: [1024, 1024] }),
)
await io.write(OUT, doc)
console.log('wrote', OUT)

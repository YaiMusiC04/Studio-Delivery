// Generates icon-192.png, icon-512.png, apple-touch-icon.png in public/
const { deflateSync } = require('zlib')
const { writeFileSync } = require('fs')
const path = require('path')

const crcTable = (() => {
  const t = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[i] = c >>> 0
  }
  return t
})()
function crc32(buf) {
  let c = 0xffffffff
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const t = Buffer.from(type, 'ascii')
  const d = Buffer.isBuffer(data) ? data : Buffer.from(data)
  const len = Buffer.allocUnsafe(4); len.writeUInt32BE(d.length)
  const crcVal = Buffer.allocUnsafe(4); crcVal.writeUInt32BE(crc32(Buffer.concat([t, d])))
  return Buffer.concat([len, t, d, crcVal])
}
function makePNG(size) {
  const S = size
  // RGBA pixels row by row
  const raw = []
  for (let y = 0; y < S; y++) {
    raw.push(0) // filter none
    for (let x = 0; x < S; x++) {
      const [r, g, b, a] = pixel(x, y, S)
      raw.push(r, g, b, a)
    }
  }
  const sig = Buffer.from([137,80,78,71,13,10,26,10])
  const ihdr = Buffer.allocUnsafe(13)
  ihdr.writeUInt32BE(S, 0); ihdr.writeUInt32BE(S, 4)
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0
  const compressed = deflateSync(Buffer.from(raw), { level: 9 })
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))])
}

// Icon design: rounded green square + white calorie flame
function pixel(x, y, S) {
  const BG = [34, 197, 94, 255]   // #22C55E green
  const WHITE = [255, 255, 255, 255]
  const TRANS = [0, 0, 0, 0]

  const radius = S * 0.22  // corner radius
  // rounded rect test
  function inRoundedRect(px, py) {
    const margin = 0
    const r = radius
    const x0 = margin, y0 = margin, x1 = S - margin, y1 = S - margin
    if (px < x0 || px > x1 || py < y0 || py > y1) return false
    const corners = [[x0+r,y0+r],[x1-r,y0+r],[x1-r,y1-r],[x0+r,y1-r]]
    for (const [cx,cy] of corners) {
      if (Math.abs(px-x0)<r+1 || Math.abs(px-x1)<r+1) {
        if (Math.abs(py-y0)<r+1 || Math.abs(py-y1)<r+1) {
          const dx = px-(px<S/2?x0+r:x1-r)
          const dy = py-(py<S/2?y0+r:y1-r)
          if (dx*dx+dy*dy > r*r) return false
        }
      }
    }
    return true
  }

  if (!inRoundedRect(x, y)) return TRANS

  // Flame shape in normalized 0..1 coords centered
  const nx = (x / S - 0.5) * 2   // -1..1
  const ny = (y / S - 0.5) * 2   // -1..1 (top = -1)

  // Outer flame: a teardrop pointing up
  function inFlame(fx, fy) {
    // Flame centered at 0, spanning roughly -0.55..0.55 wide, -0.7..0.55 tall
    const ox = fx, oy = fy - 0.05  // shift slightly down
    // Simple parametric flame: wide at bottom, narrows to point at top
    const bottom = 0.55, top = -0.68
    if (oy < top || oy > bottom) return false
    // width at this oy level
    const t = (oy - top) / (bottom - top)   // 0 at top, 1 at bottom
    // Flame is wider in lower 2/3, tapers at top
    const halfW = 0.38 * Math.sqrt(t) * (1 - Math.pow(1-t, 3) * 0.3)
    return Math.abs(ox) <= halfW
  }

  function inInnerFlame(fx, fy) {
    const ox = fx, oy = fy + 0.08
    const bottom = 0.45, top = -0.35
    if (oy < top || oy > bottom) return false
    const t = (oy - top) / (bottom - top)
    const halfW = 0.20 * Math.sqrt(t) * (1 - Math.pow(1-t, 3) * 0.4)
    return Math.abs(ox) <= halfW
  }

  if (inInnerFlame(nx, ny)) return BG
  if (inFlame(nx, ny)) return WHITE

  return BG
}

const out = path.join(__dirname, 'public')
writeFileSync(path.join(out, 'icon-192.png'), makePNG(192))
writeFileSync(path.join(out, 'icon-512.png'), makePNG(512))
writeFileSync(path.join(out, 'apple-touch-icon.png'), makePNG(180))
console.log('Icons generated.')

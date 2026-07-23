import sharp from 'sharp'
import { writeFileSync } from 'node:fs'

const EMBLEM = 'public/emblema-barrete.png'
const GREEN = { r: 27, g: 94, b: 63, alpha: 1 } // #1B5E3F
const STAR = '#154F35'

function starBgSvg(size) {
  const cells = 5
  const step = size / cells
  const starR = step * 0.22
  let stars = ''
  for (let row = 0; row < cells; row++) {
    for (let col = 0; col < cells; col++) {
      const cx = (col + 0.5) * step
      const cy = (row + 0.5) * step
      stars += `<path d="${starPath(cx, cy, starR)}" fill="${STAR}" fill-opacity="0.55"/>`
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#1B5E3F"/>
  ${stars}
</svg>`
}

function starPath(cx, cy, r) {
  const pts = []
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5
    const b = a + Math.PI / 5
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r])
    pts.push([cx + Math.cos(b) * r * 0.4, cy + Math.sin(b) * r * 0.4])
  }
  return `M${pts.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join('L')}Z`
}

async function emblemTransparent() {
  const { data, info } = await sharp(EMBLEM)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    // fundo branco → transparente
    if (r > 245 && g > 245 && b > 245) {
      data[i + 3] = 0
    }
  }

  return sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  }).png()
}

async function makeIcon(size, out, padRatio = 0.12) {
  const bg = Buffer.from(starBgSvg(size))
  const pad = Math.round(size * padRatio)
  const inner = size - pad * 2

  const emblem = await (await emblemTransparent())
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()

  await sharp(bg)
    .composite([{ input: emblem, gravity: 'centre' }])
    .png()
    .toFile(out)

  console.log('wrote', out)
}

async function main() {
  await makeIcon(192, 'public/icon-192.png', 0.1)
  await makeIcon(512, 'public/icon-512.png', 0.1)
  await makeIcon(180, 'public/apple-touch-icon.png', 0.1)
  await makeIcon(32, 'public/favicon.png', 0.08)

  // favicon.svg simples: referência visual alinhada (verde + nota)
  writeFileSync(
    'public/favicon.svg',
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="6" fill="#1B5E3F"/>
  <path fill="#154F35" d="M8 7l1.1 3.4H13l-2.7 2 1 3.4L8 13.6 4.7 15.8l1-3.4-2.7-2h3.9L8 7zm16 0l1.1 3.4H29l-2.7 2 1 3.4L24 13.6l-3.3 2.2 1-3.4-2.7-2h3.9L24 7zM16 14l1.5 4.6H22l-3.6 2.6 1.4 4.5L16 22.8l-3.8 2.9 1.4-4.5-3.6-2.6h4.5L16 14z"/>
  <path fill="#2E8B57" stroke="#111" stroke-width="0.4" d="M10 22c0-5 2.5-9 6-11 1.5 4 4 7 4 11 0 1.5-1 2.5-2.5 2.5h-5C11 24.5 10 23.5 10 22z"/>
  <rect x="10" y="21.2" width="10" height="2.6" rx="0.4" fill="#C0392B" stroke="#111" stroke-width="0.3"/>
</svg>
`
  )
  console.log('wrote public/favicon.svg')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

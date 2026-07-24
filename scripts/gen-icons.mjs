import sharp from 'sharp'
import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const MARK = path.join(root, 'public', 'mark.svg')
const GREEN = '#1B5E3F'

async function renderMark(size, out) {
  await sharp(MARK, { density: 300 })
    .resize(size, size, { fit: 'contain', background: { r: 27, g: 94, b: 63, alpha: 1 } })
    .png()
    .toFile(out)
  console.log('wrote', path.relative(root, out))
}

async function main() {
  await renderMark(1024, path.join(root, 'public', 'app-icon.png'))
  await renderMark(512, path.join(root, 'public', 'icon-512.png'))
  await renderMark(192, path.join(root, 'public', 'icon-192.png'))
  await renderMark(180, path.join(root, 'public', 'apple-touch-icon.png'))
  await renderMark(32, path.join(root, 'public', 'favicon.png'))

  const pad = Math.round(512 * 0.12)
  const inner = 512 - pad * 2
  const logo = await sharp(MARK, { density: 300 })
    .resize(inner, inner, {
      fit: 'contain',
      background: { r: 27, g: 94, b: 63, alpha: 1 },
    })
    .png()
    .toBuffer()
  await sharp({
    create: { width: 512, height: 512, channels: 3, background: GREEN },
  })
    .composite([{ input: logo, gravity: 'centre' }])
    .png()
    .toFile(path.join(root, 'public', 'icon-512-maskable.png'))
  console.log('wrote public/icon-512-maskable.png')

  writeFileSync(
    path.join(root, 'public', 'favicon.svg'),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="6" fill="#1B5E3F"/>
  <text x="16" y="15.5" text-anchor="middle" font-family="Georgia,serif" font-size="11" font-weight="700" fill="#E8A13A">BV</text>
  <text x="16" y="24" text-anchor="middle" font-family="Georgia,serif" font-size="5.5" font-weight="600" fill="#E8A13A" opacity="0.95">2026</text>
</svg>
`
  )
  console.log('wrote public/favicon.svg')

  const sizes = [16, 32, 48]
  const tmpPngs = []
  for (const s of sizes) {
    const p = path.join(root, 'public', `favicon-${s}.tmp.png`)
    await renderMark(s, p)
    tmpPngs.push(p)
  }
  try {
    const { default: pngToIco } = await import('png-to-ico')
    const buf = await pngToIco(tmpPngs)
    writeFileSync(path.join(root, 'public', 'favicon.ico'), buf)
    console.log('wrote public/favicon.ico')
  } catch (err) {
    console.warn('png-to-ico unavailable:', err.message)
  }

  const { unlinkSync } = await import('node:fs')
  for (const p of tmpPngs) {
    try {
      unlinkSync(p)
    } catch {
      /* ignore */
    }
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

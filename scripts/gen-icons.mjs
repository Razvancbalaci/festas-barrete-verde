import sharp from 'sharp'
import { writeFileSync } from 'node:fs'

/** Fonte: app-icon.png (emblema no fundo verde com estrelas) */
const SRC = 'public/app-icon.png'
const GREEN = '#1B5E3F'

async function resize(size, out) {
  await sharp(SRC).resize(size, size, { fit: 'cover' }).png().toFile(out)
  console.log('wrote', out)
}

async function main() {
  await resize(512, 'public/icon-512.png')
  await resize(192, 'public/icon-192.png')
  await resize(180, 'public/apple-touch-icon.png')
  await resize(32, 'public/favicon.png')

  const pad = Math.round(512 * 0.1)
  const inner = 512 - pad * 2
  const logo = await sharp(SRC).resize(inner, inner, { fit: 'cover' }).png().toBuffer()
  await sharp({
    create: { width: 512, height: 512, channels: 3, background: GREEN },
  })
    .composite([{ input: logo, gravity: 'centre' }])
    .png()
    .toFile('public/icon-512-maskable.png')
  console.log('wrote public/icon-512-maskable.png')

  writeFileSync(
    'public/favicon.svg',
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="6" fill="#1B5E3F"/>
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

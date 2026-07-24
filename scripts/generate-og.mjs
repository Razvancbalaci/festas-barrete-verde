import sharp from 'sharp'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const publicDir = path.join(__dirname, '..', 'public')
const mark = path.join(publicDir, 'mark.svg')
const out = path.join(publicDir, 'og-image.png')

const W = 1200
const H = 630

const svg = Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1B5E3F"/>
      <stop offset="55%" stop-color="#2E7D53"/>
      <stop offset="100%" stop-color="#1B5E3F"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#g)"/>
  <rect x="48" y="48" width="${W - 96}" height="${H - 96}" rx="24" fill="none" stroke="#E8A13A" stroke-opacity="0.45" stroke-width="2"/>
  <text x="620" y="250" font-family="Georgia, serif" font-size="52" font-weight="700" fill="#FAF8F2">Festas do Barrete Verde</text>
  <text x="620" y="320" font-family="Georgia, serif" font-size="42" font-weight="700" fill="#FAF8F2">e das Salinas 2026</text>
  <text x="620" y="400" font-family="Arial, sans-serif" font-size="28" fill="#E8A13A">Alcochete · 7 a 13 de Agosto</text>
  <text x="620" y="460" font-family="Arial, sans-serif" font-size="22" fill="#FAF8F2" fill-opacity="0.85">Programa · Mapa · Comércio</text>
</svg>`)

let image = sharp(svg)

if (fs.existsSync(mark)) {
  const logo = await sharp(mark, { density: 300 })
    .resize(280, 280, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer()
  image = sharp(svg).composite([{ input: logo, left: 100, top: 175 }])
}

await image.png().toFile(out)
console.log('Wrote', out, fs.statSync(out).size, 'bytes')

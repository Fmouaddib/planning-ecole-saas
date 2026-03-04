/**
 * Generate PWA icons from SVG template using sharp
 * Run: node scripts/generate-pwa-icons.mjs
 */
import sharp from 'sharp'
import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PUBLIC = join(__dirname, '..', 'public')

// SVG template: gradient background with "A" letter (matching sidebar branding)
function createSvg(size, maskable = false) {
  const padding = maskable ? Math.round(size * 0.1) : 0
  const innerSize = size - padding * 2
  const fontSize = Math.round(innerSize * 0.55)
  const cx = size / 2
  const cy = size / 2

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#FF5B46"/>
      <stop offset="100%" style="stop-color:#FBA625"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${maskable ? 0 : Math.round(size * 0.15)}" fill="url(#grad)"/>
  <text x="${cx}" y="${cy}" font-family="Inter, -apple-system, BlinkMacSystemFont, sans-serif" font-size="${fontSize}" font-weight="700" fill="white" text-anchor="middle" dominant-baseline="central">A</text>
</svg>`
}

const icons = [
  { name: 'pwa-192x192.png', size: 192, maskable: false },
  { name: 'pwa-512x512.png', size: 512, maskable: false },
  { name: 'pwa-maskable-192x192.png', size: 192, maskable: true },
  { name: 'pwa-maskable-512x512.png', size: 512, maskable: true },
  { name: 'apple-touch-icon-180x180.png', size: 180, maskable: false },
  { name: 'favicon-32x32.png', size: 32, maskable: false },
]

mkdirSync(PUBLIC, { recursive: true })

for (const icon of icons) {
  const svg = createSvg(icon.size, icon.maskable)
  const buffer = await sharp(Buffer.from(svg)).png().toBuffer()
  const outPath = join(PUBLIC, icon.name)
  writeFileSync(outPath, buffer)
  console.log(`✓ ${icon.name} (${icon.size}x${icon.size})`)
}

console.log('\nAll PWA icons generated!')

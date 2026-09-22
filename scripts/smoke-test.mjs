import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { assemblePackage } from '../packages/assembler/dist/index.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const manifestPath = join(root, 'packages/mock-component-library/components.manifest.json')
const libraryRoot = join(root, 'packages/mock-component-library')
const outputDir = join(root, 'packages/assembler/.smoke-out')

if (!existsSync(manifestPath)) {
  console.error('Manifest missing. Run pnpm build:lib first.')
  process.exit(1)
}

const result = assemblePackage({
  manifestPath,
  libraryRoot,
  selectedComponents: ['OrderTable'],
  outputDir,
  packageName: '@smoke/biz-kit',
  customerName: 'Smoke Test',
  orderId: 'smoke-001',
})

const pkg = JSON.parse(readFileSync(join(outputDir, 'package.json'), 'utf8'))
const watermark = JSON.parse(readFileSync(join(outputDir, 'WATERMARK.json'), 'utf8'))

if (!result.closure.resolved.includes('Button')) {
  throw new Error('Expected Button in closure for OrderTable')
}
if (!result.closure.resolved.includes('Pagination')) {
  throw new Error('Expected Pagination in closure for OrderTable')
}
if (!existsSync(join(outputDir, 'dist/OrderTable/index.js'))) {
  throw new Error('Missing assembled OrderTable artifact')
}
if (watermark.fingerprint !== result.fingerprint) {
  throw new Error('Watermark fingerprint mismatch')
}

console.log('Smoke test passed')
console.log(`Resolved: ${result.closure.resolved.join(', ')}`)
console.log(`Package: ${pkg.name}@${pkg.version}`)

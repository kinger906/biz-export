import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export const repoRoot = join(__dirname, '../../..')
export const manifestPath = join(repoRoot, 'packages/mock-component-library/components.manifest.json')
export const libraryRoot = join(repoRoot, 'packages/mock-component-library')
export const storageDir = join(repoRoot, 'packages/export-api/storage')
export const dataDir = join(repoRoot, 'packages/export-api/data')
export const ordersFile = join(dataDir, 'orders.json')
export const tokensFile = join(dataDir, 'tokens.json')
export const apiToken = process.env.BIZ_EXPORT_API_TOKEN ?? 'dev-admin-token'

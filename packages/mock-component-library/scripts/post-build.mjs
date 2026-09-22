import { copyFileSync, cpSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const dist = join(root, 'dist')

mkdirSync(join(dist, 'theme'), { recursive: true })
copyFileSync(join(root, 'src/theme/tokens.css'), join(dist, 'theme/tokens.css'))

if (existsSync(join(dist, 'BizShared/index.js'))) {
  mkdirSync(join(dist, 'shared'), { recursive: true })
  cpSync(join(dist, 'BizShared'), join(dist, 'shared'), { recursive: true })
}

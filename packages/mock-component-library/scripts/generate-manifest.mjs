import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))

/** @type {Record<string, { deps: string[], tags: string[], description: string, requiresTheme?: boolean, requiresShared?: boolean }>} */
const registry = {
  Button: {
    deps: ['@biz/shared'],
    tags: ['基础', '按钮'],
    description: '通用业务按钮',
    requiresTheme: true,
    requiresShared: true,
  },
  Pagination: {
    deps: ['@biz/shared'],
    tags: ['基础', '分页'],
    description: '分页控件',
    requiresTheme: true,
    requiresShared: true,
  },
  OrderTable: {
    deps: ['Button', 'Pagination', '@biz/shared'],
    tags: ['订单', '表格'],
    description: '订单表格，依赖 Button 与 Pagination',
    requiresTheme: true,
    requiresShared: true,
  },
  UserCard: {
    deps: ['Button', '@biz/shared'],
    tags: ['用户', '卡片'],
    description: '用户信息卡片',
    requiresTheme: true,
    requiresShared: true,
  },
}

const manifest = {
  library: '@biz/mock-component-library',
  version: pkg.version,
  buildId: `build-${Date.now()}`,
  generatedAt: new Date().toISOString(),
  peerDependencies: {
    vue: '^3.4.0',
  },
  shared: {
    id: '@biz/shared',
    entry: 'shared/index.js',
    types: 'shared/index.d.ts',
  },
  theme: {
    id: '@biz/theme',
    styles: ['theme/tokens.css'],
  },
  components: Object.entries(registry).map(([name, meta]) => {
    const distDir = join(root, 'dist', name)
    const styles = existsSync(join(distDir, 'style.css')) ? [`dist/${name}/style.css`] : []
    return {
      name,
      version: pkg.version,
      entry: `dist/${name}/index.js`,
      types: `dist/${name}/index.d.ts`,
      styles,
      deps: meta.deps,
      peerDependencies: { vue: '^3.4.0' },
      tags: meta.tags,
      description: meta.description,
      requiresTheme: meta.requiresTheme ?? false,
      requiresShared: meta.requiresShared ?? false,
      preview: `previews/${name}.png`,
    }
  }),
}

writeFileSync(join(root, 'components.manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
console.log(`Manifest written with ${manifest.components.length} components`)

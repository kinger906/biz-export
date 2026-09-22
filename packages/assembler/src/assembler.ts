import { createHash } from 'node:crypto'
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { basename, dirname, join } from 'node:path'
import archiver from 'archiver'
import { createWriteStream } from 'node:fs'
import { resolveClosure } from './closure.js'
import { loadManifest } from './manifest.js'
import type { AssembleOptions, AssembleResult, LibraryManifest } from './types.js'

function mergePeerDependencies(manifest: LibraryManifest, componentNames: string[]) {
  const merged: Record<string, string> = { ...manifest.peerDependencies }
  for (const name of componentNames) {
    const entry = manifest.components.find((item) => item.name === name)
    if (!entry) continue
    for (const [key, value] of Object.entries(entry.peerDependencies)) {
      merged[key] = value
    }
  }
  return merged
}

function copyIfExists(from: string, to: string) {
  if (!existsSync(from)) {
    throw new Error(`Missing artifact: ${from}`)
  }
  mkdirSync(dirname(to), { recursive: true })
  copyFileSync(from, to)
}

function copyDirIfExists(from: string, to: string) {
  if (!existsSync(from)) {
    throw new Error(`Missing artifact directory: ${from}`)
  }
  cpSync(from, to, { recursive: true })
}

function buildFingerprint(input: {
  buildId: string
  selected: string[]
  resolved: string[]
  customerId?: string
  orderId?: string
}) {
  const hash = createHash('sha256')
  hash.update(
    JSON.stringify({
      buildId: input.buildId,
      selected: input.selected,
      resolved: input.resolved,
      customerId: input.customerId ?? '',
      orderId: input.orderId ?? '',
    }),
  )
  return hash.digest('hex').slice(0, 16)
}

export function assemblePackage(options: AssembleOptions): AssembleResult {
  const manifest = loadManifest(options.manifestPath)
  const closure = resolveClosure(manifest, options.selectedComponents)
  const libraryRoot = options.libraryRoot
  const outputDir = options.outputDir

  if (existsSync(outputDir)) {
    rmSync(outputDir, { recursive: true, force: true })
  }
  mkdirSync(outputDir, { recursive: true })

  const distOut = join(outputDir, 'dist')
  mkdirSync(distOut, { recursive: true })

  for (const name of closure.resolved) {
    const entry = manifest.components.find((item) => item.name === name)
    if (!entry) continue

    const componentDist = join(distOut, name)
    mkdirSync(componentDist, { recursive: true })

    copyIfExists(join(libraryRoot, entry.entry), join(componentDist, 'index.js'))
    if (existsSync(join(libraryRoot, entry.types))) {
      copyIfExists(join(libraryRoot, entry.types), join(componentDist, 'index.d.ts'))
    }
    for (const style of entry.styles) {
      const styleName = basename(style)
      copyIfExists(join(libraryRoot, style), join(componentDist, styleName))
    }
  }

  if (closure.includesShared) {
    const sharedSrc = join(libraryRoot, 'dist/shared')
    copyDirIfExists(sharedSrc, join(distOut, 'shared'))
  }

  if (closure.includesTheme) {
    const themeOut = join(distOut, 'theme')
    mkdirSync(themeOut, { recursive: true })
    for (const style of manifest.theme.styles) {
      copyIfExists(join(libraryRoot, 'dist', style), join(themeOut, basename(style)))
    }
  }

  const importLines = closure.resolved.map(
    (name) => `import { ${name} } from './${name}/index.js'`,
  )
  const exportLines = closure.resolved.map((name) => `export { ${name} }`)
  const typeLines = closure.resolved.map(
    (name) => `export type * from './${name}/index.d.ts'`,
  )

  const indexJs = [
    ...importLines,
    '',
    ...exportLines,
    '',
    'const components = {',
    ...closure.resolved.map((name) => `  ${name},`),
    '};',
    '',
    'export default {',
    '  install(app) {',
    ...closure.resolved.map((name) => `    app.component('${name}', ${name});`),
    '  },',
    '  ...components,',
    '};',
  ].join('\n')

  const indexDts = [
    "import type { Plugin } from 'vue'",
    ...typeLines,
    '',
    'declare const plugin: Plugin',
    'export default plugin',
  ].join('\n')

  writeFileSync(join(outputDir, 'dist/index.js'), `${indexJs}\n`, 'utf8')
  writeFileSync(join(outputDir, 'dist/index.d.ts'), `${indexDts}\n`, 'utf8')

  const styleImports = closure.resolved
    .flatMap((name) => {
      const entry = manifest.components.find((item) => item.name === name)
      return (entry?.styles ?? []).map(() => `import './${name}/style.css'`)
    })
    .concat(closure.includesTheme ? ["import './theme/tokens.css'"] : [])

  writeFileSync(join(outputDir, 'dist/style.css'), '/* assembled styles are imported via dist/index.css */\n')
  writeFileSync(
    join(outputDir, 'dist/index.css'),
    `${styleImports.join('\n')}\n`,
    'utf8',
  )

  const packageName = options.packageName ?? '@customer/biz-kit'
  const version = options.version ?? manifest.version
  const fingerprint = buildFingerprint({
    buildId: manifest.buildId,
    selected: closure.selected,
    resolved: closure.resolved,
    customerId: options.customerId,
    orderId: options.orderId,
  })

  const packageJson = {
    name: packageName,
    version,
    description: `Custom business component kit assembled from ${manifest.library}`,
    type: 'module',
    main: './dist/index.js',
    module: './dist/index.js',
    types: './dist/index.d.ts',
    exports: {
      '.': {
        import: './dist/index.js',
        types: './dist/index.d.ts',
      },
      './style.css': './dist/index.css',
      ...Object.fromEntries(
        closure.resolved.map((name) => [
          `./${name}`,
          {
            import: `./dist/${name}/index.js`,
            types: `./dist/${name}/index.d.ts`,
          },
        ]),
      ),
    },
    files: ['dist', 'README.md', 'LICENSE', 'WATERMARK.json'],
    peerDependencies: mergePeerDependencies(manifest, closure.resolved),
    bizExport: {
      sourceLibrary: manifest.library,
      sourceVersion: manifest.version,
      buildId: manifest.buildId,
      selected: closure.selected,
      resolved: closure.resolved,
      fingerprint,
      customerName: options.customerName ?? 'Unknown',
      customerId: options.customerId ?? null,
      orderId: options.orderId ?? null,
      generatedAt: new Date().toISOString(),
    },
  }

  writeFileSync(join(outputDir, 'package.json'), `${JSON.stringify(packageJson, null, 2)}\n`, 'utf8')

  const readme = [
    `# ${packageName}`,
    '',
    `Assembled from **${manifest.library}@${manifest.version}**`,
    '',
    '## Included components',
    ...closure.resolved.map((name) => `- ${name}`),
    '',
    '## Install',
    '',
    '```bash',
    'npm install ./your-package-folder',
    '```',
    '',
    '## Usage',
    '',
    '```ts',
    "import { createApp } from 'vue'",
    `import { ${closure.resolved.join(', ')} } from '${packageName}'`,
    `import '${packageName}/style.css'`,
    '',
    'const app = createApp(App)',
    `// app.component('${closure.resolved[0]}', ${closure.resolved[0]})`,
    '```',
    '',
    'Or global install:',
    '',
    '```ts',
    `import BizKit from '${packageName}'`,
    'app.use(BizKit)',
    '```',
    '',
    '## Peer dependencies',
    ...Object.entries(packageJson.peerDependencies as Record<string, string>).map(
      ([name, range]) => `- ${name}: ${range}`,
    ),
  ].join('\n')

  writeFileSync(join(outputDir, 'README.md'), `${readme}\n`, 'utf8')

  const license = [
    'PROPRIETARY LICENSE',
    '',
    `Customer: ${options.customerName ?? 'Unknown'}`,
    `Order ID: ${options.orderId ?? 'N/A'}`,
    `Fingerprint: ${fingerprint}`,
    '',
    'Redistribution is prohibited without written permission.',
  ].join('\n')
  writeFileSync(join(outputDir, 'LICENSE'), `${license}\n`, 'utf8')

  writeFileSync(
    join(outputDir, 'WATERMARK.json'),
    `${JSON.stringify(packageJson.bizExport, null, 2)}\n`,
    'utf8',
  )

  return {
    outputDir,
    closure,
    packageJson,
    fingerprint,
  }
}

export async function createZip(sourceDir: string, zipPath: string): Promise<string> {
  await new Promise<void>((resolve, reject) => {
    const output = createWriteStream(zipPath)
    const archive = archiver('zip', { zlib: { level: 9 } })

    output.on('close', () => resolve())
    archive.on('error', reject)

    archive.pipe(output)
    archive.directory(sourceDir, false)
    archive.finalize()
  })

  return zipPath
}

export async function assembleAndZip(
  options: AssembleOptions & { zipPath?: string },
): Promise<AssembleResult & { zipPath: string }> {
  const result = assemblePackage(options)
  const zipPath = options.zipPath ?? join(options.outputDir, '..', `${basename(options.outputDir)}.zip`)
  mkdirSync(dirname(zipPath), { recursive: true })
  await createZip(result.outputDir, zipPath)
  return { ...result, zipPath }
}

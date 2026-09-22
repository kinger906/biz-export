import { rmSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'vite'
import vue from '@vitejs/plugin-vue'
import dts from 'vite-plugin-dts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const dist = join(root, 'dist')

const components = ['Button', 'Pagination', 'OrderTable', 'UserCard', 'BizShared']

rmSync(dist, { recursive: true, force: true })
mkdirSync(dist, { recursive: true })

for (const name of components) {
  await build({
    configFile: false,
    root,
    plugins: [
      vue(),
      dts({
        entryRoot: 'src/components',
        outDir: 'dist',
        rollupTypes: false,
        include: [`src/components/${name}/**/*`],
      }),
    ],
    build: {
      cssCodeSplit: false,
      lib: {
        entry: join(root, `src/components/${name}/index.ts`),
        formats: ['es'],
        fileName: () => 'index.js',
      },
      rollupOptions: {
        external: ['vue'],
        output: {
          dir: join(dist, name),
          entryFileNames: 'index.js',
          assetFileNames: 'style.css',
        },
      },
      outDir: join(dist, name),
      emptyOutDir: true,
    },
  })
  console.log(`Built ${name}`)
}

console.log('All components built')

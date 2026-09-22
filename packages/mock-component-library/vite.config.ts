import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import dts from 'vite-plugin-dts'

const components = ['Button', 'Pagination', 'OrderTable', 'UserCard', 'BizShared']

export default defineConfig({
  plugins: [
    vue(),
    dts({
      entryRoot: 'src/components',
      outDir: 'dist',
      rollupTypes: false,
    }),
  ],
  build: {
    cssCodeSplit: true,
    lib: {
      entry: Object.fromEntries(
        components.map((name) => [
          name,
          resolve(__dirname, `src/components/${name}/index.ts`),
        ]),
      ),
      formats: ['es'],
      fileName: (_format, entryName) => `${entryName}/index.js`,
    },
    rollupOptions: {
      external: ['vue'],
      output: {
        assetFileNames: (assetInfo) => {
          const name = assetInfo.name ?? ''
          if (name.endsWith('.css')) {
            const match = name.match(/([^/\\]+)\.css$/)
            if (match) return `${match[1]}/style.css`
          }
          return 'assets/[name][extname]'
        },
      },
    },
    outDir: 'dist',
    emptyOutDir: true,
  },
})

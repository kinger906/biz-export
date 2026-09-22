import { readFileSync } from 'node:fs'
import type { LibraryManifest } from './types.js'

export function loadManifest(manifestPath: string): LibraryManifest {
  const raw = readFileSync(manifestPath, 'utf8')
  return JSON.parse(raw) as LibraryManifest
}

export function getComponentMap(manifest: LibraryManifest) {
  return new Map(manifest.components.map((item) => [item.name, item]))
}

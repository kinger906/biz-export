import type { ClosureResult, LibraryManifest } from './types.js'
import { getComponentMap } from './manifest.js'

const SHARED_ID = '@biz/shared'
const THEME_ID = '@biz/theme'

export function resolveClosure(
  manifest: LibraryManifest,
  selectedComponents: string[],
): ClosureResult {
  const componentMap = getComponentMap(manifest)
  const warnings: string[] = []
  const selected = [...new Set(selectedComponents)]

  for (const name of selected) {
    if (!componentMap.has(name)) {
      throw new Error(`Unknown component: ${name}`)
    }
  }

  const resolved = new Set<string>()
  const queue = [...selected]
  let includesShared = false
  let includesTheme = false

  while (queue.length > 0) {
    const current = queue.shift()!
    if (resolved.has(current)) continue
    resolved.add(current)

    const entry = componentMap.get(current)
    if (!entry) continue

    for (const dep of entry.deps) {
      if (dep === SHARED_ID) {
        includesShared = true
        continue
      }
      if (dep === THEME_ID) {
        includesTheme = true
        continue
      }
      if (!componentMap.has(dep)) {
        warnings.push(`Component ${current} depends on missing component ${dep}`)
        continue
      }
      if (!selected.includes(dep) && !resolved.has(dep)) {
        warnings.push(`Auto-including dependency ${dep} required by ${current}`)
      }
      queue.push(dep)
    }

    if (entry.requiresShared) includesShared = true
    if (entry.requiresTheme) includesTheme = true
  }

  return {
    selected,
    resolved: [...resolved].sort(),
    includesShared,
    includesTheme,
    warnings,
  }
}

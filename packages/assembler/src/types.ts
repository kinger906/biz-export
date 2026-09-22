export interface ComponentManifestEntry {
  name: string
  version: string
  entry: string
  types: string
  styles: string[]
  deps: string[]
  peerDependencies: Record<string, string>
  tags: string[]
  description: string
  requiresTheme?: boolean
  requiresShared?: boolean
  preview?: string
}

export interface LibraryManifest {
  library: string
  version: string
  buildId: string
  generatedAt: string
  peerDependencies: Record<string, string>
  shared: {
    id: string
    entry: string
    types: string
  }
  theme: {
    id: string
    styles: string[]
  }
  components: ComponentManifestEntry[]
}

export interface ClosureResult {
  selected: string[]
  resolved: string[]
  includesShared: boolean
  includesTheme: boolean
  warnings: string[]
}

export interface AssembleOptions {
  manifestPath: string
  libraryRoot: string
  selectedComponents: string[]
  outputDir: string
  packageName?: string
  customerName?: string
  customerId?: string
  orderId?: string
  version?: string
  includeInstallPlugin?: boolean
}

export interface AssembleResult {
  outputDir: string
  zipPath?: string
  closure: ClosureResult
  packageJson: Record<string, unknown>
  fingerprint: string
}

export interface ExportTaskInput {
  selectedComponents: string[]
  customerName: string
  customerId?: string
  packageName?: string
  version?: string
}

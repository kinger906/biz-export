const ADMIN_TOKEN = import.meta.env.VITE_ADMIN_TOKEN ?? 'dev-admin-token'

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init)
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    throw new Error(payload.error ?? `Request failed: ${response.status}`)
  }
  return response.json() as Promise<T>
}

export interface ComponentEntry {
  name: string
  version: string
  description: string
  tags: string[]
  deps: string[]
}

export interface ComponentsResponse {
  library: string
  version: string
  buildId: string
  components: ComponentEntry[]
}

export interface ClosurePreview {
  selected: string[]
  resolved: string[]
  includesShared: boolean
  includesTheme: boolean
  warnings: string[]
}

export interface ExportOrder {
  id: string
  customerName: string
  customerId: string
  packageName: string
  version: string
  selectedComponents: string[]
  resolvedComponents: string[]
  status: 'pending' | 'processing' | 'completed' | 'failed'
  fingerprint?: string
  downloadToken?: string
  error?: string
  createdAt: string
  completedAt?: string
}

export function fetchComponents() {
  return request<ComponentsResponse>('/api/components')
}

export function previewClosure(selectedComponents: string[]) {
  return request<ClosurePreview>('/api/closure-preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ selectedComponents }),
  })
}

export function createExportTask(payload: {
  selectedComponents: string[]
  customerName: string
  customerId?: string
  packageName?: string
  version?: string
}) {
  return request<ExportOrder>('/api/export-tasks', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-token': ADMIN_TOKEN,
    },
    body: JSON.stringify(payload),
  })
}

export function fetchOrders() {
  return request<ExportOrder[]>('/api/export-tasks', {
    headers: { 'x-admin-token': ADMIN_TOKEN },
  })
}

export function downloadUrl(token: string) {
  return `/api/download/${token}`
}

export function revokeToken(orderId: string) {
  return request<{ ok: boolean }>(`/api/export-tasks/${orderId}/revoke-token`, {
    method: 'POST',
    headers: { 'x-admin-token': ADMIN_TOKEN },
  })
}

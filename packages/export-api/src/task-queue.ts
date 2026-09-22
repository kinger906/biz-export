import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { nanoid } from 'nanoid'
import { assembleAndZip } from '@biz/assembler'
import { libraryRoot, manifestPath, storageDir } from './config.js'
import { getOrder, upsertOrder, saveToken, type ExportOrder } from './store.js'

const queue: string[] = []
let running = false

export function enqueueExport(orderId: string) {
  queue.push(orderId)
  void processQueue()
}

async function processQueue() {
  if (running) return
  running = true

  while (queue.length > 0) {
    const orderId = queue.shift()!
    await runExport(orderId)
  }

  running = false
}

async function runExport(orderId: string) {
  const order = getOrder(orderId)
  if (!order) return

  upsertOrder({ ...order, status: 'processing' })

  try {
    mkdirSync(storageDir, { recursive: true })
    const outputDir = join(storageDir, order.id)
    const zipPath = `${outputDir}.zip`
    const downloadToken = nanoid(32)

    const result = await assembleAndZip({
      manifestPath,
      libraryRoot,
      selectedComponents: order.selectedComponents,
      outputDir,
      packageName: order.packageName,
      customerName: order.customerName,
      customerId: order.customerId,
      orderId: order.id,
      version: order.version,
      zipPath,
    })

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    saveToken({
      token: downloadToken,
      orderId: order.id,
      customerId: order.customerId,
      expiresAt,
      revoked: false,
    })

    const completed: ExportOrder = {
      ...order,
      status: 'completed',
      fingerprint: result.fingerprint,
      outputDir: result.outputDir,
      zipPath: result.zipPath,
      downloadToken,
      resolvedComponents: result.closure.resolved,
      completedAt: new Date().toISOString(),
    }
    upsertOrder(completed)
  } catch (error) {
    upsertOrder({
      ...order,
      status: 'failed',
      error: error instanceof Error ? error.message : String(error),
      completedAt: new Date().toISOString(),
    })
  }
}

import { existsSync } from 'node:fs'
import { createReadStream } from 'node:fs'
import cors from 'cors'
import express from 'express'
import { nanoid } from 'nanoid'
import { loadManifest, resolveClosure } from '@biz/assembler'
import { apiToken, manifestPath } from './config.js'
import { enqueueExport } from './task-queue.js'
import {
  getOrder,
  getValidToken,
  readOrders,
  revokeToken,
  upsertOrder,
} from './store.js'

const app = express()
app.use(cors())
app.use(express.json())

function paramId(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value
}

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = req.header('x-admin-token')
  if (token !== apiToken) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  next()
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.get('/api/components', (_req, res) => {
  const manifest = loadManifest(manifestPath)
  res.json({
    library: manifest.library,
    version: manifest.version,
    buildId: manifest.buildId,
    components: manifest.components,
  })
})

app.post('/api/closure-preview', (req, res) => {
  try {
    const selected = Array.isArray(req.body?.selectedComponents)
      ? (req.body.selectedComponents as string[])
      : []
    const manifest = loadManifest(manifestPath)
    const closure = resolveClosure(manifest, selected)
    res.json(closure)
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : String(error) })
  }
})

app.post('/api/export-tasks', requireAdmin, (req, res) => {
  try {
    const selectedComponents = Array.isArray(req.body?.selectedComponents)
      ? (req.body.selectedComponents as string[])
      : []
    const customerName = String(req.body?.customerName ?? '').trim()
    const packageName = String(req.body?.packageName ?? '@customer/biz-kit').trim()
    const version = String(req.body?.version ?? '1.0.0').trim()
    const customerId = String(req.body?.customerId ?? nanoid(8)).trim()

    if (!customerName) {
      res.status(400).json({ error: 'customerName is required' })
      return
    }
    if (selectedComponents.length === 0) {
      res.status(400).json({ error: 'selectedComponents is required' })
      return
    }

    const manifest = loadManifest(manifestPath)
    const closure = resolveClosure(manifest, selectedComponents)

    const order = upsertOrder({
      id: nanoid(12),
      customerName,
      customerId,
      packageName,
      version,
      selectedComponents,
      resolvedComponents: closure.resolved,
      status: 'pending',
      createdAt: new Date().toISOString(),
    })

    enqueueExport(order.id)
    res.status(202).json(order)
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : String(error) })
  }
})

app.get('/api/export-tasks', requireAdmin, (_req, res) => {
  res.json(readOrders())
})

app.get('/api/export-tasks/:id', requireAdmin, (req, res) => {
  const order = getOrder(paramId(req.params.id))
  if (!order) {
    res.status(404).json({ error: 'Order not found' })
    return
  }
  res.json(order)
})

app.post('/api/export-tasks/:id/revoke-token', requireAdmin, (req, res) => {
  const order = getOrder(paramId(req.params.id))
  if (!order?.downloadToken) {
    res.status(404).json({ error: 'Token not found' })
    return
  }
  revokeToken(order.downloadToken)
  res.json({ ok: true })
})

app.get('/api/download/:token', (req, res) => {
  const record = getValidToken(paramId(req.params.token))
  if (!record) {
    res.status(403).json({ error: 'Invalid or expired token' })
    return
  }

  const order = getOrder(record.orderId)
  if (!order?.zipPath || !existsSync(order.zipPath)) {
    res.status(404).json({ error: 'Package not found' })
    return
  }

  res.setHeader('Content-Type', 'application/zip')
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${order.packageName.replace('@', '').replace('/', '-')}-${order.version}.zip"`,
  )
  createReadStream(order.zipPath).pipe(res)
})

const port = Number(process.env.PORT ?? 8787)
app.listen(port, () => {
  console.log(`Export API listening on http://localhost:${port}`)
})

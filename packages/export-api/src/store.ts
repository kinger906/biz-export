import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dataDir, ordersFile, tokensFile } from './config.js'

export type ExportTaskStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface ExportOrder {
  id: string
  customerName: string
  customerId: string
  packageName: string
  version: string
  selectedComponents: string[]
  resolvedComponents: string[]
  status: ExportTaskStatus
  fingerprint?: string
  outputDir?: string
  zipPath?: string
  downloadToken?: string
  error?: string
  createdAt: string
  completedAt?: string
}

export interface DownloadTokenRecord {
  token: string
  orderId: string
  customerId: string
  expiresAt: string
  revoked: boolean
}

function ensureDataFiles() {
  mkdirSync(dataDir, { recursive: true })
  if (!existsSync(ordersFile)) {
    writeFileSync(ordersFile, '[]\n', 'utf8')
  }
  if (!existsSync(tokensFile)) {
    writeFileSync(tokensFile, '[]\n', 'utf8')
  }
}

export function readOrders(): ExportOrder[] {
  ensureDataFiles()
  return JSON.parse(readFileSync(ordersFile, 'utf8')) as ExportOrder[]
}

export function writeOrders(orders: ExportOrder[]) {
  ensureDataFiles()
  writeFileSync(ordersFile, `${JSON.stringify(orders, null, 2)}\n`, 'utf8')
}

export function upsertOrder(order: ExportOrder) {
  const orders = readOrders()
  const index = orders.findIndex((item) => item.id === order.id)
  if (index >= 0) orders[index] = order
  else orders.unshift(order)
  writeOrders(orders)
  return order
}

export function getOrder(orderId: string) {
  return readOrders().find((item) => item.id === orderId)
}

export function readTokens(): DownloadTokenRecord[] {
  ensureDataFiles()
  return JSON.parse(readFileSync(tokensFile, 'utf8')) as DownloadTokenRecord[]
}

export function writeTokens(tokens: DownloadTokenRecord[]) {
  ensureDataFiles()
  writeFileSync(tokensFile, `${JSON.stringify(tokens, null, 2)}\n`, 'utf8')
}

export function saveToken(record: DownloadTokenRecord) {
  const tokens = readTokens()
  tokens.unshift(record)
  writeTokens(tokens)
  return record
}

export function getValidToken(token: string) {
  const record = readTokens().find((item) => item.token === token && !item.revoked)
  if (!record) return null
  if (new Date(record.expiresAt).getTime() < Date.now()) return null
  return record
}

export function revokeToken(token: string) {
  const tokens = readTokens()
  const index = tokens.findIndex((item) => item.token === token)
  if (index >= 0) {
    tokens[index].revoked = true
    writeTokens(tokens)
  }
}

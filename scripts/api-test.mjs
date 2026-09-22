const base = 'http://localhost:8787'
const adminToken = 'dev-admin-token'

async function main() {
  const health = await fetch(`${base}/api/health`).then((r) => r.json())
  console.log('health', health)

  const closure = await fetch(`${base}/api/closure-preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ selectedComponents: ['OrderTable'] }),
  }).then((r) => r.json())
  console.log('closure', closure)

  const task = await fetch(`${base}/api/export-tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-token': adminToken,
    },
    body: JSON.stringify({
      selectedComponents: ['OrderTable'],
      customerName: 'Acme Corp',
      customerId: 'acme-001',
      packageName: '@acme/biz-kit',
      version: '1.0.0',
    }),
  }).then((r) => r.json())
  console.log('task created', task.id, task.status)

  for (let i = 0; i < 10; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 500))
    const order = await fetch(`${base}/api/export-tasks/${task.id}`, {
      headers: { 'x-admin-token': adminToken },
    }).then((r) => r.json())
    console.log('status', order.status)
    if (order.status === 'completed' || order.status === 'failed') {
      if (order.status === 'failed') throw new Error(order.error)
      console.log('download token', order.downloadToken)
      console.log('fingerprint', order.fingerprint)
      const download = await fetch(`${base}/api/download/${order.downloadToken}`)
      console.log('download status', download.status, download.headers.get('content-type'))
      break
    }
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import {
  createExportTask,
  downloadUrl,
  fetchComponents,
  fetchOrders,
  previewClosure,
  revokeToken,
  type ClosurePreview,
  type ComponentEntry,
  type ExportOrder,
} from './api'

const components = ref<ComponentEntry[]>([])
const libraryMeta = ref({ library: '', version: '', buildId: '' })
const selected = ref<string[]>([])
const closure = ref<ClosurePreview | null>(null)
const orders = ref<ExportOrder[]>([])
const loading = ref(false)
const previewLoading = ref(false)
const message = ref('')
const error = ref('')

const customerName = ref('Acme Corp')
const customerId = ref('acme-001')
const packageName = ref('@acme/biz-kit')
const version = ref('1.0.0')

const selectedSet = computed(() => new Set(selected.value))

async function loadComponents() {
  const data = await fetchComponents()
  components.value = data.components
  libraryMeta.value = {
    library: data.library,
    version: data.version,
    buildId: data.buildId,
  }
}

async function loadOrders() {
  orders.value = await fetchOrders()
}

async function refreshPreview() {
  if (selected.value.length === 0) {
    closure.value = null
    return
  }
  previewLoading.value = true
  error.value = ''
  try {
    closure.value = await previewClosure(selected.value)
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
  } finally {
    previewLoading.value = false
  }
}

function toggleComponent(name: string) {
  if (selectedSet.value.has(name)) {
    selected.value = selected.value.filter((item) => item !== name)
  } else {
    selected.value = [...selected.value, name]
  }
}

async function submitExport() {
  loading.value = true
  message.value = ''
  error.value = ''
  try {
    const order = await createExportTask({
      selectedComponents: selected.value,
      customerName: customerName.value,
      customerId: customerId.value,
      packageName: packageName.value,
      version: version.value,
    })
    message.value = `导出任务已创建：${order.id}`
    await loadOrders()
    pollOrder(order.id)
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
  } finally {
    loading.value = false
  }
}

async function pollOrder(orderId: string) {
  for (let i = 0; i < 20; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 1000))
    await loadOrders()
    const order = orders.value.find((item) => item.id === orderId)
    if (order && (order.status === 'completed' || order.status === 'failed')) {
      return
    }
  }
}

async function handleRevoke(orderId: string) {
  await revokeToken(orderId)
  message.value = '下载令牌已吊销'
  await loadOrders()
}

watch(selected, refreshPreview, { deep: true })

onMounted(async () => {
  try {
    await loadComponents()
    await loadOrders()
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
  }
})
</script>

<template>
  <div class="page">
    <header class="hero panel">
      <div>
        <p class="eyebrow">Biz Export Platform</p>
        <h1>业务组件导出管理</h1>
        <p class="subtitle">
          从 {{ libraryMeta.library || '组件库' }} 选择组件，预览依赖闭包，生成客户定制包。
        </p>
      </div>
      <div class="meta">
        <span>版本 {{ libraryMeta.version || '-' }}</span>
        <span>构建号 {{ libraryMeta.buildId || '-' }}</span>
      </div>
    </header>

    <div class="grid grid-2">
      <section class="panel">
        <div class="section-head">
          <h2>可选组件</h2>
          <span>{{ selected.length }} / {{ components.length }} 已选</span>
        </div>

        <div class="component-list">
          <label v-for="item in components" :key="item.name" class="component-item">
            <input
              type="checkbox"
              :checked="selectedSet.has(item.name)"
              @change="toggleComponent(item.name)"
            />
            <div>
              <strong>{{ item.name }}</strong>
              <p>{{ item.description }}</p>
              <div class="tags">
                <span v-for="tag in item.tags" :key="tag">{{ tag }}</span>
              </div>
              <small v-if="item.deps.length">依赖：{{ item.deps.join(', ') }}</small>
            </div>
          </label>
        </div>
      </section>

      <section class="panel">
        <h2>闭包预览</h2>
        <p class="hint">勾选组件后，系统会自动补全运行时依赖。</p>

        <div v-if="previewLoading" class="empty">计算中...</div>
        <div v-else-if="!closure" class="empty">请选择至少一个组件</div>
        <div v-else class="closure">
          <div class="closure-block">
            <h3>已选</h3>
            <ul>
              <li v-for="name in closure.selected" :key="name">{{ name }}</li>
            </ul>
          </div>
          <div class="closure-block">
            <h3>实际打包</h3>
            <ul>
              <li v-for="name in closure.resolved" :key="name">{{ name }}</li>
            </ul>
          </div>
          <div class="flags">
            <span>shared: {{ closure.includesShared ? '包含' : '无' }}</span>
            <span>theme: {{ closure.includesTheme ? '包含' : '无' }}</span>
          </div>
          <ul v-if="closure.warnings.length" class="warnings">
            <li v-for="warning in closure.warnings" :key="warning">{{ warning }}</li>
          </ul>
        </div>

        <form class="export-form" @submit.prevent="submitExport">
          <label>
            客户名称
            <input v-model="customerName" required />
          </label>
          <label>
            客户 ID
            <input v-model="customerId" />
          </label>
          <label>
            包名
            <input v-model="packageName" />
          </label>
          <label>
            版本
            <input v-model="version" />
          </label>
          <button type="submit" :disabled="loading || selected.length === 0">
            {{ loading ? '提交中...' : '生成定制包' }}
          </button>
        </form>

        <p v-if="message" class="message">{{ message }}</p>
        <p v-if="error" class="error">{{ error }}</p>
      </section>
    </div>

    <section class="panel orders">
      <div class="section-head">
        <h2>导出历史</h2>
        <button type="button" class="ghost" @click="loadOrders">刷新</button>
      </div>

      <table v-if="orders.length">
        <thead>
          <tr>
            <th>订单</th>
            <th>客户</th>
            <th>已选 / 实际</th>
            <th>状态</th>
            <th>指纹</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="order in orders" :key="order.id">
            <td>{{ order.id }}</td>
            <td>{{ order.customerName }}</td>
            <td>{{ order.selectedComponents.join(', ') }} / {{ order.resolvedComponents.join(', ') }}</td>
            <td>
              <span :class="['status', order.status]">{{ order.status }}</span>
            </td>
            <td>{{ order.fingerprint ?? '-' }}</td>
            <td class="actions">
              <a
                v-if="order.downloadToken && order.status === 'completed'"
                :href="downloadUrl(order.downloadToken)"
              >
                下载 ZIP
              </a>
              <button
                v-if="order.downloadToken && order.status === 'completed'"
                type="button"
                class="ghost danger"
                @click="handleRevoke(order.id)"
              >
                吊销令牌
              </button>
              <span v-if="order.error" class="error">{{ order.error }}</span>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else class="empty">暂无导出记录</p>
    </section>
  </div>
</template>

<style scoped>
.page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
  display: grid;
  gap: 20px;
}

.hero {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.eyebrow {
  margin: 0 0 8px;
  color: var(--primary);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-size: 12px;
}

h1,
h2,
h3 {
  margin: 0 0 8px;
}

.subtitle,
.hint,
.empty {
  color: var(--muted);
}

.meta {
  display: grid;
  gap: 8px;
  font-size: 14px;
  color: var(--muted);
}

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.component-list {
  display: grid;
  gap: 12px;
}

.component-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: 10px;
}

.component-item p,
.component-item small {
  margin: 4px 0 0;
  color: var(--muted);
}

.tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 8px;
}

.tags span {
  background: #eef4fb;
  color: var(--primary);
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
}

.closure {
  display: grid;
  gap: 12px;
  margin-bottom: 20px;
}

.closure-block ul,
.warnings {
  margin: 0;
  padding-left: 18px;
}

.flags {
  display: flex;
  gap: 12px;
  color: var(--muted);
  font-size: 14px;
}

.warnings {
  color: var(--warning);
}

.export-form {
  display: grid;
  gap: 12px;
}

label {
  display: grid;
  gap: 6px;
  font-size: 14px;
}

input {
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
}

button,
.ghost {
  border: none;
  border-radius: 8px;
  padding: 10px 14px;
  cursor: pointer;
}

button[type='submit'] {
  background: var(--primary);
  color: #fff;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.ghost {
  background: #eef4fb;
  color: var(--primary);
}

.ghost.danger {
  color: var(--danger);
}

.message {
  color: var(--success);
}

.error {
  color: var(--danger);
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  padding: 10px 8px;
  border-bottom: 1px solid var(--border);
  text-align: left;
  vertical-align: top;
}

.status.completed {
  color: var(--success);
}

.status.failed {
  color: var(--danger);
}

.status.processing,
.status.pending {
  color: var(--warning);
}

.actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}

.actions a {
  color: var(--primary);
}
</style>

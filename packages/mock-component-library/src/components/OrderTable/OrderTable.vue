<script setup lang="ts">
import { computed } from 'vue'
import { Button } from '../Button'
import { Pagination } from '../Pagination'
import { formatCurrency } from '../../shared'

defineOptions({ name: 'BizOrderTable' })

export interface OrderRow {
  id: string
  customer: string
  amount: number
  status: 'pending' | 'paid' | 'shipped'
}

const props = withDefaults(
  defineProps<{
    rows: OrderRow[]
    pageSize?: number
    current?: number
  }>(),
  {
    pageSize: 10,
    current: 1,
  },
)

const emit = defineEmits<{
  view: [row: OrderRow]
  'page-change': [page: number]
}>()

const pagedRows = computed(() => {
  const start = (props.current - 1) * props.pageSize
  return props.rows.slice(start, start + props.pageSize)
})
</script>

<template>
  <div class="biz-order-table">
    <table>
      <thead>
        <tr>
          <th>订单号</th>
          <th>客户</th>
          <th>金额</th>
          <th>状态</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in pagedRows" :key="row.id">
          <td>{{ row.id }}</td>
          <td>{{ row.customer }}</td>
          <td>{{ formatCurrency(row.amount) }}</td>
          <td>{{ row.status }}</td>
          <td>
            <Button type="primary" @click="emit('view', row)">查看</Button>
          </td>
        </tr>
      </tbody>
    </table>
    <Pagination
      :total="rows.length"
      :page-size="pageSize"
      :current="current"
      @change="emit('page-change', $event)"
    />
  </div>
</template>

<style scoped>
.biz-order-table {
  border: 1px solid var(--biz-border, #d9d9d9);
  border-radius: var(--biz-radius, 6px);
  padding: 12px;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 12px;
}

th,
td {
  padding: 8px;
  border-bottom: 1px solid var(--biz-border, #d9d9d9);
  text-align: left;
}
</style>

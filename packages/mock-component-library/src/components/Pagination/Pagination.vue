<script setup lang="ts">
defineOptions({ name: 'BizPagination' })

const props = withDefaults(
  defineProps<{
    total: number
    pageSize?: number
    current?: number
  }>(),
  {
    pageSize: 10,
    current: 1,
  },
)

const emit = defineEmits<{
  change: [page: number]
}>()

const totalPages = () => Math.max(1, Math.ceil(props.total / props.pageSize))

function goTo(page: number) {
  const next = Math.min(Math.max(1, page), totalPages())
  emit('change', next)
}
</script>

<template>
  <div class="biz-pagination">
    <button type="button" :disabled="current <= 1" @click="goTo(current - 1)">上一页</button>
    <span>{{ current }} / {{ totalPages() }}</span>
    <button type="button" :disabled="current >= totalPages()" @click="goTo(current + 1)">
      下一页
    </button>
  </div>
</template>

<style scoped>
.biz-pagination {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
</style>

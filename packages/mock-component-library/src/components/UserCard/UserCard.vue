<script setup lang="ts">
import { Button } from '../Button'

defineOptions({ name: 'BizUserCard' })

defineProps<{
  name: string
  role: string
  avatar?: string
}>()

const emit = defineEmits<{
  action: []
}>()
</script>

<template>
  <div class="biz-user-card">
    <img v-if="avatar" :src="avatar" alt="" class="avatar" />
    <div v-else class="avatar placeholder">{{ name.slice(0, 1) }}</div>
    <div class="info">
      <strong>{{ name }}</strong>
      <span>{{ role }}</span>
    </div>
    <Button type="primary" @click="emit('action')">联系</Button>
  </div>
</template>

<style scoped>
.biz-user-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--biz-border, #d9d9d9);
  border-radius: var(--biz-radius, 6px);
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
}

.avatar.placeholder {
  display: grid;
  place-items: center;
  background: var(--biz-primary, #1677ff);
  color: #fff;
}

.info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
</style>

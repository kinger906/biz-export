<script setup lang="ts">
import { classNames } from '../../shared'

defineOptions({ name: 'BizButton' })

withDefaults(
  defineProps<{
    type?: 'primary' | 'default'
    disabled?: boolean
  }>(),
  {
    type: 'default',
    disabled: false,
  },
)
</script>

<template>
  <button
    class="biz-button"
    :class="classNames(`biz-button--${type}`, disabled && 'biz-button--disabled')"
    :disabled="disabled"
  >
    <slot />
  </button>
</template>

<style scoped>
.biz-button {
  padding: 6px 16px;
  border-radius: var(--biz-radius, 6px);
  border: 1px solid var(--biz-border, #d9d9d9);
  background: var(--biz-bg, #fff);
  color: var(--biz-text, #1f1f1f);
  cursor: pointer;
}

.biz-button--primary {
  background: var(--biz-primary, #1677ff);
  border-color: var(--biz-primary, #1677ff);
  color: #fff;
}

.biz-button--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>

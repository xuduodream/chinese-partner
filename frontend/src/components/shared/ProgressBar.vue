<script setup lang="ts">
defineProps<{
  current: number
  total: number
  accuracy?: number
  className?: string
}>()
</script>

<template>
  <div class="progress-container" :class="className">
    <div class="progress-header">
      <span class="progress-text">{{ current }} / {{ total }} cards</span>
      <span v-if="accuracy !== undefined" class="accuracy-text">Accuracy: {{ accuracy }}%</span>
    </div>
    <div class="progress-bar">
      <div
        class="progress-fill"
        :style="{ width: `${total > 0 ? (current / total) * 100 : 0}%` }"
      />
    </div>
  </div>
</template>

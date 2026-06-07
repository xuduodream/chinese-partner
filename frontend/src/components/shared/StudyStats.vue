<script setup lang="ts">
import ProgressBar from './ProgressBar.vue'

defineProps<{
  stats: {
    total: number
    studied: number
    correct: number
    streak?: number
  }
  className?: string
}>()
</script>

<template>
  <div class="study-stats" :class="className">
    <div class="stats-grid">
      <div class="stat-item">
        <div class="stat-value">{{ stats.studied }}</div>
        <div class="stat-label">Studied</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">{{ stats.studied > 0 ? Math.round((stats.correct / stats.studied) * 100) : 0 }}%</div>
        <div class="stat-label">Accuracy</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">{{ stats.streak || 0 }}</div>
        <div class="stat-label">Day Streak</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">{{ stats.total - stats.studied }}</div>
        <div class="stat-label">Remaining</div>
      </div>
    </div>
    <ProgressBar
      :current="stats.studied"
      :total="stats.total"
      :accuracy="stats.studied > 0 ? Math.round((stats.correct / stats.studied) * 100) : 0"
      className="session-progress"
    />
  </div>
</template>

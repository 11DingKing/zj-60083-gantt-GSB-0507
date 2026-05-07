<template>
  <div class="statistics-panel">
    <div class="panel-header">
      <h4>项目统计</h4>
    </div>
    <div class="stats-grid">
      <div class="stat-item">
        <div class="stat-value">{{ stats.total }}</div>
        <div class="stat-label">总任务数</div>
      </div>
      <div class="stat-item">
        <div class="stat-value completed">{{ stats.completed }}</div>
        <div class="stat-label">已完成</div>
      </div>
      <div class="stat-item">
        <div class="stat-value delayed">{{ stats.delayed }}</div>
        <div class="stat-label">已延期</div>
      </div>
      <div class="stat-item">
        <div class="stat-value in-progress">{{ stats.inProgress }}</div>
        <div class="stat-label">进行中</div>
      </div>
    </div>
    <div class="progress-section">
      <div class="progress-header">
        <span>完成率</span>
        <span class="percentage">{{ stats.completionRate }}%</span>
      </div>
      <div class="progress-bar">
        <div 
          class="progress-fill"
          :style="{ width: stats.completionRate + '%' }"
        ></div>
      </div>
    </div>
    <div class="remaining-section">
      <span class="label">剩余工期:</span>
      <span class="value">{{ Math.round(stats.remainingDuration) }} 天</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useGanttStore } from '@/stores/ganttStore'

const store = useGanttStore()

const stats = computed(() => store.taskStats)
</script>

<style scoped>
.statistics-panel {
  background: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.panel-header h4 {
  margin: 0 0 16px 0;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.stat-item {
  text-align: center;
  padding: 12px;
  background: #f9fafb;
  border-radius: 6px;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 4px;
}

.stat-value.completed {
  color: #10b981;
}

.stat-value.delayed {
  color: #ef4444;
}

.stat-value.in-progress {
  color: #3b82f6;
}

.stat-label {
  font-size: 12px;
  color: #6b7280;
}

.progress-section {
  margin-bottom: 12px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 13px;
  color: #4b5563;
}

.percentage {
  font-weight: 600;
  color: #3b82f6;
}

.progress-bar {
  height: 8px;
  background: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #60a5fa);
  border-radius: 4px;
  transition: width 0.3s;
}

.remaining-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid #e5e7eb;
  font-size: 13px;
}

.remaining-section .label {
  color: #6b7280;
}

.remaining-section .value {
  font-weight: 600;
  color: #374151;
}
</style>

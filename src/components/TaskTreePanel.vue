<template>
  <div 
    class="task-tree-panel"
    @scroll="handleScroll"
    ref="panelRef"
  >
    <div class="task-tree-header">
      <div class="header-cell name">任务名称</div>
      <div class="header-cell start">开始</div>
      <div class="header-cell end">结束</div>
      <div class="header-cell duration">工期</div>
      <div class="header-cell progress">进度</div>
    </div>

    <div class="task-tree-body">
      <div
        v-for="task in visibleTasks"
        :key="task.id"
        :class="['task-row', { selected: selectedTaskId === task.id, milestone: task.isMilestone }]"
        :style="{ paddingLeft: task.level * 20 + 'px' }"
        @click="selectTask(task.id)"
        @contextmenu.prevent="handleContextMenu($event, task)"
      >
        <div class="cell name">
          <span 
            v-if="hasChildren(task.id)"
            class="expand-icon"
            @click.stop="toggleExpand(task.id)"
          >
            {{ task.expanded ? '▼' : '▶' }}
          </span>
          <span v-else class="expand-icon-placeholder"></span>
          <span class="task-name">{{ task.name }}</span>
        </div>
        <div class="cell start">{{ task.startDate }}</div>
        <div class="cell end">{{ task.endDate }}</div>
        <div class="cell duration">{{ task.duration }}天</div>
        <div class="cell progress">
          <div class="progress-bar">
            <div 
              class="progress-fill"
              :style="{ width: task.progress + '%', background: getProgressColor(task) }"
            ></div>
          </div>
          <span class="progress-text">{{ task.progress }}%</span>
        </div>
      </div>

      <div v-if="visibleTasks.length === 0" class="empty-state">
        暂无任务，点击"添加任务"开始创建
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { TaskStatus } from '@/types'
import type { Task } from '@/types'
import { useGanttStore } from '@/stores/ganttStore'

const store = useGanttStore()
const visibleTasks = computed(() => store.visibleTasks)
const selectedTaskId = computed(() => store.selectedTaskId)
const panelRef = ref<HTMLElement | null>(null)

defineEmits<{
  contextMenu: [event: MouseEvent, task: Task]
  scroll: [scrollTop: number]
}>()

function hasChildren(taskId: string): boolean {
  return store.tasks.some(t => t.parentId === taskId)
}

function toggleExpand(taskId: string) {
  store.toggleTaskExpand(taskId)
}

function selectTask(taskId: string) {
  store.selectTask(taskId)
}

function handleScroll(e: Event) {
  const target = e.target as HTMLElement
  store.setScrollTop(target.scrollTop)
}

function getProgressColor(task: Task): string {
  switch (task.status) {
    case TaskStatus.NOT_STARTED:
      return '#9ca3af'
    case TaskStatus.IN_PROGRESS:
      return '#3b82f6'
    case TaskStatus.COMPLETED:
      return '#10b981'
    case TaskStatus.DELAYED:
      return '#ef4444'
    default:
      return '#9ca3af'
  }
}

watch(() => store.scrollTop, (top) => {
  if (panelRef.value) {
    panelRef.value.scrollTop = top
  }
})
</script>

<style scoped>
.task-tree-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  border-right: 1px solid #e5e7eb;
  overflow: hidden;
  background: white;
}

.task-tree-header {
  display: flex;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  font-weight: 500;
  font-size: 13px;
  color: #6b7280;
}

.header-cell {
  padding: 10px 12px;
  border-right: 1px solid #e5e7eb;
}

.header-cell.name {
  flex: 1;
  min-width: 200px;
}

.header-cell.start,
.header-cell.end {
  width: 110px;
}

.header-cell.duration {
  width: 80px;
}

.header-cell.progress {
  width: 120px;
  border-right: none;
}

.task-tree-body {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

.task-row {
  display: flex;
  align-items: center;
  border-bottom: 1px solid #f3f4f6;
  cursor: pointer;
  transition: background 0.15s;
  font-size: 13px;
  height: 36px;
}

.task-row:hover {
  background: #f9fafb;
}

.task-row.selected {
  background: #eff6ff;
}

.task-row.milestone .task-name {
  color: #8b5cf6;
  font-weight: 500;
}

.cell {
  padding: 0 12px;
  border-right: 1px solid #f3f4f6;
  display: flex;
  align-items: center;
  height: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cell.name {
  flex: 1;
  min-width: 200px;
}

.cell.start,
.cell.end {
  width: 110px;
  color: #4b5563;
}

.cell.duration {
  width: 80px;
  color: #4b5563;
}

.cell.progress {
  width: 120px;
  border-right: none;
  gap: 8px;
}

.expand-icon {
  width: 16px;
  height: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #9ca3af;
  font-size: 10px;
  margin-right: 4px;
}

.expand-icon:hover {
  color: #3b82f6;
}

.expand-icon-placeholder {
  width: 20px;
  display: inline-block;
}

.task-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.progress-bar {
  flex: 1;
  height: 6px;
  background: #e5e7eb;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s;
}

.progress-text {
  width: 32px;
  text-align: right;
  color: #6b7280;
  font-size: 12px;
}

.empty-state {
  padding: 40px;
  text-align: center;
  color: #9ca3af;
  font-size: 13px;
}
</style>

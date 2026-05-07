<template>
  <div class="toolbar">
    <div class="toolbar-group">
      <span class="label">视图:</span>
      <button 
        v-for="unit in timeUnits" 
        :key="unit.value"
        @click="handleTimeUnitChange(unit.value)"
        :class="['btn', { active: currentUnit === unit.value }]"
      >
        {{ unit.label }}
      </button>
    </div>

    <div class="toolbar-group">
      <span class="label">缩放:</span>
      <button @click="zoomOut" class="btn-icon">−</button>
      <span class="zoom-value">{{ Math.round(zoom * 100) }}%</span>
      <button @click="zoomIn" class="btn-icon">+</button>
    </div>

    <div class="toolbar-group">
      <span class="label">负责人:</span>
      <select v-model="selectedAssigneeId" @change="handleAssigneeChange" class="assignee-select">
        <option value="">全部</option>
        <option v-for="resource in store.resources" :key="resource.id" :value="resource.id">
          {{ resource.name }}
        </option>
      </select>
    </div>

    <div class="toolbar-group">
      <button @click="$emit('addTask')" class="btn-primary">
        + 添加任务
      </button>
      <button @click="$emit('openResources')" class="btn-secondary">
        资源管理
      </button>
    </div>

    <div class="toolbar-group">
      <button @click="$emit('createBaseline')" class="btn-secondary">
        保存基线
      </button>
      <select v-model="selectedBaselineId" @change="handleBaselineChange" class="baseline-select">
        <option value="">显示基线</option>
        <option v-for="b in baselines" :key="b.id" :value="b.id">
          {{ b.name }}
        </option>
      </select>
    </div>

    <div class="toolbar-group">
      <button @click="$emit('exportJSON')" class="btn-secondary">
        导出JSON
      </button>
      <button @click="$emit('exportCSV')" class="btn-secondary">
        导出CSV
      </button>
      <button @click="$emit('importJSON')" class="btn-secondary">
        导入
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { TimeUnit } from '@/types'
import type { Baseline } from '@/types'
import { useGanttStore } from '@/stores/ganttStore'

interface TimeUnitOption {
  value: TimeUnit
  label: string
}

const timeUnits: TimeUnitOption[] = [
  { value: TimeUnit.DAY, label: '日' },
  { value: TimeUnit.WEEK, label: '周' },
  { value: TimeUnit.MONTH, label: '月' },
  { value: TimeUnit.QUARTER, label: '季度' }
]

const store = useGanttStore()
const currentUnit = ref(store.timeUnit)
const zoom = ref(store.zoom)
const selectedBaselineId = ref<string>('')
const selectedAssigneeId = ref<string>('')

defineEmits<{
  addTask: []
  openResources: []
  createBaseline: []
  exportJSON: []
  exportCSV: []
  importJSON: []
}>()

const baselines = store.baselines

watch(() => store.timeUnit, (unit) => {
  currentUnit.value = unit
})

watch(() => store.zoom, (z) => {
  zoom.value = z
})

function handleTimeUnitChange(unit: TimeUnit) {
  store.setTimeUnit(unit)
  currentUnit.value = unit
}

function zoomIn() {
  store.setZoom(store.zoom + 0.25)
}

function zoomOut() {
  store.setZoom(store.zoom - 0.25)
}

function handleBaselineChange() {
  const baseline = selectedBaselineId.value 
    ? baselines.value.find(b => b.id === selectedBaselineId.value) || null
    : null
  store.selectBaseline(baseline)
}

function handleAssigneeChange() {
  const resourceId = selectedAssigneeId.value || null
  store.setFilterByAssignee(resourceId)
}
</script>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 12px 16px;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  flex-wrap: wrap;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.label {
  font-size: 13px;
  color: #6b7280;
  margin-right: 4px;
}

.btn {
  padding: 6px 12px;
  border: 1px solid #d1d5db;
  background: white;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:hover {
  background: #f3f4f6;
}

.btn.active {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

.btn-icon {
  width: 28px;
  height: 28px;
  border: 1px solid #d1d5db;
  background: white;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-icon:hover {
  background: #f3f4f6;
}

.zoom-value {
  min-width: 40px;
  text-align: center;
  font-size: 13px;
  color: #374151;
}

.btn-primary {
  padding: 6px 16px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
}

.btn-primary:hover {
  background: #2563eb;
}

.btn-secondary {
  padding: 6px 12px;
  background: white;
  color: #374151;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
}

.btn-secondary:hover {
  background: #f3f4f6;
}

.baseline-select {
  padding: 5px 10px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 13px;
  background: white;
  cursor: pointer;
}

.assignee-select {
  padding: 5px 10px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 13px;
  background: white;
  cursor: pointer;
  min-width: 120px;
}
</style>

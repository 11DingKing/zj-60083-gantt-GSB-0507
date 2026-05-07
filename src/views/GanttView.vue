<template>
  <div class="gantt-view">
    <header class="app-header">
      <div class="header-left">
        <h1 class="app-title">甘特图项目管理</h1>
        <ProjectSelector />
      </div>
      <div class="header-right">
        <button 
          v-if="currentProject" 
          @click="handleSave" 
          class="btn-save"
        >
          保存
        </button>
      </div>
    </header>

    <Toolbar
      v-if="currentProject"
      @addTask="showAddTaskDialog = true"
      @openResources="showResourceDialog = true"
      @createBaseline="handleCreateBaseline"
      @exportJSON="handleExportJSON"
      @exportCSV="handleExportCSV"
      @importJSON="triggerImport"
    />

    <template v-if="currentProject">
      <div class="view-tabs">
        <button 
          @click="currentView = 'gantt'" 
          :class="['tab-btn', { active: currentView === 'gantt' }]"
        >
          甘特图视图
        </button>
        <button 
          @click="currentView = 'resource'" 
          :class="['tab-btn', { active: currentView === 'resource' }]"
        >
          资源负载视图
        </button>
      </div>
    </template>

    <main class="main-content">
      <template v-if="currentProject && currentView === 'gantt'">
        <div class="gantt-layout">
          <div class="left-panel">
            <TaskTreePanel
              @contextMenu="handleContextMenu"
            />
          </div>
          <div class="right-panel">
            <GanttCanvas
              @contextMenu="handleGanttContextMenu"
            />
          </div>
        </div>
      </template>

      <template v-else-if="currentProject && currentView === 'resource'">
        <div class="resource-view">
          <div class="resource-header">
            <div class="resource-name-col">资源</div>
            <div class="resource-workload-col">
              <span class="workload-header">每日工作量（小时）</span>
              <div class="date-headers">
                <span 
                  v-for="(date, idx) in workloadDateRange" 
                  :key="idx"
                  class="date-header"
                >
                  {{ date.getDate() }}日
                </span>
              </div>
            </div>
          </div>
          <div class="resource-list" ref="resourceListRef">
            <div 
              v-for="resource in resources" 
              :key="resource.id" 
              class="resource-row"
            >
              <div class="resource-name-col">
                <span class="resource-color" :style="{ background: resource.color }"></span>
                <span class="resource-name">{{ resource.name }}</span>
                <span class="resource-role">{{ resource.role }}</span>
              </div>
              <div class="resource-workload-col">
                <div class="workload-bars">
                  <div 
                    v-for="(workload, idx) in getWorkloadsForResource(resource.id)" 
                    :key="idx"
                    class="workload-bar-container"
                    :title="`${workload.date}: ${workload.hours.toFixed(1)}小时`"
                  >
                    <div 
                      class="workload-bar"
                      :class="{ 'overload': workload.isOverloaded }"
                      :style="{ height: getWorkloadBarHeight(workload.hours, resource.dailyHours) }"
                    ></div>
                    <span class="workload-value" :class="{ 'overload': workload.isOverloaded }">
                      {{ workload.hours > 0 ? workload.hours.toFixed(1) : '' }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="resource-legend">
            <div class="legend-item">
              <span class="legend-color normal"></span>
              <span>正常负载</span>
            </div>
            <div class="legend-item">
              <span class="legend-color overload"></span>
              <span>过载 (超过每日可用工时)</span>
            </div>
            <div class="legend-info">
              每日可用工时: {{ resources.length > 0 ? resources[0].dailyHours : 8 }} 小时/人
            </div>
          </div>
        </div>
      </template>
      <template v-else>
        <div class="welcome-section">
          <div class="welcome-content">
            <h2>欢迎使用甘特图项目管理工具</h2>
            <p>创建一个新项目或选择已有项目开始管理您的任务排期</p>
            <div class="welcome-actions">
              <button @click="createSampleProject" class="btn-primary-large">
                创建示例项目
              </button>
            </div>
          </div>
        </div>
      </template>
    </main>

    <aside v-if="currentProject" class="side-panel">
      <StatisticsPanel />
      <div v-if="selectedTask" class="task-detail">
        <div class="detail-header">
          <h4>任务详情</h4>
          <button @click="showEditDialog = true" class="btn-edit-small">编辑</button>
        </div>
        <div class="detail-body">
          <div class="detail-item">
            <span class="label">名称</span>
            <span class="value">{{ selectedTask.name }}</span>
          </div>
          <div class="detail-item">
            <span class="label">开始日期</span>
            <span class="value">{{ selectedTask.startDate }}</span>
          </div>
          <div class="detail-item">
            <span class="label">结束日期</span>
            <span class="value">{{ selectedTask.endDate }}</span>
          </div>
          <div class="detail-item">
            <span class="label">工期</span>
            <span class="value">{{ selectedTask.duration }} 天</span>
          </div>
          <div class="detail-item">
            <span class="label">进度</span>
            <span class="value progress">
              <span 
                class="progress-bar-mini"
                :style="{ background: getStatusColor(selectedTask) }"
              >
                <span 
                  class="progress-fill-mini"
                  :style="{ width: selectedTask.progress + '%' }"
                ></span>
              </span>
              {{ selectedTask.progress }}%
            </span>
          </div>
          <div class="detail-item">
            <span class="label">状态</span>
            <span 
              class="value status"
              :style="{ color: getStatusColor(selectedTask) }"
            >
              {{ getStatusLabel(selectedTask) }}
            </span>
          </div>
          <div class="detail-item" v-if="selectedTask.description">
            <span class="label">描述</span>
            <span class="value">{{ selectedTask.description }}</span>
          </div>
        </div>
      </div>
    </aside>

    <TaskEditDialog
      v-model:visible="showEditDialog"
      :task="selectedTask"
      :parent-id="selectedTask?.parentId || null"
      @save="handleDialogSave"
    />

    <TaskEditDialog
      v-model:visible="showAddTaskDialog"
      :task="null"
      :parent-id="contextTask?.parentId || null"
      @save="handleDialogSave"
    />

    <TaskEditDialog
      v-model:visible="showAddChildDialog"
      :task="null"
      :parent-id="contextTask?.id || null"
      @save="handleDialogSave"
    />

    <ResourceDialog
      v-model:visible="showResourceDialog"
    />

    <ContextMenu
      :visible="showContextMenu"
      :position="contextMenuPosition"
      :task="contextTask"
      @action="handleMenuAction"
      @close="showContextMenu = false"
    />

    <input 
      ref="fileInput" 
      type="file" 
      accept=".json" 
      style="display: none"
      @change="handleImportFile"
    />

    <Teleport to="body">
      <div v-if="showBaselineDialog" class="dialog-overlay" @click.self="showBaselineDialog = false">
        <div class="dialog">
          <h3>保存基线</h3>
          <div class="form-group">
            <label>基线名称</label>
            <input v-model="baselineName" type="text" placeholder="例如: 初始计划" />
          </div>
          <div class="dialog-actions">
            <button @click="showBaselineDialog = false" class="btn-cancel">取消</button>
            <button @click="saveBaseline" class="btn-primary" :disabled="!baselineName">保存</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { TaskStatus } from '@/types'
import type { Task, ResourceWorkload } from '@/types'
import { useGanttStore } from '@/stores/ganttStore'
import * as exportService from '@/services/exportService'
import * as resourceService from '@/services/resourceService'
import ProjectSelector from '@/components/ProjectSelector.vue'
import Toolbar from '@/components/Toolbar.vue'
import TaskTreePanel from '@/components/TaskTreePanel.vue'
import GanttCanvas from '@/components/GanttCanvas.vue'
import TaskEditDialog from '@/components/TaskEditDialog.vue'
import ResourceDialog from '@/components/ResourceDialog.vue'
import ContextMenu from '@/components/ContextMenu.vue'
import StatisticsPanel from '@/components/StatisticsPanel.vue'

const store = useGanttStore()

const currentProject = computed(() => store.currentProject)
const selectedTask = computed(() => store.selectedTaskId ? store.getTaskById(store.selectedTaskId) : null)
const resources = computed(() => store.resources)

const currentView = ref<'gantt' | 'resource'>('gantt')
const resourceListRef = ref<HTMLElement | null>(null)

const workloadMap = ref<Map<string, ResourceWorkload[]>>(new Map())
const workloadDateRange = ref<Date[]>([])

let autoSaveTimer: number | null = null

const showEditDialog = ref(false)
const showAddTaskDialog = ref(false)
const showAddChildDialog = ref(false)
const showResourceDialog = ref(false)
const showContextMenu = ref(false)
const showBaselineDialog = ref(false)

const contextMenuPosition = ref({ x: 0, y: 0 })
const contextTask = ref<Task | null>(null)

const baselineName = ref('')
const fileInput = ref<HTMLInputElement | null>(null)

watch([currentView, currentProject, resources], async () => {
  if (currentView.value === 'resource' && currentProject.value) {
    await loadWorkloadData()
  }
})

watch(resources, async () => {
  if (currentView.value === 'resource' && currentProject.value) {
    await loadWorkloadData()
  }
}, { deep: true })

watch(() => store.tasks, async () => {
  if (currentView.value === 'resource' && currentProject.value) {
    await loadWorkloadData()
  }
}, { deep: true })

async function loadWorkloadData(): Promise<void> {
  if (!currentProject.value) return

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const startDate = new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000)
  const endDate = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000)

  const dates: Date[] = []
  const d = new Date(startDate)
  while (d <= endDate) {
    dates.push(new Date(d))
    d.setDate(d.getDate() + 1)
  }
  workloadDateRange.value = dates

  const map = await resourceService.calculateResourceWorkload(
    currentProject.value.id,
    startDate,
    endDate
  )
  workloadMap.value = map
}

function getWorkloadsForResource(resourceId: string): ResourceWorkload[] {
  return workloadMap.value.get(resourceId) || []
}

function getWorkloadBarHeight(hours: number, maxHours: number): string {
  const maxHeight = 60
  const height = Math.min((hours / Math.max(maxHours, 1)) * maxHeight, maxHeight)
  return Math.max(height, 0) + 'px'
}

function startAutoSave(): void {
  if (autoSaveTimer) {
    clearInterval(autoSaveTimer)
  }
  
  autoSaveTimer = window.setInterval(() => {
    if (currentProject.value) {
      console.log('自动保存 -', new Date().toLocaleTimeString('zh-CN'))
    }
  }, 30000)
}

function stopAutoSave(): void {
  if (autoSaveTimer) {
    clearInterval(autoSaveTimer)
    autoSaveTimer = null
  }
}

onMounted(() => {
  store.loadProjects()
  startAutoSave()
})

onUnmounted(() => {
  stopAutoSave()
})

function getStatusColor(task: Task): string {
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

function getStatusLabel(task: Task): string {
  switch (task.status) {
    case TaskStatus.NOT_STARTED:
      return '未开始'
    case TaskStatus.IN_PROGRESS:
      return '进行中'
    case TaskStatus.COMPLETED:
      return '已完成'
    case TaskStatus.DELAYED:
      return '已延期'
    default:
      return '未开始'
  }
}

function handleContextMenu(e: MouseEvent, task: Task | null): void {
  contextTask.value = task
  contextMenuPosition.value = { x: e.clientX, y: e.clientY }
  showContextMenu.value = true
}

function handleGanttContextMenu(e: MouseEvent): void {
  const task = store.selectedTaskId ? store.getTaskById(store.selectedTaskId) : null
  contextTask.value = task
  contextMenuPosition.value = { x: e.clientX, y: e.clientY }
  showContextMenu.value = true
}

function handleMenuAction(action: string, task: Task | null): void {
  showContextMenu.value = false
  
  switch (action) {
    case 'edit':
      if (task) {
        showEditDialog.value = true
      }
      break
    case 'add':
      showAddTaskDialog.value = true
      break
    case 'add-child':
      if (task) {
        contextTask.value = task
        showAddChildDialog.value = true
      }
      break
    case 'delete':
      if (task && confirm('确定要删除该任务及其所有子任务吗？')) {
        store.deleteTask(task.id)
      }
      break
    case 'mark-complete':
      if (task) {
        const newProgress = task.progress >= 100 ? 0 : 100
        store.updateTask(task.id, { progress: newProgress })
      }
      break
    case 'set-predecessor':
      break
  }
}

function handleDialogSave(): void {
  showEditDialog.value = false
  showAddTaskDialog.value = false
  showAddChildDialog.value = false
}

function handleSave(): void {
  alert('项目已保存')
}

function handleExportJSON(): void {
  if (!currentProject.value) return
  
  const json = exportService.exportToJSON(
    currentProject.value,
    store.tasks,
    store.dependencies,
    store.resources
  )
  
  exportService.downloadJSON(json, currentProject.value.name)
}

function handleExportCSV(): void {
  if (!currentProject.value) return
  
  const csv = exportService.exportToCSV(store.tasks)
  exportService.downloadCSV(csv, currentProject.value.name)
}

function triggerImport(): void {
  if (fileInput.value) {
    fileInput.value.click()
  }
}

function handleImportFile(e: Event): void {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = async (event) => {
    try {
      const content = event.target?.result as string
      const data = exportService.parseJSONImport(content)
      
      const project = await store.createProject(
        data.project.name,
        data.project.description
      )
      
      await store.switchProject(project.id)
      
      alert('导入成功')
    } catch (error) {
      alert('导入失败: ' + (error as Error).message)
    }
  }
  reader.readAsText(file)
  input.value = ''
}

function handleCreateBaseline(): void {
  if (!currentProject.value) return
  baselineName.value = `基线 ${new Date().toLocaleDateString('zh-CN')}`
  showBaselineDialog.value = true
}

function saveBaseline(): void {
  if (!baselineName.value.trim()) return
  store.createBaseline(baselineName.value.trim())
  baselineName.value = ''
  showBaselineDialog.value = false
}

async function createSampleProject(): Promise<void> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const project = await store.createProject('示例项目', '这是一个甘特图示例项目')
  await store.switchProject(project.id)
  
  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
  const twoWeeks = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000)
  const threeWeeks = new Date(today.getTime() + 21 * 24 * 60 * 60 * 1000)
  const fourWeeks = new Date(today.getTime() + 28 * 24 * 60 * 60 * 1000)

  const task1 = await store.createTask({
    name: '项目启动',
    startDate: today.toISOString().split('T')[0],
    endDate: nextWeek.toISOString().split('T')[0],
    duration: 7,
    progress: 100,
    isMilestone: false
  })

  const task2 = await store.createTask({
    name: '需求分析',
    startDate: nextWeek.toISOString().split('T')[0],
    endDate: twoWeeks.toISOString().split('T')[0],
    duration: 7,
    progress: 60,
    isMilestone: false
  })

  const task3 = await store.createTask({
    name: '详细设计',
    startDate: twoWeeks.toISOString().split('T')[0],
    endDate: threeWeeks.toISOString().split('T')[0],
    duration: 7,
    progress: 0,
    isMilestone: false
  })

  const task4 = await store.createTask({
    name: '开发实现',
    startDate: threeWeeks.toISOString().split('T')[0],
    endDate: fourWeeks.toISOString().split('T')[0],
    duration: 7,
    progress: 0,
    isMilestone: false
  })

  const milestone = await store.createTask({
    name: '项目验收',
    startDate: fourWeeks.toISOString().split('T')[0],
    endDate: fourWeeks.toISOString().split('T')[0],
    duration: 1,
    progress: 0,
    isMilestone: true
  })

  try {
    await store.createDependency(task1.id, task2.id)
    await store.createDependency(task2.id, task3.id)
    await store.createDependency(task3.id, task4.id)
    await store.createDependency(task4.id, milestone.id)
  } catch (e) {
    console.error('创建依赖失败', e)
  }

  await store.createResource('张三', '项目经理', 8)
  await store.createResource('李四', '开发工程师', 8)
  await store.createResource('王五', '测试工程师', 8)
}
</script>

<style scoped>
.gantt-view {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background: #f5f7fa;
}

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: white;
  border-bottom: 1px solid #e5e7eb;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 24px;
}

.app-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
}

.btn-save {
  padding: 8px 20px;
  background: #10b981;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
}

.btn-save:hover {
  background: #059669;
}

.main-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.gantt-layout {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.left-panel {
  width: 500px;
  min-width: 300px;
  border-right: 1px solid #e5e7eb;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  resize: horizontal;
}

.right-panel {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.welcome-section {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.welcome-content {
  text-align: center;
  max-width: 500px;
  padding: 40px;
}

.welcome-content h2 {
  margin: 0 0 16px 0;
  font-size: 28px;
  font-weight: 600;
  color: #1f2937;
}

.welcome-content p {
  margin: 0 0 24px 0;
  font-size: 16px;
  color: #6b7280;
  line-height: 1.6;
}

.welcome-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.btn-primary-large {
  padding: 12px 32px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-primary-large:hover {
  background: #2563eb;
}

.side-panel {
  width: 280px;
  min-width: 280px;
  border-left: 1px solid #e5e7eb;
  background: #f9fafb;
  padding: 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.task-detail {
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #e5e7eb;
}

.detail-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}

.btn-edit-small {
  padding: 4px 12px;
  background: #f3f4f6;
  color: #374151;
  border: none;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
}

.btn-edit-small:hover {
  background: #e5e7eb;
}

.detail-body {
  padding: 12px 16px;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 8px 0;
  border-bottom: 1px solid #f3f4f6;
}

.detail-item:last-child {
  border-bottom: none;
}

.detail-item .label {
  font-size: 13px;
  color: #6b7280;
}

.detail-item .value {
  font-size: 13px;
  color: #1f2937;
  text-align: right;
  max-width: 60%;
  word-break: break-word;
}

.detail-item .progress {
  display: flex;
  align-items: center;
  gap: 8px;
}

.progress-bar-mini {
  width: 60px;
  height: 6px;
  background: #e5e7eb;
  border-radius: 3px;
  display: block;
  overflow: hidden;
}

.progress-fill-mini {
  height: 100%;
  background: #3b82f6;
  border-radius: 3px;
  display: block;
}

.detail-item .status {
  font-weight: 500;
}

.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog {
  background: white;
  border-radius: 8px;
  padding: 24px;
  min-width: 400px;
}

.dialog h3 {
  margin: 0 0 20px 0;
  font-size: 18px;
  color: #1f2937;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-size: 14px;
  color: #4b5563;
}

.form-group input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  box-sizing: border-box;
}

.form-group input:focus {
  outline: none;
  border-color: #3b82f6;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}

.btn-cancel {
  padding: 8px 16px;
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
}

.btn-cancel:hover {
  background: #e5e7eb;
}

.btn-primary {
  padding: 8px 16px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
}

.btn-primary:hover {
  background: #2563eb;
}

.btn-primary:disabled {
  background: #93c5fd;
  cursor: not-allowed;
}

.view-tabs {
  display: flex;
  background: white;
  border-bottom: 1px solid #e5e7eb;
  padding: 0 16px;
}

.tab-btn {
  padding: 12px 24px;
  border: none;
  background: transparent;
  font-size: 14px;
  color: #6b7280;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
}

.tab-btn:hover {
  color: #374151;
  background: #f9fafb;
}

.tab-btn.active {
  color: #3b82f6;
  border-bottom-color: #3b82f6;
  font-weight: 500;
}

.resource-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: white;
  overflow: hidden;
}

.resource-header {
  display: flex;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  min-height: 50px;
  flex-shrink: 0;
}

.resource-name-col {
  width: 240px;
  min-width: 240px;
  padding: 12px 16px;
  border-right: 1px solid #e5e7eb;
  font-weight: 600;
  font-size: 14px;
  color: #374151;
  display: flex;
  align-items: center;
}

.resource-workload-col {
  flex: 1;
  padding: 8px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 0;
  overflow-x: auto;
}

.workload-header {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
}

.date-headers {
  display: flex;
  gap: 0;
  min-width: fit-content;
}

.date-header {
  width: 60px;
  text-align: center;
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
}

.resource-list {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

.resource-row {
  display: flex;
  border-bottom: 1px solid #f3f4f6;
  min-height: 80px;
}

.resource-row:hover {
  background: #f9fafb;
}

.resource-row .resource-name-col {
  border-right: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px;
}

.resource-color {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.resource-name {
  font-size: 14px;
  font-weight: 500;
  color: #1f2937;
}

.resource-role {
  font-size: 12px;
  color: #6b7280;
  margin-left: 8px;
}

.resource-row .resource-workload-col {
  padding: 8px 16px;
  display: flex;
  align-items: center;
  overflow-x: auto;
}

.workload-bars {
  display: flex;
  gap: 0;
  min-width: fit-content;
}

.workload-bar-container {
  width: 60px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  height: 60px;
  position: relative;
}

.workload-bar {
  width: 30px;
  background: #3b82f6;
  border-radius: 4px 4px 0 0;
  min-height: 4px;
  transition: background 0.2s;
}

.workload-bar.overload {
  background: #ef4444;
}

.workload-value {
  font-size: 10px;
  color: #6b7280;
  margin-top: 2px;
  position: absolute;
  top: -4px;
}

.workload-value.overload {
  color: #ef4444;
  font-weight: 500;
}

.resource-legend {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 12px 16px;
  background: #f9fafb;
  border-top: 1px solid #e5e7eb;
  flex-shrink: 0;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #6b7280;
}

.legend-color {
  width: 16px;
  height: 16px;
  border-radius: 3px;
}

.legend-color.normal {
  background: #3b82f6;
}

.legend-color.overload {
  background: #ef4444;
}

.legend-info {
  font-size: 12px;
  color: #6b7280;
  margin-left: auto;
}
</style>

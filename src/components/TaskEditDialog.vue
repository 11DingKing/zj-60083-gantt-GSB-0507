<template>
  <Teleport to="body">
    <div v-if="visible" class="dialog-overlay" @click.self="$emit('close')">
      <div class="dialog">
        <div class="dialog-header">
          <h3>{{ isEdit ? '编辑任务' : '新建任务' }}</h3>
          <button @click="$emit('close')" class="btn-close">×</button>
        </div>

        <div class="dialog-body">
          <div class="form-row">
            <div class="form-group">
              <label>任务名称 *</label>
              <input v-model="form.name" type="text" placeholder="请输入任务名称" />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>开始日期</label>
              <input v-model="form.startDate" type="date" />
            </div>
            <div class="form-group">
              <label>结束日期</label>
              <input v-model="form.endDate" type="date" />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>工期(天)</label>
              <input v-model.number="form.duration" type="number" min="1" @change="updateEndDate" />
            </div>
            <div class="form-group">
              <label>进度(%)</label>
              <input v-model.number="form.progress" type="number" min="0" max="100" />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>优先级</label>
              <select v-model="form.priority">
                <option value="low">低</option>
                <option value="medium">中</option>
                <option value="high">高</option>
                <option value="critical">紧急</option>
              </select>
            </div>
            <div class="form-group">
              <label>负责人</label>
              <div class="multi-select">
                <div 
                  v-for="resource in resources" 
                  :key="resource.id"
                  :class="['resource-tag', { selected: form.assignees.includes(resource.id) }]"
                  @click="toggleResource(resource.id)"
                >
                  <span class="color-dot" :style="{ background: resource.color }"></span>
                  {{ resource.name }}
                </div>
              </div>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group checkbox-group">
              <label>
                <input v-model="form.isMilestone" type="checkbox" @change="handleMilestoneChange" />
                设为里程碑
              </label>
            </div>
          </div>

          <div class="form-group">
            <label>描述</label>
            <textarea v-model="form.description" placeholder="任务描述（可选）"></textarea>
          </div>
        </div>

        <div class="dialog-actions">
          <button @click="$emit('close')" class="btn-cancel">取消</button>
          <button @click="handleSave" class="btn-primary" :disabled="!form.name">保存</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { TaskPriority } from '@/types'
import type { Task, Resource } from '@/types'
import { useGanttStore } from '@/stores/ganttStore'

interface Props {
  visible: boolean
  task: Task | null
  parentId: string | null
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  task: null,
  parentId: null
})

interface Emits {
  'update:visible': [value: boolean]
  close: []
  save: []
}

const emit = defineEmits<Emits>()

const store = useGanttStore()
const resources = store.resources

const isEdit = computed(() => !!props.task)

const defaultForm = {
  name: '',
  description: '',
  startDate: new Date().toISOString().split('T')[0],
  endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  duration: 7,
  progress: 0,
  priority: TaskPriority.MEDIUM,
  assignees: [] as string[],
  isMilestone: false
}

const form = ref({ ...defaultForm })

watch(() => props.visible, (visible) => {
  if (visible) {
    if (props.task) {
      form.value = {
        name: props.task.name,
        description: props.task.description,
        startDate: props.task.startDate,
        endDate: props.task.endDate,
        duration: props.task.duration,
        progress: props.task.progress,
        priority: props.task.priority,
        assignees: [...props.task.assignees],
        isMilestone: props.task.isMilestone
      }
    } else {
      form.value = { ...defaultForm }
      if (props.parentId) {
        const parent = store.getTaskById(props.parentId)
        if (parent) {
          form.value.startDate = parent.startDate
          form.value.endDate = parent.endDate
        }
      }
    }
  }
})

function updateEndDate(): void {
  if (form.value.startDate && form.value.duration > 0) {
    const start = new Date(form.value.startDate)
    const end = new Date(start.getTime() + (form.value.duration - 1) * 24 * 60 * 60 * 1000)
    form.value.endDate = end.toISOString().split('T')[0]
  }
}

function handleMilestoneChange(): void {
  if (form.value.isMilestone) {
    form.value.endDate = form.value.startDate
    form.value.duration = 1
    form.value.progress = form.value.progress > 0 ? 100 : 0
  }
}

function toggleResource(resourceId: string): void {
  const index = form.value.assignees.indexOf(resourceId)
  if (index === -1) {
    form.value.assignees.push(resourceId)
  } else {
    form.value.assignees.splice(index, 1)
  }
}

function handleSave(): void {
  if (!form.value.name.trim()) return

  const data = {
    name: form.value.name.trim(),
    description: form.value.description.trim(),
    startDate: form.value.startDate,
    endDate: form.value.endDate,
    duration: form.value.duration,
    progress: form.value.progress,
    priority: form.value.priority,
    assignees: [...form.value.assignees],
    isMilestone: form.value.isMilestone
  }

  if (props.task) {
    store.updateTask(props.task.id, data)
  } else {
    store.createTask(data, props.parentId)
  }

  emit('save')
  emit('close')
  
  form.value = { ...defaultForm }
}
</script>

<style scoped>
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
  width: 90vw;
  max-width: 600px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e5e7eb;
}

.dialog-header h3 {
  margin: 0;
  font-size: 18px;
  color: #1f2937;
}

.btn-close {
  width: 32px;
  height: 32px;
  border: none;
  background: none;
  font-size: 24px;
  color: #9ca3af;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.btn-close:hover {
  background: #f3f4f6;
  color: #6b7280;
}

.dialog-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

.form-row {
  display: flex;
  gap: 16px;
}

.form-group {
  margin-bottom: 16px;
  flex: 1;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-size: 14px;
  color: #4b5563;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  box-sizing: border-box;
}

.form-group textarea {
  min-height: 80px;
  resize: vertical;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #3b82f6;
}

.multi-select {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  min-height: 40px;
}

.resource-tag {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: #f3f4f6;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.resource-tag:hover {
  background: #e5e7eb;
}

.resource-tag.selected {
  background: #dbeafe;
  color: #1e40af;
}

.color-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.checkbox-group label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.checkbox-group input[type="checkbox"] {
  width: auto;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid #e5e7eb;
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
</style>

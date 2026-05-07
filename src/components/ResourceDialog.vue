<template>
  <Teleport to="body">
    <div v-if="visible" class="dialog-overlay" @click.self="$emit('close')">
      <div class="dialog">
        <div class="dialog-header">
          <h3>资源管理</h3>
          <button @click="$emit('close')" class="btn-close">×</button>
        </div>

        <div class="dialog-body">
          <div class="add-form">
            <div class="form-row">
              <div class="form-group">
                <label>姓名</label>
                <input v-model="newResource.name" type="text" placeholder="请输入姓名" />
              </div>
              <div class="form-group">
                <label>角色</label>
                <input v-model="newResource.role" type="text" placeholder="请输入角色" />
              </div>
              <div class="form-group">
                <label>每日工时(小时)</label>
                <input v-model.number="newResource.dailyHours" type="number" min="1" max="24" />
              </div>
              <div class="form-group actions">
                <label>&nbsp;</label>
                <button @click="addResource" class="btn-add" :disabled="!newResource.name">
                  添加
                </button>
              </div>
            </div>
          </div>

          <div class="resource-list">
            <div 
              v-for="resource in resources" 
              :key="resource.id"
              class="resource-item"
            >
              <div class="resource-info">
                <span class="color-dot" :style="{ background: resource.color }"></span>
                <span class="name">{{ resource.name }}</span>
                <span class="role">{{ resource.role }}</span>
                <span class="hours">{{ resource.dailyHours }}小时/天</span>
              </div>
              <div class="resource-actions">
                <button @click="startEdit(resource)" class="btn-edit">编辑</button>
                <button @click="deleteResource(resource.id)" class="btn-delete">删除</button>
              </div>
            </div>

            <div v-if="resources.length === 0" class="empty-state">
              暂无资源，请添加团队成员
            </div>
          </div>
        </div>

        <div class="dialog-actions">
          <button @click="$emit('close')" class="btn-close-dialog">关闭</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import type { Resource } from '@/types'
import { useGanttStore } from '@/stores/ganttStore'

interface Props {
  visible: boolean
}

withDefaults(defineProps<Props>(), {
  visible: false
})

const store = useGanttStore()
const resources = store.resources

const newResource = reactive({
  name: '',
  role: '',
  dailyHours: 8
})

const editingResource = ref<Resource | null>(null)

function addResource(): void {
  if (!newResource.name.trim()) return

  store.createResource(
    newResource.name.trim(),
    newResource.role.trim(),
    newResource.dailyHours
  )

  newResource.name = ''
  newResource.role = ''
  newResource.dailyHours = 8
}

function startEdit(resource: Resource): void {
  editingResource.value = { ...resource }
}

function deleteResource(resourceId: string): void {
  if (confirm('确定要删除该资源吗？')) {
    store.deleteResource(resourceId)
  }
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
  max-width: 700px;
  max-height: 80vh;
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

.add-form {
  padding: 16px;
  background: #f9fafb;
  border-radius: 6px;
  margin-bottom: 16px;
}

.form-row {
  display: flex;
  gap: 12px;
  align-items: flex-end;
}

.form-group {
  flex: 1;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
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

.form-group.actions {
  flex: none;
}

.btn-add {
  padding: 8px 20px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  white-space: nowrap;
}

.btn-add:hover {
  background: #2563eb;
}

.btn-add:disabled {
  background: #93c5fd;
  cursor: not-allowed;
}

.resource-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.resource-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  transition: border-color 0.2s;
}

.resource-item:hover {
  border-color: #d1d5db;
}

.resource-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.color-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.name {
  font-weight: 500;
  color: #1f2937;
}

.role {
  color: #6b7280;
  font-size: 13px;
}

.hours {
  color: #9ca3af;
  font-size: 13px;
}

.resource-actions {
  display: flex;
  gap: 8px;
}

.btn-edit,
.btn-delete {
  padding: 4px 12px;
  border: none;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
}

.btn-edit {
  background: #e5e7eb;
  color: #374151;
}

.btn-edit:hover {
  background: #d1d5db;
}

.btn-delete {
  background: #fee2e2;
  color: #dc2626;
}

.btn-delete:hover {
  background: #fecaca;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid #e5e7eb;
}

.btn-close-dialog {
  padding: 8px 20px;
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
}

.btn-close-dialog:hover {
  background: #e5e7eb;
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: #9ca3af;
  font-size: 14px;
}
</style>

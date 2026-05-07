<template>
  <div class="project-selector">
    <select 
      v-model="selectedId" 
      @change="handleChange"
      class="project-select"
    >
      <option value="">-- 选择项目 --</option>
      <option v-for="project in projects" :key="project.id" :value="project.id">
        {{ project.name }}
      </option>
    </select>
    <button @click="showCreateDialog = true" class="btn-create">
      + 新建项目
    </button>

    <Teleport to="body">
      <div v-if="showCreateDialog" class="dialog-overlay" @click.self="showCreateDialog = false">
        <div class="dialog">
          <h3>新建项目</h3>
          <div class="form-group">
            <label>项目名称</label>
            <input v-model="newProjectName" type="text" placeholder="请输入项目名称" />
          </div>
          <div class="form-group">
            <label>描述</label>
            <textarea v-model="newProjectDesc" placeholder="项目描述（可选）"></textarea>
          </div>
          <div class="dialog-actions">
            <button @click="showCreateDialog = false" class="btn-cancel">取消</button>
            <button @click="createProject" class="btn-primary">创建</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useGanttStore } from '@/stores/ganttStore'

const store = useGanttStore()

const projects = computed(() => store.projects)
const selectedId = ref<string>('')
const showCreateDialog = ref(false)
const newProjectName = ref('')
const newProjectDesc = ref('')

watch(() => store.currentProjectId, (id) => {
  selectedId.value = id || ''
})

function handleChange() {
  store.switchProject(selectedId.value || null)
}

async function createProject() {
  if (!newProjectName.value.trim()) return

  const project = await store.createProject(
    newProjectName.value.trim(),
    newProjectDesc.value.trim()
  )
  
  selectedId.value = project.id
  store.switchProject(project.id)
  
  newProjectName.value = ''
  newProjectDesc.value = ''
  showCreateDialog.value = false
}
</script>

<style scoped>
.project-selector {
  display: flex;
  align-items: center;
  gap: 12px;
}

.project-select {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  min-width: 200px;
  background: white;
  cursor: pointer;
}

.project-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.btn-create {
  padding: 8px 16px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-create:hover {
  background: #2563eb;
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
  max-width: 90vw;
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

.form-group input,
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
.form-group textarea:focus {
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
</style>

<template>
  <Teleport to="body">
    <div 
      v-if="visible" 
      class="context-menu-overlay"
      @click="handleClickOutside"
    >
      <div 
        class="context-menu"
        :style="{ left: position.x + 'px', top: position.y + 'px' }"
      >
        <div 
          v-for="item in menuItems" 
          :key="item.action"
          :class="['menu-item', { disabled: item.disabled, divider: item.divider }]"
          @click="handleAction(item.action)"
        >
          <span class="menu-label">{{ item.label }}</span>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Task } from '@/types'

interface Props {
  visible: boolean
  position: { x: number; y: number }
  task: Task | null
}

const props = defineProps<Props>()

interface Emits {
  action: [action: string, task: Task | null]
  close: []
}

const emit = defineEmits<Emits>()

interface MenuItem {
  action: string
  label: string
  disabled?: boolean
  divider?: boolean
}

const menuItems = computed<MenuItem[]>(() => {
  const items: MenuItem[] = []
  
  if (props.task) {
    items.push({ action: 'edit', label: '编辑任务' })
    items.push({ action: 'add-child', label: '添加子任务', disabled: props.task.level >= 3 })
    items.push({ action: 'mark-complete', label: props.task.progress >= 100 ? '取消完成' : '标记完成' })
    items.push({ action: 'set-predecessor', label: '设置前置任务' })
    items.push({ action: 'divider1', label: '', divider: true })
    items.push({ action: 'delete', label: '删除任务' })
  } else {
    items.push({ action: 'add', label: '添加任务' })
  }
  
  return items
})

function handleAction(action: string): void {
  emit('action', action, props.task)
}

function handleClickOutside(): void {
  emit('close')
}
</script>

<style scoped>
.context-menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1001;
}

.context-menu {
  position: absolute;
  background: white;
  border-radius: 6px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  border: 1px solid #e5e7eb;
  min-width: 160px;
  z-index: 1002;
  padding: 4px 0;
}

.menu-item {
  padding: 8px 16px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.15s;
}

.menu-item:hover:not(.disabled) {
  background: #f3f4f6;
}

.menu-item.disabled {
  color: #9ca3af;
  cursor: not-allowed;
}

.menu-item.divider {
  height: 1px;
  padding: 0;
  margin: 4px 0;
  background: #e5e7eb;
  cursor: default;
}

.menu-label {
  display: block;
  color: #374151;
}

.menu-item.disabled .menu-label {
  color: #9ca3af;
}
</style>

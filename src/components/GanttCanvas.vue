<template>
  <div 
    class="gantt-canvas-container"
    @wheel="handleWheel"
    @mousedown="handleMouseDown"
    @mousemove="handleMouseMove"
    @mouseup="handleMouseUp"
    @mouseleave="handleMouseUp"
    @contextmenu.prevent="handleContextMenu"
  >
    <div 
      class="gantt-scroll-container"
      ref="scrollRef"
      @scroll="handleScroll"
    >
      <div class="gantt-wrapper" :style="{ width: totalWidth + 'px', height: totalHeight + 'px' }">
        <canvas 
          ref="canvasRef"
          :width="canvasWidth"
          :height="canvasHeight"
          class="gantt-canvas"
        ></canvas>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { TaskStatus, TimeUnit } from '@/types'
import type { Task, Dependency } from '@/types'
import { useGanttStore } from '@/stores/ganttStore'

const store = useGanttStore()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const scrollRef = ref<HTMLElement | null>(null)
const canvasWidth = ref(1200)
const canvasHeight = ref(600)

const ROW_HEIGHT = 36
const TIMELINE_HEIGHT = 60
const CELL_MIN_WIDTH = 60
const TASK_HEIGHT = 24
const TASK_PADDING = 6

const isDragging = ref(false)
const dragType = ref<string | null>(null)
const dragTaskId = ref<string | null>(null)
const dragStartX = ref(0)
const dragStartY = ref(0)
const dragStartDate = ref<Date | null>(null)
const dragStartProgress = ref(0)

const isResizingDependency = ref(false)
const dependencyFromTaskId = ref<string | null>(null)
const dependencyStartX = ref(0)
const dependencyStartY = ref(0)

const visibleTasks = computed(() => store.visibleTasks)
const timeUnit = computed(() => store.timeUnit)
const zoom = computed(() => store.zoom)

const cellWidth = computed(() => CELL_MIN_WIDTH * zoom.value)

const projectDateRange = computed(() => {
  const tasks = store.tasks
  if (tasks.length === 0) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const start = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
    const end = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000)
    return { start, end }
  }

  let minDate = new Date(tasks[0].startDate)
  let maxDate = new Date(tasks[0].endDate)

  for (const task of tasks) {
    const start = new Date(task.startDate)
    const end = new Date(task.endDate)
    if (start < minDate) minDate = start
    if (end > maxDate) maxDate = end
  }

  minDate = new Date(minDate.getTime() - 15 * 24 * 60 * 60 * 1000)
  maxDate = new Date(maxDate.getTime() + 15 * 24 * 60 * 60 * 1000)

  return { start: minDate, end: maxDate }
})

const totalWidth = computed(() => {
  const { start, end } = projectDateRange.value
  const days = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1
  return days * cellWidth.value + 200
})

const totalHeight = computed(() => {
  return TIMELINE_HEIGHT + visibleTasks.value.length * ROW_HEIGHT + 100
})

defineEmits<{
  contextMenu: [event: MouseEvent, task?: Task]
  taskClick: [task: Task]
}>()

function dateToX(date: Date): number {
  const { start } = projectDateRange.value
  const days = (date.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)
  return Math.round(days * cellWidth.value)
}

function xToDate(x: number): Date {
  const { start } = projectDateRange.value
  const days = x / cellWidth.value
  const date = new Date(start.getTime() + days * 24 * 60 * 60 * 1000)
  date.setHours(0, 0, 0, 0)
  return date
}

function getTaskColor(task: Task): string {
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

function render(): void {
  const canvas = canvasRef.value
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const width = canvas.width
  const height = canvas.height
  
  ctx.clearRect(0, 0, width, height)

  const scrollX = store.scrollLeft
  const scrollY = store.scrollTop

  drawTimeline(ctx, scrollX)
  drawGrid(ctx, scrollX, scrollY)
  drawTodayLine(ctx, scrollX, scrollY)
  
  if (store.selectedBaseline) {
    drawBaselines(ctx, scrollX, scrollY)
  }
  
  drawDependencies(ctx, scrollX, scrollY)
  drawTasks(ctx, scrollX, scrollY)
  
  if (isResizingDependency.value) {
    drawDependencyPreview(ctx, scrollX, scrollY)
  }
}

function drawTimeline(ctx: CanvasRenderingContext2D, scrollX: number): void {
  const { start, end } = projectDateRange.value
  const width = canvasWidth.value
  
  ctx.fillStyle = '#f9fafb'
  ctx.fillRect(0, 0, width, TIMELINE_HEIGHT)
  
  ctx.strokeStyle = '#e5e7eb'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, TIMELINE_HEIGHT)
  ctx.lineTo(width, TIMELINE_HEIGHT)
  ctx.stroke()

  ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif'
  ctx.fillStyle = '#6b7280'
  ctx.textAlign = 'center'

  let currentDate = new Date(start)
  currentDate.setHours(0, 0, 0, 0)

  while (currentDate <= end) {
    const x = dateToX(currentDate) - scrollX
    
    if (timeUnit.value === TimeUnit.DAY) {
      const day = currentDate.getDate()
      ctx.fillText(day.toString(), x + cellWidth.value / 2, 50)
      
      if (currentDate.getDate() === 1) {
        const month = currentDate.toLocaleDateString('zh-CN', { month: 'short' })
        ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif'
        ctx.fillStyle = '#374151'
        ctx.fillText(month, x + cellWidth.value / 2, 25)
        ctx.fillStyle = '#6b7280'
      }
    } else if (timeUnit.value === TimeUnit.WEEK) {
      const weekNum = getWeekNumber(currentDate)
      if (currentDate.getDay() === 1) {
        ctx.fillText(`第${weekNum}周`, x + 3 * cellWidth.value, 50)
      }
    } else if (timeUnit.value === TimeUnit.MONTH) {
      if (currentDate.getDate() === 1) {
        const month = currentDate.toLocaleDateString('zh-CN', { month: 'long' })
        ctx.fillText(month, x + 15 * cellWidth.value, 50)
      }
    } else if (timeUnit.value === TimeUnit.QUARTER) {
      const quarter = Math.floor(currentDate.getMonth() / 3) + 1
      if (currentDate.getMonth() % 3 === 0 && currentDate.getDate() === 1) {
        ctx.fillText(`Q${quarter}`, x + 45 * cellWidth.value, 50)
      }
    }

    currentDate.setDate(currentDate.getDate() + 1)
  }
}

function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1)
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
}

function drawGrid(ctx: CanvasRenderingContext2D, scrollX: number, scrollY: number): void {
  const { start, end } = projectDateRange.value
  const width = canvasWidth.value
  const height = canvasHeight.value

  ctx.strokeStyle = '#f3f4f6'
  ctx.lineWidth = 1

  let currentDate = new Date(start)
  currentDate.setHours(0, 0, 0, 0)

  while (currentDate <= end) {
    const x = dateToX(currentDate) - scrollX
    
    if (x >= 0 && x <= width) {
      ctx.beginPath()
      ctx.moveTo(x, TIMELINE_HEIGHT)
      ctx.lineTo(x, height)
      ctx.stroke()
    }

    currentDate.setDate(currentDate.getDate() + 1)
  }

  for (let i = 0; i < visibleTasks.value.length + 1; i++) {
    const y = TIMELINE_HEIGHT + i * ROW_HEIGHT - scrollY
    if (y >= TIMELINE_HEIGHT && y <= height) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }
  }
}

function drawTodayLine(ctx: CanvasRenderingContext2D, scrollX: number, scrollY: number): void {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const x = dateToX(today) - scrollX

  if (x >= 0 && x <= canvasWidth.value) {
    ctx.strokeStyle = '#ef4444'
    ctx.lineWidth = 2
    ctx.setLineDash([5, 5])
    ctx.beginPath()
    ctx.moveTo(x, TIMELINE_HEIGHT - scrollY)
    ctx.lineTo(x, canvasHeight.value)
    ctx.stroke()
    ctx.setLineDash([])

    ctx.fillStyle = '#ef4444'
    ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('今天', x, TIMELINE_HEIGHT - 15)
  }
}

function drawTasks(ctx: CanvasRenderingContext2D, scrollX: number, scrollY: number): void {
  visibleTasks.value.forEach((task, index) => {
    const y = TIMELINE_HEIGHT + index * ROW_HEIGHT + TASK_PADDING - scrollY
    
    if (y < -TASK_HEIGHT || y > canvasHeight.value) return

    const startDate = new Date(task.startDate)
    const endDate = new Date(task.endDate)
    
    const startX = dateToX(startDate) - scrollX
    const taskWidth = Math.max(
      (endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000) * cellWidth.value,
      10
    )

    if (task.isMilestone) {
      drawMilestone(ctx, task, startX + taskWidth / 2, y + TASK_HEIGHT / 2)
    } else {
      drawTaskBar(ctx, task, startX, y, taskWidth)
    }
  })
}

function drawTaskBar(
  ctx: CanvasRenderingContext2D,
  task: Task,
  x: number,
  y: number,
  width: number
): void {
  const color = getTaskColor(task)
  const radius = 4
  const progressWidth = width * (task.progress / 100)

  ctx.save()
  
  if (x + width < 0 || x > canvasWidth.value) {
    ctx.restore()
    return
  }

  ctx.fillStyle = color
  ctx.globalAlpha = 0.8
  
  ctx.beginPath()
  ctx.roundRect(x, y, width, TASK_HEIGHT, radius)
  ctx.fill()

  if (task.progress > 0 && task.progress < 100) {
    ctx.fillStyle = color
    ctx.globalAlpha = 0.4
    ctx.beginPath()
    ctx.roundRect(x + progressWidth, y, width - progressWidth, TASK_HEIGHT, [0, radius, radius, 0])
    ctx.fill()

    ctx.globalAlpha = 0.8
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.roundRect(x, y, progressWidth, TASK_HEIGHT, [radius, 0, 0, radius])
    ctx.fill()
  }

  if (task.isCriticalPath || store.selectedTaskId === task.id) {
    ctx.strokeStyle = task.isCriticalPath ? '#dc2626' : '#2563eb'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.roundRect(x - 1, y - 1, width + 2, TASK_HEIGHT + 2, radius + 1)
    ctx.stroke()
  }

  ctx.globalAlpha = 1
  ctx.fillStyle = '#ffffff'
  ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif'
  ctx.textAlign = 'left'

  if (width > 50) {
    const maxTextWidth = width - 10
    ctx.save()
    ctx.beginPath()
    ctx.roundRect(x, y, width, TASK_HEIGHT, radius)
    ctx.clip()
    
    const displayName = task.name.length > 20 ? task.name.substring(0, 17) + '...' : task.name
    ctx.fillText(displayName, x + 8, y + 16)
    ctx.restore()
  }

  ctx.restore()
}

function drawMilestone(
  ctx: CanvasRenderingContext2D,
  task: Task,
  x: number,
  y: number
): void {
  const size = 14
  const color = '#8b5cf6'

  ctx.save()
  ctx.fillStyle = color
  ctx.strokeStyle = store.selectedTaskId === task.id ? '#2563eb' : color
  ctx.lineWidth = 2

  ctx.beginPath()
  ctx.moveTo(x, y - size / 2)
  ctx.lineTo(x + size / 2, y)
  ctx.lineTo(x, y + size / 2)
  ctx.lineTo(x - size / 2, y)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  ctx.restore()
}

function drawBaselines(ctx: CanvasRenderingContext2D, scrollX: number, scrollY: number): void {
  const baseline = store.selectedBaseline
  if (!baseline) return

  visibleTasks.value.forEach((task, index) => {
    const baselineTask = baseline.tasks.find(t => t.taskId === task.id)
    if (!baselineTask) return

    const y = TIMELINE_HEIGHT + index * ROW_HEIGHT + TASK_PADDING + TASK_HEIGHT - scrollY + 4
    
    if (y < 0 || y > canvasHeight.value) return

    const startDate = new Date(baselineTask.startDate)
    const endDate = new Date(baselineTask.endDate)
    
    const startX = dateToX(startDate) - scrollX
    const taskWidth = Math.max(
      (endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000) * cellWidth.value,
      10
    )

    if (startX + taskWidth < 0 || startX > canvasWidth.value) return

    ctx.fillStyle = 'rgba(156, 163, 175, 0.4)'
    ctx.fillRect(startX, y, taskWidth, 6)

    if (startX !== dateToX(new Date(task.startDate)) - scrollX || 
        taskWidth !== (new Date(task.endDate).getTime() - new Date(task.startDate).getTime()) / (24 * 60 * 60 * 1000) * cellWidth.value) {
      ctx.fillStyle = '#f97316'
      ctx.beginPath()
      ctx.arc(startX + taskWidth / 2, y + 3, 4, 0, Math.PI * 2)
      ctx.fill()
    }
  })
}

function drawDependencies(ctx: CanvasRenderingContext2D, scrollX: number, scrollY: number): void {
  const dependencies = store.dependencies

  dependencies.forEach(dep => {
    const fromIndex = visibleTasks.value.findIndex(t => t.id === dep.fromTaskId)
    const toIndex = visibleTasks.value.findIndex(t => t.id === dep.toTaskId)

    if (fromIndex === -1 || toIndex === -1) return

    const fromTask = visibleTasks.value[fromIndex]
    const toTask = visibleTasks.value[toIndex]

    const fromY = TIMELINE_HEIGHT + fromIndex * ROW_HEIGHT + TASK_HEIGHT / 2 + TASK_PADDING - scrollY
    const toY = TIMELINE_HEIGHT + toIndex * ROW_HEIGHT + TASK_HEIGHT / 2 + TASK_PADDING - scrollY

    const fromEndX = dateToX(new Date(fromTask.endDate)) - scrollX
    const toStartX = dateToX(new Date(toTask.startDate)) - scrollX

    if (fromY < TIMELINE_HEIGHT || toY < TIMELINE_HEIGHT) return

    const color = dep.hasConflict ? '#ef4444' : '#9ca3af'
    const lineWidth = dep.hasConflict ? 2 : 1

    ctx.save()
    ctx.strokeStyle = color
    ctx.lineWidth = lineWidth
    ctx.fillStyle = color

    ctx.beginPath()
    ctx.moveTo(fromEndX, fromY)
    ctx.lineTo(fromEndX + 10, fromY)
    ctx.lineTo(fromEndX + 10, toY)
    ctx.lineTo(toStartX - 10, toY)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(toStartX - 10, toY - 5)
    ctx.lineTo(toStartX - 10, toY + 5)
    ctx.lineTo(toStartX - 4, toY)
    ctx.closePath()
    ctx.fill()

    ctx.restore()
  })
}

function drawDependencyPreview(ctx: CanvasRenderingContext2D, scrollX: number, scrollY: number): void {
  if (!dependencyFromTaskId.value) return

  const fromIndex = visibleTasks.value.findIndex(t => t.id === dependencyFromTaskId.value)
  if (fromIndex === -1) return

  const fromTask = visibleTasks.value[fromIndex]
  const fromY = TIMELINE_HEIGHT + fromIndex * ROW_HEIGHT + TASK_HEIGHT / 2 + TASK_PADDING - scrollY
  const fromEndX = dateToX(new Date(fromTask.endDate)) - scrollX

  const currentX = dependencyStartX.value + (dragStartX.value - store.scrollLeft) - scrollX
  const currentY = dependencyStartY.value

  ctx.save()
  ctx.strokeStyle = '#3b82f6'
  ctx.lineWidth = 2
  ctx.setLineDash([5, 5])

  ctx.beginPath()
  ctx.moveTo(fromEndX, fromY)
  ctx.lineTo(fromEndX + 10, fromY)
  ctx.lineTo(fromEndX + 10, currentY)
  ctx.lineTo(currentX, currentY)
  ctx.stroke()

  ctx.restore()
}

function handleWheel(e: WheelEvent): void {
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    store.setZoom(store.zoom + delta)
  }
}

function getTaskAtPosition(x: number, y: number): Task | null {
  const scrollX = store.scrollLeft
  const scrollY = store.scrollTop

  for (let i = 0; i < visibleTasks.value.length; i++) {
    const task = visibleTasks.value[i]
    const taskY = TIMELINE_HEIGHT + i * ROW_HEIGHT + TASK_PADDING - scrollY
    const startDate = new Date(task.startDate)
    const endDate = new Date(task.endDate)
    const startX = dateToX(startDate) - scrollX
    const taskWidth = Math.max(
      (endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000) * cellWidth.value,
      10
    )

    if (y >= taskY && y <= taskY + TASK_HEIGHT &&
        x >= startX - 5 && x <= startX + taskWidth + 5) {
      return task
    }
  }
  return null
}

function handleMouseDown(e: MouseEvent): void {
  const canvas = canvasRef.value
  if (!canvas) return

  const rect = canvas.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top

  const task = getTaskAtPosition(x, y)
  
  if (task) {
    const startDate = new Date(task.startDate)
    const endDate = new Date(task.endDate)
    const startX = dateToX(startDate) - store.scrollLeft
    const taskWidth = Math.max(
      (endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000) * cellWidth.value,
      10
    )

    const relativeX = x + store.scrollLeft
    const taskStartX = startX + store.scrollLeft
    const taskEndX = taskStartX + taskWidth
    const progressX = taskStartX + taskWidth * (task.progress / 100)

    if (task.progress > 0 && task.progress < 100 && 
        relativeX >= progressX - 8 && relativeX <= progressX + 8) {
      dragType.value = 'progress'
    } else if (relativeX >= taskEndX - 8 && relativeX <= taskEndX + 8) {
      dragType.value = 'resize-end'
    } else if (relativeX >= taskStartX - 8 && relativeX <= taskStartX + 8) {
      dragType.value = 'resize-start'
    } else if (relativeX >= taskEndX - 20 && relativeX <= taskEndX) {
      isResizingDependency.value = true
      dependencyFromTaskId.value = task.id
      dependencyStartX.value = x
      dependencyStartY.value = y
      return
    } else {
      dragType.value = 'move'
    }

    isDragging.value = true
    dragTaskId.value = task.id
    dragStartX.value = relativeX
    dragStartDate.value = new Date(task.startDate)
    dragStartProgress.value = task.progress

    store.selectTask(task.id)
  }
}

function handleMouseMove(e: MouseEvent): void {
  const canvas = canvasRef.value
  if (!canvas) return

  const rect = canvas.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top

  if (isResizingDependency.value) {
    dependencyStartX.value = x
    dependencyStartY.value = y
    render()
    return
  }

  if (!isDragging.value || !dragTaskId.value) return

  const task = store.getTaskById(dragTaskId.value)
  if (!task) return

  const currentX = x + store.scrollLeft
  const deltaX = currentX - dragStartX.value
  const deltaDays = Math.round(deltaX / cellWidth.value)

  if (dragType.value === 'progress') {
    const startDate = new Date(task.startDate)
    const endDate = new Date(task.endDate)
    const startX = dateToX(startDate) - store.scrollLeft
    const taskWidth = Math.max(
      (endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000) * cellWidth.value,
      10
    )

    const progressDelta = (deltaX / taskWidth) * 100
    const newProgress = Math.max(0, Math.min(100, Math.round(dragStartProgress.value + progressDelta)))

    if (newProgress !== task.progress) {
      store.updateTask(task.id, { progress: newProgress })
    }

    render()
    return
  }

  if (dragType.value === 'move') {
    if (deltaDays !== 0) {
      const newStart = new Date(dragStartDate.value!.getTime() + deltaDays * 24 * 60 * 60 * 1000)
      const newEnd = new Date(newStart.getTime() + (task.duration - 1) * 24 * 60 * 60 * 1000)
      
      store.updateTask(task.id, {
        startDate: newStart.toISOString().split('T')[0],
        endDate: newEnd.toISOString().split('T')[0]
      })
      
      dragStartDate.value = newStart
      dragStartX.value = currentX
    }
  } else if (dragType.value === 'resize-start') {
    const newStart = new Date(dragStartDate.value!.getTime() + deltaDays * 24 * 60 * 60 * 1000)
    const originalEnd = new Date(task.endDate)
    
    if (newStart < originalEnd) {
      const newDuration = Math.ceil((originalEnd.getTime() - newStart.getTime()) / (24 * 60 * 60 * 1000)) + 1
      
      store.updateTask(task.id, {
        startDate: newStart.toISOString().split('T')[0],
        duration: newDuration
      })
      
      dragStartDate.value = newStart
      dragStartX.value = currentX
    }
  } else if (dragType.value === 'resize-end') {
    const originalStart = new Date(task.startDate)
    const newEnd = new Date(originalStart.getTime() + (task.duration - 1 + deltaDays) * 24 * 60 * 60 * 1000)
    
    if (newEnd > originalStart) {
      const newDuration = Math.ceil((newEnd.getTime() - originalStart.getTime()) / (24 * 60 * 60 * 1000)) + 1
      
      store.updateTask(task.id, {
        endDate: newEnd.toISOString().split('T')[0],
        duration: newDuration
      })
      
      dragStartX.value = currentX
    }
  }

  render()
}

function handleMouseUp(e: MouseEvent): void {
  if (isResizingDependency.value && dependencyFromTaskId.value) {
    const canvas = canvasRef.value
    if (canvas) {
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const targetTask = getTaskAtPosition(x, e.clientY - rect.top)
      
      if (targetTask && targetTask.id !== dependencyFromTaskId.value) {
        store.createDependency(dependencyFromTaskId.value, targetTask.id)
      }
    }
  }

  isDragging.value = false
  dragType.value = null
  dragTaskId.value = null
  isResizingDependency.value = false
  dependencyFromTaskId.value = null
}

function handleScroll(e: Event): void {
  const target = e.target as HTMLElement
  store.setScrollLeft(target.scrollLeft)
  store.setScrollTop(target.scrollTop)
}

function handleContextMenu(e: MouseEvent): void {
  const canvas = canvasRef.value
  if (!canvas) return

  const rect = canvas.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top

  const task = getTaskAtPosition(x, y)
  store.selectTask(task?.id || null)
}

function updateCanvasSize(): void {
  const defaultWidth = 1200
  const defaultHeight = 600
  
  if (scrollRef.value) {
    const container = scrollRef.value
    const containerWidth = container.clientWidth || defaultWidth
    const containerHeight = container.clientHeight || defaultHeight
    
    canvasWidth.value = Math.max(containerWidth, totalWidth.value, defaultWidth)
    canvasHeight.value = Math.max(containerHeight, totalHeight.value, defaultHeight)
  } else {
    canvasWidth.value = Math.max(totalWidth.value, defaultWidth)
    canvasHeight.value = Math.max(totalHeight.value, defaultHeight)
  }
}

watch([visibleTasks, timeUnit, zoom, () => store.dependencies, () => store.selectedBaseline, () => store.filterByAssigneeId], () => {
  nextTick(() => {
    updateCanvasSize()
    render()
  })
})

watch([() => store.scrollLeft, () => store.scrollTop], () => {
  render()
})

onMounted(() => {
  nextTick(() => {
    updateCanvasSize()
    render()
  })

  window.addEventListener('resize', () => {
    updateCanvasSize()
    render()
  })
})

onUnmounted(() => {
  window.removeEventListener('resize', () => {
    updateCanvasSize()
    render()
  })
})
</script>

<style scoped>
.gantt-canvas-container {
  width: 100%;
  height: 100%;
  min-height: 400px;
  position: relative;
  background: white;
  display: flex;
  flex-direction: column;
}

.gantt-scroll-container {
  flex: 1;
  width: 100%;
  min-height: 300px;
  overflow: auto;
}

.gantt-wrapper {
  position: relative;
  min-width: 100%;
}

.gantt-canvas {
  display: block;
  cursor: default;
}

.gantt-canvas:active {
  cursor: grabbing;
}
</style>

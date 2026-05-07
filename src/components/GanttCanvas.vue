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
import { useGanttStore } from '@/stores/ganttStore'
import { drawTimeline, drawGrid, drawTodayLine } from '@/canvas/renderer/timeline'
import { drawTasks, drawBaselines } from '@/canvas/renderer/taskBar'
import { drawDependencies, drawDependencyPreview } from '@/canvas/renderer/dependency'
import { getProjectDateRange } from '@/utils/coordinate'
import { useGanttDrag } from '@/composables/useGanttDrag'
import { useDependencyDraw } from '@/composables/useDependencyDraw'

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

const visibleTasks = computed(() => store.visibleTasks)
const timeUnit = computed(() => store.timeUnit)
const zoom = computed(() => store.zoom)
const cellWidth = computed(() => CELL_MIN_WIDTH * zoom.value)

const projectDateRange = computed(() => getProjectDateRange(store.tasks))
const totalWidth = computed(() => {
  const { start, end } = projectDateRange.value
  const days = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1
  return days * cellWidth.value + 200
})
const totalHeight = computed(() => TIMELINE_HEIGHT + visibleTasks.value.length * ROW_HEIGHT + 100)

defineEmits<{
  contextMenu: [event: MouseEvent, task?: any]
  taskClick: [task: any]
}>()

const constants = { ROW_HEIGHT, TIMELINE_HEIGHT, TASK_HEIGHT, TASK_PADDING, CELL_MIN_WIDTH }
const { getTaskAtPosition, handleMouseDown: dragMouseDown, handleMouseMove: dragMouseMove, reset: resetDrag } = useGanttDrag(
  constants,
  () => cellWidth.value,
  () => projectDateRange.value.start
)
const { state: dependencyState, startDrawing, updatePosition, finishDrawing, reset: resetDependency } = useDependencyDraw(
  () => projectDateRange.value.start,
  () => cellWidth.value,
  () => store.scrollLeft
)

function render(): void {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  const scrollX = store.scrollLeft
  const scrollY = store.scrollTop

  drawTimeline(ctx, {
    projectStart: projectDateRange.value.start,
    projectEnd: projectDateRange.value.end,
    cellWidth: cellWidth.value,
    timelineHeight: TIMELINE_HEIGHT,
    canvasWidth: canvasWidth.value,
    scrollX,
    timeUnit: timeUnit.value
  })

  drawGrid(ctx, {
    projectStart: projectDateRange.value.start,
    projectEnd: projectDateRange.value.end,
    cellWidth: cellWidth.value,
    timelineHeight: TIMELINE_HEIGHT,
    rowHeight: ROW_HEIGHT,
    visibleTaskCount: visibleTasks.value.length,
    canvasWidth: canvasWidth.value,
    canvasHeight: canvasHeight.value,
    scrollX,
    scrollY
  })

  drawTodayLine(ctx, {
    projectStart: projectDateRange.value.start,
    cellWidth: cellWidth.value,
    timelineHeight: TIMELINE_HEIGHT,
    canvasWidth: canvasWidth.value,
    canvasHeight: canvasHeight.value,
    scrollX,
    scrollY
  })

  if (store.selectedBaseline) {
    drawBaselines(ctx, {
      tasks: visibleTasks.value,
      baseline: store.selectedBaseline,
      projectStart: projectDateRange.value.start,
      cellWidth: cellWidth.value,
      timelineHeight: TIMELINE_HEIGHT,
      rowHeight: ROW_HEIGHT,
      taskHeight: TASK_HEIGHT,
      taskPadding: TASK_PADDING,
      canvasWidth: canvasWidth.value,
      canvasHeight: canvasHeight.value,
      scrollX,
      scrollY
    })
  }

  drawDependencies(ctx, {
    tasks: visibleTasks.value,
    dependencies: store.dependencies,
    projectStart: projectDateRange.value.start,
    cellWidth: cellWidth.value,
    timelineHeight: TIMELINE_HEIGHT,
    rowHeight: ROW_HEIGHT,
    taskHeight: TASK_HEIGHT,
    taskPadding: TASK_PADDING,
    canvasWidth: canvasWidth.value,
    scrollX,
    scrollY
  })

  drawTasks(ctx, {
    tasks: visibleTasks.value,
    projectStart: projectDateRange.value.start,
    cellWidth: cellWidth.value,
    timelineHeight: TIMELINE_HEIGHT,
    rowHeight: ROW_HEIGHT,
    taskHeight: TASK_HEIGHT,
    taskPadding: TASK_PADDING,
    canvasWidth: canvasWidth.value,
    canvasHeight: canvasHeight.value,
    scrollX,
    scrollY,
    selectedTaskId: store.selectedTaskId
  })

  if (dependencyState.value.isResizingDependency) {
    drawDependencyPreview(ctx, {
      tasks: visibleTasks.value,
      fromTaskId: dependencyState.value.dependencyFromTaskId!,
      projectStart: projectDateRange.value.start,
      cellWidth: cellWidth.value,
      timelineHeight: TIMELINE_HEIGHT,
      rowHeight: ROW_HEIGHT,
      taskHeight: TASK_HEIGHT,
      taskPadding: TASK_PADDING,
      canvasWidth: canvasWidth.value,
      scrollX,
      scrollY,
      currentX: dependencyState.value.dependencyStartX,
      currentY: dependencyState.value.dependencyStartY
    })
  }
}

function getCanvasPosition(e: MouseEvent): { x: number; y: number } {
  const canvas = canvasRef.value
  if (!canvas) return { x: 0, y: 0 }
  const rect = canvas.getBoundingClientRect()
  return { x: e.clientX - rect.left, y: e.clientY - rect.top }
}

function handleWheel(e: WheelEvent): void {
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    store.setZoom(store.zoom + delta)
  }
}

function handleMouseDown(e: MouseEvent): void {
  const { x, y } = getCanvasPosition(e)
  const result = dragMouseDown(x, y)
  if (result.startedDependency && result.task) {
    startDrawing(result.task, x, y)
  }
}

function handleMouseMove(e: MouseEvent): void {
  const { x, y } = getCanvasPosition(e)
  if (dependencyState.value.isResizingDependency) {
    updatePosition(x, y)
    render()
    return
  }
  dragMouseMove(x, y)
  render()
}

function handleMouseUp(e: MouseEvent): void {
  if (dependencyState.value.isResizingDependency) {
    const { x, y } = getCanvasPosition(e)
    finishDrawing(getTaskAtPosition, x, y)
    render()
    return
  }
  resetDrag()
}

function handleScroll(e: Event): void {
  const target = e.target as HTMLElement
  store.setScrollLeft(target.scrollLeft)
  store.setScrollTop(target.scrollTop)
}

function handleContextMenu(e: MouseEvent): void {
  const { x, y } = getCanvasPosition(e)
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

function onResize(): void {
  updateCanvasSize()
  render()
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
  window.addEventListener('resize', onResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
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

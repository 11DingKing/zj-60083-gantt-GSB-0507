<template>
  <div class="gantt-canvas-container" @wheel="handleWheel" @mousedown="onMouseDown"
    @mousemove="onMouseMove" @mouseup="onMouseUp" @mouseleave="onMouseUp" @contextmenu.prevent="handleContextMenu">
    <div class="gantt-scroll-container" ref="scrollRef" @scroll="handleScroll">
      <div class="gantt-wrapper" :style="{ width: totalWidth + 'px', height: totalHeight + 'px' }">
        <canvas ref="canvasRef" :width="canvasWidth" :height="canvasHeight" class="gantt-canvas"></canvas>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import type { Task } from '@/types'
import { useGanttStore } from '@/stores/ganttStore'
import { CELL_MIN_WIDTH, TIMELINE_HEIGHT, ROW_HEIGHT, computeProjectDateRange, dateToX } from '@/utils/coordinate'
import * as timelineRenderer from '@/canvas/renderer/timeline'
import * as taskBarRenderer from '@/canvas/renderer/taskBar'
import * as dependencyRenderer from '@/canvas/renderer/dependency'
import { useGanttDrag } from '@/composables/useGanttDrag'
import { useDependencyDraw } from '@/composables/useDependencyDraw'

const store = useGanttStore()
const drag = useGanttDrag()
const depDraw = useDependencyDraw()
const canvasRef = ref<HTMLCanvasElement | null>(null)
const scrollRef = ref<HTMLElement | null>(null)
const canvasWidth = ref(1200)
const canvasHeight = ref(600)
const visibleTasks = computed(() => store.visibleTasks)
const timeUnit = computed(() => store.timeUnit)
const zoom = computed(() => store.zoom)
const cellWidth = computed(() => CELL_MIN_WIDTH * zoom.value)
const projectDateRange = computed(() => computeProjectDateRange(store.tasks))
const rangeStart = computed(() => projectDateRange.value.start)
const rangeEnd = computed(() => projectDateRange.value.end)
const totalWidth = computed(() => {
  const days = Math.ceil((rangeEnd.value.getTime() - rangeStart.value.getTime()) / (24 * 60 * 60 * 1000)) + 1
  return days * cellWidth.value + 200
})
const totalHeight = computed(() => TIMELINE_HEIGHT + visibleTasks.value.length * ROW_HEIGHT + 100)

defineEmits<{ contextMenu: [event: MouseEvent, task?: Task]; taskClick: [task: Task] }>()

function render(): void {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  const scrollX = store.scrollLeft, scrollY = store.scrollTop
  const cw = canvasWidth.value, ch = canvasHeight.value
  const rs = rangeStart.value, cwid = cellWidth.value
  const tasks = visibleTasks.value

  timelineRenderer.draw({ ctx, scrollX, canvasWidth: cw, rangeStart: rs, rangeEnd: rangeEnd.value, cellWidth: cwid, timeUnit: timeUnit.value })
  timelineRenderer.drawGrid({ ctx, scrollX, scrollY, canvasWidth: cw, canvasHeight: ch, rangeStart: rs, rangeEnd: rangeEnd.value, cellWidth: cwid, visibleTaskCount: tasks.length })
  timelineRenderer.drawTodayLine({ ctx, scrollX, scrollY, canvasWidth: cw, canvasHeight: ch, rangeStart: rs, cellWidth: cwid })

  if (store.selectedBaseline) {
    taskBarRenderer.drawBaselines({ ctx, scrollX, scrollY, canvasWidth: cw, canvasHeight: ch, rangeStart: rs, cellWidth: cwid, visibleTasks: tasks, baseline: store.selectedBaseline, dateToXFn: (d: Date) => dateToX(d, rs, cwid) })
  }

  dependencyRenderer.draw({ ctx, scrollX, scrollY, canvasWidth: cw, canvasHeight: ch, rangeStart: rs, cellWidth: cwid, visibleTasks: tasks, dependencies: store.dependencies })
  taskBarRenderer.draw({ ctx, scrollX, scrollY, canvasWidth: cw, canvasHeight: ch, rangeStart: rs, cellWidth: cwid, visibleTasks: tasks, selectedTaskId: store.selectedTaskId })

  if (depDraw.isResizing.value && depDraw.fromTaskId.value) {
    dependencyRenderer.drawPreview({ ctx, scrollX, scrollY, rangeStart: rs, cellWidth: cwid, visibleTasks: tasks, fromTaskId: depDraw.fromTaskId.value, currentX: depDraw.currentX.value, currentY: depDraw.currentY.value, storeScrollLeft: store.scrollLeft, dragStartX: drag.dragStartX.value })
  }
}

function onMouseDown(e: MouseEvent): void {
  const canvas = canvasRef.value
  if (!canvas) return
  const result = drag.handleMouseDown(e, canvas, visibleTasks.value, rangeStart.value, cellWidth.value)
  if (result.isDependencyDrag) {
    const rect = canvas.getBoundingClientRect()
    const task = drag.getTaskAtPosition(e.clientX - rect.left, e.clientY - rect.top, visibleTasks.value, rangeStart.value, cellWidth.value)
    if (task) depDraw.handleMouseDown(e, canvas, task, visibleTasks.value, rangeStart.value, cellWidth.value)
  }
}

function onMouseMove(e: MouseEvent): void {
  const canvas = canvasRef.value
  if (!canvas) return
  if (depDraw.isResizing.value) { depDraw.handleMouseMove(e, canvas); render(); return }
  drag.handleMouseMove(e, canvas, visibleTasks.value, rangeStart.value, cellWidth.value)
  render()
}

function onMouseUp(e: MouseEvent): void {
  const canvas = canvasRef.value
  if (!canvas) return
  if (depDraw.isResizing.value) depDraw.handleMouseUp(e, canvas, visibleTasks.value, rangeStart.value, cellWidth.value)
  drag.handleMouseUp()
}

function handleWheel(e: WheelEvent): void {
  if (e.ctrlKey || e.metaKey) { e.preventDefault(); store.setZoom(store.zoom + (e.deltaY > 0 ? -0.1 : 0.1)) }
}

function handleScroll(e: Event): void {
  const t = e.target as HTMLElement
  store.setScrollLeft(t.scrollLeft); store.setScrollTop(t.scrollTop)
}

function handleContextMenu(e: MouseEvent): void {
  const canvas = canvasRef.value
  if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  const task = drag.getTaskAtPosition(e.clientX - rect.left, e.clientY - rect.top, visibleTasks.value, rangeStart.value, cellWidth.value)
  store.selectTask(task?.id || null)
}

function updateCanvasSize(): void {
  const dw = 1200, dh = 600
  if (scrollRef.value) {
    const c = scrollRef.value
    canvasWidth.value = Math.max(c.clientWidth || dw, totalWidth.value, dw)
    canvasHeight.value = Math.max(c.clientHeight || dh, totalHeight.value, dh)
  } else {
    canvasWidth.value = Math.max(totalWidth.value, dw)
    canvasHeight.value = Math.max(totalHeight.value, dh)
  }
}

watch([visibleTasks, timeUnit, zoom, () => store.dependencies, () => store.selectedBaseline, () => store.filterByAssigneeId], () => {
  nextTick(() => { updateCanvasSize(); render() })
})
watch([() => store.scrollLeft, () => store.scrollTop], () => { render() })
const onResize = () => { updateCanvasSize(); render() }
onMounted(() => { nextTick(() => { updateCanvasSize(); render() }); window.addEventListener('resize', onResize) })
onUnmounted(() => { window.removeEventListener('resize', onResize) })
</script>

<style scoped>
.gantt-canvas-container { width: 100%; height: 100%; min-height: 400px; position: relative; background: white; display: flex; flex-direction: column; }
.gantt-scroll-container { flex: 1; width: 100%; min-height: 300px; overflow: auto; }
.gantt-wrapper { position: relative; min-width: 100%; }
.gantt-canvas { display: block; cursor: default; }
.gantt-canvas:active { cursor: grabbing; }
</style>

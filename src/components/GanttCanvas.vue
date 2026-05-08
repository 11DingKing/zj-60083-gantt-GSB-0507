<template>
  <div class="gantt-canvas-container" @wheel="onWheel" @mousedown="onMouseDown"
       @mousemove="onMouseMove" @mouseup="onMouseUp" @mouseleave="onMouseUp"
       @contextmenu.prevent="onContextMenu">
    <div class="gantt-scroll-container" ref="scrollRef" @scroll="onScroll">
      <div class="gantt-wrapper" :style="{ width: totalWidth + 'px', height: totalHeight + 'px' }">
        <canvas ref="canvasRef" :width="canvasWidth" :height="canvasHeight" class="gantt-canvas"></canvas>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useGanttStore } from '@/stores/ganttStore'
import { drawAll } from '@/canvas/renderer'
import { getProjectDateRange, totalDaysRange } from '@/utils/coordinate'
import { useGanttDrag } from '@/composables/useGanttDrag'
import { useDependencyDraw } from '@/composables/useDependencyDraw'

const K = { ROW_HEIGHT: 36, TIMELINE_HEIGHT: 60, CELL_MIN_WIDTH: 60, TASK_HEIGHT: 24, TASK_PADDING: 6 }
const store = useGanttStore()
const canvasRef = ref<HTMLCanvasElement | null>(null)
const scrollRef = ref<HTMLElement | null>(null)
const canvasWidth = ref(1200)
const canvasHeight = ref(600)
defineEmits<{ contextMenu: [event: MouseEvent, task?: any]; taskClick: [task: any] }>()

const projectDateRange = computed(() => getProjectDateRange(store.tasks))
const cellWidth = computed(() => K.CELL_MIN_WIDTH * store.zoom)
const coordCtx = computed(() => ({ projectStart: projectDateRange.value.start, cellWidth: cellWidth.value }))
const totalWidth = computed(() => totalDaysRange(projectDateRange.value.start, projectDateRange.value.end) * cellWidth.value + 200)
const totalHeight = computed(() => K.TIMELINE_HEIGHT + store.visibleTasks.length * K.ROW_HEIGHT + 100)

const { getTaskAtPosition, handleMouseDown, handleMouseMove, reset } = useGanttDrag(K, () => coordCtx.value)
const { state: dep, start, update, finish } = useDependencyDraw()

function render(): void {
  const c = canvasRef.value?.getContext('2d')
  if (!c) return
  drawAll(c, {
    ctx: coordCtx.value,
    timeUnit: store.timeUnit,
    visibleTasks: store.visibleTasks,
    dependencies: store.dependencies,
    selectedBaseline: store.selectedBaseline,
    selectedTaskId: store.selectedTaskId,
    timelineHeight: K.TIMELINE_HEIGHT,
    rowHeight: K.ROW_HEIGHT,
    taskHeight: K.TASK_HEIGHT,
    taskPadding: K.TASK_PADDING,
    canvasWidth: canvasWidth.value,
    canvasHeight: canvasHeight.value,
    scrollX: store.scrollLeft,
    scrollY: store.scrollTop,
    isResizingDependency: dep.value.isResizingDependency,
    dependencyFromTaskId: dep.value.dependencyFromTaskId,
    dependencyStartX: dep.value.dependencyStartX,
    dependencyStartY: dep.value.dependencyStartY,
    projectEnd: projectDateRange.value.end
  })
}

function pos(e: MouseEvent): { x: number; y: number } {
  if (!canvasRef.value) return { x: 0, y: 0 }
  const rect = canvasRef.value.getBoundingClientRect()
  return { x: e.clientX - rect.left, y: e.clientY - rect.top }
}

function onWheel(e: WheelEvent): void { if (e.ctrlKey || e.metaKey) { e.preventDefault(); store.setZoom(store.zoom + (e.deltaY > 0 ? -0.1 : 0.1)) } }
function onMouseDown(e: MouseEvent): void { const r = handleMouseDown(pos(e).x, pos(e).y); if (r.startedDependency && r.task) start(r.task, pos(e).x, pos(e).y) }
function onMouseMove(e: MouseEvent): void { const p = pos(e); if (dep.value.isResizingDependency) { update(p.x, p.y); render(); return } handleMouseMove(p.x, p.y); render() }
function onMouseUp(e: MouseEvent): void { if (dep.value.isResizingDependency) { finish(getTaskAtPosition, pos(e).x, pos(e).y); render(); return } reset() }
function onScroll(e: Event): void { const t = e.target as HTMLElement; store.setScrollLeft(t.scrollLeft); store.setScrollTop(t.scrollTop) }
function onContextMenu(e: MouseEvent): void { const p = pos(e); store.selectTask(getTaskAtPosition(p.x, p.y)?.id || null) }
function updateCanvasSize(): void {
  const w = 1200, h = 600
  if (scrollRef.value) {
    canvasWidth.value = Math.max(scrollRef.value.clientWidth || w, totalWidth.value, w)
    canvasHeight.value = Math.max(scrollRef.value.clientHeight || h, totalHeight.value, h)
  } else { canvasWidth.value = Math.max(totalWidth.value, w); canvasHeight.value = Math.max(totalHeight.value, h) }
}
function onResize(): void { updateCanvasSize(); render() }
watch([() => store.visibleTasks, () => store.timeUnit, () => store.zoom, () => store.dependencies, () => store.selectedBaseline, () => store.filterByAssigneeId], () => nextTick(() => { updateCanvasSize(); render() }))
watch([() => store.scrollLeft, () => store.scrollTop], () => render())
onMounted(() => { nextTick(() => { updateCanvasSize(); render() }); window.addEventListener('resize', onResize) })
onUnmounted(() => window.removeEventListener('resize', onResize))
</script>

<style scoped>
.gantt-canvas-container { width: 100%; height: 100%; min-height: 400px; position: relative; background: white; display: flex; flex-direction: column; }
.gantt-scroll-container { flex: 1; width: 100%; min-height: 300px; overflow: auto; }
.gantt-wrapper { position: relative; min-width: 100%; }
.gantt-canvas { display: block; cursor: default; }
.gantt-canvas:active { cursor: grabbing; }
</style>

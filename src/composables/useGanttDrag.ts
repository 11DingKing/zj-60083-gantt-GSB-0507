import { ref, computed } from 'vue'
import type { Task } from '@/types'
import { useGanttStore } from '@/stores/ganttStore'
import { dateToX, taskWidth, deltaXToDays, daysToDate, durationDays } from '@/utils/coordinate'
import type { CoordinateContext } from '@/utils/coordinate'

export interface DragConstants {
  ROW_HEIGHT: number
  TIMELINE_HEIGHT: number
  TASK_HEIGHT: number
  TASK_PADDING: number
  CELL_MIN_WIDTH: number
}

export interface DragContext {
  isDragging: boolean
  dragType: string | null
  dragTaskId: string | null
  dragStartX: number
  dragStartY: number
  dragStartDate: Date | null
  dragStartProgress: number
}

export function useGanttDrag(
  constants: DragConstants,
  getCtx: () => CoordinateContext
) {
  const store = useGanttStore()
  const visibleTasks = computed(() => store.visibleTasks)

  const ctx = ref<DragContext>({
    isDragging: false,
    dragType: null,
    dragTaskId: null,
    dragStartX: 0,
    dragStartY: 0,
    dragStartDate: null,
    dragStartProgress: 0
  })

  function getTaskAtPosition(x: number, y: number): Task | null {
    const scrollX = store.scrollLeft
    const scrollY = store.scrollTop
    const coordCtx = getCtx()
    const { ROW_HEIGHT, TIMELINE_HEIGHT, TASK_HEIGHT, TASK_PADDING } = constants

    for (let i = 0; i < visibleTasks.value.length; i++) {
      const task = visibleTasks.value[i]
      const taskY = TIMELINE_HEIGHT + i * ROW_HEIGHT + TASK_PADDING - scrollY
      const startDate = new Date(task.startDate)
      const endDate = new Date(task.endDate)
      const startX = dateToX(startDate, coordCtx) - scrollX
      const width = taskWidth(startDate, endDate, coordCtx)

      if (y >= taskY && y <= taskY + TASK_HEIGHT &&
          x >= startX - 5 && x <= startX + width + 5) {
        return task
      }
    }
    return null
  }

  function handleMouseDown(x: number, y: number): { startedDependency: boolean; task?: Task } {
    const task = getTaskAtPosition(x, y)
    if (!task) return { startedDependency: false }

    const coordCtx = getCtx()
    const startDate = new Date(task.startDate)
    const endDate = new Date(task.endDate)
    const startX = dateToX(startDate, coordCtx) - store.scrollLeft
    const width = taskWidth(startDate, endDate, coordCtx)

    const relativeX = x + store.scrollLeft
    const taskStartX = startX + store.scrollLeft
    const taskEndX = taskStartX + width
    const progressX = taskStartX + width * (task.progress / 100)

    if (task.progress > 0 && task.progress < 100 &&
        relativeX >= progressX - 8 && relativeX <= progressX + 8) {
      ctx.value.dragType = 'progress'
    } else if (relativeX >= taskEndX - 8 && relativeX <= taskEndX + 8) {
      ctx.value.dragType = 'resize-end'
    } else if (relativeX >= taskStartX - 8 && relativeX <= taskStartX + 8) {
      ctx.value.dragType = 'resize-start'
    } else if (relativeX >= taskEndX - 20 && relativeX <= taskEndX) {
      return { startedDependency: true, task }
    } else {
      ctx.value.dragType = 'move'
    }

    ctx.value.isDragging = true
    ctx.value.dragTaskId = task.id
    ctx.value.dragStartX = relativeX
    ctx.value.dragStartDate = new Date(task.startDate)
    ctx.value.dragStartProgress = task.progress
    store.selectTask(task.id)
    return { startedDependency: false, task }
  }

  function handleMouseMove(x: number, y: number): void {
    if (!ctx.value.isDragging || !ctx.value.dragTaskId) return

    const task = store.getTaskById(ctx.value.dragTaskId)
    if (!task) return

    const coordCtx = getCtx()
    const currentX = x + store.scrollLeft
    const deltaX = currentX - ctx.value.dragStartX
    const deltaDays = deltaXToDays(deltaX, coordCtx)

    if (ctx.value.dragType === 'progress') {
      const startDate = new Date(task.startDate)
      const endDate = new Date(task.endDate)
      const width = taskWidth(startDate, endDate, coordCtx)
      const progressDelta = (deltaX / width) * 100
      const newProgress = Math.max(0, Math.min(100, Math.round(ctx.value.dragStartProgress + progressDelta)))
      if (newProgress !== task.progress) {
        store.updateTask(task.id, { progress: newProgress })
      }
      return
    }

    if (ctx.value.dragType === 'move') {
      if (deltaDays !== 0) {
        const newStart = daysToDate(deltaDays, ctx.value.dragStartDate!)
        const newEnd = daysToDate(task.duration - 1, newStart)
        store.updateTask(task.id, {
          startDate: newStart.toISOString().split('T')[0],
          endDate: newEnd.toISOString().split('T')[0]
        })
        ctx.value.dragStartDate = newStart
        ctx.value.dragStartX = currentX
      }
    } else if (ctx.value.dragType === 'resize-start') {
      const newStart = daysToDate(deltaDays, ctx.value.dragStartDate!)
      const originalEnd = new Date(task.endDate)
      if (newStart < originalEnd) {
        const newDuration = durationDays(newStart, originalEnd)
        store.updateTask(task.id, {
          startDate: newStart.toISOString().split('T')[0],
          duration: newDuration
        })
        ctx.value.dragStartDate = newStart
        ctx.value.dragStartX = currentX
      }
    } else if (ctx.value.dragType === 'resize-end') {
      const originalStart = new Date(task.startDate)
      const newEnd = daysToDate(task.duration - 1 + deltaDays, originalStart)
      if (newEnd > originalStart) {
        const newDuration = durationDays(originalStart, newEnd)
        store.updateTask(task.id, {
          endDate: newEnd.toISOString().split('T')[0],
          duration: newDuration
        })
        ctx.value.dragStartX = currentX
      }
    }
  }

  function reset(): void {
    ctx.value = {
      isDragging: false,
      dragType: null,
      dragTaskId: null,
      dragStartX: 0,
      dragStartY: 0,
      dragStartDate: null,
      dragStartProgress: 0
    }
  }

  return {
    ctx,
    getTaskAtPosition,
    handleMouseDown,
    handleMouseMove,
    reset
  }
}

import { ref, computed } from 'vue'
import type { Task } from '@/types'
import { useGanttStore } from '@/stores/ganttStore'

export interface DragConstants {
  ROW_HEIGHT: number
  TIMELINE_HEIGHT: number
  TASK_HEIGHT: number
  TASK_PADDING: number
  CELL_MIN_WIDTH: number
}

export interface DragState {
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
  getCellWidth: () => number,
  getProjectStart: () => Date
) {
  const store = useGanttStore()

  const state = ref<DragState>({
    isDragging: false,
    dragType: null,
    dragTaskId: null,
    dragStartX: 0,
    dragStartY: 0,
    dragStartDate: null,
    dragStartProgress: 0
  })

  const visibleTasks = computed(() => store.visibleTasks)

  function dateToX(date: Date): number {
    const projectStart = getProjectStart()
    const cellWidth = getCellWidth()
    const days = (date.getTime() - projectStart.getTime()) / (24 * 60 * 60 * 1000)
    return Math.round(days * cellWidth)
  }

  function getTaskAtPosition(x: number, y: number): Task | null {
    const scrollX = store.scrollLeft
    const scrollY = store.scrollTop
    const cellWidth = getCellWidth()
    const { ROW_HEIGHT, TIMELINE_HEIGHT, TASK_HEIGHT, TASK_PADDING } = constants

    for (let i = 0; i < visibleTasks.value.length; i++) {
      const task = visibleTasks.value[i]
      const taskY = TIMELINE_HEIGHT + i * ROW_HEIGHT + TASK_PADDING - scrollY
      const startDate = new Date(task.startDate)
      const endDate = new Date(task.endDate)
      const startX = dateToX(startDate) - scrollX
      const taskWidth = Math.max(
        (endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000) * cellWidth,
        10
      )

      if (y >= taskY && y <= taskY + TASK_HEIGHT &&
          x >= startX - 5 && x <= startX + taskWidth + 5) {
        return task
      }
    }
    return null
  }

  function handleMouseDown(x: number, y: number): { startedDependency: boolean; task?: Task } {
    const task = getTaskAtPosition(x, y)

    if (task) {
      const startDate = new Date(task.startDate)
      const endDate = new Date(task.endDate)
      const startX = dateToX(startDate) - store.scrollLeft
      const cellWidth = getCellWidth()
      const taskWidth = Math.max(
        (endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000) * cellWidth,
        10
      )

      const relativeX = x + store.scrollLeft
      const taskStartX = startX + store.scrollLeft
      const taskEndX = taskStartX + taskWidth
      const progressX = taskStartX + taskWidth * (task.progress / 100)

      if (task.progress > 0 && task.progress < 100 &&
          relativeX >= progressX - 8 && relativeX <= progressX + 8) {
        state.value.dragType = 'progress'
      } else if (relativeX >= taskEndX - 8 && relativeX <= taskEndX + 8) {
        state.value.dragType = 'resize-end'
      } else if (relativeX >= taskStartX - 8 && relativeX <= taskStartX + 8) {
        state.value.dragType = 'resize-start'
      } else if (relativeX >= taskEndX - 20 && relativeX <= taskEndX) {
        return { startedDependency: true, task }
      } else {
        state.value.dragType = 'move'
      }

      state.value.isDragging = true
      state.value.dragTaskId = task.id
      state.value.dragStartX = relativeX
      state.value.dragStartDate = new Date(task.startDate)
      state.value.dragStartProgress = task.progress

      store.selectTask(task.id)
      return { startedDependency: false, task }
    }

    return { startedDependency: false }
  }

  function handleMouseMove(x: number, y: number): void {
    if (!state.value.isDragging || !state.value.dragTaskId) return

    const task = store.getTaskById(state.value.dragTaskId)
    if (!task) return

    const cellWidth = getCellWidth()
    const currentX = x + store.scrollLeft
    const deltaX = currentX - state.value.dragStartX
    const deltaDays = Math.round(deltaX / cellWidth)

    if (state.value.dragType === 'progress') {
      const startDate = new Date(task.startDate)
      const endDate = new Date(task.endDate)
      const startX = dateToX(startDate) - store.scrollLeft
      const taskWidth = Math.max(
        (endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000) * cellWidth,
        10
      )

      const progressDelta = (deltaX / taskWidth) * 100
      const newProgress = Math.max(0, Math.min(100, Math.round(state.value.dragStartProgress + progressDelta)))

      if (newProgress !== task.progress) {
        store.updateTask(task.id, { progress: newProgress })
      }
      return
    }

    if (state.value.dragType === 'move') {
      if (deltaDays !== 0) {
        const newStart = new Date(state.value.dragStartDate!.getTime() + deltaDays * 24 * 60 * 60 * 1000)
        const newEnd = new Date(newStart.getTime() + (task.duration - 1) * 24 * 60 * 60 * 1000)

        store.updateTask(task.id, {
          startDate: newStart.toISOString().split('T')[0],
          endDate: newEnd.toISOString().split('T')[0]
        })

        state.value.dragStartDate = newStart
        state.value.dragStartX = currentX
      }
    } else if (state.value.dragType === 'resize-start') {
      const newStart = new Date(state.value.dragStartDate!.getTime() + deltaDays * 24 * 60 * 60 * 1000)
      const originalEnd = new Date(task.endDate)

      if (newStart < originalEnd) {
        const newDuration = Math.ceil((originalEnd.getTime() - newStart.getTime()) / (24 * 60 * 60 * 1000)) + 1

        store.updateTask(task.id, {
          startDate: newStart.toISOString().split('T')[0],
          duration: newDuration
        })

        state.value.dragStartDate = newStart
        state.value.dragStartX = currentX
      }
    } else if (state.value.dragType === 'resize-end') {
      const originalStart = new Date(task.startDate)
      const newEnd = new Date(originalStart.getTime() + (task.duration - 1 + deltaDays) * 24 * 60 * 60 * 1000)

      if (newEnd > originalStart) {
        const newDuration = Math.ceil((newEnd.getTime() - originalStart.getTime()) / (24 * 60 * 60 * 1000)) + 1

        store.updateTask(task.id, {
          endDate: newEnd.toISOString().split('T')[0],
          duration: newDuration
        })

        state.value.dragStartX = currentX
      }
    }
  }

  function reset(): void {
    state.value = {
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
    state,
    getTaskAtPosition,
    handleMouseDown,
    handleMouseMove,
    reset
  }
}

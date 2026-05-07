import { ref } from 'vue'
import type { Task } from '@/types'
import { useGanttStore } from '@/stores/ganttStore'
import { dateToX, getTaskRect, TASK_HEIGHT, ROW_HEIGHT, TIMELINE_HEIGHT, TASK_PADDING } from '@/utils/coordinate'

export function useGanttDrag() {
  const store = useGanttStore()

  const isDragging = ref(false)
  const dragType = ref<string | null>(null)
  const dragTaskId = ref<string | null>(null)
  const dragStartX = ref(0)
  const dragStartDate = ref<Date | null>(null)
  const dragStartProgress = ref(0)

  function getTaskAtPosition(
    x: number,
    y: number,
    visibleTasks: Task[],
    rangeStart: Date,
    cellWidth: number
  ): Task | null {
    const scrollX = store.scrollLeft
    const scrollY = store.scrollTop

    for (let i = 0; i < visibleTasks.length; i++) {
      const task = visibleTasks[i]
      const rect = getTaskRect(task, i, rangeStart, cellWidth, scrollX, scrollY)

      if (y >= rect.y && y <= rect.y + TASK_HEIGHT &&
          x >= rect.x - 5 && x <= rect.x + rect.width + 5) {
        return task
      }
    }
    return null
  }

  function handleMouseDown(
    e: MouseEvent,
    canvas: HTMLCanvasElement,
    visibleTasks: Task[],
    rangeStart: Date,
    cellWidth: number
  ): { isDependencyDrag: boolean } {
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const task = getTaskAtPosition(x, y, visibleTasks, rangeStart, cellWidth)

    if (task) {
      const scrollX = store.scrollLeft
      const taskRect = getTaskRect(task, visibleTasks.indexOf(task), rangeStart, cellWidth, scrollX, 0)
      const startX = taskRect.x
      const taskWidth = taskRect.width
      const taskStartX = dateToX(new Date(task.startDate), rangeStart, cellWidth)
      const taskEndX = taskStartX + taskWidth
      const progressX = taskStartX + taskWidth * (task.progress / 100)

      const relativeX = x + scrollX

      if (task.progress > 0 && task.progress < 100 &&
          relativeX >= progressX - 8 && relativeX <= progressX + 8) {
        dragType.value = 'progress'
      } else if (relativeX >= taskEndX - 8 && relativeX <= taskEndX + 8) {
        dragType.value = 'resize-end'
      } else if (relativeX >= taskStartX - 8 && relativeX <= taskStartX + 8) {
        dragType.value = 'resize-start'
      } else if (relativeX >= taskEndX - 20 && relativeX <= taskEndX) {
        return { isDependencyDrag: true }
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

    return { isDependencyDrag: false }
  }

  function handleMouseMove(
    e: MouseEvent,
    canvas: HTMLCanvasElement,
    visibleTasks: Task[],
    rangeStart: Date,
    cellWidth: number
  ): void {
    if (!isDragging.value || !dragTaskId.value) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left

    const task = store.getTaskById(dragTaskId.value)
    if (!task) return

    const currentX = x + store.scrollLeft
    const deltaX = currentX - dragStartX.value
    const deltaDays = Math.round(deltaX / cellWidth)

    if (dragType.value === 'progress') {
      const startDate = new Date(task.startDate)
      const endDate = new Date(task.endDate)
      const taskWidth = Math.max(
        (endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000) * cellWidth,
        10
      )

      const progressDelta = (deltaX / taskWidth) * 100
      const newProgress = Math.max(0, Math.min(100, Math.round(dragStartProgress.value + progressDelta)))

      if (newProgress !== task.progress) {
        store.updateTask(task.id, { progress: newProgress })
      }
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
  }

  function handleMouseUp(): void {
    isDragging.value = false
    dragType.value = null
    dragTaskId.value = null
  }

  return {
    isDragging,
    dragType,
    dragTaskId,
    dragStartX,
    dragStartDate,
    dragStartProgress,
    getTaskAtPosition,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
  }
}

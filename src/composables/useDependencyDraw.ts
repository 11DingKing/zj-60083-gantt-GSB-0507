import { ref } from 'vue'
import type { Task } from '@/types'
import { useGanttStore } from '@/stores/ganttStore'
import { TASK_HEIGHT, TASK_PADDING, TIMELINE_HEIGHT, ROW_HEIGHT, dateToX } from '@/utils/coordinate'

export function useDependencyDraw() {
  const store = useGanttStore()

  const isResizing = ref(false)
  const fromTaskId = ref<string | null>(null)
  const currentX = ref(0)
  const currentY = ref(0)

  function handleMouseDown(
    e: MouseEvent,
    canvas: HTMLCanvasElement,
    task: Task,
    visibleTasks: Task[],
    rangeStart: Date,
    cellWidth: number
  ): void {
    isResizing.value = true
    fromTaskId.value = task.id
    const rect = canvas.getBoundingClientRect()
    currentX.value = e.clientX - rect.left
    currentY.value = e.clientY - rect.top
  }

  function handleMouseMove(e: MouseEvent, canvas: HTMLCanvasElement): void {
    if (!isResizing.value) return
    const rect = canvas.getBoundingClientRect()
    currentX.value = e.clientX - rect.left
    currentY.value = e.clientY - rect.top
  }

  function handleMouseUp(
    e: MouseEvent,
    canvas: HTMLCanvasElement,
    visibleTasks: Task[],
    rangeStart: Date,
    cellWidth: number
  ): void {
    if (isResizing.value && fromTaskId.value) {
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      const scrollX = store.scrollLeft
      const scrollY = store.scrollTop

      let targetTask: Task | null = null
      for (let i = 0; i < visibleTasks.length; i++) {
        const t = visibleTasks[i]
        const taskY = TIMELINE_HEIGHT + i * ROW_HEIGHT + TASK_PADDING - scrollY
        const startDate = new Date(t.startDate)
        const endDate = new Date(t.endDate)
        const startX = dateToX(startDate, rangeStart, cellWidth) - scrollX
        const taskWidth = Math.max(
          (endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000) * cellWidth,
          10
        )

        if (y >= taskY && y <= taskY + TASK_HEIGHT &&
            x >= startX - 5 && x <= startX + taskWidth + 5) {
          targetTask = t
          break
        }
      }

      if (targetTask && targetTask.id !== fromTaskId.value) {
        store.createDependency(fromTaskId.value, targetTask.id)
      }
    }

    isResizing.value = false
    fromTaskId.value = null
  }

  return {
    isResizing,
    fromTaskId,
    currentX,
    currentY,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
  }
}

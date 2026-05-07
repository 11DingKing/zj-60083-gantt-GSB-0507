import { ref } from 'vue'
import type { Task } from '@/types'
import { useGanttStore } from '@/stores/ganttStore'

export interface DependencyDrawState {
  isResizingDependency: boolean
  dependencyFromTaskId: string | null
  dependencyStartX: number
  dependencyStartY: number
}

export function useDependencyDraw(
  getProjectStart: () => Date,
  getCellWidth: () => number,
  getCanvasScrollLeft: () => number
) {
  const store = useGanttStore()

  const state = ref<DependencyDrawState>({
    isResizingDependency: false,
    dependencyFromTaskId: null,
    dependencyStartX: 0,
    dependencyStartY: 0
  })

  function startDrawing(task: Task, x: number, y: number): void {
    state.value.isResizingDependency = true
    state.value.dependencyFromTaskId = task.id
    state.value.dependencyStartX = x
    state.value.dependencyStartY = y
  }

  function updatePosition(x: number, y: number): void {
    state.value.dependencyStartX = x
    state.value.dependencyStartY = y
  }

  function finishDrawing(getTaskAtPosition: (x: number, y: number) => Task | null, x: number, y: number): void {
    if (state.value.isResizingDependency && state.value.dependencyFromTaskId) {
      const targetTask = getTaskAtPosition(x, y)

      if (targetTask && targetTask.id !== state.value.dependencyFromTaskId) {
        store.createDependency(state.value.dependencyFromTaskId, targetTask.id)
      }
    }

    reset()
  }

  function reset(): void {
    state.value = {
      isResizingDependency: false,
      dependencyFromTaskId: null,
      dependencyStartX: 0,
      dependencyStartY: 0
    }
  }

  function getPreviewCurrentX(): number {
    return state.value.dependencyStartX + (0 - getCanvasScrollLeft())
  }

  return {
    state,
    startDrawing,
    updatePosition,
    finishDrawing,
    reset,
    getPreviewCurrentX
  }
}

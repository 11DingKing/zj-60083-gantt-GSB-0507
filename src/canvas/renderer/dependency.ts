import type { Task, Dependency } from '@/types'
import { dateToX } from '@/utils/coordinate'
import type { CoordinateContext } from '@/utils/coordinate'

export interface DependencyOptions {
  tasks: Task[]
  dependencies: Dependency[]
  ctx: CoordinateContext
  timelineHeight: number
  rowHeight: number
  taskHeight: number
  taskPadding: number
  canvasWidth: number
  scrollX: number
  scrollY: number
}

export function drawDependencies(cctx: CanvasRenderingContext2D, options: DependencyOptions): void {
  const { tasks, dependencies, ctx, timelineHeight, rowHeight, taskHeight, taskPadding, scrollX, scrollY } = options

  dependencies.forEach(dep => {
    const fromIndex = tasks.findIndex(t => t.id === dep.fromTaskId)
    const toIndex = tasks.findIndex(t => t.id === dep.toTaskId)

    if (fromIndex === -1 || toIndex === -1) return

    const fromTask = tasks[fromIndex]
    const toTask = tasks[toIndex]

    const fromY = timelineHeight + fromIndex * rowHeight + taskHeight / 2 + taskPadding - scrollY
    const toY = timelineHeight + toIndex * rowHeight + taskHeight / 2 + taskPadding - scrollY

    const fromEndX = dateToX(new Date(fromTask.endDate), ctx) - scrollX
    const toStartX = dateToX(new Date(toTask.startDate), ctx) - scrollX

    if (fromY < timelineHeight || toY < timelineHeight) return

    const color = dep.hasConflict ? '#ef4444' : '#9ca3af'
    const lineWidth = dep.hasConflict ? 2 : 1

    cctx.save()
    cctx.strokeStyle = color
    cctx.lineWidth = lineWidth
    cctx.fillStyle = color

    cctx.beginPath()
    cctx.moveTo(fromEndX, fromY)
    cctx.lineTo(fromEndX + 10, fromY)
    cctx.lineTo(fromEndX + 10, toY)
    cctx.lineTo(toStartX - 10, toY)
    cctx.stroke()

    cctx.beginPath()
    cctx.moveTo(toStartX - 10, toY - 5)
    cctx.lineTo(toStartX - 10, toY + 5)
    cctx.lineTo(toStartX - 4, toY)
    cctx.closePath()
    cctx.fill()

    cctx.restore()
  })
}

export interface DependencyPreviewOptions {
  tasks: Task[]
  fromTaskId: string
  ctx: CoordinateContext
  timelineHeight: number
  rowHeight: number
  taskHeight: number
  taskPadding: number
  canvasWidth: number
  scrollX: number
  scrollY: number
  currentX: number
  currentY: number
}

export function drawDependencyPreview(cctx: CanvasRenderingContext2D, options: DependencyPreviewOptions): void {
  const { tasks, fromTaskId, ctx, timelineHeight, rowHeight, taskHeight, taskPadding, scrollX, scrollY, currentX, currentY } = options

  const fromIndex = tasks.findIndex(t => t.id === fromTaskId)
  if (fromIndex === -1) return

  const fromTask = tasks[fromIndex]
  const fromY = timelineHeight + fromIndex * rowHeight + taskHeight / 2 + taskPadding - scrollY
  const fromEndX = dateToX(new Date(fromTask.endDate), ctx) - scrollX

  cctx.save()
  cctx.strokeStyle = '#3b82f6'
  cctx.lineWidth = 2
  cctx.setLineDash([5, 5])

  cctx.beginPath()
  cctx.moveTo(fromEndX, fromY)
  cctx.lineTo(fromEndX + 10, fromY)
  cctx.lineTo(fromEndX + 10, currentY)
  cctx.lineTo(currentX, currentY)
  cctx.stroke()

  cctx.restore()
}

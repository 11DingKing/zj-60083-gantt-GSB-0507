import type { Task, Dependency } from '@/types'

export interface DependencyOptions {
  tasks: Task[]
  dependencies: Dependency[]
  projectStart: Date
  cellWidth: number
  timelineHeight: number
  rowHeight: number
  taskHeight: number
  taskPadding: number
  canvasWidth: number
  scrollX: number
  scrollY: number
}

export function drawDependencies(ctx: CanvasRenderingContext2D, options: DependencyOptions): void {
  const { tasks, dependencies, projectStart, cellWidth, timelineHeight, rowHeight, taskHeight, taskPadding, scrollX, scrollY } = options

  dependencies.forEach(dep => {
    const fromIndex = tasks.findIndex(t => t.id === dep.fromTaskId)
    const toIndex = tasks.findIndex(t => t.id === dep.toTaskId)

    if (fromIndex === -1 || toIndex === -1) return

    const fromTask = tasks[fromIndex]
    const toTask = tasks[toIndex]

    const fromY = timelineHeight + fromIndex * rowHeight + taskHeight / 2 + taskPadding - scrollY
    const toY = timelineHeight + toIndex * rowHeight + taskHeight / 2 + taskPadding - scrollY

    const fromEndX = dateToX(new Date(fromTask.endDate), projectStart, cellWidth) - scrollX
    const toStartX = dateToX(new Date(toTask.startDate), projectStart, cellWidth) - scrollX

    if (fromY < timelineHeight || toY < timelineHeight) return

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

export interface DependencyPreviewOptions {
  tasks: Task[]
  fromTaskId: string
  projectStart: Date
  cellWidth: number
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

export function drawDependencyPreview(ctx: CanvasRenderingContext2D, options: DependencyPreviewOptions): void {
  const { tasks, fromTaskId, projectStart, cellWidth, timelineHeight, rowHeight, taskHeight, taskPadding, scrollX, scrollY, currentX, currentY } = options

  const fromIndex = tasks.findIndex(t => t.id === fromTaskId)
  if (fromIndex === -1) return

  const fromTask = tasks[fromIndex]
  const fromY = timelineHeight + fromIndex * rowHeight + taskHeight / 2 + taskPadding - scrollY
  const fromEndX = dateToX(new Date(fromTask.endDate), projectStart, cellWidth) - scrollX

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

function dateToX(date: Date, projectStart: Date, cellWidth: number): number {
  const days = (date.getTime() - projectStart.getTime()) / (24 * 60 * 60 * 1000)
  return Math.round(days * cellWidth)
}

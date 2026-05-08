import type { Task, Dependency } from '@/types'
import { dateToX, TIMELINE_HEIGHT, TASK_HEIGHT, TASK_PADDING } from '@/utils/coordinate'

export interface DependencyOptions {
  ctx: CanvasRenderingContext2D
  scrollX: number
  scrollY: number
  canvasWidth: number
  canvasHeight: number
  rangeStart: Date
  cellWidth: number
  visibleTasks: Task[]
  dependencies: Dependency[]
}

export function draw(options: DependencyOptions): void {
  const { ctx, scrollX, scrollY, canvasWidth, canvasHeight, rangeStart, cellWidth, visibleTasks, dependencies } = options

  dependencies.forEach(dep => {
    const fromIndex = visibleTasks.findIndex(t => t.id === dep.fromTaskId)
    const toIndex = visibleTasks.findIndex(t => t.id === dep.toTaskId)

    if (fromIndex === -1 || toIndex === -1) return

    const fromTask = visibleTasks[fromIndex]
    const toTask = visibleTasks[toIndex]

    const fromY = TIMELINE_HEIGHT + fromIndex * 36 + TASK_HEIGHT / 2 + TASK_PADDING - scrollY
    const toY = TIMELINE_HEIGHT + toIndex * 36 + TASK_HEIGHT / 2 + TASK_PADDING - scrollY

    const fromEndX = dateToX(new Date(fromTask.endDate), rangeStart, cellWidth) - scrollX
    const toStartX = dateToX(new Date(toTask.startDate), rangeStart, cellWidth) - scrollX

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

export function drawPreview(options: {
  ctx: CanvasRenderingContext2D
  scrollX: number
  scrollY: number
  rangeStart: Date
  cellWidth: number
  visibleTasks: Task[]
  fromTaskId: string
  currentX: number
  currentY: number
  storeScrollLeft: number
  dragStartX: number
}): void {
  const { ctx, scrollX, scrollY, rangeStart, cellWidth, visibleTasks, fromTaskId, currentX, currentY, storeScrollLeft, dragStartX } = options

  const fromIndex = visibleTasks.findIndex(t => t.id === fromTaskId)
  if (fromIndex === -1) return

  const fromTask = visibleTasks[fromIndex]
  const fromY = TIMELINE_HEIGHT + fromIndex * 36 + TASK_HEIGHT / 2 + TASK_PADDING - scrollY
  const fromEndX = dateToX(new Date(fromTask.endDate), rangeStart, cellWidth) - scrollX

  const lineX = currentX + (dragStartX - storeScrollLeft) - scrollX
  const lineY = currentY

  ctx.save()
  ctx.strokeStyle = '#3b82f6'
  ctx.lineWidth = 2
  ctx.setLineDash([5, 5])

  ctx.beginPath()
  ctx.moveTo(fromEndX, fromY)
  ctx.lineTo(fromEndX + 10, fromY)
  ctx.lineTo(fromEndX + 10, lineY)
  ctx.lineTo(lineX, lineY)
  ctx.stroke()

  ctx.restore()
}

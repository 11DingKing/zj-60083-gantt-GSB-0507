import { TaskStatus } from '@/types'
import type { Task, Baseline } from '@/types'

export interface TaskBarOptions {
  tasks: Task[]
  projectStart: Date
  cellWidth: number
  timelineHeight: number
  rowHeight: number
  taskHeight: number
  taskPadding: number
  canvasWidth: number
  canvasHeight: number
  scrollX: number
  scrollY: number
  selectedTaskId: string | null
}

export function drawTasks(ctx: CanvasRenderingContext2D, options: TaskBarOptions): void {
  const { tasks, projectStart, cellWidth, timelineHeight, rowHeight, taskHeight, taskPadding, canvasWidth, canvasHeight, scrollX, scrollY, selectedTaskId } = options

  tasks.forEach((task, index) => {
    const y = timelineHeight + index * rowHeight + taskPadding - scrollY

    if (y < -taskHeight || y > canvasHeight) return

    const startDate = new Date(task.startDate)
    const endDate = new Date(task.endDate)

    const startX = dateToX(startDate, projectStart, cellWidth) - scrollX
    const taskWidth = Math.max(
      (endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000) * cellWidth,
      10
    )

    if (task.isMilestone) {
      drawMilestone(ctx, task, startX + taskWidth / 2, y + taskHeight / 2, selectedTaskId)
    } else {
      drawTaskBar(ctx, task, startX, y, taskWidth, canvasWidth, selectedTaskId)
    }
  })
}

function drawTaskBar(
  ctx: CanvasRenderingContext2D,
  task: Task,
  x: number,
  y: number,
  width: number,
  canvasWidth: number,
  selectedTaskId: string | null
): void {
  const color = getTaskColor(task)
  const radius = 4
  const progressWidth = width * (task.progress / 100)

  ctx.save()

  if (x + width < 0 || x > canvasWidth) {
    ctx.restore()
    return
  }

  ctx.fillStyle = color
  ctx.globalAlpha = 0.8

  ctx.beginPath()
  ctx.roundRect(x, y, width, 24, radius)
  ctx.fill()

  if (task.progress > 0 && task.progress < 100) {
    ctx.fillStyle = color
    ctx.globalAlpha = 0.4
    ctx.beginPath()
    ctx.roundRect(x + progressWidth, y, width - progressWidth, 24, [0, radius, radius, 0])
    ctx.fill()

    ctx.globalAlpha = 0.8
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.roundRect(x, y, progressWidth, 24, [radius, 0, 0, radius])
    ctx.fill()
  }

  if (task.isCriticalPath || selectedTaskId === task.id) {
    ctx.strokeStyle = task.isCriticalPath ? '#dc2626' : '#2563eb'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.roundRect(x - 1, y - 1, width + 2, 26, radius + 1)
    ctx.stroke()
  }

  ctx.globalAlpha = 1
  ctx.fillStyle = '#ffffff'
  ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif'
  ctx.textAlign = 'left'

  if (width > 50) {
    ctx.save()
    ctx.beginPath()
    ctx.roundRect(x, y, width, 24, radius)
    ctx.clip()

    const displayName = task.name.length > 20 ? task.name.substring(0, 17) + '...' : task.name
    ctx.fillText(displayName, x + 8, y + 16)
    ctx.restore()
  }

  ctx.restore()
}

function drawMilestone(
  ctx: CanvasRenderingContext2D,
  task: Task,
  x: number,
  y: number,
  selectedTaskId: string | null
): void {
  const size = 14
  const color = '#8b5cf6'

  ctx.save()
  ctx.fillStyle = color
  ctx.strokeStyle = selectedTaskId === task.id ? '#2563eb' : color
  ctx.lineWidth = 2

  ctx.beginPath()
  ctx.moveTo(x, y - size / 2)
  ctx.lineTo(x + size / 2, y)
  ctx.lineTo(x, y + size / 2)
  ctx.lineTo(x - size / 2, y)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  ctx.restore()
}

function getTaskColor(task: Task): string {
  switch (task.status) {
    case TaskStatus.NOT_STARTED:
      return '#9ca3af'
    case TaskStatus.IN_PROGRESS:
      return '#3b82f6'
    case TaskStatus.COMPLETED:
      return '#10b981'
    case TaskStatus.DELAYED:
      return '#ef4444'
    default:
      return '#9ca3af'
  }
}

export interface BaselineOptions {
  tasks: Task[]
  baseline: Baseline
  projectStart: Date
  cellWidth: number
  timelineHeight: number
  rowHeight: number
  taskHeight: number
  taskPadding: number
  canvasWidth: number
  canvasHeight: number
  scrollX: number
  scrollY: number
}

export function drawBaselines(ctx: CanvasRenderingContext2D, options: BaselineOptions): void {
  const { tasks, baseline, projectStart, cellWidth, timelineHeight, rowHeight, taskHeight, taskPadding, canvasWidth, canvasHeight, scrollX, scrollY } = options

  tasks.forEach((task, index) => {
    const baselineTask = baseline.tasks.find(t => t.taskId === task.id)
    if (!baselineTask) return

    const y = timelineHeight + index * rowHeight + taskPadding + taskHeight - scrollY + 4

    if (y < 0 || y > canvasHeight) return

    const startDate = new Date(baselineTask.startDate)
    const endDate = new Date(baselineTask.endDate)

    const startX = dateToX(startDate, projectStart, cellWidth) - scrollX
    const taskWidth = Math.max(
      (endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000) * cellWidth,
      10
    )

    if (startX + taskWidth < 0 || startX > canvasWidth) return

    ctx.fillStyle = 'rgba(156, 163, 175, 0.4)'
    ctx.fillRect(startX, y, taskWidth, 6)

    const currentStartX = dateToX(new Date(task.startDate), projectStart, cellWidth) - scrollX
    const currentTaskWidth = (new Date(task.endDate).getTime() - new Date(task.startDate).getTime()) / (24 * 60 * 60 * 1000) * cellWidth

    if (startX !== currentStartX || taskWidth !== currentTaskWidth) {
      ctx.fillStyle = '#f97316'
      ctx.beginPath()
      ctx.arc(startX + taskWidth / 2, y + 3, 4, 0, Math.PI * 2)
      ctx.fill()
    }
  })
}

function dateToX(date: Date, projectStart: Date, cellWidth: number): number {
  const days = (date.getTime() - projectStart.getTime()) / (24 * 60 * 60 * 1000)
  return Math.round(days * cellWidth)
}

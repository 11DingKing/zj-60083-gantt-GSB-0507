import type { Task, Baseline } from '@/types'
import {
  dateToX,
  getTaskColor,
  getTaskRect,
  TIMELINE_HEIGHT,
  TASK_HEIGHT,
  TASK_PADDING,
  ROW_HEIGHT,
} from '@/utils/coordinate'

export interface TaskBarOptions {
  ctx: CanvasRenderingContext2D
  scrollX: number
  scrollY: number
  canvasWidth: number
  canvasHeight: number
  rangeStart: Date
  cellWidth: number
  visibleTasks: Task[]
  selectedTaskId: string | null
}

export function draw(options: TaskBarOptions): void {
  const { ctx, scrollX, scrollY, canvasWidth, canvasHeight, rangeStart, cellWidth, visibleTasks, selectedTaskId } = options

  visibleTasks.forEach((task, index) => {
    const rect = getTaskRect(task, index, rangeStart, cellWidth, scrollX, scrollY)

    if (rect.y < -TASK_HEIGHT || rect.y > canvasHeight) return

    if (task.isMilestone) {
      drawMilestone(ctx, task, rect.x + rect.width / 2, rect.y + TASK_HEIGHT / 2, selectedTaskId)
    } else {
      drawTaskBar(ctx, task, rect.x, rect.y, rect.width, canvasWidth, selectedTaskId)
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
  ctx.roundRect(x, y, width, TASK_HEIGHT, radius)
  ctx.fill()

  if (task.progress > 0 && task.progress < 100) {
    ctx.fillStyle = color
    ctx.globalAlpha = 0.4
    ctx.beginPath()
    ctx.roundRect(x + progressWidth, y, width - progressWidth, TASK_HEIGHT, [0, radius, radius, 0])
    ctx.fill()

    ctx.globalAlpha = 0.8
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.roundRect(x, y, progressWidth, TASK_HEIGHT, [radius, 0, 0, radius])
    ctx.fill()
  }

  if (task.isCriticalPath || selectedTaskId === task.id) {
    ctx.strokeStyle = task.isCriticalPath ? '#dc2626' : '#2563eb'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.roundRect(x - 1, y - 1, width + 2, TASK_HEIGHT + 2, radius + 1)
    ctx.stroke()
  }

  ctx.globalAlpha = 1
  ctx.fillStyle = '#ffffff'
  ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif'
  ctx.textAlign = 'left'

  if (width > 50) {
    ctx.save()
    ctx.beginPath()
    ctx.roundRect(x, y, width, TASK_HEIGHT, radius)
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

export function drawBaselines(options: {
  ctx: CanvasRenderingContext2D
  scrollX: number
  scrollY: number
  canvasWidth: number
  canvasHeight: number
  rangeStart: Date
  cellWidth: number
  visibleTasks: Task[]
  baseline: Baseline
  dateToXFn: (date: Date) => number
}): void {
  const { ctx, scrollX, scrollY, canvasWidth, canvasHeight, rangeStart, cellWidth, visibleTasks, baseline, dateToXFn } = options

  visibleTasks.forEach((task, index) => {
    const baselineTask = baseline.tasks.find(t => t.taskId === task.id)
    if (!baselineTask) return

    const y = TIMELINE_HEIGHT + index * ROW_HEIGHT + TASK_PADDING + TASK_HEIGHT - scrollY + 4

    if (y < 0 || y > canvasHeight) return

    const startDate = new Date(baselineTask.startDate)
    const endDate = new Date(baselineTask.endDate)

    const startX = dateToXFn(startDate) - scrollX
    const taskWidth = Math.max(
      (endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000) * cellWidth,
      10
    )

    if (startX + taskWidth < 0 || startX > canvasWidth) return

    ctx.fillStyle = 'rgba(156, 163, 175, 0.4)'
    ctx.fillRect(startX, y, taskWidth, 6)

    const currentStartX = dateToX(new Date(task.startDate), rangeStart, cellWidth) - scrollX
    const currentWidth = (new Date(task.endDate).getTime() - new Date(task.startDate).getTime()) / (24 * 60 * 60 * 1000) * cellWidth

    if (startX !== currentStartX || taskWidth !== currentWidth) {
      ctx.fillStyle = '#f97316'
      ctx.beginPath()
      ctx.arc(startX + taskWidth / 2, y + 3, 4, 0, Math.PI * 2)
      ctx.fill()
    }
  })
}

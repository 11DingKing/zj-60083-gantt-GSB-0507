import { TaskStatus } from '@/types'
import type { Task, Baseline } from '@/types'
import { dateToX, taskWidth } from '@/utils/coordinate'
import type { CoordinateContext } from '@/utils/coordinate'

export interface TaskBarOptions {
  tasks: Task[]
  ctx: CoordinateContext
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

export function drawTasks(cctx: CanvasRenderingContext2D, options: TaskBarOptions): void {
  const { tasks, ctx, timelineHeight, rowHeight, taskHeight, taskPadding, canvasWidth, canvasHeight, scrollX, scrollY, selectedTaskId } = options

  tasks.forEach((task, index) => {
    const y = timelineHeight + index * rowHeight + taskPadding - scrollY

    if (y < -taskHeight || y > canvasHeight) return

    const startDate = new Date(task.startDate)
    const endDate = new Date(task.endDate)

    const startX = dateToX(startDate, ctx) - scrollX
    const width = taskWidth(startDate, endDate, ctx)

    if (task.isMilestone) {
      drawMilestone(cctx, task, startX + width / 2, y + taskHeight / 2, selectedTaskId)
    } else {
      drawTaskBar(cctx, task, startX, y, width, canvasWidth, taskHeight, selectedTaskId)
    }
  })
}

function drawTaskBar(
  cctx: CanvasRenderingContext2D,
  task: Task,
  x: number,
  y: number,
  width: number,
  canvasWidth: number,
  taskHeight: number,
  selectedTaskId: string | null
): void {
  const color = getTaskColor(task)
  const radius = 4
  const progressWidth = width * (task.progress / 100)

  cctx.save()

  if (x + width < 0 || x > canvasWidth) {
    cctx.restore()
    return
  }

  cctx.fillStyle = color
  cctx.globalAlpha = 0.8

  cctx.beginPath()
  cctx.roundRect(x, y, width, taskHeight, radius)
  cctx.fill()

  if (task.progress > 0 && task.progress < 100) {
    cctx.fillStyle = color
    cctx.globalAlpha = 0.4
    cctx.beginPath()
    cctx.roundRect(x + progressWidth, y, width - progressWidth, taskHeight, [0, radius, radius, 0])
    cctx.fill()

    cctx.globalAlpha = 0.8
    cctx.fillStyle = color
    cctx.beginPath()
    cctx.roundRect(x, y, progressWidth, taskHeight, [radius, 0, 0, radius])
    cctx.fill()
  }

  if (task.isCriticalPath || selectedTaskId === task.id) {
    cctx.strokeStyle = task.isCriticalPath ? '#dc2626' : '#2563eb'
    cctx.lineWidth = 2
    cctx.beginPath()
    cctx.roundRect(x - 1, y - 1, width + 2, taskHeight + 2, radius + 1)
    cctx.stroke()
  }

  cctx.globalAlpha = 1
  cctx.fillStyle = '#ffffff'
  cctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif'
  cctx.textAlign = 'left'

  if (width > 50) {
    cctx.save()
    cctx.beginPath()
    cctx.roundRect(x, y, width, taskHeight, radius)
    cctx.clip()

    const displayName = task.name.length > 20 ? task.name.substring(0, 17) + '...' : task.name
    cctx.fillText(displayName, x + 8, y + 16)
    cctx.restore()
  }

  cctx.restore()
}

function drawMilestone(
  cctx: CanvasRenderingContext2D,
  task: Task,
  x: number,
  y: number,
  selectedTaskId: string | null
): void {
  const size = 14
  const color = '#8b5cf6'

  cctx.save()
  cctx.fillStyle = color
  cctx.strokeStyle = selectedTaskId === task.id ? '#2563eb' : color
  cctx.lineWidth = 2

  cctx.beginPath()
  cctx.moveTo(x, y - size / 2)
  cctx.lineTo(x + size / 2, y)
  cctx.lineTo(x, y + size / 2)
  cctx.lineTo(x - size / 2, y)
  cctx.closePath()
  cctx.fill()
  cctx.stroke()

  cctx.restore()
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
  ctx: CoordinateContext
  timelineHeight: number
  rowHeight: number
  taskHeight: number
  taskPadding: number
  canvasWidth: number
  canvasHeight: number
  scrollX: number
  scrollY: number
}

export function drawBaselines(cctx: CanvasRenderingContext2D, options: BaselineOptions): void {
  const { tasks, baseline, ctx, timelineHeight, rowHeight, taskHeight, taskPadding, canvasWidth, canvasHeight, scrollX, scrollY } = options

  tasks.forEach((task, index) => {
    const baselineTask = baseline.tasks.find((t: any) => t.taskId === task.id)
    if (!baselineTask) return

    const y = timelineHeight + index * rowHeight + taskPadding + taskHeight - scrollY + 4

    if (y < 0 || y > canvasHeight) return

    const startDate = new Date(baselineTask.startDate)
    const endDate = new Date(baselineTask.endDate)

    const startX = dateToX(startDate, ctx) - scrollX
    const width = taskWidth(startDate, endDate, ctx)

    if (startX + width < 0 || startX > canvasWidth) return

    cctx.fillStyle = 'rgba(156, 163, 175, 0.4)'
    cctx.fillRect(startX, y, width, 6)

    const currentStartX = dateToX(new Date(task.startDate), ctx) - scrollX
    const currentTaskWidth = taskWidth(new Date(task.startDate), new Date(task.endDate), ctx)

    if (startX !== currentStartX || width !== currentTaskWidth) {
      cctx.fillStyle = '#f97316'
      cctx.beginPath()
      cctx.arc(startX + width / 2, y + 3, 4, 0, Math.PI * 2)
      cctx.fill()
    }
  })
}

import { TimeUnit } from '@/types'

export interface TimelineOptions {
  projectStart: Date
  projectEnd: Date
  cellWidth: number
  timelineHeight: number
  canvasWidth: number
  scrollX: number
  timeUnit: TimeUnit
}

export function drawTimeline(ctx: CanvasRenderingContext2D, options: TimelineOptions): void {
  const { projectStart, projectEnd, cellWidth, timelineHeight, canvasWidth, scrollX, timeUnit } = options

  ctx.fillStyle = '#f9fafb'
  ctx.fillRect(0, 0, canvasWidth, timelineHeight)

  ctx.strokeStyle = '#e5e7eb'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, timelineHeight)
  ctx.lineTo(canvasWidth, timelineHeight)
  ctx.stroke()

  ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif'
  ctx.fillStyle = '#6b7280'
  ctx.textAlign = 'center'

  let currentDate = new Date(projectStart)
  currentDate.setHours(0, 0, 0, 0)

  while (currentDate <= projectEnd) {
    const x = dateToX(currentDate, projectStart, cellWidth) - scrollX

    if (timeUnit === TimeUnit.DAY) {
      const day = currentDate.getDate()
      ctx.fillText(day.toString(), x + cellWidth / 2, 50)

      if (currentDate.getDate() === 1) {
        const month = currentDate.toLocaleDateString('zh-CN', { month: 'short' })
        ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif'
        ctx.fillStyle = '#374151'
        ctx.fillText(month, x + cellWidth / 2, 25)
        ctx.fillStyle = '#6b7280'
      }
    } else if (timeUnit === TimeUnit.WEEK) {
      const weekNum = getWeekNumber(currentDate)
      if (currentDate.getDay() === 1) {
        ctx.fillText(`第${weekNum}周`, x + 3 * cellWidth, 50)
      }
    } else if (timeUnit === TimeUnit.MONTH) {
      if (currentDate.getDate() === 1) {
        const month = currentDate.toLocaleDateString('zh-CN', { month: 'long' })
        ctx.fillText(month, x + 15 * cellWidth, 50)
      }
    } else if (timeUnit === TimeUnit.QUARTER) {
      const quarter = Math.floor(currentDate.getMonth() / 3) + 1
      if (currentDate.getMonth() % 3 === 0 && currentDate.getDate() === 1) {
        ctx.fillText(`Q${quarter}`, x + 45 * cellWidth, 50)
      }
    }

    currentDate.setDate(currentDate.getDate() + 1)
  }
}

export interface GridOptions {
  projectStart: Date
  projectEnd: Date
  cellWidth: number
  timelineHeight: number
  rowHeight: number
  visibleTaskCount: number
  canvasWidth: number
  canvasHeight: number
  scrollX: number
  scrollY: number
}

export function drawGrid(ctx: CanvasRenderingContext2D, options: GridOptions): void {
  const { projectStart, projectEnd, cellWidth, timelineHeight, rowHeight, visibleTaskCount, canvasWidth, canvasHeight, scrollX, scrollY } = options

  ctx.strokeStyle = '#f3f4f6'
  ctx.lineWidth = 1

  let currentDate = new Date(projectStart)
  currentDate.setHours(0, 0, 0, 0)

  while (currentDate <= projectEnd) {
    const x = dateToX(currentDate, projectStart, cellWidth) - scrollX

    if (x >= 0 && x <= canvasWidth) {
      ctx.beginPath()
      ctx.moveTo(x, timelineHeight)
      ctx.lineTo(x, canvasHeight)
      ctx.stroke()
    }

    currentDate.setDate(currentDate.getDate() + 1)
  }

  for (let i = 0; i < visibleTaskCount + 1; i++) {
    const y = timelineHeight + i * rowHeight - scrollY
    if (y >= timelineHeight && y <= canvasHeight) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(canvasWidth, y)
      ctx.stroke()
    }
  }
}

export interface TodayLineOptions {
  projectStart: Date
  cellWidth: number
  timelineHeight: number
  canvasWidth: number
  canvasHeight: number
  scrollX: number
  scrollY: number
}

export function drawTodayLine(ctx: CanvasRenderingContext2D, options: TodayLineOptions): void {
  const { projectStart, cellWidth, timelineHeight, canvasWidth, canvasHeight, scrollX, scrollY } = options

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const x = dateToX(today, projectStart, cellWidth) - scrollX

  if (x >= 0 && x <= canvasWidth) {
    ctx.strokeStyle = '#ef4444'
    ctx.lineWidth = 2
    ctx.setLineDash([5, 5])
    ctx.beginPath()
    ctx.moveTo(x, timelineHeight - scrollY)
    ctx.lineTo(x, canvasHeight)
    ctx.stroke()
    ctx.setLineDash([])

    ctx.fillStyle = '#ef4444'
    ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('今天', x, timelineHeight - 15)
  }
}

function dateToX(date: Date, projectStart: Date, cellWidth: number): number {
  const days = (date.getTime() - projectStart.getTime()) / (24 * 60 * 60 * 1000)
  return Math.round(days * cellWidth)
}

function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1)
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
}

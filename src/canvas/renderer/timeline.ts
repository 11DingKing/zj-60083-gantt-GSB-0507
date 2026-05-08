import { TimeUnit } from '@/types'
import { dateToX, getWeekNumber, TIMELINE_HEIGHT, CELL_MIN_WIDTH } from '@/utils/coordinate'

export interface TimelineOptions {
  ctx: CanvasRenderingContext2D
  scrollX: number
  canvasWidth: number
  rangeStart: Date
  rangeEnd: Date
  cellWidth: number
  timeUnit: TimeUnit
}

export function draw(options: TimelineOptions): void {
  const { ctx, scrollX, canvasWidth, rangeStart, rangeEnd, cellWidth, timeUnit } = options

  ctx.fillStyle = '#f9fafb'
  ctx.fillRect(0, 0, canvasWidth, TIMELINE_HEIGHT)

  ctx.strokeStyle = '#e5e7eb'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, TIMELINE_HEIGHT)
  ctx.lineTo(canvasWidth, TIMELINE_HEIGHT)
  ctx.stroke()

  ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif'
  ctx.fillStyle = '#6b7280'
  ctx.textAlign = 'center'

  let currentDate = new Date(rangeStart)
  currentDate.setHours(0, 0, 0, 0)

  while (currentDate <= rangeEnd) {
    const x = dateToX(currentDate, rangeStart, cellWidth) - scrollX

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

export function drawGrid(options: {
  ctx: CanvasRenderingContext2D
  scrollX: number
  scrollY: number
  canvasWidth: number
  canvasHeight: number
  rangeStart: Date
  rangeEnd: Date
  cellWidth: number
  visibleTaskCount: number
}): void {
  const { ctx, scrollX, scrollY, canvasWidth, canvasHeight, rangeStart, rangeEnd, cellWidth, visibleTaskCount } = options

  ctx.strokeStyle = '#f3f4f6'
  ctx.lineWidth = 1

  let currentDate = new Date(rangeStart)
  currentDate.setHours(0, 0, 0, 0)

  while (currentDate <= rangeEnd) {
    const x = dateToX(currentDate, rangeStart, cellWidth) - scrollX

    if (x >= 0 && x <= canvasWidth) {
      ctx.beginPath()
      ctx.moveTo(x, TIMELINE_HEIGHT)
      ctx.lineTo(x, canvasHeight)
      ctx.stroke()
    }

    currentDate.setDate(currentDate.getDate() + 1)
  }

  for (let i = 0; i < visibleTaskCount + 1; i++) {
    const y = TIMELINE_HEIGHT + i * 36 - scrollY
    if (y >= TIMELINE_HEIGHT && y <= canvasHeight) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(canvasWidth, y)
      ctx.stroke()
    }
  }
}

export function drawTodayLine(options: {
  ctx: CanvasRenderingContext2D
  scrollX: number
  scrollY: number
  canvasWidth: number
  canvasHeight: number
  rangeStart: Date
  cellWidth: number
}): void {
  const { ctx, scrollX, scrollY, canvasWidth, canvasHeight, rangeStart, cellWidth } = options
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const x = dateToX(today, rangeStart, cellWidth) - scrollX

  if (x >= 0 && x <= canvasWidth) {
    ctx.strokeStyle = '#ef4444'
    ctx.lineWidth = 2
    ctx.setLineDash([5, 5])
    ctx.beginPath()
    ctx.moveTo(x, TIMELINE_HEIGHT - scrollY)
    ctx.lineTo(x, canvasHeight)
    ctx.stroke()
    ctx.setLineDash([])

    ctx.fillStyle = '#ef4444'
    ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('今天', x, TIMELINE_HEIGHT - 15)
  }
}

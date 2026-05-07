export interface CoordinateContext {
  projectStart: Date
  cellWidth: number
}

export function dateToX(date: Date, ctx: CoordinateContext): number {
  const days = (date.getTime() - ctx.projectStart.getTime()) / (24 * 60 * 60 * 1000)
  return Math.round(days * ctx.cellWidth)
}

export function xToDate(x: number, ctx: CoordinateContext): Date {
  const days = x / ctx.cellWidth
  const date = new Date(ctx.projectStart.getTime() + days * 24 * 60 * 60 * 1000)
  date.setHours(0, 0, 0, 0)
  return date
}

export function taskWidth(startDate: Date, endDate: Date, ctx: CoordinateContext): number {
  return Math.max(
    (endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000) * ctx.cellWidth,
    10
  )
}

export function deltaXToDays(deltaX: number, ctx: CoordinateContext): number {
  return Math.round(deltaX / ctx.cellWidth)
}

export function daysToDate(days: number, baseDate: Date): Date {
  return new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000)
}

export function durationDays(startDate: Date, endDate: Date): number {
  return Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)) + 1
}

export function totalDaysRange(start: Date, end: Date): number {
  return Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1
}

export function getProjectDateRange(tasks: Array<{ startDate: string; endDate: string }>): { start: Date; end: Date } {
  if (tasks.length === 0) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const start = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
    const end = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000)
    return { start, end }
  }

  let minDate = new Date(tasks[0].startDate)
  let maxDate = new Date(tasks[0].endDate)

  for (const task of tasks) {
    const start = new Date(task.startDate)
    const end = new Date(task.endDate)
    if (start < minDate) minDate = start
    if (end > maxDate) maxDate = end
  }

  minDate = new Date(minDate.getTime() - 15 * 24 * 60 * 60 * 1000)
  maxDate = new Date(maxDate.getTime() + 15 * 24 * 60 * 60 * 1000)

  return { start: minDate, end: maxDate }
}

export interface CoordinateContext {
  projectStart: Date
  cellWidth: number
}

export function dateToX(date: Date, context: CoordinateContext): number {
  const { projectStart, cellWidth } = context
  const days = (date.getTime() - projectStart.getTime()) / (24 * 60 * 60 * 1000)
  return Math.round(days * cellWidth)
}

export function xToDate(x: number, context: CoordinateContext): Date {
  const { projectStart, cellWidth } = context
  const days = x / cellWidth
  const date = new Date(projectStart.getTime() + days * 24 * 60 * 60 * 1000)
  date.setHours(0, 0, 0, 0)
  return date
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

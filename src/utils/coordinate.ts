import { TimeUnit } from '@/types'
import type { Task } from '@/types'

export const ROW_HEIGHT = 36
export const TIMELINE_HEIGHT = 60
export const CELL_MIN_WIDTH = 60
export const TASK_HEIGHT = 24
export const TASK_PADDING = 6

export function dateToX(date: Date, rangeStart: Date, cellWidth: number): number {
  const days = (date.getTime() - rangeStart.getTime()) / (24 * 60 * 60 * 1000)
  return Math.round(days * cellWidth)
}

export function xToDate(x: number, rangeStart: Date, cellWidth: number): Date {
  const days = x / cellWidth
  const date = new Date(rangeStart.getTime() + days * 24 * 60 * 60 * 1000)
  date.setHours(0, 0, 0, 0)
  return date
}

export function getTaskColor(task: Task): string {
  switch (task.status) {
    case 'not_started':
      return '#9ca3af'
    case 'in_progress':
      return '#3b82f6'
    case 'completed':
      return '#10b981'
    case 'delayed':
      return '#ef4444'
    default:
      return '#9ca3af'
  }
}

export function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1)
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
}

export function computeProjectDateRange(tasks: Task[]): { start: Date; end: Date } {
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
    const s = new Date(task.startDate)
    const e = new Date(task.endDate)
    if (s < minDate) minDate = s
    if (e > maxDate) maxDate = e
  }

  minDate = new Date(minDate.getTime() - 15 * 24 * 60 * 60 * 1000)
  maxDate = new Date(maxDate.getTime() + 15 * 24 * 60 * 60 * 1000)

  return { start: minDate, end: maxDate }
}

export function getTaskRect(
  task: Task,
  index: number,
  rangeStart: Date,
  cellWidth: number,
  scrollX: number,
  scrollY: number
): { x: number; y: number; width: number } {
  const startDate = new Date(task.startDate)
  const endDate = new Date(task.endDate)
  const x = dateToX(startDate, rangeStart, cellWidth) - scrollX
  const width = Math.max(
    (endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000) * cellWidth,
    10
  )
  const y = TIMELINE_HEIGHT + index * ROW_HEIGHT + TASK_PADDING - scrollY
  return { x, y, width }
}

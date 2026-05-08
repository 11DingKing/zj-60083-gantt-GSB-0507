import { TimeUnit } from '@/types'
import type { Task, Dependency, Baseline } from '@/types'
import type { CoordinateContext } from '@/utils/coordinate'
import { drawTimeline, drawGrid, drawTodayLine } from './timeline'
import { drawTasks, drawBaselines } from './taskBar'
import { drawDependencies, drawDependencyPreview } from './dependency'

export interface DrawAllOptions {
  ctx: CoordinateContext
  timeUnit: TimeUnit
  visibleTasks: Task[]
  dependencies: Dependency[]
  selectedBaseline: Baseline | null
  selectedTaskId: string | null
  timelineHeight: number
  rowHeight: number
  taskHeight: number
  taskPadding: number
  canvasWidth: number
  canvasHeight: number
  scrollX: number
  scrollY: number
  isResizingDependency: boolean
  dependencyFromTaskId: string | null
  dependencyStartX: number
  dependencyStartY: number
  projectEnd: Date
}

export function drawAll(c: CanvasRenderingContext2D, o: DrawAllOptions): void {
  c.clearRect(0, 0, o.canvasWidth, o.canvasHeight)

  drawTimeline(c, {
    projectStart: o.ctx.projectStart,
    projectEnd: o.projectEnd,
    cellWidth: o.ctx.cellWidth,
    timelineHeight: o.timelineHeight,
    canvasWidth: o.canvasWidth,
    scrollX: o.scrollX,
    timeUnit: o.timeUnit
  })

  drawGrid(c, {
    projectStart: o.ctx.projectStart,
    projectEnd: o.projectEnd,
    cellWidth: o.ctx.cellWidth,
    timelineHeight: o.timelineHeight,
    rowHeight: o.rowHeight,
    visibleTaskCount: o.visibleTasks.length,
    canvasWidth: o.canvasWidth,
    canvasHeight: o.canvasHeight,
    scrollX: o.scrollX,
    scrollY: o.scrollY
  })

  drawTodayLine(c, {
    projectStart: o.ctx.projectStart,
    cellWidth: o.ctx.cellWidth,
    timelineHeight: o.timelineHeight,
    canvasWidth: o.canvasWidth,
    canvasHeight: o.canvasHeight,
    scrollX: o.scrollX,
    scrollY: o.scrollY
  })

  if (o.selectedBaseline) {
    drawBaselines(c, {
      tasks: o.visibleTasks,
      baseline: o.selectedBaseline,
      ctx: o.ctx,
      timelineHeight: o.timelineHeight,
      rowHeight: o.rowHeight,
      taskHeight: o.taskHeight,
      taskPadding: o.taskPadding,
      canvasWidth: o.canvasWidth,
      canvasHeight: o.canvasHeight,
      scrollX: o.scrollX,
      scrollY: o.scrollY
    })
  }

  drawDependencies(c, {
    tasks: o.visibleTasks,
    dependencies: o.dependencies,
    ctx: o.ctx,
    timelineHeight: o.timelineHeight,
    rowHeight: o.rowHeight,
    taskHeight: o.taskHeight,
    taskPadding: o.taskPadding,
    canvasWidth: o.canvasWidth,
    scrollX: o.scrollX,
    scrollY: o.scrollY
  })

  drawTasks(c, {
    tasks: o.visibleTasks,
    ctx: o.ctx,
    timelineHeight: o.timelineHeight,
    rowHeight: o.rowHeight,
    taskHeight: o.taskHeight,
    taskPadding: o.taskPadding,
    canvasWidth: o.canvasWidth,
    canvasHeight: o.canvasHeight,
    scrollX: o.scrollX,
    scrollY: o.scrollY,
    selectedTaskId: o.selectedTaskId
  })

  if (o.isResizingDependency && o.dependencyFromTaskId) {
    drawDependencyPreview(c, {
      tasks: o.visibleTasks,
      fromTaskId: o.dependencyFromTaskId,
      ctx: o.ctx,
      timelineHeight: o.timelineHeight,
      rowHeight: o.rowHeight,
      taskHeight: o.taskHeight,
      taskPadding: o.taskPadding,
      canvasWidth: o.canvasWidth,
      scrollX: o.scrollX,
      scrollY: o.scrollY,
      currentX: o.dependencyStartX,
      currentY: o.dependencyStartY
    })
  }
}

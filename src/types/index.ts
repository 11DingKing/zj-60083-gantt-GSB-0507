export enum TaskStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  DELAYED = 'delayed'
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum DependencyType {
  FS = 'FS',
  SS = 'SS',
  FF = 'FF',
  SF = 'SF'
}

export enum TimeUnit {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter'
}

export interface Task {
  id: string
  projectId: string
  name: string
  description: string
  startDate: string
  endDate: string
  duration: number
  progress: number
  priority: TaskPriority
  status: TaskStatus
  assignees: string[]
  parentId: string | null
  level: number
  order: number
  expanded: boolean
  isMilestone: boolean
  isCriticalPath: boolean
  createdAt: string
  updatedAt: string
}

export interface Dependency {
  id: string
  projectId: string
  fromTaskId: string
  toTaskId: string
  type: DependencyType
  lag: number
  hasConflict: boolean
}

export interface Resource {
  id: string
  projectId: string
  name: string
  role: string
  dailyHours: number
  color: string
}

export interface ResourceWorkload {
  resourceId: string
  date: string
  hours: number
  isOverloaded: boolean
}

export interface Baseline {
  id: string
  projectId: string
  name: string
  tasks: BaselineTask[]
  createdAt: string
}

export interface BaselineTask {
  taskId: string
  startDate: string
  endDate: string
  duration: number
}

export interface Project {
  id: string
  name: string
  description: string
  createdAt: string
  updatedAt: string
}

export interface ContextMenuAction {
  action: string
  label: string
  icon?: string
  disabled?: boolean
}

export interface CanvasTaskRect {
  taskId: string
  x: number
  y: number
  width: number
  height: number
  task: Task
}

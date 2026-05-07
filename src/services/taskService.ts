import { getDB } from '@/utils/db'
import { TaskStatus, TaskPriority } from '@/types'
import type { Task } from '@/types'

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

function calculateStatus(task: Task): TaskStatus {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const startDate = new Date(task.startDate)
  startDate.setHours(0, 0, 0, 0)
  
  const endDate = new Date(task.endDate)
  endDate.setHours(0, 0, 0, 0)

  if (task.progress >= 100) {
    return TaskStatus.COMPLETED
  }

  if (today > endDate && task.progress < 100) {
    return TaskStatus.DELAYED
  }

  if (today >= startDate && task.progress > 0) {
    return TaskStatus.IN_PROGRESS
  }

  return TaskStatus.NOT_STARTED
}

export async function getTasks(projectId: string): Promise<Task[]> {
  const db = await getDB()
  const tasks = await db.getAllFromIndex('tasks', 'by-projectId', projectId)
  return tasks.sort((a, b) => a.order - b.order)
}

export async function getTask(taskId: string): Promise<Task | undefined> {
  const db = await getDB()
  return db.get('tasks', taskId)
}

export async function createTask(projectId: string, data: Partial<Task>, parentId: string | null = null): Promise<Task> {
  const db = await getDB()
  const now = new Date().toISOString()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const siblingTasks = await db.getAllFromIndex('tasks', 'by-parentId', parentId)
  const maxOrder = siblingTasks.reduce((max, t) => Math.max(max, t.order), -1)

  let parentLevel = 0
  if (parentId) {
    const parent = await db.get('tasks', parentId)
    if (parent) {
      parentLevel = parent.level + 1
    }
  }

  const task: Task = {
    id: generateId(),
    projectId,
    name: data.name || '新任务',
    description: data.description || '',
    startDate: data.startDate || today.toISOString().split('T')[0],
    endDate: data.endDate || new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    duration: data.duration || 7,
    progress: data.progress ?? 0,
    priority: data.priority || TaskPriority.MEDIUM,
    status: TaskStatus.NOT_STARTED,
    assignees: data.assignees || [],
    parentId,
    level: Math.min(parentLevel, 3),
    order: maxOrder + 1,
    expanded: true,
    isMilestone: data.isMilestone || false,
    isCriticalPath: false,
    createdAt: now,
    updatedAt: now
  }

  task.status = calculateStatus(task)

  if (task.isMilestone) {
    task.endDate = task.startDate
    task.duration = 1
  }

  await db.add('tasks', task)

  if (parentId) {
    const parent = await db.get('tasks', parentId)
    if (parent) {
      await updateParentDates(projectId, parentId)
    }
  }

  return task
}

export async function updateTask(taskId: string, updates: Partial<Task>): Promise<Task | undefined> {
  const db = await getDB()
  const task = await db.get('tasks', taskId)
  if (!task) return undefined

  const updatedTask: Task = {
    ...task,
    ...updates,
    updatedAt: new Date().toISOString()
  }

  if (updatedTask.isMilestone) {
    updatedTask.endDate = updatedTask.startDate
    updatedTask.duration = 1
  }

  updatedTask.status = calculateStatus(updatedTask)

  await db.put('tasks', updatedTask)

  if (updatedTask.parentId) {
    await updateParentDates(updatedTask.projectId, updatedTask.parentId)
  }

  await updateChildTasksStatus(updatedTask.projectId, updatedTask.id)

  return updatedTask
}

async function updateParentDates(projectId: string, parentId: string | null, updatedTasks: Task[] = []): Promise<Task[]> {
  if (!parentId) return updatedTasks

  const db = await getDB()
  const parent = await db.get('tasks', parentId)
  if (!parent) return updatedTasks

  const children = await db.getAllFromIndex('tasks', 'by-parentId', parentId)
  
  if (children.length === 0) return updatedTasks

  let minStart = new Date(children[0].startDate)
  let maxEnd = new Date(children[0].endDate)
  let totalProgress = 0

  for (const child of children) {
    const childStart = new Date(child.startDate)
    const childEnd = new Date(child.endDate)
    if (childStart < minStart) minStart = childStart
    if (childEnd > maxEnd) maxEnd = childEnd
    totalProgress += child.progress
  }

  const duration = Math.ceil((maxEnd.getTime() - minStart.getTime()) / (24 * 60 * 60 * 1000)) + 1
  const avgProgress = Math.round(totalProgress / children.length)

  const updatedParent: Task = {
    ...parent,
    startDate: minStart.toISOString().split('T')[0],
    endDate: maxEnd.toISOString().split('T')[0],
    duration,
    progress: avgProgress,
    updatedAt: new Date().toISOString()
  }

  updatedParent.status = calculateStatus(updatedParent)

  await db.put('tasks', updatedParent)
  updatedTasks.push(updatedParent)

  if (updatedParent.parentId) {
    return updateParentDates(projectId, updatedParent.parentId, updatedTasks)
  }

  return updatedTasks
}

export async function updateParentTaskDates(task: Task): Promise<Task[]> {
  return updateParentDates(task.projectId, task.parentId, [])
}

async function updateChildTasksStatus(projectId: string, parentId: string): Promise<void> {
  const db = await getDB()
  const children = await db.getAllFromIndex('tasks', 'by-parentId', parentId)
  
  for (const child of children) {
    await updateChildTasksStatus(projectId, child.id)
  }
}

export async function deleteTask(taskId: string): Promise<Task[]> {
  const db = await getDB()
  const task = await db.get('tasks', taskId)
  if (!task) return []

  const parentId = task.parentId
  const projectId = task.projectId

  const tx = db.transaction(['tasks', 'dependencies'], 'readwrite')

  await deleteTaskRecursive(tx, taskId)

  const deps = await tx.objectStore('dependencies').index('by-projectId').getAll(task.projectId)
  for (const dep of deps) {
    if (dep.fromTaskId === taskId || dep.toTaskId === taskId) {
      await tx.objectStore('dependencies').delete(dep.id)
    }
  }

  await tx.done

  if (parentId) {
    return updateParentDates(projectId, parentId, [])
  }

  return []
}

async function deleteTaskRecursive(tx: IDBTransaction, taskId: string): Promise<void> {
  const task = await tx.objectStore('tasks').get(taskId)
  if (!task) return

  const children = await tx.objectStore('tasks').index('by-parentId').getAll(taskId)
  for (const child of children) {
    await deleteTaskRecursive(tx, child.id)
  }

  await tx.objectStore('tasks').delete(taskId)
}

export async function getChildTasks(parentId: string): Promise<Task[]> {
  const db = await getDB()
  return db.getAllFromIndex('tasks', 'by-parentId', parentId)
}

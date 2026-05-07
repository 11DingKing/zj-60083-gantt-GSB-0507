import { getDB } from '@/utils/db'
import type { Resource, Task, ResourceWorkload } from '@/types'

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
]

export async function getResources(projectId: string): Promise<Resource[]> {
  const db = await getDB()
  return db.getAllFromIndex('resources', 'by-projectId', projectId)
}

export async function createResource(
  projectId: string,
  name: string,
  role: string = '',
  dailyHours: number = 8
): Promise<Resource> {
  const db = await getDB()
  const existing = await db.getAllFromIndex('resources', 'by-projectId', projectId)
  
  const resource: Resource = {
    id: generateId(),
    projectId,
    name,
    role,
    dailyHours,
    color: COLORS[existing.length % COLORS.length]
  }

  await db.add('resources', resource)
  return resource
}

export async function updateResource(
  resourceId: string,
  updates: Partial<Resource>
): Promise<Resource | undefined> {
  const db = await getDB()
  const resource = await db.get('resources', resourceId)
  if (!resource) return undefined

  const updatedResource = { ...resource, ...updates }
  await db.put('resources', updatedResource)
  return updatedResource
}

export async function deleteResource(resourceId: string): Promise<void> {
  const db = await getDB()
  const resource = await db.get('resources', resourceId)
  if (!resource) return

  const tasks = await db.getAllFromIndex('tasks', 'by-projectId', resource.projectId)
  const tx = db.transaction(['resources', 'tasks'], 'readwrite')

  await tx.store.delete(resourceId)

  for (const task of tasks) {
    if (task.assignees.includes(resourceId)) {
      const updatedTask = {
        ...task,
        assignees: task.assignees.filter(id => id !== resourceId)
      }
      await tx.objectStore('tasks').put(updatedTask)
    }
  }

  await tx.done
}

export async function calculateResourceWorkload(
  projectId: string,
  startDate: Date,
  endDate: Date
): Promise<Map<string, ResourceWorkload[]>> {
  const db = await getDB()
  const resources = await db.getAllFromIndex('resources', 'by-projectId', projectId)
  const tasks = await db.getAllFromIndex('tasks', 'by-projectId', projectId)

  const workloadMap = new Map<string, ResourceWorkload[]>()

  for (const resource of resources) {
    const workloads: ResourceWorkload[] = []
    const currentDate = new Date(startDate)

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0]
      let totalHours = 0

      for (const task of tasks) {
        if (!task.assignees.includes(resource.id)) continue

        const taskStart = new Date(task.startDate)
        const taskEnd = new Date(task.endDate)
        const taskDate = new Date(dateStr)

        if (taskDate >= taskStart && taskDate <= taskEnd) {
          const workDays = Math.ceil(
            (taskEnd.getTime() - taskStart.getTime()) / (24 * 60 * 60 * 1000)
          ) + 1
          const estimatedHours = (resource.dailyHours * task.progress) / 100
          totalHours += workDays > 0 ? estimatedHours / workDays : 0
        }
      }

      workloads.push({
        resourceId: resource.id,
        date: dateStr,
        hours: totalHours,
        isOverloaded: totalHours > resource.dailyHours
      })

      currentDate.setDate(currentDate.getDate() + 1)
    }

    workloadMap.set(resource.id, workloads)
  }

  return workloadMap
}

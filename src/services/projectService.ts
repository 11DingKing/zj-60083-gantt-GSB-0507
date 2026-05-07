import { getDB } from '@/utils/db'
import type { Project } from '@/types'

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

export async function getProjects(): Promise<Project[]> {
  const db = await getDB()
  const projects = await db.getAll('projects')
  return projects.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
}

export async function getProject(projectId: string): Promise<Project | undefined> {
  const db = await getDB()
  return db.get('projects', projectId)
}

export async function createProject(name: string, description: string = ''): Promise<Project> {
  const db = await getDB()
  const now = new Date().toISOString()
  const project: Project = {
    id: generateId(),
    name,
    description,
    createdAt: now,
    updatedAt: now
  }
  await db.add('projects', project)
  return project
}

export async function updateProject(projectId: string, updates: Partial<Project>): Promise<Project | undefined> {
  const db = await getDB()
  const project = await db.get('projects', projectId)
  if (!project) return undefined

  const updatedProject = {
    ...project,
    ...updates,
    updatedAt: new Date().toISOString()
  }
  await db.put('projects', updatedProject)
  return updatedProject
}

export async function deleteProject(projectId: string): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(['projects', 'tasks', 'dependencies', 'resources', 'baselines'], 'readwrite')

  await tx.store.delete(projectId)

  const tasks = await tx.objectStore('tasks').index('by-projectId').getAll(projectId)
  for (const task of tasks) {
    await tx.objectStore('tasks').delete(task.id)
  }

  const deps = await tx.objectStore('dependencies').index('by-projectId').getAll(projectId)
  for (const dep of deps) {
    await tx.objectStore('dependencies').delete(dep.id)
  }

  const resources = await tx.objectStore('resources').index('by-projectId').getAll(projectId)
  for (const resource of resources) {
    await tx.objectStore('resources').delete(resource.id)
  }

  const baselines = await tx.objectStore('baselines').index('by-projectId').getAll(projectId)
  for (const baseline of baselines) {
    await tx.objectStore('baselines').delete(baseline.id)
  }

  await tx.done
}

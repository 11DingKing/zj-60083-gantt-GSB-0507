import { openDB, IDBPDatabase } from 'idb'
import type { Project, Task, Dependency, Resource, Baseline } from '@/types'

const DB_NAME = 'GanttProjectDB'
const DB_VERSION = 1

export interface GanttDB {
  projects: {
    key: string
    value: Project
    indexes: { 'by-createdAt': string }
  }
  tasks: {
    key: string
    value: Task
    indexes: { 'by-projectId': string; 'by-parentId': string }
  }
  dependencies: {
    key: string
    value: Dependency
    indexes: { 'by-projectId': string }
  }
  resources: {
    key: string
    value: Resource
    indexes: { 'by-projectId': string }
  }
  baselines: {
    key: string
    value: Baseline
    indexes: { 'by-projectId': string }
  }
}

let dbInstance: IDBPDatabase<GanttDB> | null = null

export async function getDB(): Promise<IDBPDatabase<GanttDB>> {
  if (dbInstance) return dbInstance

  dbInstance = await openDB<GanttDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('projects')) {
        const projectStore = db.createObjectStore('projects', { keyPath: 'id' })
        projectStore.createIndex('by-createdAt', 'createdAt')
      }

      if (!db.objectStoreNames.contains('tasks')) {
        const taskStore = db.createObjectStore('tasks', { keyPath: 'id' })
        taskStore.createIndex('by-projectId', 'projectId')
        taskStore.createIndex('by-parentId', 'parentId')
      }

      if (!db.objectStoreNames.contains('dependencies')) {
        const depStore = db.createObjectStore('dependencies', { keyPath: 'id' })
        depStore.createIndex('by-projectId', 'projectId')
      }

      if (!db.objectStoreNames.contains('resources')) {
        const resourceStore = db.createObjectStore('resources', { keyPath: 'id' })
        resourceStore.createIndex('by-projectId', 'projectId')
      }

      if (!db.objectStoreNames.contains('baselines')) {
        const baselineStore = db.createObjectStore('baselines', { keyPath: 'id' })
        baselineStore.createIndex('by-projectId', 'projectId')
      }
    }
  })

  return dbInstance
}

export async function closeDB(): Promise<void> {
  if (dbInstance) {
    dbInstance.close()
    dbInstance = null
  }
}

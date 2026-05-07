import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { TaskStatus, TimeUnit, DependencyType } from '@/types'
import type { Task, Project, Dependency, Resource, Baseline } from '@/types'
import * as projectService from '@/services/projectService'
import * as taskService from '@/services/taskService'
import * as dependencyService from '@/services/dependencyService'
import * as resourceService from '@/services/resourceService'
import * as baselineService from '@/services/baselineService'

export const useGanttStore = defineStore('gantt', () => {
  const projects = ref<Project[]>([])
  const currentProjectId = ref<string | null>(null)
  const tasks = ref<Task[]>([])
  const dependencies = ref<Dependency[]>([])
  const resources = ref<Resource[]>([])
  const baselines = ref<Baseline[]>([])
  const selectedBaseline = ref<Baseline | null>(null)

  const timeUnit = ref<TimeUnit>(TimeUnit.DAY)
  const scrollTop = ref(0)
  const scrollLeft = ref(0)
  const zoom = ref(1)

  const selectedTaskId = ref<string | null>(null)
  const selectedResourceId = ref<string | null>(null)
  const filterByAssigneeId = ref<string | null>(null)

  const isLoading = ref(false)
  const lastSaved = ref<Date | null>(null)

  const currentProject = computed(() => {
    return projects.value.find(p => p.id === currentProjectId.value) || null
  })

  const filterByAssignee = computed(() => {
    if (!filterByAssigneeId.value) return null
    return resources.value.find(r => r.id === filterByAssigneeId.value) || null
  })

  const visibleTasks = computed(() => {
    const expandedIds = new Set<string>()
    const result: Task[] = []
    
    const filterIds = new Set<string>()
    if (filterByAssigneeId.value) {
      const taskIds = tasks.value
        .filter(t => t.assignees.includes(filterByAssigneeId.value!))
        .map(t => t.id)
      taskIds.forEach(id => filterIds.add(id))
      
      for (const task of tasks.value) {
        if (filterIds.has(task.id)) {
          let parentId = task.parentId
          while (parentId) {
            filterIds.add(parentId)
            const parent = tasks.value.find(t => t.id === parentId)
            parentId = parent?.parentId || null
          }
        }
      }
    }

    for (const task of tasks.value) {
      if (filterByAssigneeId.value && !filterIds.has(task.id)) continue
      
      if (task.parentId === null) {
        result.push(task)
        if (task.expanded) {
          expandedIds.add(task.id)
        }
      } else if (expandedIds.has(task.parentId)) {
        result.push(task)
        if (task.expanded) {
          expandedIds.add(task.id)
        }
      }
    }

    return result.sort((a, b) => a.order - b.order)
  })

  const taskStats = computed(() => {
    const total = tasks.value.length
    const completed = tasks.value.filter(t => t.status === TaskStatus.COMPLETED).length
    const delayed = tasks.value.filter(t => t.status === TaskStatus.DELAYED).length
    const inProgress = tasks.value.filter(t => t.status === TaskStatus.IN_PROGRESS).length
    const notStarted = tasks.value.filter(t => t.status === TaskStatus.NOT_STARTED).length

    let totalDuration = 0
    let completedDuration = 0
    for (const task of tasks.value) {
      totalDuration += task.duration
      completedDuration += task.duration * (task.progress / 100)
    }

    return {
      total,
      completed,
      delayed,
      inProgress,
      notStarted,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      remainingDuration: totalDuration - completedDuration
    }
  })

  async function loadProjects(): Promise<void> {
    projects.value = await projectService.getProjects()
  }

  async function createProject(name: string, description?: string): Promise<Project> {
    const project = await projectService.createProject(name, description)
    projects.value.push(project)
    return project
  }

  async function switchProject(projectId: string | null): Promise<void> {
    currentProjectId.value = projectId

    if (projectId) {
      await loadProjectData(projectId)
    } else {
      tasks.value = []
      dependencies.value = []
      resources.value = []
      baselines.value = []
    }
  }

  async function loadProjectData(projectId: string): Promise<void> {
    isLoading.value = true

    try {
      tasks.value = await taskService.getTasks(projectId)
      dependencies.value = await dependencyService.getDependencies(projectId)
      resources.value = await resourceService.getResources(projectId)
      baselines.value = await baselineService.getBaselines(projectId)

      await dependencyService.checkDependencyConflicts(projectId, tasks.value, dependencies.value)
      await dependencyService.calculateCriticalPath(projectId, tasks.value, dependencies.value)
    } finally {
      isLoading.value = false
    }
  }

  async function createTask(data: Partial<Task>, parentId: string | null = null): Promise<Task> {
    if (!currentProjectId.value) {
      throw new Error('请先选择项目')
    }

    const task = await taskService.createTask(currentProjectId.value, data, parentId)
    tasks.value.push(task)
    
    const updatedParents = await taskService.updateParentTaskDates(task)
    for (const parent of updatedParents) {
      const idx = tasks.value.findIndex(t => t.id === parent.id)
      if (idx !== -1) {
        tasks.value[idx] = parent
      }
    }
    
    await calculateCriticalPath()
    return task
  }

  async function updateTask(taskId: string, updates: Partial<Task>): Promise<void> {
    const updated = await taskService.updateTask(taskId, updates)
    if (updated) {
      const index = tasks.value.findIndex(t => t.id === taskId)
      if (index !== -1) {
        tasks.value[index] = updated
      }
      
      const updatedParents = await taskService.updateParentTaskDates(updated)
      for (const parent of updatedParents) {
        const idx = tasks.value.findIndex(t => t.id === parent.id)
        if (idx !== -1) {
          tasks.value[idx] = parent
        }
      }
      
      await calculateCriticalPath()
    }
  }

  async function deleteTask(taskId: string): Promise<void> {
    const updatedParents = await taskService.deleteTask(taskId)
    tasks.value = tasks.value.filter(t => t.id !== taskId)
    
    for (const parent of updatedParents) {
      const idx = tasks.value.findIndex(t => t.id === parent.id)
      if (idx !== -1) {
        tasks.value[idx] = parent
      }
    }
    
    if (selectedTaskId.value === taskId) {
      selectedTaskId.value = null
    }
    await calculateCriticalPath()
  }

  async function toggleTaskExpand(taskId: string): Promise<void> {
    const task = tasks.value.find(t => t.id === taskId)
    if (task) {
      task.expanded = !task.expanded
      await taskService.updateTask(taskId, { expanded: task.expanded })
    }
  }

  async function createDependency(
    fromTaskId: string,
    toTaskId: string,
    type: DependencyType = DependencyType.FS
  ): Promise<Dependency> {
    if (!currentProjectId.value) {
      throw new Error('请先选择项目')
    }

    const dep = await dependencyService.createDependency(
      currentProjectId.value,
      fromTaskId,
      toTaskId,
      type
    )
    dependencies.value.push(dep)
    await checkConflicts()
    await calculateCriticalPath()
    return dep
  }

  async function deleteDependency(depId: string): Promise<void> {
    await dependencyService.deleteDependency(depId)
    dependencies.value = dependencies.value.filter(d => d.id !== depId)
    await checkConflicts()
    await calculateCriticalPath()
  }

  async function checkConflicts(): Promise<void> {
    if (!currentProjectId.value) return

    dependencies.value = await dependencyService.checkDependencyConflicts(
      currentProjectId.value,
      tasks.value,
      dependencies.value
    )
  }

  async function calculateCriticalPath(): Promise<void> {
    if (!currentProjectId.value) return

    const criticalPathIds = await dependencyService.calculateCriticalPath(
      currentProjectId.value,
      tasks.value,
      dependencies.value
    )

    for (let i = 0; i < tasks.value.length; i++) {
      const isCritical = criticalPathIds.includes(tasks.value[i].id)
      if (tasks.value[i].isCriticalPath !== isCritical) {
        tasks.value[i] = {
          ...tasks.value[i],
          isCriticalPath: isCritical
        }
      }
    }
  }

  async function createResource(name: string, role: string, dailyHours: number = 8): Promise<Resource> {
    if (!currentProjectId.value) {
      throw new Error('请先选择项目')
    }

    const resource = await resourceService.createResource(
      currentProjectId.value,
      name,
      role,
      dailyHours
    )
    resources.value.push(resource)
    return resource
  }

  async function updateResource(resourceId: string, updates: Partial<Resource>): Promise<void> {
    const updated = await resourceService.updateResource(resourceId, updates)
    if (updated) {
      const index = resources.value.findIndex(r => r.id === resourceId)
      if (index !== -1) {
        resources.value[index] = updated
      }
    }
  }

  async function deleteResource(resourceId: string): Promise<void> {
    await resourceService.deleteResource(resourceId)
    resources.value = resources.value.filter(r => r.id !== resourceId)
    if (selectedResourceId.value === resourceId) {
      selectedResourceId.value = null
    }
  }

  async function createBaseline(name: string): Promise<Baseline> {
    if (!currentProjectId.value) {
      throw new Error('请先选择项目')
    }

    const baseline = await baselineService.createBaseline(
      currentProjectId.value,
      name,
      tasks.value
    )
    baselines.value.push(baseline)
    return baseline
  }

  async function deleteBaseline(baselineId: string): Promise<void> {
    await baselineService.deleteBaseline(baselineId)
    baselines.value = baselines.value.filter(b => b.id !== baselineId)
    if (selectedBaseline.value?.id === baselineId) {
      selectedBaseline.value = null
    }
  }

  function selectBaseline(baseline: Baseline | null): void {
    selectedBaseline.value = baseline
  }

  function setTimeUnit(unit: TimeUnit): void {
    timeUnit.value = unit
  }

  function setScrollTop(top: number): void {
    scrollTop.value = top
  }

  function setScrollLeft(left: number): void {
    scrollLeft.value = left
  }

  function setZoom(newZoom: number): void {
    zoom.value = Math.max(0.5, Math.min(3, newZoom))
  }

  function selectTask(taskId: string | null): void {
    selectedTaskId.value = taskId
  }

  function selectResource(resourceId: string | null): void {
    selectedResourceId.value = resourceId
  }

  function setFilterByAssignee(resourceId: string | null): void {
    filterByAssigneeId.value = resourceId
  }

  function getTaskById(taskId: string): Task | undefined {
    return tasks.value.find(t => t.id === taskId)
  }

  function getResourceById(resourceId: string): Resource | undefined {
    return resources.value.find(r => r.id === resourceId)
  }

  function getTasksByAssignee(resourceId: string): Task[] {
    return tasks.value.filter(t => t.assignees.includes(resourceId))
  }

  return {
    projects,
    currentProjectId,
    tasks,
    dependencies,
    resources,
    baselines,
    selectedBaseline,
    timeUnit,
    scrollTop,
    scrollLeft,
    zoom,
    selectedTaskId,
    selectedResourceId,
    filterByAssigneeId,
    filterByAssignee,
    isLoading,
    lastSaved,
    currentProject,
    visibleTasks,
    taskStats,
    loadProjects,
    createProject,
    switchProject,
    loadProjectData,
    createTask,
    updateTask,
    deleteTask,
    toggleTaskExpand,
    createDependency,
    deleteDependency,
    checkConflicts,
    calculateCriticalPath,
    createResource,
    updateResource,
    deleteResource,
    createBaseline,
    deleteBaseline,
    selectBaseline,
    setTimeUnit,
    setScrollTop,
    setScrollLeft,
    setZoom,
    selectTask,
    selectResource,
    setFilterByAssignee,
    getTaskById,
    getResourceById,
    getTasksByAssignee
  }
})

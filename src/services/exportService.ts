import type { Task, Dependency, Resource, Project } from '@/types'

export interface ProjectExport {
  project: Project
  tasks: Task[]
  dependencies: Dependency[]
  resources: Resource[]
  exportedAt: string
}

export function exportToJSON(
  project: Project,
  tasks: Task[],
  dependencies: Dependency[],
  resources: Resource[]
): string {
  const exportData: ProjectExport = {
    project,
    tasks,
    dependencies,
    resources,
    exportedAt: new Date().toISOString()
  }
  return JSON.stringify(exportData, null, 2)
}

export function downloadJSON(data: string, filename: string): void {
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function exportToCSV(tasks: Task[]): string {
  const headers = [
    'ID', '名称', '描述', '开始日期', '结束日期', '工期(天)',
    '进度(%)', '优先级', '状态', '负责人', '父任务ID', '层级', '是否里程碑'
  ]

  const rows = tasks.map(task => [
    task.id,
    `"${task.name.replace(/"/g, '""')}"`,
    `"${task.description.replace(/"/g, '""')}"`,
    task.startDate,
    task.endDate,
    task.duration,
    task.progress,
    task.priority,
    task.status,
    task.assignees.join(';'),
    task.parentId || '',
    task.level,
    task.isMilestone ? '是' : '否'
  ])

  const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n')
  return '\uFEFF' + csvContent
}

export function downloadCSV(data: string, filename: string): void {
  const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function parseJSONImport(data: string): ProjectExport {
  const parsed = JSON.parse(data) as ProjectExport
  if (!parsed.project || !parsed.tasks) {
    throw new Error('无效的导入格式')
  }
  return parsed
}

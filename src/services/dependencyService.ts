import { getDB } from "@/utils/db";
import { generateId } from "@/utils/common";
import { DependencyType } from "@/types";
import type { Dependency, Task } from "@/types";

export async function getDependencies(
  projectId: string,
): Promise<Dependency[]> {
  const db = await getDB();
  return db.getAllFromIndex("dependencies", "by-projectId", projectId);
}

export async function createDependency(
  projectId: string,
  fromTaskId: string,
  toTaskId: string,
  type: DependencyType = DependencyType.FS,
  lag: number = 0,
): Promise<Dependency> {
  const db = await getDB();

  const existing = await db.getAllFromIndex(
    "dependencies",
    "by-projectId",
    projectId,
  );
  const alreadyExists = existing.some(
    (d) => d.fromTaskId === fromTaskId && d.toTaskId === toTaskId,
  );

  if (alreadyExists) {
    throw new Error("依赖关系已存在");
  }

  const dependency: Dependency = {
    id: generateId(),
    projectId,
    fromTaskId,
    toTaskId,
    type,
    lag,
    hasConflict: false,
  };

  await db.add("dependencies", dependency);
  return dependency;
}

export async function deleteDependency(dependencyId: string): Promise<void> {
  const db = await getDB();
  await db.delete("dependencies", dependencyId);
}

export async function checkDependencyConflicts(
  projectId: string,
  tasks: Task[],
  dependencies: Dependency[],
): Promise<Dependency[]> {
  const updatedDeps: Dependency[] = [];

  for (const dep of dependencies) {
    const fromTask = tasks.find((t) => t.id === dep.fromTaskId);
    const toTask = tasks.find((t) => t.id === dep.toTaskId);

    if (!fromTask || !toTask) {
      updatedDeps.push(dep);
      continue;
    }

    let hasConflict = false;
    const fromStart = new Date(fromTask.startDate);
    const fromEnd = new Date(fromTask.endDate);
    const toStart = new Date(toTask.startDate);
    const toEnd = new Date(toTask.endDate);

    switch (dep.type) {
      case DependencyType.FS:
        if (toStart < fromEnd) hasConflict = true;
        break;
      case DependencyType.SS:
        if (toStart < fromStart) hasConflict = true;
        break;
      case DependencyType.FF:
        if (toEnd < fromEnd) hasConflict = true;
        break;
      case DependencyType.SF:
        if (toEnd < fromStart) hasConflict = true;
        break;
    }

    updatedDeps.push({ ...dep, hasConflict });
  }

  return updatedDeps;
}

export async function calculateCriticalPath(
  projectId: string,
  tasks: Task[],
  dependencies: Dependency[],
): Promise<string[]> {
  const criticalPath: string[] = [];

  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  const adjacencyMap = new Map<string, string[]>();
  const reverseAdjacencyMap = new Map<string, string[]>();

  for (const task of tasks) {
    adjacencyMap.set(task.id, []);
    reverseAdjacencyMap.set(task.id, []);
  }

  for (const dep of dependencies) {
    if (dep.type === DependencyType.FS) {
      const adj = adjacencyMap.get(dep.fromTaskId) || [];
      adj.push(dep.toTaskId);
      adjacencyMap.set(dep.fromTaskId, adj);

      const revAdj = reverseAdjacencyMap.get(dep.toTaskId) || [];
      revAdj.push(dep.fromTaskId);
      reverseAdjacencyMap.set(dep.toTaskId, revAdj);
    }
  }

  const earliestStart = new Map<string, number>();
  const earliestFinish = new Map<string, number>();
  const latestStart = new Map<string, number>();
  const latestFinish = new Map<string, number>();

  const topoSort = topologicalSort(tasks, adjacencyMap);

  for (const taskId of topoSort) {
    const task = taskMap.get(taskId);
    if (!task) continue;

    const predIds = reverseAdjacencyMap.get(taskId) || [];
    let maxPredFinish = 0;

    for (const predId of predIds) {
      const predFinish = earliestFinish.get(predId) || 0;
      maxPredFinish = Math.max(maxPredFinish, predFinish);
    }

    const startDate = new Date(task.startDate);
    const baseDays = Math.floor(startDate.getTime() / (24 * 60 * 60 * 1000));
    const es = Math.max(baseDays, maxPredFinish);
    const ef = es + task.duration;

    earliestStart.set(taskId, es);
    earliestFinish.set(taskId, ef);
  }

  let maxFinish = 0;
  for (const task of tasks) {
    const ef = earliestFinish.get(task.id) || 0;
    maxFinish = Math.max(maxFinish, ef);
  }

  const reverseTopoSort = [...topoSort].reverse();

  for (const taskId of reverseTopoSort) {
    const task = taskMap.get(taskId);
    if (!task) continue;

    const succIds = adjacencyMap.get(taskId) || [];
    let minSuccStart = maxFinish;

    for (const succId of succIds) {
      const succStart = latestStart.get(succId) || maxFinish;
      minSuccStart = Math.min(minSuccStart, succStart);
    }

    const lf = minSuccStart;
    const ls = lf - task.duration;

    latestStart.set(taskId, ls);
    latestFinish.set(taskId, lf);
  }

  for (const task of tasks) {
    const es = earliestStart.get(task.id) || 0;
    const ls = latestStart.get(task.id) || 0;

    if (Math.abs(es - ls) < 0.001) {
      criticalPath.push(task.id);
    }
  }

  return criticalPath;
}

function topologicalSort(
  tasks: Task[],
  adjacencyMap: Map<string, string[]>,
): string[] {
  const inDegree = new Map<string, number>();
  const queue: string[] = [];
  const result: string[] = [];

  for (const task of tasks) {
    inDegree.set(task.id, 0);
  }

  for (const [, neighbors] of adjacencyMap) {
    for (const neighbor of neighbors) {
      const degree = inDegree.get(neighbor) || 0;
      inDegree.set(neighbor, degree + 1);
    }
  }

  for (const task of tasks) {
    const degree = inDegree.get(task.id) || 0;
    if (degree === 0) {
      queue.push(task.id);
    }
  }

  while (queue.length > 0) {
    const node = queue.shift()!;
    result.push(node);

    const neighbors = adjacencyMap.get(node) || [];
    for (const neighbor of neighbors) {
      const degree = (inDegree.get(neighbor) || 0) - 1;
      inDegree.set(neighbor, degree);

      if (degree === 0) {
        queue.push(neighbor);
      }
    }
  }

  return result;
}

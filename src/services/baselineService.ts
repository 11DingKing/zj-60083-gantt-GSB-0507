import { getDB } from "@/utils/db";
import { generateId } from "@/utils/common";
import type { Baseline, Task } from "@/types";

export async function getBaselines(projectId: string): Promise<Baseline[]> {
  const db = await getDB();
  return db.getAllFromIndex("baselines", "by-projectId", projectId);
}

export async function createBaseline(
  projectId: string,
  name: string,
  tasks: Task[],
): Promise<Baseline> {
  const db = await getDB();
  const now = new Date().toISOString();

  const baselineTasks = tasks.map((task) => ({
    taskId: task.id,
    startDate: task.startDate,
    endDate: task.endDate,
    duration: task.duration,
  }));

  const baseline: Baseline = {
    id: generateId(),
    projectId,
    name,
    tasks: baselineTasks,
    createdAt: now,
  };

  await db.add("baselines", baseline);
  return baseline;
}

export async function deleteBaseline(baselineId: string): Promise<void> {
  const db = await getDB();
  await db.delete("baselines", baselineId);
}

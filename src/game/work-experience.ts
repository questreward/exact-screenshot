import type { JobMissionState } from "@/services/game";

/** Read-only presentation of recorded activities and mission steps. */
export function currentWork<T extends { type: string; status: string; start_time: string; end_time: string }>(activities: T[], day: string) {
  const works = activities.filter(a => a.type === "work");
  return {
    running: works.find(a => a.status === "running"),
    planned: works.filter(a => a.status === "planned").sort((a, b) => a.start_time.localeCompare(b.start_time))[0],
    finished: works.filter(a => a.status === "completed" && a.end_time.slice(0, 10) === day).sort((a, b) => b.end_time.localeCompare(a.end_time))[0],
  };
}

export function recordedObjectives(m: NonNullable<JobMissionState["mission"]>) {
  return Array.from({ length: Math.max(0, m.step_count) }, (_, index) => ({
    index,
    state: m.status === "success" || m.status === "failure" || index < m.step_index ? "recorded" : m.status === "active" && index === m.step_index ? "current" : "pending",
  }));
}
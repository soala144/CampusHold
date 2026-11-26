import type { Actor } from "@/lib/domain/job-machine";
import type { Job, Service, User } from "@/lib/domain/types";
import type { AppState, Mode } from "./state";

export const getUser = (s: AppState, id: string): User | undefined => s.users.find((u) => u.id === id);

export const currentUser = (s: AppState): User => getUser(s, s.currentUserId)!;

/** The current user's role in a job, or null when they aren't part of it. */
export function roleIn(job: Job, userId: string): Extract<Actor, "client" | "freelancer"> | null {
  if (job.clientId === userId) return "client";
  if (job.freelancerId === userId) return "freelancer";
  return null;
}

export function jobsFor(s: AppState, userId: string, mode: Mode): Job[] {
  return s.jobs
    .filter((j) => (mode === "client" ? j.clientId : j.freelancerId) === userId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function otherParty(s: AppState, job: Job, userId: string): User | undefined {
  return getUser(s, job.clientId === userId ? job.freelancerId : job.clientId);
}

export function unreadCount(job: Job, userId: string): number {
  const seen = job.lastReadAt[userId] ?? "";
  return job.thread.filter((t) => t.kind === "message" && t.authorId !== userId && t.createdAt > seen).length;
}

export function unreadNotifications(s: AppState): number {
  return s.notifications.filter((n) => n.userId === s.currentUserId && !n.read).length;
}

export function completedJobsCount(s: AppState, freelancerId: string): number {
  return s.jobs.filter((j) => j.freelancerId === freelancerId && j.status === "completed").length;
}

/** Active services that clients can see and request. */
export function visibleServices(s: AppState): Service[] {
  return s.services.filter((svc) => {
    const u = getUser(s, svc.freelancerId);
    return svc.status === "active" && u?.status === "active" && u.roles.freelancer;
  });
}

export const startingPrice = (svc: Service) => Math.min(...svc.packages.map((p) => p.price));
export const fastestDelivery = (svc: Service) => Math.min(...svc.packages.map((p) => p.deliveryDays));

export function serviceStats(s: AppState, serviceId: string) {
  const jobs = s.jobs.filter((j) => j.serviceId === serviceId);
  return {
    requests: jobs.length,
    completed: jobs.filter((j) => j.status === "completed").length,
  };
}

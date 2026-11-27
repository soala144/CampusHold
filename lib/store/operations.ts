/**
 * Pure state operations for the Stage 2 mock.
 * Each returns either a new state or an error message. Job status changes
 * always go through `evaluateTransition` so invalid transitions are refused
 * here exactly as they will be on the server in Stage 3.
 */
import { evaluateTransition, type Actor, type JobAction } from "@/lib/domain/job-machine";
import type {
  Attachment,
  CategoryId,
  Dispute,
  DisputeReason,
  Job,
  JobEventType,
  Notification,
  PayoutAccount,
  Service,
  ServicePackage,
  ServiceCover,
  ServiceStatus,
  Transaction,
  User,
} from "@/lib/domain/types";
import { formatMoney } from "@/lib/format";
import { newId } from "./ids";
import type { AppState, Mode } from "./state";

type Op<T = void> = { state: AppState; value: T } | { error: string };

const now = () => new Date().toISOString();


/* ---------- small helpers ---------- */

function withJob(s: AppState, jobId: string, fn: (j: Job) => Job): AppState {
  return { ...s, jobs: s.jobs.map((j) => (j.id === jobId ? fn(j) : j)) };
}

function addEvent(job: Job, event: JobEventType, actorId?: string, note?: string): Job {
  const createdAt = now();
  return {
    ...job,
    updatedAt: createdAt,
    thread: [...job.thread, { kind: "event", id: newId("ev"), event, actorId, note, createdAt }],
  };
}

function notify(
  s: AppState,
  userId: string,
  type: Notification["type"],
  title: string,
  body: string,
  href: string,
): AppState {
  const n: Notification = { id: newId("n"), userId, type, title, body, href, read: false, createdAt: now() };
  return { ...s, notifications: [n, ...s.notifications] };
}

function audit(s: AppState, actorId: string, action: string, target: string): AppState {
  return { ...s, audit: [{ id: newId("a"), actorId, action, target, createdAt: now() }, ...s.audit] };
}

function updateTx(s: AppState, match: (t: Transaction) => boolean, patch: Partial<Transaction>): AppState {
  let done = false;
  return {
    ...s,
    transactions: s.transactions.map((t) => {
      if (done || !match(t)) return t;
      done = true;
      return { ...t, ...patch, updatedAt: now() };
    }),
  };
}

function addTx(s: AppState, t: Omit<Transaction, "id" | "reference" | "simulated" | "createdAt" | "updatedAt">): AppState {
  const id = newId("tx");
  const tx: Transaction = {
    ...t,
    id,
    reference: `SIM-${id.slice(3).toUpperCase()}`,
    simulated: true,
    createdAt: now(),
    updatedAt: now(),
  };
  return { ...s, transactions: [tx, ...s.transactions] };
}

const nameOf = (s: AppState, id: string) => s.users.find((u) => u.id === id)?.displayName ?? "Someone";
const findJob = (s: AppState, id: string) => s.jobs.find((j) => j.id === id);

/** Request the payout once a job is approved AND its funds are available. */
function requestRelease(s: AppState, job: Job): AppState {
  let next = withJob(s, job.id, (j) => addEvent({ ...j, paymentStatus: "release_requested" }, "release_requested"));
  next = addTx(next, {
    jobId: job.id,
    type: "payout",
    amount: job.budget,
    status: "processing",
    userId: job.freelancerId,
    counterpartyId: job.clientId,
  });
  next = notify(
    next,
    job.freelancerId,
    "payout_initiated",
    "Payout requested",
    `${formatMoney(job.budget)} for “${job.title}” has been requested (simulated).`,
    "/wallet",
  );
  return audit(next, "system", "Payout requested (simulated)", job.title);
}

/* ---------- job lifecycle ---------- */

export interface JobActionInput {
  as: Actor;
  byUserId?: string;
  note?: string;
  submission?: { note: string; files: Attachment[] };
  dispute?: { reason: DisputeReason; details: string; evidence: Attachment[] };
}

export function jobAction(jobId: string, action: JobAction, input: JobActionInput) {
  return (s: AppState): Op<Job> => {
    const job = findJob(s, jobId);
    if (!job) return { error: "Job not found." };

    const result = evaluateTransition(job, action, input.as);
    if (!result.ok) return { error: result.reason };

    const by = input.byUserId;
    const other = by === job.clientId ? job.freelancerId : job.clientId;
    const href = `/jobs/${job.id}`;
    let next = withJob(s, jobId, (j) => ({ ...j, status: result.status, paymentStatus: result.paymentStatus }));
    const event = (type: JobEventType, note?: string) => {
      next = withJob(next, jobId, (j) => addEvent(j, type, by, note));
    };

    switch (action) {
      case "send_request":
        event("job_sent");
        next = notify(next, job.freelancerId, "job_request", "New job request", `${nameOf(s, job.clientId)} wants to hire you for “${job.title}”.`, href);
        break;
      case "accept":
        event("job_accepted");
        next = notify(next, job.clientId, "job_accepted", "Job accepted", `${nameOf(s, job.freelancerId)} accepted “${job.title}”. Fund the job to get started.`, href);
        break;
      case "decline":
        event("job_declined", input.note);
        next = notify(next, job.clientId, "job_accepted", "Job declined", `${nameOf(s, job.freelancerId)} declined “${job.title}”.`, href);
        break;
      case "cancel":
        event("job_cancelled", input.note);
        if (by) next = notify(next, other, "dispute_update", "Job cancelled", `“${job.title}” was cancelled.`, href);
        break;
      case "initiate_payment":
        event("payment_initiated");
        next = addTx(next, { jobId, type: "payment", amount: job.budget, status: "processing", userId: job.clientId, counterpartyId: job.freelancerId });
        break;
      case "confirm_payment":
        event("payment_confirmed");
        next = updateTx(next, (t) => t.jobId === jobId && t.type === "payment" && t.status === "processing", { status: "succeeded" });
        next = notify(next, job.freelancerId, "payment_confirmed", "Payment confirmed", `“${job.title}” is funded. You can start work.`, href);
        next = notify(next, job.clientId, "payment_confirmed", "Payment confirmed", `Your payment for “${job.title}” was verified.`, href);
        next = audit(next, "system", "Payment confirmed (simulated)", job.title);
        break;
      case "fail_payment":
        event("payment_failed");
        next = updateTx(next, (t) => t.jobId === jobId && t.type === "payment" && t.status === "processing", { status: "failed" });
        next = notify(next, job.clientId, "payment_confirmed", "Payment failed", `Your payment for “${job.title}” didn't go through. You can try again.`, href);
        break;
      case "start_work":
        event("work_started");
        break;
      case "submit_delivery": {
        if (!input.submission) return { error: "Add a note describing the delivery." };
        const sub = { id: newId("sub"), ...input.submission, createdAt: now() };
        next = withJob(next, jobId, (j) => ({ ...j, submissions: [...j.submissions, sub] }));
        event("delivery_submitted");
        next = notify(next, job.clientId, "delivery_submitted", "Delivery submitted", `${nameOf(s, job.freelancerId)} submitted work for “${job.title}”.`, href);
        break;
      }
      case "request_revision":
        if (!input.note?.trim()) return { error: "Describe the changes you need." };
        next = withJob(next, jobId, (j) => ({ ...j, revisionsUsed: j.revisionsUsed + 1 }));
        event("revision_requested", input.note);
        next = notify(next, job.freelancerId, "revision_requested", "Revision requested", `${nameOf(s, job.clientId)} asked for changes on “${job.title}”.`, href);
        break;
      case "approve": {
        event("work_approved");
        next = notify(next, job.freelancerId, "work_approved", "Work approved", `${nameOf(s, job.clientId)} approved “${job.title}”.`, href);
        const approved = findJob(next, jobId)!;
        if (approved.paymentStatus === "available") {
          next = requestRelease(next, approved);
        } else {
          next = withJob(next, jobId, (j) =>
            addEvent(j, "release_queued", undefined, "Release is queued and will be requested once the funds settle with the provider."),
          );
        }
        break;
      }
      case "complete":
        next = updateTx(next, (t) => t.jobId === jobId && t.type === "payout" && t.status === "processing", { status: "succeeded" });
        event("transfer_completed");
        event("job_completed");
        next = notify(next, job.freelancerId, "payout_initiated", "Payout sent", `${formatMoney(job.budget)} for “${job.title}” was sent to your bank (simulated).`, "/wallet");
        next = audit(next, "system", "Transfer completed (simulated)", job.title);
        break;
      case "open_dispute": {
        if (!input.dispute || !by) return { error: "Tell us what went wrong." };
        const d: Dispute = {
          id: newId("dsp"),
          jobId,
          openedById: by,
          reason: input.dispute.reason,
          details: input.dispute.details,
          evidence: input.dispute.evidence,
          status: "open",
          updates: [],
          createdAt: now(),
          updatedAt: now(),
        };
        next = { ...next, disputes: [d, ...next.disputes] };
        next = withJob(next, jobId, (j) => ({ ...j, disputeId: d.id, statusBeforeDispute: job.status }));
        event("dispute_opened");
        next = notify(next, other, "dispute_update", "Dispute opened", `${nameOf(s, by)} opened a dispute on “${job.title}”. Payment is on hold.`, `/disputes/${d.id}`);
        next = audit(next, by, "Opened dispute", job.title);
        break;
      }
      case "resolve_dispute_release":
      case "resolve_dispute_refund": {
        const release = action === "resolve_dispute_release";
        next = {
          ...next,
          disputes: next.disputes.map((d) =>
            d.id === job.disputeId
              ? {
                  ...d,
                  status: "resolved",
                  resolution: { outcome: release ? "release_to_freelancer" : "refund_to_client", note: input.note ?? "" },
                  updatedAt: now(),
                  updates: [...d.updates, { id: newId("du"), authorId: "admin", body: input.note || (release ? "Resolved: payment released to the freelancer." : "Resolved: payment refunded to the client."), createdAt: now() }],
                }
              : d,
          ),
        };
        next = addTx(next, {
          jobId,
          type: release ? "payout" : "refund",
          amount: job.budget,
          status: "succeeded",
          userId: release ? job.freelancerId : job.clientId,
          counterpartyId: release ? job.clientId : job.freelancerId,
        });
        event("dispute_resolved", input.note);
        event(release ? "job_completed" : "job_cancelled");
        for (const uid of [job.clientId, job.freelancerId]) {
          next = notify(next, uid, "dispute_update", "Dispute resolved", `The dispute on “${job.title}” has been resolved.`, `/disputes/${job.disputeId}`);
        }
        next = audit(next, "admin", release ? "Resolved dispute (release to freelancer)" : "Resolved dispute (refund to client)", job.title);
        break;
      }
    }

    return { state: next, value: findJob(next, jobId)! };
  };
}

/* ---------- simulated provider events (not user actions) ---------- */

export function settleFunds(jobId: string) {
  return (s: AppState): Op => {
    const job = findJob(s, jobId);
    if (!job) return { error: "Job not found." };
    if (job.paymentStatus !== "pending_settlement" && job.paymentStatus !== "confirmed") {
      return { error: "Funds aren't pending settlement." };
    }
    let next = withJob(s, jobId, (j) => addEvent({ ...j, paymentStatus: "available" }, "funds_settled"));
    next = audit(next, "system", "Funds settled (simulated)", job.title);
    const updated = findJob(next, jobId)!;
    if (updated.status === "approved") next = requestRelease(next, updated);
    return { state: next, value: undefined };
  };
}

export function failTransfer(jobId: string) {
  return (s: AppState): Op => {
    const job = findJob(s, jobId);
    if (!job || job.paymentStatus !== "release_requested") return { error: "No transfer in progress." };
    let next = updateTx(s, (t) => t.jobId === jobId && t.type === "payout" && t.status === "processing", { status: "failed" });
    next = withJob(next, jobId, (j) =>
      addEvent({ ...j, paymentStatus: "available" }, "transfer_failed", undefined, "The provider rejected the transfer. Funds are still held; the transfer can be retried."),
    );
    next = audit(next, "system", "Transfer failed (simulated)", job.title);
    return { state: next, value: undefined };
  };
}

export function retryTransfer(jobId: string) {
  return (s: AppState): Op => {
    const job = findJob(s, jobId);
    if (!job || job.status !== "approved" || job.paymentStatus !== "available") {
      return { error: "This transfer can't be retried right now." };
    }
    return { state: requestRelease(s, job), value: undefined };
  };
}

/* ---------- messaging ---------- */

export function sendMessage(jobId: string, authorId: string, body: string, attachments: Attachment[]) {
  return (s: AppState): Op => {
    const job = findJob(s, jobId);
    if (!job) return { error: "Job not found." };
    if (![job.clientId, job.freelancerId].includes(authorId)) return { error: "You're not part of this job." };
    if (!body.trim() && attachments.length === 0) return { error: "Write a message or attach a file." };
    const createdAt = now();
    let next = withJob(s, jobId, (j) => ({
      ...j,
      updatedAt: createdAt,
      lastReadAt: { ...j.lastReadAt, [authorId]: createdAt },
      thread: [...j.thread, { kind: "message", id: newId("msg"), authorId, body: body.trim(), attachments, createdAt }],
    }));
    const other = authorId === job.clientId ? job.freelancerId : job.clientId;
    next = notify(next, other, "new_message", `New message from ${nameOf(s, authorId)}`, body.slice(0, 120) || "Sent an attachment.", `/jobs/${jobId}`);
    return { state: next, value: undefined };
  };
}

export function markJobRead(jobId: string, userId: string) {
  return (s: AppState): Op => {
    const job = findJob(s, jobId);
    if (!job) return { error: "Job not found." };
    const last = job.thread.at(-1)?.createdAt;
    if (!last || job.lastReadAt[userId] === last) return { error: "noop" };
    return { state: withJob(s, jobId, (j) => ({ ...j, lastReadAt: { ...j.lastReadAt, [userId]: last } })), value: undefined };
  };
}

/* ---------- jobs ---------- */

export interface NewJobInput {
  title: string;
  description: string;
  category: CategoryId;
  budget: number; // kobo
  deadline: string;
  skills: string[];
  deliverables: string[];
  attachments: Attachment[];
  freelancerId: string;
  revisionsAllowed: number;
}

export function createJob(clientId: string, input: NewJobInput, send: boolean) {
  return (s: AppState): Op<Job> => {
    if (input.freelancerId === clientId) return { error: "You can't hire yourself." };
    const createdAt = now();
    const job: Job = {
      id: newId("job"),
      title: input.title,
      description: input.description,
      category: input.category,
      budget: input.budget,
      deadline: input.deadline,
      skills: input.skills,
      deliverables: input.deliverables.map((title) => ({ id: newId("dl"), title })),
      attachments: input.attachments,
      clientId,
      freelancerId: input.freelancerId,
      status: "draft",
      paymentStatus: "not_started",
      revisionsAllowed: input.revisionsAllowed,
      revisionsUsed: 0,
      submissions: [],
      thread: [{ kind: "event", id: newId("ev"), event: "job_created", actorId: clientId, createdAt }],
      lastReadAt: {},
      createdAt,
      updatedAt: createdAt,
    };
    let next: AppState = { ...s, jobs: [job, ...s.jobs] };
    if (send) {
      const sent = jobAction(job.id, "send_request", { as: "client", byUserId: clientId })(next);
      if ("error" in sent) return sent;
      next = sent.state;
    }
    return { state: next, value: findJob(next, job.id)! };
  };
}

/* ---------- account ---------- */

export function setMode(mode: Mode) {
  return (s: AppState): Op => ({ state: { ...s, mode }, value: undefined });
}

export function updateUser(userId: string, patch: Partial<User>) {
  return (s: AppState): Op => ({
    state: { ...s, users: s.users.map((u) => (u.id === userId ? { ...u, ...patch } : u)) },
    value: undefined,
  });
}

export function savePayoutAccount(account: PayoutAccount) {
  return (s: AppState): Op => ({
    state: {
      ...s,
      payoutAccounts: [account, ...s.payoutAccounts.filter((a) => a.userId !== account.userId)],
    },
    value: undefined,
  });
}

export function removePayoutAccount(userId: string) {
  return (s: AppState): Op => {
    const busy = s.jobs.some(
      (j) => j.freelancerId === userId && ["release_requested", "transfer_processing"].includes(j.paymentStatus),
    );
    if (busy) return { error: "You have a payout in progress. Try again once it completes." };
    return { state: { ...s, payoutAccounts: s.payoutAccounts.filter((a) => a.userId !== userId) }, value: undefined };
  };
}

/* ---------- notifications ---------- */

export function markNotificationsRead(userId: string, ids?: string[]) {
  return (s: AppState): Op => ({
    state: {
      ...s,
      notifications: s.notifications.map((n) =>
        n.userId === userId && (!ids || ids.includes(n.id)) ? { ...n, read: true } : n,
      ),
    },
    value: undefined,
  });
}

/* ---------- disputes & admin ---------- */

export function addDisputeUpdate(disputeId: string, authorId: string | "admin", body: string, evidence: Attachment[] = []) {
  return (s: AppState): Op => {
    if (!body.trim()) return { error: "Write an update." };
    return {
      state: {
        ...s,
        disputes: s.disputes.map((d) =>
          d.id === disputeId
            ? {
                ...d,
                evidence: [...d.evidence, ...evidence],
                updates: [...d.updates, { id: newId("du"), authorId, body: body.trim(), createdAt: now() }],
                updatedAt: now(),
              }
            : d,
        ),
      },
      value: undefined,
    };
  };
}

export function setDisputeStatus(disputeId: string, status: "open" | "under_review") {
  return (s: AppState): Op => {
    const d = s.disputes.find((x) => x.id === disputeId);
    if (!d || d.status === "resolved") return { error: "This dispute is already resolved." };
    const job = findJob(s, d.jobId);
    let next: AppState = {
      ...s,
      disputes: s.disputes.map((x) => (x.id === disputeId ? { ...x, status, updatedAt: now() } : x)),
    };
    next = audit(next, "admin", status === "under_review" ? "Moved dispute to review" : "Reopened dispute", job?.title ?? disputeId);
    return { state: next, value: undefined };
  };
}

export function setUserStatus(userId: string, status: User["status"]) {
  return (s: AppState): Op => {
    let next: AppState = { ...s, users: s.users.map((u) => (u.id === userId ? { ...u, status } : u)) };
    next = audit(next, "admin", status === "suspended" ? "Suspended user" : "Reactivated user", nameOf(s, userId));
    return { state: next, value: undefined };
  };
}

/* ---------- services ---------- */

export interface ServiceInput {
  title: string;
  category: CategoryId;
  summary: string;
  description: string;
  tags: string[];
  packages: Omit<ServicePackage, "id">[];
  faq: { q: string; a: string }[];
  images: Attachment[];
  cover?: ServiceCover;
}

export function saveService(freelancerId: string, input: ServiceInput, status: ServiceStatus, serviceId?: string) {
  return (s: AppState): Op<Service> => {
    const me = s.users.find((u) => u.id === freelancerId);
    if (!me?.roles.freelancer) return { error: "Turn on “Offer services” in settings to publish services." };
    const existing = serviceId ? s.services.find((x) => x.id === serviceId) : undefined;
    if (serviceId && (!existing || existing.freelancerId !== freelancerId)) return { error: "Service not found." };
    const packages = [...input.packages]
      .sort((a, b) => a.price - b.price)
      .map((p) => ({ ...p, id: newId("pkg") }));
    const at = now();
    const service: Service = {
      id: existing?.id ?? newId("svc"),
      freelancerId,
      ...input,
      packages,
      status,
      createdAt: existing?.createdAt ?? at,
      updatedAt: at,
    };
    const services = existing ? s.services.map((x) => (x.id === existing.id ? service : x)) : [service, ...s.services];
    return { state: { ...s, services }, value: service };
  };
}

export function setServiceStatus(serviceId: string, freelancerId: string, status: ServiceStatus) {
  return (s: AppState): Op => {
    const svc = s.services.find((x) => x.id === serviceId);
    if (!svc || svc.freelancerId !== freelancerId) return { error: "Service not found." };
    return {
      state: { ...s, services: s.services.map((x) => (x.id === serviceId ? { ...x, status, updatedAt: now() } : x)) },
      value: undefined,
    };
  };
}

export function deleteService(serviceId: string, freelancerId: string) {
  return (s: AppState): Op => {
    const svc = s.services.find((x) => x.id === serviceId);
    if (!svc || svc.freelancerId !== freelancerId) return { error: "Service not found." };
    // Jobs keep their own copy of the agreed scope, so history isn't affected.
    return { state: { ...s, services: s.services.filter((x) => x.id !== serviceId) }, value: undefined };
  };
}

/** Turn a service package into a job request sent to the freelancer. */
export function requestService(
  clientId: string,
  serviceId: string,
  packageId: string,
  requirements: string,
  attachments: Attachment[],
) {
  return (s: AppState): Op<Job> => {
    const svc = s.services.find((x) => x.id === serviceId);
    if (!svc) return { error: "This service no longer exists." };
    if (svc.status !== "active") return { error: "This service isn't taking requests right now." };
    if (svc.freelancerId === clientId) return { error: "You can't request your own service." };
    const freelancer = s.users.find((u) => u.id === svc.freelancerId);
    if (!freelancer || freelancer.status !== "active") return { error: "This freelancer isn't available." };
    if (freelancer.freelancer?.availability === "unavailable") return { error: `${freelancer.firstName} isn't taking new work right now.` };
    const pkg = svc.packages.find((p) => p.id === packageId);
    if (!pkg) return { error: "Choose a package." };

    const client = s.users.find((u) => u.id === clientId);
    let base = s;
    if (client && !client.roles.client) {
      base = { ...s, users: s.users.map((u) => (u.id === clientId ? { ...u, roles: { ...u.roles, client: true } } : u)) };
    }
    const created = createJob(
      clientId,
      {
        title: svc.packages.length > 1 ? `${svc.title} (${pkg.name})` : svc.title,
        description: requirements.trim(),
        category: svc.category,
        budget: pkg.price,
        deadline: new Date(Date.now() + pkg.deliveryDays * 86_400_000).toISOString(),
        skills: svc.tags,
        deliverables: pkg.features,
        attachments,
        freelancerId: svc.freelancerId,
        revisionsAllowed: pkg.revisions,
      },
      true,
    )(base);
    if ("error" in created) return created;
    const next = withJob(created.state, created.value.id, (j) => ({ ...j, serviceId: svc.id, packageName: pkg.name }));
    return { state: { ...next, mode: "client" }, value: findJob(next, created.value.id)! };
  };
}

import "server-only";
import type { Actor } from "@/lib/domain/job-machine";
import type { CategoryId, Job, PayoutAccount, User } from "@/lib/domain/types";
import { categories } from "@/lib/domain/categories";
import type { AppState } from "@/lib/store/state";

/** Payments are simulated until Stage 4; simulation controls are only allowed when this is on. */
export const simulationEnabled = () => process.env.SIMULATION_ENABLED !== "false";

type Verdict = { ok: true; args: unknown[] } | { ok: false; error: string };
const deny = (error = "You don't have permission to do that."): Verdict => ({ ok: false, error });
const allow = (...args: unknown[]): Verdict => ({ ok: true, args });

const str = (v: unknown, max = 5000) => (typeof v === "string" && v.length <= max ? v : null);
const isCategory = (v: unknown): v is CategoryId => categories.some((c) => c.id === v);

/** Profile fields a user may change about themselves. Never roles beyond client/freelancer, never admin. */
const USER_FIELDS = ["firstName", "lastName", "displayName", "bio", "location", "roles", "freelancer", "client", "onboarded"] as const;

/**
 * Decide whether `user` may run operation `name` with `args`, and rewrite any
 * identity arguments from the session. The client is never trusted to say
 * who it is.
 */
export function authorize(name: string, rawArgs: unknown[], user: User, world: AppState): Verdict {
  const args = Array.isArray(rawArgs) ? rawArgs : [];
  const findJob = (id: unknown) => world.jobs.find((j) => j.id === id);
  const partyRole = (job: Job) => (job.clientId === user.id ? "client" : job.freelancerId === user.id ? "freelancer" : null);

  switch (name) {
    case "jobAction": {
      const [jobId, action, input] = args as [string, string, { as?: Actor } & Record<string, unknown>];
      const job = findJob(jobId);
      if (!job || typeof action !== "string" || !input || typeof input !== "object") return deny("Job not found.");
      const role = partyRole(job);
      const as = input.as;
      if (as === "admin") return user.isAdmin ? allow(jobId, action, { ...input, byUserId: undefined }) : deny();
      if (as === "system") {
        return simulationEnabled() && (role || user.isAdmin) ? allow(jobId, action, { ...input, byUserId: undefined }) : deny();
      }
      if (!role) return deny();
      // You can only ever act as yourself on a job.
      return as === role ? allow(jobId, action, { ...input, byUserId: user.id }) : deny();
    }
    case "settleFunds":
    case "failTransfer":
    case "retryTransfer": {
      const job = findJob(args[0]);
      return job && simulationEnabled() && (partyRole(job) || user.isAdmin) ? allow(args[0]) : deny();
    }
    case "sendMessage": {
      const [jobId, , body, attachments] = args;
      const job = findJob(jobId);
      if (!job || !partyRole(job)) return deny();
      const text = str(body, 5000);
      if (text === null || !Array.isArray(attachments) || attachments.length > 10) return deny("Invalid message.");
      return allow(jobId, user.id, text, attachments);
    }
    case "markJobRead":
      return findJob(args[0]) ? allow(args[0], user.id) : deny();
    case "createJob": {
      const [, input, send] = args as [unknown, Record<string, unknown>, unknown];
      if (!user.roles.client) return deny("Turn on hiring in settings first.");
      if (!input || !str(input.title, 90) || !str(input.description, 4000) || !isCategory(input.category)) return deny("Invalid job.");
      const budget = input.budget;
      if (typeof budget !== "number" || !Number.isInteger(budget) || budget < 100_000 || budget > 500_000_000) return deny("Invalid price.");
      if (!Array.isArray(input.deliverables) || input.deliverables.length < 1 || input.deliverables.length > 10) return deny("Invalid deliverables.");
      const revisions = input.revisionsAllowed;
      if (typeof revisions !== "number" || revisions < 0 || revisions > 5) return deny("Invalid revisions.");
      if (!world.users.some((u) => u.id === input.freelancerId && u.roles.freelancer && u.status === "active")) return deny("Freelancer not found.");
      return allow(user.id, input, Boolean(send));
    }
    case "requestService": {
      const [, serviceId, packageId, requirements, attachments] = args;
      const text = str(requirements, 3000);
      if (!text || text.trim().length < 30 || !Array.isArray(attachments)) return deny("Describe what you need.");
      return allow(user.id, serviceId, packageId, text, attachments);
    }
    case "saveService": {
      const [, input, status, serviceId] = args as [unknown, Record<string, unknown>, unknown, unknown];
      if (!["active", "paused", "draft"].includes(status as string)) return deny();
      if (!input || !str(input.title, 80) || !str(input.summary, 160) || !str(input.description, 3000) || !isCategory(input.category)) {
        return deny("Invalid service.");
      }
      if (!Array.isArray(input.packages) || input.packages.length < 1 || input.packages.length > 3) return deny("Add 1–3 packages.");
      for (const p of input.packages as Record<string, unknown>[]) {
        if (typeof p.price !== "number" || p.price < 100_000 || p.price > 500_000_000 || !Array.isArray(p.features)) return deny("Invalid package.");
      }
      if (input.cover !== undefined) {
        const c = input.cover as Record<string, unknown>;
        const url = str(c?.url, 500);
        if (!url || !/^https:\/\/\S+$/i.test(url) || typeof c.aspect !== "number" || c.aspect < 0.5 || c.aspect > 2) {
          return deny("Use a direct https link for the cover image.");
        }
        input.cover = { url, alt: str(c.alt, 120) || "Service cover image", aspect: c.aspect };
      }
      return allow(user.id, input, status, serviceId ?? undefined);
    }
    case "setServiceStatus":
      return ["active", "paused", "draft"].includes(args[2] as string) ? allow(args[0], user.id, args[2]) : deny();
    case "deleteService":
      return allow(args[0], user.id);
    case "setMode":
      return args[0] === "client" || args[0] === "freelancer" ? allow(args[0]) : deny();
    case "updateUser": {
      const patch = (args[1] ?? {}) as Record<string, unknown>;
      const safe: Record<string, unknown> = {};
      for (const k of USER_FIELDS) if (k in patch) safe[k] = patch[k];
      if (safe.roles) {
        const r = safe.roles as Record<string, unknown>;
        safe.roles = { client: Boolean(r.client), freelancer: Boolean(r.freelancer) };
      }
      if (safe.displayName !== undefined && !str(safe.displayName, 60)) return deny("Invalid name.");
      return allow(user.id, safe);
    }
    case "savePayoutAccount": {
      const a = args[0] as Partial<PayoutAccount>;
      if (!a || !str(a.bankName, 80) || !/^\d{4}$/.test(String(a.accountNumberLast4)) || !str(a.accountName, 120)) return deny("Invalid account.");
      return allow({
        userId: user.id,
        bankName: a.bankName,
        accountNumberLast4: a.accountNumberLast4,
        accountName: a.accountName,
        status: "pending_verification",
        createdAt: new Date().toISOString(),
      });
    }
    case "removePayoutAccount":
      return allow(user.id);
    case "markNotificationsRead":
      return allow(user.id, Array.isArray(args[1]) ? args[1] : undefined);
    case "addDisputeUpdate": {
      const [disputeId, authorId, body, evidence] = args;
      const d = world.disputes.find((x) => x.id === disputeId);
      if (!d) return deny("Dispute not found.");
      const job = findJob(d.jobId);
      const asAdmin = authorId === "admin";
      if (asAdmin ? !user.isAdmin : !job || !partyRole(job)) return deny();
      return allow(disputeId, asAdmin ? "admin" : user.id, str(body, 3000) ?? "", Array.isArray(evidence) ? evidence : []);
    }
    case "setDisputeStatus":
    case "setUserStatus":
      return user.isAdmin && args[0] !== user.id ? allow(...args) : deny();
    default:
      return deny("Unknown action.");
  }
}

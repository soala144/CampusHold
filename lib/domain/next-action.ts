import type { Job } from "./types";

export interface NextAction {
  /** Who needs to act. */
  owner: "you" | "them" | "provider" | "admin" | "none";
  /** One-line explanation of where the job stands. */
  message: string;
  /** Short label for a call to action, when the viewer is the owner. */
  cta?: string;
  href?: string;
}

/** What should happen next on a job, from the viewer's point of view. */
export function nextActionFor(job: Job, role: "client" | "freelancer"): NextAction {
  const isClient = role === "client";
  const pay = `/jobs/${job.id}/pay`;
  const ws = `/jobs/${job.id}`;
  switch (job.status) {
    case "draft":
      return isClient
        ? { owner: "you", message: "This job hasn't been sent yet.", cta: "Send request", href: ws }
        : { owner: "none", message: "Draft." };
    case "pending_response":
      return isClient
        ? { owner: "them", message: "Waiting for the freelancer to accept or decline." }
        : { owner: "you", message: "You have a new job request.", cta: "Respond", href: ws };
    case "accepted":
      return isClient
        ? {
            owner: "you",
            message:
              job.paymentStatus === "failed"
                ? "Your last payment attempt failed. Try again to start the job."
                : "Accepted. Fund the job so work can begin.",
            cta: "Fund job",
            href: pay,
          }
        : { owner: "them", message: "Accepted. Waiting for the client to fund the job." };
    case "awaiting_payment":
      return { owner: "provider", message: "Payment started. Waiting for the provider to confirm it." };
    case "payment_confirmed":
      return isClient
        ? { owner: "them", message: "Funded. Waiting for the freelancer to start." }
        : { owner: "you", message: "Payment is confirmed. You can start work.", cta: "Start work", href: ws };
    case "in_progress":
      return isClient
        ? { owner: "them", message: "Work is in progress." }
        : { owner: "you", message: "Deliver the work when it's ready.", cta: "Submit delivery", href: ws };
    case "revision_requested":
      return isClient
        ? { owner: "them", message: "Waiting for the revised delivery." }
        : { owner: "you", message: "The client asked for changes.", cta: "Submit revision", href: ws };
    case "submitted":
      return isClient
        ? { owner: "you", message: "Work has been delivered. Review it.", cta: "Review delivery", href: ws }
        : { owner: "them", message: "Delivered. Waiting for the client's review." };
    case "approved":
      return {
        owner: "provider",
        message:
          job.paymentStatus === "release_requested"
            ? "Approved. The payout has been requested."
            : job.paymentStatus === "available"
              ? "Approved. The last transfer attempt failed and can be retried."
              : "Approved. The payout will be requested once funds settle.",
      };
    case "disputed":
      return { owner: "admin", message: "A dispute is open. Payment is on hold while it's reviewed.", cta: "View dispute", href: job.disputeId ? `/disputes/${job.disputeId}` : ws };
    case "completed":
      return { owner: "none", message: "Completed and paid out." };
    case "cancelled":
      return { owner: "none", message: "This job was cancelled." };
  }
}

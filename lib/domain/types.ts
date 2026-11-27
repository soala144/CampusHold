/**
 * CampusHold domain types.
 * These mirror the shapes the Stage 3 database will hold, so UI built
 * against them should carry over with minimal change.
 *
 * Money is always stored as an integer number of kobo (1 NGN = 100 kobo).
 */

export type ID = string;
export type ISODate = string;
export type Kobo = number;

/* ---------- Users & profiles ---------- */

export type ExperienceLevel = "entry" | "intermediate" | "expert";
export type Availability = "available" | "limited" | "unavailable";
export type PricingType = "fixed" | "hourly";

export interface FreelancerProfile {
  title: string;
  skills: string[];
  categories: CategoryId[];
  experience: ExperienceLevel;
  description: string;
  portfolio: { label: string; url: string }[];
  pricing: { type: PricingType; from: Kobo };
  availability: Availability;
}

export interface ClientProfile {
  kind: "individual" | "organisation";
  organisationName?: string;
  industry?: string;
  description?: string;
  hiringPreferences?: string;
}

export interface Location {
  country: string;
  state: string;
  city: string;
}

export interface User {
  id: ID;
  username: string;
  firstName: string;
  lastName: string;
  displayName: string;
  email: string;
  phone: string;
  bio: string;
  location: Location;
  /** Hue (0-360) used for the generated avatar. */
  avatarHue: number;
  roles: { client: boolean; freelancer: boolean };
  isAdmin: boolean;
  verified: { email: boolean; phone: boolean };
  status: "active" | "suspended";
  /** Finished onboarding (profile and roles chosen). */
  onboarded?: boolean;
  joinedAt: ISODate;
  freelancer?: FreelancerProfile;
  client?: ClientProfile;
}

/* ---------- Marketplace ---------- */

export type CategoryId =
  | "design"
  | "development"
  | "writing"
  | "video"
  | "photography"
  | "marketing"
  | "research"
  | "tutoring";

/* ---------- Services (listings freelancers sell) ---------- */

export interface ServicePackage {
  id: ID;
  name: string;
  description: string;
  price: Kobo;
  deliveryDays: number;
  revisions: number;
  /** What's included. Becomes the job's deliverables when ordered. */
  features: string[];
}

export type ServiceStatus = "active" | "paused" | "draft";

export interface ServiceCover {
  url: string;
  alt: string;
  /** width / height, used to reserve space and lay out the masonry grid. */
  aspect: number;
}

export interface Service {
  id: ID;
  freelancerId: ID;
  title: string;
  category: CategoryId;
  summary: string;
  description: string;
  tags: string[];
  /** 1–3 packages, cheapest first. */
  packages: ServicePackage[];
  faq: { q: string; a: string }[];
  images: Attachment[];
  /** Cover photo. Uploads arrive with Stage 3 storage; seed data uses placeholders. */
  cover?: ServiceCover;
  status: ServiceStatus;
  createdAt: ISODate;
  updatedAt: ISODate;
}

/* ---------- Jobs ---------- */

export type JobStatus =
  | "draft"
  | "pending_response"
  | "accepted"
  | "awaiting_payment"
  | "payment_confirmed"
  | "in_progress"
  | "submitted"
  | "revision_requested"
  | "approved"
  | "completed"
  | "disputed"
  | "cancelled";

export type PaymentStatus =
  | "not_started"
  | "initiated"
  | "confirmed"
  | "pending_settlement"
  | "available"
  | "release_requested"
  | "transfer_processing"
  | "transfer_completed"
  | "refund_processing"
  | "refunded"
  | "failed";

export interface Deliverable {
  id: ID;
  title: string;
}

export interface Attachment {
  id: ID;
  name: string;
  sizeBytes: number;
}

export interface Submission {
  id: ID;
  note: string;
  files: Attachment[];
  createdAt: ISODate;
}

export type JobEventType =
  | "job_created"
  | "job_sent"
  | "job_accepted"
  | "job_declined"
  | "payment_initiated"
  | "payment_confirmed"
  | "payment_failed"
  | "work_started"
  | "delivery_submitted"
  | "revision_requested"
  | "work_approved"
  | "funds_settled"
  | "release_queued"
  | "release_requested"
  | "transfer_failed"
  | "transfer_completed"
  | "job_completed"
  | "dispute_opened"
  | "dispute_resolved"
  | "job_cancelled";

/** An item in the job workspace timeline: a person's message or a system event. */
export type ThreadItem =
  | {
      kind: "message";
      id: ID;
      authorId: ID;
      body: string;
      attachments: Attachment[];
      createdAt: ISODate;
    }
  | {
      kind: "event";
      id: ID;
      event: JobEventType;
      actorId?: ID;
      note?: string;
      createdAt: ISODate;
    };

export interface Job {
  id: ID;
  title: string;
  description: string;
  category: CategoryId;
  budget: Kobo;
  deadline: ISODate;
  skills: string[];
  deliverables: Deliverable[];
  attachments: Attachment[];
  clientId: ID;
  freelancerId: ID;
  status: JobStatus;
  paymentStatus: PaymentStatus;
  revisionsAllowed: number;
  revisionsUsed: number;
  submissions: Submission[];
  thread: ThreadItem[];
  /** Last thread item each participant has seen, for unread counts. */
  lastReadAt: Record<ID, ISODate>;
  /** Set when the job was requested from a service listing. */
  serviceId?: ID;
  packageName?: string;
  disputeId?: ID;
  /** Status before a dispute was opened, so resolution can restore it. */
  statusBeforeDispute?: JobStatus;
  createdAt: ISODate;
  updatedAt: ISODate;
}

/* ---------- Money ---------- */

export type TransactionType = "payment" | "payout" | "refund";
export type TransactionStatus = "processing" | "pending" | "succeeded" | "failed";

/** A ledger entry. Balances are derived from these, never stored. */
export interface Transaction {
  id: ID;
  jobId: ID;
  type: TransactionType;
  amount: Kobo;
  status: TransactionStatus;
  /** Payer for payments; recipient for payouts and refunds. */
  userId: ID;
  counterpartyId: ID;
  reference: string;
  simulated: true;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface PayoutAccount {
  userId: ID;
  bankName: string;
  accountNumberLast4: string;
  accountName: string;
  status: "pending_verification" | "verified";
  createdAt: ISODate;
}

/* ---------- Disputes ---------- */

export type DisputeReason =
  | "not_delivered"
  | "not_as_agreed"
  | "missed_deadline"
  | "unresponsive"
  | "other";

export type DisputeStatus = "open" | "under_review" | "resolved";

export interface Dispute {
  id: ID;
  jobId: ID;
  openedById: ID;
  reason: DisputeReason;
  details: string;
  evidence: Attachment[];
  status: DisputeStatus;
  resolution?: { outcome: "release_to_freelancer" | "refund_to_client" | "split"; note: string };
  updates: { id: ID; authorId: ID | "admin"; body: string; createdAt: ISODate }[];
  createdAt: ISODate;
  updatedAt: ISODate;
}

/* ---------- Notifications ---------- */

export type NotificationType =
  | "job_request"
  | "job_accepted"
  | "payment_confirmed"
  | "new_message"
  | "delivery_submitted"
  | "revision_requested"
  | "work_approved"
  | "payout_initiated"
  | "dispute_update";

export interface Notification {
  id: ID;
  userId: ID;
  type: NotificationType;
  title: string;
  body: string;
  href: string;
  read: boolean;
  createdAt: ISODate;
}

/* ---------- Audit ---------- */

export interface AuditEntry {
  id: ID;
  actorId: ID | "system";
  action: string;
  target: string;
  createdAt: ISODate;
}

import type {
  AuditEntry,
  Dispute,
  Job,
  Notification,
  PayoutAccount,
  Service,
  Transaction,
  User,
} from "@/lib/domain/types";
import { seedServices } from "@/lib/mock/seed-services";
import {
  CURRENT_USER_ID,
  seedAudit,
  seedDisputes,
  seedJobs,
  seedNotifications,
  seedPayoutAccounts,
  seedTransactions,
  seedUsers,
} from "@/lib/mock/seed";

export type Mode = "client" | "freelancer";

export interface AppState {
  version: number;
  currentUserId: string;
  /** Demo session flag. Real sessions arrive with Stage 3 auth. */
  signedIn: boolean;
  /** Which side of the app the current user is looking at. */
  mode: Mode;
  users: User[];
  jobs: Job[];
  services: Service[];
  transactions: Transaction[];
  payoutAccounts: PayoutAccount[];
  disputes: Dispute[];
  notifications: Notification[];
  audit: AuditEntry[];
}

/** Bump when the seed shape changes so stale localStorage is discarded. */
export const STATE_VERSION = 3;

export function createSeedState(): AppState {
  // Deep copy so mutations never touch the seed module.
  return structuredClone({
    version: STATE_VERSION,
    currentUserId: CURRENT_USER_ID,
    signedIn: true,
    mode: "client" as Mode,
    users: seedUsers,
    jobs: seedJobs,
    services: seedServices,
    transactions: seedTransactions,
    payoutAccounts: seedPayoutAccounts,
    disputes: seedDisputes,
    notifications: seedNotifications,
    audit: seedAudit,
  });
}

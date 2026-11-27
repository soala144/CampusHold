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

export type Mode = "client" | "freelancer";

/** Everything the signed-in user can see, as sent by the server. */
export interface AppState {
  version: number;
  /** "" when signed out. */
  currentUserId: string;
  signedIn: boolean;
  /** Which side of the app the current user is looking at. */
  mode: Mode;
  /** True while payments are simulated (Stage 3). Enables the test controls. */
  simulation?: boolean;
  /** Which payment rail is live: simulated money, or Bachs (sandbox or live). */
  payments?: "simulated" | "bachs-sandbox" | "bachs-live";
  users: User[];
  jobs: Job[];
  services: Service[];
  transactions: Transaction[];
  payoutAccounts: PayoutAccount[];
  disputes: Dispute[];
  notifications: Notification[];
  audit: AuditEntry[];
}

export const STATE_VERSION = 4;

export function emptyState(): AppState {
  return {
    version: STATE_VERSION,
    currentUserId: "",
    signedIn: false,
    mode: "client",
    users: [],
    jobs: [],
    services: [],
    transactions: [],
    payoutAccounts: [],
    disputes: [],
    notifications: [],
    audit: [],
  };
}

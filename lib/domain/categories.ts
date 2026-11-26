import type { CategoryId, DisputeReason, ExperienceLevel, Availability } from "./types";

export const categories: { id: CategoryId; label: string; blurb: string }[] = [
  { id: "design", label: "Design", blurb: "Brand, UI, graphics, illustration" },
  { id: "development", label: "Development", blurb: "Websites, apps, scripts, fixes" },
  { id: "writing", label: "Writing", blurb: "Copy, content, editing, CVs" },
  { id: "video", label: "Video", blurb: "Editing, motion, animation" },
  { id: "photography", label: "Photography", blurb: "Product, events, portraits" },
  { id: "marketing", label: "Marketing", blurb: "Social media, ads, strategy" },
  { id: "research", label: "Research & data", blurb: "Surveys, analysis, dashboards" },
  { id: "tutoring", label: "Tutoring", blurb: "Lessons, exam prep, coaching" },
];

export const categoryLabel = (id: CategoryId) =>
  categories.find((c) => c.id === id)?.label ?? id;

export const experienceLabels: Record<ExperienceLevel, string> = {
  entry: "Entry level",
  intermediate: "Intermediate",
  expert: "Expert",
};

export const availabilityMeta: Record<Availability, { label: string; tone: "success" | "warning" | "neutral" }> = {
  available: { label: "Available now", tone: "success" },
  limited: { label: "Limited availability", tone: "warning" },
  unavailable: { label: "Not taking work", tone: "neutral" },
};

export const disputeReasonLabels: Record<DisputeReason, string> = {
  not_delivered: "Work was not delivered",
  not_as_agreed: "Work is not as agreed",
  missed_deadline: "Deadline was missed",
  unresponsive: "Other party is unresponsive",
  other: "Something else",
};

export const nigerianBanks = [
  "Access Bank",
  "First Bank",
  "Guaranty Trust Bank",
  "Kuda Microfinance Bank",
  "Moniepoint Microfinance Bank",
  "OPay",
  "PalmPay",
  "United Bank for Africa",
  "Wema Bank",
  "Zenith Bank",
];

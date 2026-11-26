import { z } from "zod";

export const roleSchema = z.object({
  intent: z.enum(["hire", "offer", "both"], { message: "Choose how you'll use CampusHold" }),
});

export const profileSchema = z.object({
  firstName: z.string().trim().min(1, "Enter your first name").max(50),
  lastName: z.string().trim().min(1, "Enter your last name").max(50),
  displayName: z.string().trim().min(2, "Enter a display name").max(60),
  country: z.string().trim().min(1, "Choose your country"),
  state: z.string().trim().min(1, "Enter your state"),
  city: z.string().trim().min(1, "Enter your city"),
  bio: z.string().trim().min(20, "Write at least 20 characters").max(280, "Keep it under 280 characters"),
  photoName: z.string().optional(),
});

const url = z
  .string()
  .trim()
  .url("Enter a full link, starting with https://")
  .refine((v) => v.startsWith("https://") || v.startsWith("http://"), "Links must start with https://");

export const freelancerSchema = z.object({
  title: z.string().trim().min(3, "Enter a professional title").max(60),
  skills: z.array(z.string()).min(1, "Add at least one skill").max(15, "Up to 15 skills"),
  categories: z.array(z.string()).min(1, "Choose at least one category").max(3, "Choose up to 3 categories"),
  experience: z.enum(["entry", "intermediate", "expert"], { message: "Choose your experience level" }),
  description: z.string().trim().min(50, "Write at least 50 characters").max(1200),
  portfolio: z.array(z.object({ label: z.string().trim().min(1, "Add a label"), url })).max(5),
  pricingType: z.enum(["fixed", "hourly"]),
  pricingFrom: z.coerce
    .number({ message: "Enter an amount" })
    .int("Use whole naira")
    .min(1000, "Minimum is ₦1,000")
    .max(10_000_000, "That's above the current limit"),
  availability: z.enum(["available", "limited", "unavailable"]),
});

export const clientSchema = z
  .object({
    kind: z.enum(["individual", "organisation"]),
    organisationName: z.string().trim().max(80).optional(),
    industry: z.string().trim().max(60).optional(),
    description: z.string().trim().max(600).optional(),
    hiringPreferences: z.string().trim().max(400).optional(),
  })
  .refine((d) => d.kind === "individual" || (d.organisationName && d.organisationName.length >= 2), {
    path: ["organisationName"],
    message: "Enter your organisation's name",
  })
  .refine((d) => d.kind === "individual" || (d.industry && d.industry.length >= 2), {
    path: ["industry"],
    message: "Enter your industry",
  });

export const payoutSchema = z.object({
  bankName: z.string().min(1, "Choose your bank"),
  accountNumber: z
    .string()
    .trim()
    .regex(/^\d{10}$/, "Account numbers are 10 digits (NUBAN)"),
});

export type RoleData = z.infer<typeof roleSchema>;
export type ProfileData = z.infer<typeof profileSchema>;
export type FreelancerData = z.infer<typeof freelancerSchema>;
export type ClientData = z.infer<typeof clientSchema>;
export type PayoutData = z.infer<typeof payoutSchema> & { accountName: string };

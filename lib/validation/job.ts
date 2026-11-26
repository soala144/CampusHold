import { z } from "zod";

const MIN_NAIRA = 1_000;
const MAX_NAIRA = 5_000_000;

export const jobSchema = z.object({
  freelancerId: z.string().min(1, "Choose a freelancer"),
  title: z.string().trim().min(8, "Use at least 8 characters").max(90, "Keep the title under 90 characters"),
  category: z.string().min(1, "Choose a category"),
  description: z.string().trim().min(40, "Describe the job in at least 40 characters").max(4000),
  budget: z.preprocess((v) => (v === "" ? undefined : v), z.coerce
    .number({ message: "Enter the agreed price" })
    .int("Use whole naira")
    .min(MIN_NAIRA, `Minimum is ₦${MIN_NAIRA.toLocaleString()}`)
    .max(MAX_NAIRA, `Maximum is ₦${MAX_NAIRA.toLocaleString()} during early access`)),
  deadline: z
    .string()
    .min(1, "Choose a deadline")
    .refine((v) => new Date(`${v}T23:59:00+01:00`).getTime() > Date.now(), "The deadline must be in the future"),
  skills: z.array(z.string()).max(10),
  deliverables: z
    .array(z.object({ title: z.string().trim().min(2, "Describe this deliverable").max(120) }))
    .min(1, "Add at least one deliverable")
    .max(10),
  revisionsAllowed: z.coerce.number().int().min(0).max(5),
});

export type JobFormInput = z.input<typeof jobSchema>;
export type JobFormData = z.output<typeof jobSchema>;

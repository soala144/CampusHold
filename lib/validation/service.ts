import { z } from "zod";

export const packageSchema = z.object({
  name: z.string().trim().min(2, "Name the package").max(30, "Keep it under 30 characters"),
  description: z.string().trim().max(160, "Keep it under 160 characters"),
  price: z.preprocess((v) => (v === "" ? undefined : v), z.coerce
    .number({ message: "Enter a price" })
    .int("Use whole naira")
    .min(1_000, "Minimum is ₦1,000")
    .max(5_000_000, "Maximum is ₦5,000,000 during early access")),
  deliveryDays: z.coerce.number({ message: "Enter days" }).int().min(1, "At least 1 day").max(60, "Up to 60 days"),
  revisions: z.coerce.number().int().min(0).max(5),
  features: z
    .array(z.object({ text: z.string().trim().min(2, "Describe this item").max(80) }))
    .min(1, "List at least one thing that's included")
    .max(8, "Up to 8 items"),
});

export const serviceSchema = z.object({
  title: z.string().trim().min(10, "Use at least 10 characters").max(80, "Keep the title under 80 characters"),
  category: z.string().min(1, "Choose a category"),
  summary: z.string().trim().min(20, "Write at least 20 characters").max(160, "Keep it under 160 characters"),
  description: z.string().trim().min(80, "Describe the service in at least 80 characters").max(3000),
  tags: z.array(z.string()).max(8, "Up to 8 tags"),
  packages: z.array(packageSchema).min(1, "Add at least one package").max(3, "Up to 3 packages"),
  faq: z
    .array(
      z.object({
        q: z.string().trim().min(5, "Write the question").max(120),
        a: z.string().trim().min(5, "Write the answer").max(500),
      }),
    )
    .max(6, "Up to 6 questions"),
});

export const serviceRequestSchema = z.object({
  requirements: z
    .string()
    .trim()
    .min(30, "Tell the freelancer what you need (at least 30 characters)")
    .max(3000, "Keep it under 3,000 characters"),
});

export type ServiceFormInput = z.input<typeof serviceSchema>;
export type ServiceFormData = z.output<typeof serviceSchema>;

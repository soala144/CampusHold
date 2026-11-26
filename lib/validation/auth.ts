import { z } from "zod";

/** Nigerian mobile numbers: 080..., +23480..., 23480... */
export const phoneSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-]/g, ""))
  .refine((v) => /^(\+?234|0)[789][01]\d{8}$/.test(v), "Enter a valid Nigerian phone number, e.g. 0803 123 4567");

export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters")
  .regex(/[A-Za-z]/, "Include at least one letter")
  .regex(/\d/, "Include at least one number");

const name = (label: string) =>
  z.string().trim().min(1, `Enter your ${label}`).max(50, `${label[0].toUpperCase()}${label.slice(1)} is too long`);

export const signupSchema = z
  .object({
    firstName: name("first name"),
    lastName: name("last name"),
    email: z.string().trim().toLowerCase().email("Enter a valid email address"),
    phone: phoneSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    terms: z.boolean().refine((v) => v, "You need to accept the terms to continue"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords don't match",
  });

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});

export const forgotSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
});

export const resetSchema = z
  .object({ password: passwordSchema, confirmPassword: z.string() })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords don't match",
  });

export const codeSchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code"),
});

export type SignupInput = z.input<typeof signupSchema>;
export type LoginInput = z.input<typeof loginSchema>;

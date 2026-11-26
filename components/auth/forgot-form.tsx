"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MailCheck } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { Spinner } from "@/components/ui/feedback";
import { forgotSchema } from "@/lib/validation/auth";
import { delay } from "@/lib/simulate";
import { AuthHeading, DemoHint } from "./auth-shell";

export function ForgotForm() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<{ email: string }>({ resolver: zodResolver(forgotSchema) });

  if (sentTo) {
    return (
      <div className="flex flex-col items-start gap-4">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-success-soft text-success">
          <MailCheck className="size-6" aria-hidden />
        </span>
        <AuthHeading
          title="Check your email"
          description={
            <>
              If an account exists for <span className="font-medium text-ink">{sentTo}</span>, we&rsquo;ve sent a
              link to reset your password. The link expires in 30 minutes.
            </>
          }
        />
        <ButtonLink href="/reset-password" size="lg" className="w-full">
          Open reset link (demo)
        </ButtonLink>
        <button onClick={() => setSentTo(null)} className="self-center text-sm text-muted hover:text-ink">
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <>
      <AuthHeading
        title="Reset your password"
        description="Enter the email you signed up with and we'll send you a reset link."
      />
      <form
        noValidate
        onSubmit={handleSubmit(async ({ email }) => {
          await delay();
          setSentTo(email);
        })}
        className="flex flex-col gap-4"
      >
        <Field label="Email" error={errors.email?.message}>
          {(p) => <Input {...p} type="email" autoComplete="email" {...register("email")} />}
        </Field>
        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting && <Spinner />}
          Send reset link
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        Remembered it?{" "}
        <Link href="/login" className="font-medium text-ink underline-offset-4 hover:underline">
          Back to log in
        </Link>
      </p>
      <DemoHint>No email is sent in the mock.</DemoHint>
    </>
  );
}

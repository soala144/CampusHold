"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Alert } from "@/components/ui/feedback";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2 } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field } from "@/components/ui/form";
import { Spinner } from "@/components/ui/feedback";
import { resetSchema } from "@/lib/validation/auth";
import { resetPassword } from "@/lib/server/auth-actions";
import { AuthHeading } from "./auth-shell";
import { PasswordInput } from "./password-input";

export function ResetForm() {
  const token = useSearchParams().get("token") ?? "";
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<{ password: string; confirmPassword: string }>({
    resolver: zodResolver(resetSchema),
    mode: "onTouched",
  });

  if (done) {
    return (
      <div className="flex flex-col items-start gap-4">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-success-soft text-success">
          <CheckCircle2 className="size-6" aria-hidden />
        </span>
        <AuthHeading
          title="Password updated"
          description="You've been signed out of other devices. Log in with your new password."
        />
        <ButtonLink href="/login" size="lg" className="w-full">
          Log in
        </ButtonLink>
      </div>
    );
  }

  return (
    <>
      <AuthHeading title="Choose a new password" />
      {(error || !token) && (
        <Alert tone="danger" className="mb-5">
          {error ?? "This reset link is missing its token. Request a new one."}
        </Alert>
      )}
      <form
        noValidate
        onSubmit={handleSubmit(async (values) => {
          setError(null);
          const res = await resetPassword(token, values);
          if (!res.ok) return setError(res.error);
          setDone(true);
        })}
        className="flex flex-col gap-4"
      >
        <Field
          label="New password"
          error={errors.password?.message}
          hint="At least 8 characters, with a letter and a number."
        >
          {(p) => <PasswordInput {...p} autoComplete="new-password" {...register("password")} />}
        </Field>
        <Field label="Confirm new password" error={errors.confirmPassword?.message}>
          {(p) => <PasswordInput {...p} autoComplete="new-password" {...register("confirmPassword")} />}
        </Field>
        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting && <Spinner />}
          Update password
        </Button>
      </form>
    </>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { Alert, Spinner } from "@/components/ui/feedback";
import { loginSchema, type LoginInput } from "@/lib/validation/auth";
import { delay } from "@/lib/simulate";
import { takeReturnTo } from "@/lib/return-to";
import { ops, run } from "@/lib/store";
import { AuthHeading, DemoHint } from "./auth-shell";
import { PasswordInput } from "./password-input";

export function LoginForm() {
  const router = useRouter();
  const [failed, setFailed] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema), mode: "onTouched" });

  async function onSubmit(values: LoginInput) {
    setFailed(false);
    await delay();
    // Demo: lets testers see the failed-login state.
    if (values.password === "wrongpassword") {
      setFailed(true);
      return;
    }
    run(ops.setSignedIn(true));
    router.push(takeReturnTo());
  }

  return (
    <>
      <AuthHeading title="Welcome back" description="Log in to your CampusHold account." />
      {failed && (
        <Alert tone="danger" title="That email and password don't match" className="mb-5">
          Check your details and try again, or reset your password.
        </Alert>
      )}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <Field label="Email" error={errors.email?.message}>
          {(p) => <Input {...p} type="email" autoComplete="email" {...register("email")} />}
        </Field>
        <Field label="Password" error={errors.password?.message}>
          {(p) => <PasswordInput {...p} autoComplete="current-password" {...register("password")} />}
        </Field>
        <Link href="/forgot-password" className="-mt-1 self-end text-sm text-muted hover:text-ink">
          Forgot password?
        </Link>
        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting && <Spinner />}
          {isSubmitting ? "Logging in…" : "Log in"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        New to CampusHold?{" "}
        <Link href="/signup" className="font-medium text-ink underline-offset-4 hover:underline">
          Create an account
        </Link>
      </p>
      <DemoHint>
        Any valid email and password signs you in as the demo user. Use the password{" "}
        <code className="font-mono">wrongpassword</code> to see the error state.
      </DemoHint>
    </>
  );
}

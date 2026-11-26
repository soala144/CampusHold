"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { Alert, Spinner } from "@/components/ui/feedback";
import { codeSchema } from "@/lib/validation/auth";
import { delay } from "@/lib/simulate";
import { cn } from "@/lib/cn";
import { AuthHeading, DemoHint } from "./auth-shell";

type Step = "email" | "phone";

export function VerifyFlow() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<{ code: string }>({ resolver: zodResolver(codeSchema) });

  useEffect(() => {
    // Read after mount so server and client markup match.
    const id = setTimeout(() => setEmail(sessionStorage.getItem("campushold:pending-email")), 0);
    return () => clearTimeout(id);
  }, []);

  async function onSubmit({ code }: { code: string }) {
    await delay(600);
    if (code === "000000") {
      setError("code", { message: "That code is incorrect or has expired." });
      return;
    }
    setResent(false);
    if (step === "email") {
      reset({ code: "" });
      setStep("phone");
    } else {
      router.push("/onboarding");
    }
  }

  const isEmail = step === "email";

  return (
    <>
      <ol className="mb-8 flex items-center gap-2 text-sm" aria-label="Verification progress">
        {(["email", "phone"] as const).map((s, i) => (
          <li key={s} className="flex items-center gap-2">
            {i > 0 && <span className="h-px w-6 bg-line-strong" aria-hidden />}
            <span
              aria-current={step === s ? "step" : undefined}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1",
                step === s
                  ? "bg-ink text-white"
                  : s === "email" && step === "phone"
                    ? "bg-success-soft text-success"
                    : "bg-surface text-muted",
              )}
            >
              {s === "email" ? <Mail className="size-3.5" /> : <Smartphone className="size-3.5" />}
              {s === "email" ? "Email" : "Phone"}
            </span>
          </li>
        ))}
      </ol>

      <AuthHeading
        title={isEmail ? "Verify your email" : "Verify your phone"}
        description={
          isEmail ? (
            <>
              We sent a 6-digit code to{" "}
              {email ? <span className="font-medium text-ink">{email}</span> : "your email"}.
            </>
          ) : (
            "We sent a 6-digit code by SMS to the number you signed up with."
          )
        }
      />

      {resent && (
        <Alert tone="success" className="mb-4">
          A new code is on its way.
        </Alert>
      )}

      <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Field label="Verification code" error={errors.code?.message}>
          {(p) => (
            <Input
              {...p}
              key={step}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="••••••"
              className="text-center font-mono text-lg tracking-[0.5em]"
              {...register("code")}
            />
          )}
        </Field>
        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting && <Spinner />}
          {isEmail ? "Verify email" : "Verify phone"}
        </Button>
        <button type="button" onClick={() => setResent(true)} className="text-sm text-muted hover:text-ink">
          Didn&rsquo;t get it? Resend code
        </button>
      </form>
      <DemoHint>
        Any 6 digits work. Use <code className="font-mono">000000</code> to see the invalid-code state.
      </DemoHint>
    </>
  );
}

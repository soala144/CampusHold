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
import { resendCode, verifyCode, whoAmI } from "@/lib/server/auth-actions";
import { cn } from "@/lib/cn";
import { AuthHeading } from "./auth-shell";

type Step = "email" | "phone";

export function VerifyFlow() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  // Codes shown on screen while email/SMS isn't connected.
  const [codes, setCodes] = useState<{ email?: string; phone?: string }>({});
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<{ code: string }>({ resolver: zodResolver(codeSchema) });

  useEffect(() => {
    void whoAmI().then(async (me) => {
      if (!me) return router.replace("/login");
      setEmail(me.email);
      if (me.emailVerified && me.phoneVerified) return router.replace("/onboarding");
      const current = me.emailVerified ? "phone" : "email";
      setStep(current);
      let saved: { email?: string; phone?: string } = {};
      try {
        saved = JSON.parse(sessionStorage.getItem("campushold:codes") ?? "{}");
      } catch {}
      // Came here without fresh codes (e.g. logged in later): issue a new one.
      if (!saved[current]) {
        const res = await resendCode(current);
        if (res.ok && res.code) saved = { ...saved, [current]: res.code };
      }
      setCodes(saved);
    });
  }, [router]);

  async function onSubmit({ code }: { code: string }) {
    const res = await verifyCode(step, { code });
    if (!res.ok) {
      setError("code", { message: res.error });
      return;
    }
    setResent(false);
    if (step === "email") {
      reset({ code: "" });
      setStep("phone");
    } else {
      sessionStorage.removeItem("campushold:codes");
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

      {codes[step] && (
        <div className="mb-5 flex items-center justify-between gap-4 rounded-xl border border-dashed border-warning/50 bg-warning-soft/60 px-4 py-3">
          <div>
            <p className="text-xs text-muted">Your {isEmail ? "email" : "phone"} code</p>
            <p className="font-mono text-2xl font-medium tracking-[0.3em]" aria-live="polite">
              {codes[step]}
            </p>
          </div>
          <p className="max-w-[12rem] text-right text-xs text-muted">
            Shown here because {isEmail ? "email" : "SMS"} isn&rsquo;t connected yet.
          </p>
        </div>
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
        <button
          type="button"
          onClick={async () => {
            const res = await resendCode(step);
            if (res.ok && res.code) setCodes((c) => ({ ...c, [step]: res.code }));
            setResent(true);
          }}
          className="text-sm text-muted hover:text-ink"
        >
          Didn&rsquo;t get it? Resend code
        </button>
        {!isEmail && (
          <button type="button" onClick={() => router.push("/onboarding")} className="text-sm text-muted hover:text-ink">
            Skip for now and verify later
          </button>
        )}
      </form>
    </>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input } from "@/components/ui/form";
import { Spinner } from "@/components/ui/feedback";
import { signupSchema, type SignupInput } from "@/lib/validation/auth";
import { delay } from "@/lib/simulate";
import { AuthHeading, DemoHint } from "./auth-shell";
import { PasswordInput } from "./password-input";

export function SignupForm() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: { terms: false },
    mode: "onTouched",
  });

  async function onSubmit(values: SignupInput) {
    await delay();
    sessionStorage.setItem("campushold:pending-email", values.email);
    router.push("/verify");
  }

  return (
    <>
      <AuthHeading
        title="Create your account"
        description="One account to hire freelancers, offer your services, or both."
      />
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name" error={errors.firstName?.message}>
            {(p) => <Input {...p} autoComplete="given-name" {...register("firstName")} />}
          </Field>
          <Field label="Last name" error={errors.lastName?.message}>
            {(p) => <Input {...p} autoComplete="family-name" {...register("lastName")} />}
          </Field>
        </div>
        <Field label="Email" error={errors.email?.message}>
          {(p) => <Input {...p} type="email" autoComplete="email" {...register("email")} />}
        </Field>
        <Field label="Phone number" error={errors.phone?.message} hint="We'll send a code to verify it.">
          {(p) => <Input {...p} type="tel" autoComplete="tel" placeholder="0803 123 4567" {...register("phone")} />}
        </Field>
        <Field
          label="Password"
          error={errors.password?.message}
          hint="At least 8 characters, with a letter and a number."
        >
          {(p) => <PasswordInput {...p} autoComplete="new-password" {...register("password")} />}
        </Field>
        <Field label="Confirm password" error={errors.confirmPassword?.message}>
          {(p) => <PasswordInput {...p} autoComplete="new-password" {...register("confirmPassword")} />}
        </Field>
        <div className="flex flex-col gap-1.5">
          <Checkbox
            {...register("terms")}
            aria-invalid={Boolean(errors.terms)}
            label="I agree to the CampusHold Terms of Service and Privacy Policy."
          />
          {errors.terms && <p className="pl-7 text-sm text-danger">{errors.terms.message}</p>}
        </div>
        <Button type="submit" size="lg" className="mt-2" disabled={isSubmitting}>
          {isSubmitting && <Spinner />}
          {isSubmitting ? "Creating account…" : "Create account"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-ink underline-offset-4 hover:underline">
          Log in
        </Link>
      </p>
      <DemoHint>
        No account is created yet. You&rsquo;ll continue to email and phone verification, then onboarding.
      </DemoHint>
    </>
  );
}

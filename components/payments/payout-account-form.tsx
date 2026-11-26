"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BadgeCheck, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import { Alert, Spinner } from "@/components/ui/feedback";
import { nigerianBanks } from "@/lib/domain/categories";
import { payoutSchema, type PayoutData } from "@/lib/validation/onboarding";
import { delay } from "@/lib/simulate";

/**
 * Bank payout details with simulated account-name resolution.
 * Stage 4 replaces the simulation with the provider's account lookup.
 */
export function PayoutAccountForm({
  defaultName,
  initial,
  submitLabel = "Save payout account",
  onSubmit,
  secondary,
}: {
  /** Used to produce a plausible resolved name in the mock. */
  defaultName: string;
  initial?: Partial<PayoutData>;
  submitLabel?: string;
  onSubmit: (data: PayoutData) => void | Promise<void>;
  secondary?: React.ReactNode;
}) {
  const [resolved, setResolved] = useState<string | null>(initial?.accountName ?? null);
  const [resolving, setResolving] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    trigger,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<{ bankName: string; accountNumber: string }>({
    resolver: zodResolver(payoutSchema),
    defaultValues: { bankName: initial?.bankName ?? "", accountNumber: initial?.accountNumber ?? "" },
  });

  async function resolve() {
    setLookupError(null);
    setResolved(null);
    if (!(await trigger())) return;
    setResolving(true);
    await delay(900);
    setResolving(false);
    // Demo: an account number starting with 000 simulates a failed lookup.
    if (getValues("accountNumber").startsWith("000")) {
      setLookupError("We couldn't find that account. Check the bank and account number.");
      return;
    }
    setResolved(defaultName.toUpperCase());
  }

  const fields = register("accountNumber", { onChange: () => setResolved(null) });
  const bank = register("bankName", { onChange: () => setResolved(null) });

  return (
    <form
      noValidate
      onSubmit={handleSubmit(async (v) => {
        if (!resolved) {
          setLookupError("Verify the account name before saving.");
          return;
        }
        await onSubmit({ ...v, accountName: resolved });
      })}
      className="flex flex-col gap-4"
    >
      <Field label="Bank" error={errors.bankName?.message}>
        {(p) => (
          <Select {...p} {...bank}>
            <option value="">Choose a bank</option>
            {nigerianBanks.map((b) => (
              <option key={b}>{b}</option>
            ))}
          </Select>
        )}
      </Field>
      <Field label="Account number" error={errors.accountNumber?.message}>
        {(p) => <Input {...p} inputMode="numeric" maxLength={10} placeholder="0123456789" {...fields} />}
      </Field>

      {resolved ? (
        <div className="flex items-center gap-3 rounded-xl border border-success/25 bg-success-soft px-4 py-3">
          <BadgeCheck className="size-5 shrink-0 text-success" aria-hidden />
          <div className="text-sm">
            <p className="text-muted">Account name</p>
            <p className="font-medium tracking-wide">{resolved}</p>
          </div>
        </div>
      ) : (
        <Button type="button" variant="secondary" onClick={resolve} disabled={resolving}>
          {resolving && <Spinner />}
          {resolving ? "Looking up account…" : "Verify account name"}
        </Button>
      )}
      {lookupError && <Alert tone="danger">{lookupError}</Alert>}

      <p className="flex items-start gap-2 text-xs text-muted">
        <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        We only ask for what payouts need. We don&rsquo;t collect your BVN or NIN unless our payment provider&rsquo;s
        compliance process requires it, and then through their secure form. Lookups here are simulated.
      </p>

      <div className="mt-2 flex flex-wrap justify-end gap-2">
        {secondary}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Spinner />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

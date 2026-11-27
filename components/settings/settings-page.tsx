"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Laptop, Smartphone } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Alert, Spinner } from "@/components/ui/feedback";
import { Field, Input, PrefixInput, Select, Textarea } from "@/components/ui/form";
import { StatusPill } from "@/components/ui/primitives";
import { Tabs } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { PasswordInput } from "@/components/auth/password-input";
import { Page, PageHeader, Panel } from "@/components/app/page-header";
import { ACTIVE_STATUSES } from "@/lib/domain/job-machine";
import { availabilityMeta } from "@/lib/domain/categories";
import type { User } from "@/lib/domain/types";
import { cn } from "@/lib/cn";
import { nairaToKobo } from "@/lib/format";
import { delay } from "@/lib/simulate";
import { currentUser, ops, run, useAppState } from "@/lib/store";
import { passwordSchema } from "@/lib/validation/auth";

type Tab = "profile" | "roles" | "notifications" | "security";

export function SettingsPage() {
  const [tab, setTab] = useState<Tab>("profile");
  return (
    <Page className="max-w-4xl">
      <PageHeader title="Settings" />
      <Tabs
        label="Settings sections"
        value={tab}
        onChange={setTab}
        className="mb-6"
        items={[
          { value: "profile", label: "Profile" },
          { value: "roles", label: "Hiring & services" },
          { value: "notifications", label: "Notifications" },
          { value: "security", label: "Security" },
        ]}
      />
      {tab === "profile" && <ProfileSettings />}
      {tab === "roles" && <RoleSettings />}
      {tab === "notifications" && <NotificationSettings />}
      {tab === "security" && <SecuritySettings />}
    </Page>
  );
}

/* ---------- Profile ---------- */

const profileForm = z.object({
  displayName: z.string().trim().min(2, "Enter a display name").max(60),
  bio: z.string().trim().max(280, "Keep it under 280 characters"),
  city: z.string().trim().min(1, "Enter your city"),
  state: z.string().trim().min(1, "Enter your state"),
  title: z.string().trim().max(60).optional(),
  description: z.string().trim().max(1200).optional(),
  availability: z.enum(["available", "limited", "unavailable"]).optional(),
  pricingFrom: z.coerce.number().int().min(1000, "Minimum is ₦1,000").optional(),
});

function ProfileSettings() {
  const s = useAppState();
  const me = currentUser(s);
  const toast = useToast();
  const f = me.freelancer;
  const { register, handleSubmit, formState: { errors, isSubmitting, isDirty }, reset } = useForm<z.input<typeof profileForm>, unknown, z.output<typeof profileForm>>({
    resolver: zodResolver(profileForm),
    defaultValues: {
      displayName: me.displayName,
      bio: me.bio,
      city: me.location.city,
      state: me.location.state,
      title: f?.title,
      description: f?.description,
      availability: f?.availability,
      pricingFrom: f ? f.pricing.from / 100 : undefined,
    },
  });

  return (
    <form
      noValidate
      onSubmit={handleSubmit(async (d) => {
        await delay(500);
        const patch: Partial<User> = {
          displayName: d.displayName,
          bio: d.bio,
          location: { ...me.location, city: d.city, state: d.state },
        };
        if (f) {
          patch.freelancer = {
            ...f,
            title: d.title || f.title,
            description: d.description || f.description,
            availability: d.availability ?? f.availability,
            pricing: { ...f.pricing, from: d.pricingFrom ? nairaToKobo(d.pricingFrom) : f.pricing.from },
          };
        }
        run(ops.updateUser(me.id, patch));
        reset(d);
        toast.success("Profile saved");
      })}
      className="flex flex-col gap-6"
    >
      <Panel title="Public profile">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <Avatar user={me} size="lg" />
            <p className="text-sm text-muted">Profile photos upload to storage in a later stage.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Display name" error={errors.displayName?.message}>
              {(p) => <Input {...p} {...register("displayName")} />}
            </Field>
            <Field label="Email" hint="Contact support to change your email.">
              {(p) => <Input {...p} value={me.email} disabled readOnly />}
            </Field>
            <Field label="City" error={errors.city?.message}>
              {(p) => <Input {...p} {...register("city")} />}
            </Field>
            <Field label="State" error={errors.state?.message}>
              {(p) => <Input {...p} {...register("state")} />}
            </Field>
          </div>
          <Field label="Bio" error={errors.bio?.message}>
            {(p) => <Textarea {...p} rows={3} {...register("bio")} />}
          </Field>
        </div>
      </Panel>

      {f && (
        <Panel title="Freelancer profile">
          <div className="flex flex-col gap-4">
            <Field label="Professional title" error={errors.title?.message}>
              {(p) => <Input {...p} {...register("title")} />}
            </Field>
            <Field label="Description" error={errors.description?.message}>
              {(p) => <Textarea {...p} rows={5} {...register("description")} />}
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Availability">
                {(p) => (
                  <Select {...p} {...register("availability")}>
                    {Object.entries(availabilityMeta).map(([v, m]) => <option key={v} value={v}>{m.label}</option>)}
                  </Select>
                )}
              </Field>
              <Field label={`Starting price${f.pricing.type === "hourly" ? " per hour" : ""}`} error={errors.pricingFrom?.message}>
                {(p) => <PrefixInput {...p} prefix="₦" inputMode="numeric" {...register("pricingFrom")} />}
              </Field>
            </div>
          </div>
        </Panel>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="ghost" disabled={!isDirty} onClick={() => reset()}>Discard</Button>
        <Button type="submit" disabled={isSubmitting || !isDirty}>
          {isSubmitting && <Spinner />}
          Save changes
        </Button>
      </div>
    </form>
  );
}

/* ---------- Roles ---------- */

function RoleSettings() {
  const s = useAppState();
  const me = currentUser(s);
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);
  const activeAs = (role: "client" | "freelancer") =>
    s.jobs.some((j) => (role === "client" ? j.clientId : j.freelancerId) === me.id && ACTIVE_STATUSES.includes(j.status));

  function toggle(role: "client" | "freelancer") {
    setError(null);
    const next = { ...me.roles, [role]: !me.roles[role] };
    if (!next.client && !next.freelancer) return setError("Keep at least one of hiring or offering services turned on.");
    if (!next[role] && activeAs(role)) return setError(`You have active jobs as a ${role}. Finish or cancel them first.`);
    if (role === "freelancer" && next.freelancer && !me.freelancer) return setError("Complete onboarding for services first. (Visit /onboarding.)");
    run(ops.updateUser(me.id, { roles: next }));
    if (!next[s.mode]) run(ops.setMode(next.client ? "client" : "freelancer"));
    toast.success("Preferences updated");
  }

  return (
    <Panel title="How you use CampusHold">
      <div className="flex flex-col gap-3">
        {(
          [
            ["client", "Hire freelancers", "Post jobs, fund work and approve deliveries."],
            ["freelancer", "Offer services", "List services, appear in Explore and receive job requests."],
          ] as const
        ).map(([role, title, desc]) => (
          <label key={role} className="flex cursor-pointer items-center justify-between gap-4 rounded-card border border-line p-4">
            <span>
              <span className="block font-medium">{title}</span>
              <span className="block text-sm text-muted">{desc}</span>
            </span>
            <Switch checked={me.roles[role]} onChange={() => toggle(role)} label={title} />
          </label>
        ))}
        {error && <Alert tone="warning">{error}</Alert>}
      </div>
    </Panel>
  );
}

function Switch({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", checked ? "bg-ink" : "bg-line-strong")}
    >
      <span className={cn("absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform", checked && "translate-x-5")} />
    </button>
  );
}

/* ---------- Notifications ---------- */

const prefRows = [
  ["jobs", "Job requests and responses"],
  ["payments", "Payments and payouts"],
  ["messages", "New messages"],
  ["deliveries", "Deliveries, revisions and approvals"],
  ["disputes", "Dispute updates"],
] as const;

function NotificationSettings() {
  const toast = useToast();
  const [prefs, setPrefs] = useState<Record<string, { email: boolean; sms: boolean }>>(() =>
    Object.fromEntries(prefRows.map(([k]) => [k, { email: true, sms: k === "payments" || k === "disputes" }])),
  );
  return (
    <Panel title="Notification preferences">
      <p className="mb-4 text-sm text-muted">In-app notifications are always on. Choose what else reaches you.</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted">
              <th className="pb-3 font-normal">Event</th>
              <th className="w-20 pb-3 text-center font-normal">Email</th>
              <th className="w-20 pb-3 text-center font-normal">SMS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {prefRows.map(([k, label]) => (
              <tr key={k}>
                <td className="py-3">{label}</td>
                {(["email", "sms"] as const).map((ch) => (
                  <td key={ch} className="py-3 text-center">
                    <input
                      type="checkbox"
                      aria-label={`${label} by ${ch}`}
                      checked={prefs[k][ch]}
                      onChange={() => setPrefs((p) => ({ ...p, [k]: { ...p[k], [ch]: !p[k][ch] } }))}
                      className="size-4 accent-ink"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-5 flex justify-end">
        <Button onClick={() => toast.success("Notification preferences saved")}>Save preferences</Button>
      </div>
    </Panel>
  );
}

/* ---------- Security ---------- */

const changePassword = z
  .object({ current: z.string().min(1, "Enter your current password"), password: passwordSchema, confirm: z.string() })
  .refine((d) => d.password === d.confirm, { path: ["confirm"], message: "Passwords don't match" });

function SecuritySettings() {
  const s = useAppState();
  const me = currentUser(s);
  const toast = useToast();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<z.infer<typeof changePassword>>({
    resolver: zodResolver(changePassword),
  });

  return (
    <div className="flex flex-col gap-6">
      <Panel title="Verification">
        <ul className="flex flex-col gap-3 text-sm">
          <li className="flex items-center justify-between gap-3">
            <span>Email · {me.email}</span>
            <StatusPill tone={me.verified.email ? "success" : "warning"}>{me.verified.email ? "Verified" : "Not verified"}</StatusPill>
          </li>
          <li className="flex items-center justify-between gap-3">
            <span>Phone · {me.phone}</span>
            <StatusPill tone={me.verified.phone ? "success" : "warning"}>{me.verified.phone ? "Verified" : "Not verified"}</StatusPill>
          </li>
        </ul>
      </Panel>

      <Panel title="Change password">
        <form
          noValidate
          onSubmit={handleSubmit(async () => {
            await delay();
            reset({ current: "", password: "", confirm: "" });
            toast.success("Password updated");
          })}
          className="flex max-w-md flex-col gap-4"
        >
          <Field label="Current password" error={errors.current?.message}>
            {(p) => <PasswordInput {...p} autoComplete="current-password" {...register("current")} />}
          </Field>
          <Field label="New password" error={errors.password?.message}>
            {(p) => <PasswordInput {...p} autoComplete="new-password" {...register("password")} />}
          </Field>
          <Field label="Confirm new password" error={errors.confirm?.message}>
            {(p) => <PasswordInput {...p} autoComplete="new-password" {...register("confirm")} />}
          </Field>
          <Button type="submit" className="self-start" disabled={isSubmitting}>
            {isSubmitting && <Spinner />}
            Update password
          </Button>
        </form>
      </Panel>

      <Panel title="Active sessions">
        <ul className="flex flex-col gap-3 text-sm">
          <li className="flex items-center gap-3">
            <Laptop className="size-4 text-muted" aria-hidden />
            <span className="flex-1">This browser · Uyo, NG</span>
            <StatusPill tone="success">Current</StatusPill>
          </li>
          <li className="flex items-center gap-3">
            <Smartphone className="size-4 text-muted" aria-hidden />
            <span className="flex-1">Android phone · last active 2 days ago</span>
          </li>
        </ul>
        <Button variant="secondary" size="sm" className="mt-4" onClick={() => toast.success("Signed out of other sessions")}>
          Sign out other sessions
        </Button>
      </Panel>

    </div>
  );
}

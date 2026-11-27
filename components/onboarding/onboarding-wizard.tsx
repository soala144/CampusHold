"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useFieldArray, useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Briefcase, Building2, Camera, Check, Plus, Repeat, Search, Trash2, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { ChoiceCard, Field, Input, PrefixInput, Select, TagInput, Textarea } from "@/components/ui/form";
import { Alert, Spinner } from "@/components/ui/feedback";
import { Logo } from "@/components/ui/logo";
import { PayoutAccountForm } from "@/components/payments/payout-account-form";
import { categories, experienceLabels, availabilityMeta, categoryLabel } from "@/lib/domain/categories";
import type { CategoryId, User } from "@/lib/domain/types";
import { cn } from "@/lib/cn";
import { formatMoney, nairaToKobo } from "@/lib/format";
import { delay } from "@/lib/simulate";
import { takeReturnTo } from "@/lib/return-to";
import { currentUser, ops, run, useAppState } from "@/lib/store";
import {
  clientSchema,
  freelancerSchema,
  profileSchema,
  roleSchema,
  type ClientData,
  type FreelancerData,
  type PayoutData,
  type ProfileData,
  type RoleData,
} from "@/lib/validation/onboarding";

/* ---------- draft persistence (save and continue) ---------- */

interface Draft {
  step: StepId;
  role?: RoleData;
  profile?: ProfileData;
  freelancer?: FreelancerData;
  client?: ClientData;
  payout?: PayoutData | "skipped";
}

const DRAFT_KEY = "campushold:onboarding-draft";
const loadDraft = (): Draft => {
  try {
    return JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "") as Draft;
  } catch {
    return { step: "role" };
  }
};

type StepId = "role" | "profile" | "freelancer" | "client" | "payout" | "review";

const stepTitles: Record<StepId, string> = {
  role: "Your goals",
  profile: "Profile",
  freelancer: "Services",
  client: "Hiring",
  payout: "Payouts",
  review: "Review",
};

function stepsFor(intent?: RoleData["intent"]): StepId[] {
  const s: StepId[] = ["role", "profile"];
  if (intent === "offer" || intent === "both") s.push("freelancer");
  if (intent === "hire" || intent === "both") s.push("client");
  if (intent === "offer" || intent === "both") s.push("payout");
  s.push("review");
  return s;
}

export function OnboardingWizard() {
  const router = useRouter();
  const me = currentUser(useAppState());
  const [draft, setDraft] = useState<Draft>(loadDraft);
  const [saved, setSaved] = useState(false);
  const steps = stepsFor(draft.role?.intent);
  const index = Math.max(0, steps.indexOf(draft.step));

  function save(patch: Partial<Draft>, next: boolean) {
    const nextStep = next ? stepsFor(patch.role?.intent ?? draft.role?.intent)[index + 1] : draft.step;
    const updated = { ...draft, ...patch, step: nextStep ?? draft.step };
    setDraft(updated);
    localStorage.setItem(DRAFT_KEY, JSON.stringify(updated));
    setSaved(!next);
    if (next) window.scrollTo({ top: 0 });
  }

  function back() {
    const prev = steps[index - 1];
    if (prev) setDraft((d) => ({ ...d, step: prev }));
    setSaved(false);
  }

  async function finish() {
    await delay(800);
    const intent = draft.role!.intent;
    const p = draft.profile!;
    const f = draft.freelancer;
    const patch: Partial<User> = {
      firstName: p.firstName,
      lastName: p.lastName,
      displayName: p.displayName,
      bio: p.bio,
      location: { country: p.country, state: p.state, city: p.city },
      roles: { client: intent !== "offer", freelancer: intent !== "hire" },
      freelancer: f
        ? {
            title: f.title,
            skills: f.skills,
            categories: f.categories as CategoryId[],
            experience: f.experience,
            description: f.description,
            portfolio: f.portfolio,
            pricing: { type: f.pricingType, from: nairaToKobo(f.pricingFrom) },
            availability: f.availability,
          }
        : undefined,
      client: draft.client,
      onboarded: true,
    };
    run(ops.updateUser(me.id, patch));
    if (draft.payout && draft.payout !== "skipped") {
      run(
        ops.savePayoutAccount({
          userId: me.id,
          bankName: draft.payout.bankName,
          accountNumberLast4: draft.payout.accountNumber.slice(-4),
          accountName: draft.payout.accountName,
          status: "pending_verification",
          createdAt: new Date().toISOString(),
        }),
      );
    }
    run(ops.setMode(intent === "offer" ? "freelancer" : "client"));
    localStorage.removeItem(DRAFT_KEY);
    router.push(takeReturnTo());
  }

  const step = steps[index];

  return (
    <div className="min-h-dvh bg-surface/50">
      <header className="border-b border-line bg-canvas">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <Logo />
          <span className="text-sm text-muted">
            Step {index + 1} of {steps.length}
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-8 md:py-12">
        <ol className="mb-10 flex gap-1.5" aria-label="Onboarding progress">
          {steps.map((s, i) => (
            <li key={s} className="flex flex-1 flex-col gap-2">
              <span className={cn("h-1 rounded-full", i <= index ? "bg-ink" : "bg-line-strong")} />
              <span
                aria-current={i === index ? "step" : undefined}
                className={cn("hidden text-xs sm:block", i === index ? "font-medium text-ink" : "text-subtle")}
              >
                {stepTitles[s]}
              </span>
            </li>
          ))}
        </ol>

        {saved && (
          <Alert tone="success" className="mb-6">
            Progress saved. You can close this page and pick up where you left off.
          </Alert>
        )}

        <div className="rounded-panel border border-line bg-canvas p-5 shadow-card md:p-8">
          {step === "role" && <RoleStep initial={draft.role} onNext={(role) => save({ role }, true)} />}
          {step === "profile" && (
            <ProfileStep
              me={me}
              initial={draft.profile}
              onBack={back}
              onSave={(profile, next) => save({ profile }, next)}
            />
          )}
          {step === "freelancer" && (
            <FreelancerStep initial={draft.freelancer} onBack={back} onSave={(freelancer, next) => save({ freelancer }, next)} />
          )}
          {step === "client" && (
            <ClientStep initial={draft.client} onBack={back} onSave={(client, next) => save({ client }, next)} />
          )}
          {step === "payout" && (
            <StepShell
              title="Where should we send your earnings?"
              description="Add the bank account you'd like payouts sent to. You can skip this and add it later, but you'll need it before you can be paid."
            >
              <PayoutAccountForm
                defaultName={`${draft.profile?.lastName ?? me.lastName} ${draft.profile?.firstName ?? me.firstName}`}
                initial={draft.payout && draft.payout !== "skipped" ? draft.payout : undefined}
                submitLabel="Continue"
                onSubmit={(payout) => save({ payout }, true)}
                secondary={
                  <>
                    <Button variant="ghost" onClick={back} className="mr-auto">
                      Back
                    </Button>
                    <Button variant="secondary" onClick={() => save({ payout: "skipped" }, true)}>
                      Skip for now
                    </Button>
                  </>
                }
              />
            </StepShell>
          )}
          {step === "review" && <ReviewStep draft={draft} onBack={back} onFinish={finish} onEdit={(s) => setDraft((d) => ({ ...d, step: s }))} />}
        </div>
      </div>
    </div>
  );
}

/* ---------- steps ---------- */

function StepShell({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-display text-2xl font-medium tracking-[-0.03em]">{title}</h1>
        {description && <p className="text-muted">{description}</p>}
      </div>
      {children}
    </div>
  );
}

function StepActions({
  onBack,
  onSaveOnly,
  submitting,
  nextLabel = "Continue",
}: {
  onBack?: () => void;
  onSaveOnly?: () => void;
  submitting?: boolean;
  nextLabel?: string;
}) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-line pt-5">
      {onBack && (
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
      )}
      <div className="ml-auto flex gap-2">
        {onSaveOnly && (
          <Button variant="secondary" onClick={onSaveOnly}>
            Save for later
          </Button>
        )}
        <Button type="submit" disabled={submitting}>
          {nextLabel}
        </Button>
      </div>
    </div>
  );
}

function RoleStep({ initial, onNext }: { initial?: RoleData; onNext: (d: RoleData) => void }) {
  const { control, handleSubmit, formState } = useForm<RoleData>({
    resolver: zodResolver(roleSchema),
    defaultValues: initial,
  });
  const options = [
    { value: "hire", title: "I want to hire freelancers", description: "Post jobs and work with freelancers.", icon: <Search /> },
    { value: "offer", title: "I want to offer freelance services", description: "Get hired and paid for your skills.", icon: <Briefcase /> },
    { value: "both", title: "I want to do both", description: "Hire and get hired from one account.", icon: <Repeat /> },
  ] as const;
  return (
    <form noValidate onSubmit={handleSubmit(onNext)}>
      <StepShell title="How will you use CampusHold?" description="You can change this any time in settings.">
        <Controller
          control={control}
          name="intent"
          render={({ field }) => (
            <div role="radiogroup" aria-label="How you'll use CampusHold" className="flex flex-col gap-3">
              {options.map((o) => (
                <ChoiceCard
                  key={o.value}
                  name="intent"
                  checked={field.value === o.value}
                  onSelect={() => field.onChange(o.value)}
                  title={o.title}
                  description={o.description}
                  icon={o.icon}
                />
              ))}
            </div>
          )}
        />
        {formState.errors.intent && <p className="text-sm text-danger">{formState.errors.intent.message}</p>}
        <StepActions />
      </StepShell>
    </form>
  );
}

function ProfileStep({
  me,
  initial,
  onBack,
  onSave,
}: {
  me: User;
  initial?: ProfileData;
  onBack: () => void;
  onSave: (d: ProfileData, next: boolean) => void;
}) {
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const { register, handleSubmit, control, getValues, formState: { errors } } = useForm<ProfileData>({
    resolver: zodResolver(profileSchema),
    defaultValues: initial ?? {
      firstName: me.firstName,
      lastName: me.lastName,
      displayName: me.displayName,
      country: "Nigeria",
      state: me.location.state,
      city: me.location.city,
      bio: "",
    },
    mode: "onTouched",
  });
  const [bio = "", firstName, lastName] = useWatch({ control, name: ["bio", "firstName", "lastName"] });

  return (
    <form noValidate onSubmit={handleSubmit((d) => onSave({ ...d, photoName: d.photoName }, true))}>
      <StepShell title="Tell people about yourself" description="This appears on your profile and in job workspaces.">
        <div className="flex items-center gap-4">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element -- local object URL preview
            <img src={photo} alt="Profile preview" className="size-20 rounded-full object-cover" />
          ) : (
            <Avatar user={{ firstName: firstName || "?", lastName: lastName || "", avatarHue: me.avatarHue }} size="xl" />
          )}
          <div className="flex flex-col gap-1.5">
            <label className="inline-flex cursor-pointer items-center gap-2 self-start rounded-full border border-line-strong px-4 py-2 text-sm font-medium hover:bg-surface has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ink">
              <Camera className="size-4" aria-hidden />
              {photo ? "Change photo" : "Upload photo"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  setPhotoError(null);
                  if (!f) return;
                  if (f.size > 2 * 1024 * 1024) return setPhotoError("Photos must be under 2 MB.");
                  setPhoto(URL.createObjectURL(f));
                }}
              />
            </label>
            <p className={cn("text-xs", photoError ? "text-danger" : "text-muted")}>
              {photoError ?? "JPG, PNG or WebP, up to 2 MB. Stored locally in this demo."}
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name" error={errors.firstName?.message}>
            {(p) => <Input {...p} {...register("firstName")} />}
          </Field>
          <Field label="Last name" error={errors.lastName?.message}>
            {(p) => <Input {...p} {...register("lastName")} />}
          </Field>
        </div>
        <Field label="Display name" error={errors.displayName?.message} hint="How your name appears to others.">
          {(p) => <Input {...p} {...register("displayName")} />}
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Country" error={errors.country?.message}>
            {(p) => (
              <Select {...p} {...register("country")}>
                <option>Nigeria</option>
                <option>Ghana</option>
                <option>Kenya</option>
                <option>South Africa</option>
                <option>Other</option>
              </Select>
            )}
          </Field>
          <Field label="State" error={errors.state?.message}>
            {(p) => <Input {...p} {...register("state")} />}
          </Field>
          <Field label="City" error={errors.city?.message}>
            {(p) => <Input {...p} {...register("city")} />}
          </Field>
        </div>
        <Field
          label="Short bio"
          error={errors.bio?.message}
          hint={<span className="tabular-nums">{bio.length}/280</span>}
        >
          {(p) => <Textarea {...p} rows={3} placeholder="What you study or do, and what you're looking for." {...register("bio")} />}
        </Field>
        <StepActions onBack={onBack} onSaveOnly={() => onSave(getValues(), false)} />
      </StepShell>
    </form>
  );
}

type FreelancerForm = z.input<typeof freelancerSchema>;

function FreelancerStep({
  initial,
  onBack,
  onSave,
}: {
  initial?: FreelancerData;
  onBack: () => void;
  onSave: (d: FreelancerData, next: boolean) => void;
}) {
  const { register, control, handleSubmit, getValues, formState: { errors } } = useForm<FreelancerForm, unknown, FreelancerData>({
    resolver: zodResolver(freelancerSchema),
    defaultValues: initial ?? {
      title: "",
      skills: [],
      categories: [],
      description: "",
      portfolio: [],
      pricingType: "fixed",
      availability: "available",
    },
    mode: "onTouched",
  });
  const portfolio = useFieldArray({ control, name: "portfolio" });

  return (
    <form noValidate onSubmit={handleSubmit((d) => onSave(d, true))}>
      <StepShell title="What do you offer?" description="Clients use this to find and choose you.">
        <Field label="Professional title" error={errors.title?.message} hint="e.g. Brand designer, Data analyst">
          {(p) => <Input {...p} {...register("title")} />}
        </Field>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-sm font-medium">Service categories</legend>
          <Controller
            control={control}
            name="categories"
            render={({ field }) => (
              <div className="flex flex-wrap gap-2">
                {categories.map((c) => {
                  const on = field.value.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => field.onChange(on ? field.value.filter((x) => x !== c.id) : [...field.value, c.id])}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition-colors",
                        on ? "border-ink bg-ink text-white" : "border-line-strong hover:bg-surface",
                      )}
                    >
                      {on && <Check className="size-3.5" aria-hidden />}
                      {c.label}
                    </button>
                  );
                })}
              </div>
            )}
          />
          {errors.categories && <p className="text-sm text-danger">{errors.categories.message}</p>}
        </fieldset>

        <Field label="Skills" error={errors.skills?.message} hint="Press Enter or comma after each skill.">
          {(p) => (
            <Controller
              control={control}
              name="skills"
              render={({ field }) => (
                <TagInput id={p.id} value={field.value} onChange={field.onChange} invalid={p["aria-invalid"]} placeholder="e.g. Figma, Logo design" />
              )}
            />
          )}
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Experience level" error={errors.experience?.message}>
            {(p) => (
              <Select {...p} {...register("experience")}>
                <option value="">Choose…</option>
                {Object.entries(experienceLabels).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Availability">
            {(p) => (
              <Select {...p} {...register("availability")}>
                {Object.entries(availabilityMeta).map(([v, m]) => (
                  <option key={v} value={v}>
                    {m.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>

        <Field label="Professional description" error={errors.description?.message}>
          {(p) => (
            <Textarea {...p} rows={5} placeholder="What you do, who you've worked with, and how you work." {...register("description")} />
          )}
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Pricing">
            {(p) => (
              <Select {...p} {...register("pricingType")}>
                <option value="fixed">Fixed price per job</option>
                <option value="hourly">Hourly rate</option>
              </Select>
            )}
          </Field>
          <Field label="Starting from" error={errors.pricingFrom?.message}>
            {(p) => <PrefixInput {...p} prefix="₦" inputMode="numeric" placeholder="25000" {...register("pricingFrom")} />}
          </Field>
        </div>

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 flex w-full items-baseline justify-between text-sm font-medium">
            Portfolio links <span className="text-xs font-normal text-subtle">Optional · up to 5</span>
          </legend>
          {portfolio.fields.map((f, i) => (
            <div key={f.id} className="grid gap-2 sm:grid-cols-[10rem_1fr_auto]">
              <Input aria-label="Link label" placeholder="Behance" {...register(`portfolio.${i}.label`)} aria-invalid={Boolean(errors.portfolio?.[i]?.label)} />
              <Input aria-label="Link URL" placeholder="https://" {...register(`portfolio.${i}.url`)} aria-invalid={Boolean(errors.portfolio?.[i]?.url)} />
              <Button variant="ghost" onClick={() => portfolio.remove(i)} aria-label="Remove link">
                <Trash2 />
              </Button>
              {(errors.portfolio?.[i]?.url || errors.portfolio?.[i]?.label) && (
                <p className="text-sm text-danger sm:col-span-3">
                  {errors.portfolio?.[i]?.label?.message ?? errors.portfolio?.[i]?.url?.message}
                </p>
              )}
            </div>
          ))}
          {portfolio.fields.length < 5 && (
            <Button variant="secondary" size="sm" className="self-start" onClick={() => portfolio.append({ label: "", url: "" })}>
              <Plus />
              Add link
            </Button>
          )}
        </fieldset>

        <StepActions onBack={onBack} onSaveOnly={() => onSave(getValues() as FreelancerData, false)} />
      </StepShell>
    </form>
  );
}

function ClientStep({
  initial,
  onBack,
  onSave,
}: {
  initial?: ClientData;
  onBack: () => void;
  onSave: (d: ClientData, next: boolean) => void;
}) {
  const { register, control, handleSubmit, getValues, formState: { errors } } = useForm<ClientData>({
    resolver: zodResolver(clientSchema),
    defaultValues: initial ?? { kind: "individual" },
    mode: "onTouched",
  });
  const kind = useWatch({ control, name: "kind" });
  return (
    <form noValidate onSubmit={handleSubmit((d) => onSave(d, true))}>
      <StepShell title="Who are you hiring for?" description="Freelancers see this when you send them a job.">
        <Controller
          control={control}
          name="kind"
          render={({ field }) => (
            <div role="radiogroup" aria-label="Hiring as" className="grid gap-3 sm:grid-cols-2">
              <ChoiceCard name="kind" checked={field.value === "individual"} onSelect={() => field.onChange("individual")} title="Myself" description="Personal or study projects" icon={<UserIcon />} />
              <ChoiceCard name="kind" checked={field.value === "organisation"} onSelect={() => field.onChange("organisation")} title="An organisation" description="Business, club or society" icon={<Building2 />} />
            </div>
          )}
        />
        {kind === "organisation" && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Organisation name" error={errors.organisationName?.message}>
                {(p) => <Input {...p} {...register("organisationName")} />}
              </Field>
              <Field label="Industry" error={errors.industry?.message}>
                {(p) => <Input {...p} placeholder="e.g. Food & drink" {...register("industry")} />}
              </Field>
            </div>
            <Field label="About the organisation" optional error={errors.description?.message}>
              {(p) => <Textarea {...p} rows={3} {...register("description")} />}
            </Field>
          </>
        )}
        <Field label="What do you usually hire for?" optional error={errors.hiringPreferences?.message}>
          {(p) => <Textarea {...p} rows={3} placeholder="e.g. Design for events, short videos, website fixes" {...register("hiringPreferences")} />}
        </Field>
        <StepActions onBack={onBack} onSaveOnly={() => onSave(getValues(), false)} />
      </StepShell>
    </form>
  );
}

function ReviewStep({
  draft,
  onBack,
  onFinish,
  onEdit,
}: {
  draft: Draft;
  onBack: () => void;
  onFinish: () => Promise<void>;
  onEdit: (s: StepId) => void;
}) {
  const [busy, setBusy] = useState(false);
  const p = draft.profile;
  const f = draft.freelancer;
  const c = draft.client;
  const intentLabel = { hire: "Hiring", offer: "Offering services", both: "Hiring and offering services" }[draft.role?.intent ?? "hire"];

  if (!p) {
    return (
      <Alert tone="warning" title="Some steps are incomplete" action={<Button size="sm" onClick={() => onEdit("profile")}>Finish profile</Button>}>
        Complete your profile before finishing.
      </Alert>
    );
  }

  return (
    <StepShell title="Review and finish" description="Check everything looks right. You can edit any of this later in settings.">
      <ReviewBlock title="Goals" onEdit={() => onEdit("role")}>
        {intentLabel}
      </ReviewBlock>
      <ReviewBlock title="Profile" onEdit={() => onEdit("profile")}>
        <p className="font-medium text-ink">{p.displayName}</p>
        <p>
          {p.city}, {p.state}, {p.country}
        </p>
        <p className="mt-1">{p.bio}</p>
      </ReviewBlock>
      {f && (
        <ReviewBlock title="Services" onEdit={() => onEdit("freelancer")}>
          <p className="font-medium text-ink">{f.title}</p>
          <p>
            {f.categories.map((x) => categoryLabel(x as CategoryId)).join(", ")} · {experienceLabels[f.experience]}
          </p>
          <p>
            From {formatMoney(nairaToKobo(f.pricingFrom))}
            {f.pricingType === "hourly" ? " per hour" : " per job"} · {availabilityMeta[f.availability].label}
          </p>
          <p>Skills: {f.skills.join(", ")}</p>
        </ReviewBlock>
      )}
      {c && (
        <ReviewBlock title="Hiring" onEdit={() => onEdit("client")}>
          {c.kind === "organisation" ? `${c.organisationName} · ${c.industry}` : "Hiring for myself"}
        </ReviewBlock>
      )}
      {draft.payout && (
        <ReviewBlock title="Payouts" onEdit={() => onEdit("payout")}>
          {draft.payout === "skipped"
            ? "Not set up yet. You'll be reminded before your first payout."
            : `${draft.payout.bankName} ••••${draft.payout.accountNumber.slice(-4)} · ${draft.payout.accountName}`}
        </ReviewBlock>
      )}
      <div className="flex flex-wrap items-center gap-2 border-t border-line pt-5">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button
          className="ml-auto"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await onFinish();
          }}
        >
          {busy && <Spinner />}
          {busy ? "Setting up your account…" : "Finish and go to dashboard"}
        </Button>
      </div>
    </StepShell>
  );
}

function ReviewBlock({ title, onEdit, children }: { title: string; onEdit: () => void; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-card border border-line p-4">
      <div className="flex flex-col gap-0.5 text-sm text-muted">
        <p className="mb-1 text-xs font-medium tracking-wide text-subtle uppercase">{title}</p>
        {children}
      </div>
      <button onClick={onEdit} className="shrink-0 text-sm font-medium text-ink underline-offset-4 hover:underline">
        Edit
      </button>
    </div>
  );
}

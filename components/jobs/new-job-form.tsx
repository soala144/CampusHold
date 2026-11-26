"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Send, Trash2 } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button, ButtonLink } from "@/components/ui/button";
import { Alert, Spinner } from "@/components/ui/feedback";
import { Field, Input, PrefixInput, Select, TagInput, Textarea } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { Page, PageHeader, Panel } from "@/components/app/page-header";
import { categories } from "@/lib/domain/categories";
import type { Attachment, CategoryId } from "@/lib/domain/types";
import { formatMoney, nairaToKobo } from "@/lib/format";
import { delay } from "@/lib/simulate";
import { currentUser, ops, run, useAppState } from "@/lib/store";
import { jobSchema, type JobFormData, type JobFormInput } from "@/lib/validation/job";
import { AttachmentPicker } from "./attachments";

function isoDate(daysFromNow: number) {
  const d = new Date(Date.now() + daysFromNow * 86_400_000);
  return d.toISOString().slice(0, 10);
}

export function NewJobForm() {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const s = useAppState();
  const me = currentUser(s);
  const freelancers = s.users.filter((u) => u.roles.freelancer && u.freelancer && u.id !== me.id && u.status === "active");
  const preselected = freelancers.find((u) => u.username === params.get("freelancer"));
  const [files, setFiles] = useState<Attachment[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<JobFormInput, unknown, JobFormData>({
    resolver: zodResolver(jobSchema),
    defaultValues: {
      freelancerId: preselected?.id ?? "",
      category: preselected?.freelancer?.categories[0] ?? "",
      title: "",
      description: "",
      skills: [],
      deliverables: [{ title: "" }],
      revisionsAllowed: 2,
      deadline: isoDate(7),
    },
    mode: "onTouched",
  });
  const deliverables = useFieldArray({ control, name: "deliverables" });
  const [freelancerId, rawBudget] = useWatch({ control, name: ["freelancerId", "budget"] });
  const chosen = freelancers.find((u) => u.id === freelancerId);
  const budget = Number(rawBudget);

  if (!me.roles.client) {
    return (
      <Page className="max-w-2xl">
        <Alert tone="info" title="Hiring isn't turned on for your account" action={<ButtonLink href="/settings" size="sm">Open settings</ButtonLink>}>
          Turn on hiring in your settings to post jobs. You&rsquo;ll keep your freelancer profile.
        </Alert>
      </Page>
    );
  }

  async function submit(data: JobFormData, send: boolean) {
    setSubmitError(null);
    await delay(500);
    const r = run(
      ops.createJob(
        me.id,
        {
          title: data.title,
          description: data.description,
          category: data.category as CategoryId,
          budget: nairaToKobo(data.budget),
          deadline: new Date(`${data.deadline}T23:59:00+01:00`).toISOString(),
          skills: data.skills,
          deliverables: data.deliverables.map((d) => d.title),
          attachments: files,
          freelancerId: data.freelancerId,
          revisionsAllowed: data.revisionsAllowed,
        },
        send,
      ),
    );
    if (!r.ok) return setSubmitError(r.error);
    run(ops.setMode("client"));
    toast.success(send ? "Job request sent" : "Draft saved");
    router.push(`/jobs/${r.value.id}`);
  }

  return (
    <Page>
      <PageHeader back={{ href: "/jobs", label: "My jobs" }} title="Post a job" description="Agree the details up front. The freelancer accepts these terms before you pay." />
      <form noValidate onSubmit={handleSubmit((d) => submit(d, true))} className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="flex flex-col gap-6">
          <Panel title="Who you're hiring">
            <Field label="Freelancer" error={errors.freelancerId?.message}>
              {(p) => (
                <Select {...p} {...register("freelancerId")}>
                  <option value="">Choose a freelancer</option>
                  {freelancers.map((u) => (
                    <option key={u.id} value={u.id} disabled={u.freelancer?.availability === "unavailable"}>
                      {u.displayName} — {u.freelancer?.title}
                      {u.freelancer?.availability === "unavailable" ? " (not taking work)" : ""}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            {chosen && (
              <div className="mt-3 flex items-center gap-3 rounded-xl bg-surface p-3">
                <Avatar user={chosen} size="sm" />
                <p className="text-sm text-muted">
                  {chosen.firstName} usually charges from <span className="font-medium text-ink">{formatMoney(chosen.freelancer!.pricing.from)}</span>
                  {chosen.freelancer!.pricing.type === "hourly" ? " per hour" : ""}.
                </p>
              </div>
            )}
          </Panel>

          <Panel title="The job">
            <div className="flex flex-col gap-4">
              <Field label="Job title" error={errors.title?.message}>
                {(p) => <Input {...p} placeholder="e.g. Logo and menu design for a café" {...register("title")} />}
              </Field>
              <Field label="Category" error={errors.category?.message}>
                {(p) => (
                  <Select {...p} {...register("category")}>
                    <option value="">Choose a category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label="Description" error={errors.description?.message} hint="What you need, who it's for, and anything the freelancer should know.">
                {(p) => <Textarea {...p} rows={6} {...register("description")} />}
              </Field>
              <Field label="Required skills" optional hint="Press Enter after each skill.">
                {(p) => (
                  <Controller control={control} name="skills" render={({ field }) => <TagInput id={p.id} value={field.value} onChange={field.onChange} max={10} placeholder="e.g. Figma" />} />
                )}
              </Field>
              <div>
                <p className="mb-1.5 text-sm font-medium">Attachments <span className="font-normal text-subtle">· optional</span></p>
                <AttachmentPicker value={files} onChange={setFiles} label="Add reference files" />
              </div>
            </div>
          </Panel>

          <Panel title="Deliverables">
            <fieldset className="flex flex-col gap-3">
              <legend className="sr-only">Deliverables</legend>
              {deliverables.fields.map((f, i) => (
                <div key={f.id} className="flex flex-col gap-1">
                  <div className="flex gap-2">
                    <span className="flex h-11 w-6 shrink-0 items-center justify-center text-sm text-subtle tabular-nums">{i + 1}.</span>
                    <Input aria-label={`Deliverable ${i + 1}`} placeholder="e.g. Final logo files (SVG + PNG)" aria-invalid={Boolean(errors.deliverables?.[i]?.title)} {...register(`deliverables.${i}.title`)} />
                    {deliverables.fields.length > 1 && (
                      <Button variant="ghost" size="icon" onClick={() => deliverables.remove(i)} aria-label={`Remove deliverable ${i + 1}`}>
                        <Trash2 />
                      </Button>
                    )}
                  </div>
                  {errors.deliverables?.[i]?.title && <p className="pl-8 text-sm text-danger">{errors.deliverables[i]?.title?.message}</p>}
                </div>
              ))}
              {errors.deliverables?.root && <p className="text-sm text-danger">{errors.deliverables.root.message}</p>}
              {deliverables.fields.length < 10 && (
                <Button variant="secondary" size="sm" className="self-start" onClick={() => deliverables.append({ title: "" })}>
                  <Plus />Add deliverable
                </Button>
              )}
            </fieldset>
          </Panel>

          <Panel title="Price and timing">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Agreed price" error={errors.budget?.message}>
                {(p) => <PrefixInput {...p} prefix="₦" inputMode="numeric" placeholder="50000" {...register("budget")} />}
              </Field>
              <Field label="Deadline" error={errors.deadline?.message}>
                {(p) => <Input {...p} type="date" min={isoDate(1)} {...register("deadline")} />}
              </Field>
              <Field label="Revisions included">
                {(p) => (
                  <Select {...p} {...register("revisionsAllowed")}>
                    {[0, 1, 2, 3].map((n) => <option key={n} value={n}>{n}</option>)}
                  </Select>
                )}
              </Field>
            </div>
          </Panel>
        </div>

        <aside className="flex flex-col gap-4 self-start lg:sticky lg:top-6">
          <Panel title="What happens next">
            <ol className="flex flex-col gap-3 text-sm text-ink-soft">
              <li><span className="font-medium text-ink">1.</span> {chosen?.firstName ?? "The freelancer"} reviews and accepts the terms.</li>
              <li><span className="font-medium text-ink">2.</span> You fund {budget > 0 ? formatMoney(nairaToKobo(budget)) : "the job"}. We confirm the payment before work starts.</li>
              <li><span className="font-medium text-ink">3.</span> You review the delivery and approve it, or ask for changes.</li>
              <li><span className="font-medium text-ink">4.</span> Payment is released once you approve.</li>
            </ol>
          </Panel>
          {submitError && <Alert tone="danger">{submitError}</Alert>}
          <Button type="submit" size="lg" disabled={isSubmitting}>
            {isSubmitting ? <Spinner /> : <Send />}
            Send job request
          </Button>
          <Button variant="secondary" disabled={isSubmitting} onClick={handleSubmit((d) => submit(d, false))}>
            Save as draft
          </Button>
          <p className="text-xs text-muted">You won&rsquo;t be charged until the freelancer accepts and you choose to fund the job.</p>
        </aside>
      </form>
    </Page>
  );
}

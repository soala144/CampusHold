"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useFieldArray, useForm, useWatch, type Control, type FieldErrors, type UseFormRegister } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FileSearch, Plus, Trash2 } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button, ButtonLink } from "@/components/ui/button";
import { Alert, EmptyState, Spinner } from "@/components/ui/feedback";
import { Field, Input, PrefixInput, Select, TagInput, Textarea } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { Page, PageHeader, Panel } from "@/components/app/page-header";
import { categories } from "@/lib/domain/categories";
import type { Attachment, CategoryId, Service, ServiceCover, ServiceStatus } from "@/lib/domain/types";
import { formatMoney, nairaToKobo } from "@/lib/format";
import { delay } from "@/lib/simulate";
import { currentUser, ops, run, useAppState } from "@/lib/store";
import { serviceSchema, type ServiceFormData, type ServiceFormInput } from "@/lib/validation/service";
import { ServiceCover as CoverImage } from "./service-card";
import { CoverUrlField } from "./cover-url-field";

const emptyPackage = (name: string) => ({ name, description: "", price: "" as unknown as number, deliveryDays: 3, revisions: 1, features: [{ text: "" }] });

function toForm(svc?: Service): ServiceFormInput {
  if (!svc) {
    return { title: "", category: "", summary: "", description: "", tags: [], packages: [emptyPackage("Basic")], faq: [] };
  }
  return {
    title: svc.title,
    category: svc.category,
    summary: svc.summary,
    description: svc.description,
    tags: svc.tags,
    packages: svc.packages.map((p) => ({ ...p, price: p.price / 100, features: p.features.map((text) => ({ text })) })),
    faq: svc.faq,
  };
}

export function ServiceEditor() {
  const params = useParams<{ id?: string }>();
  const router = useRouter();
  const toast = useToast();
  const s = useAppState();
  const me = currentUser(s);
  const existing = params.id ? s.services.find((x) => x.id === params.id && x.freelancerId === me.id) : undefined;
  const images: Attachment[] = existing?.images ?? [];
  const [cover, setCover] = useState<ServiceCover | undefined>(existing?.cover);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ServiceFormInput, unknown, ServiceFormData>({
    resolver: zodResolver(serviceSchema),
    defaultValues: toForm(existing),
    mode: "onTouched",
  });
  const packages = useFieldArray({ control, name: "packages" });
  const faq = useFieldArray({ control, name: "faq" });
  const [title, category, summary, livePackages] = useWatch({ control, name: ["title", "category", "summary", "packages"] });

  if (params.id && !existing) {
    return (
      <Page>
        <EmptyState icon={<FileSearch />} title="Service not found" action={<ButtonLink href="/my-services" size="sm">My services</ButtonLink>} />
      </Page>
    );
  }
  if (!me.roles.freelancer) {
    return (
      <Page className="max-w-3xl">
        <Alert tone="info" title="Turn on “Offer services” first" action={<ButtonLink href="/settings" size="sm">Open settings</ButtonLink>}>
          You need a freelancer profile to list services.
        </Alert>
      </Page>
    );
  }

  async function save(d: ServiceFormData, status: ServiceStatus) {
    setError(null);
    await delay(500);
    const r = run(
      ops.saveService(
        me.id,
        {
          title: d.title,
          category: d.category as CategoryId,
          summary: d.summary,
          description: d.description,
          tags: d.tags,
          packages: d.packages.map((p) => ({
            name: p.name,
            description: p.description,
            price: nairaToKobo(p.price),
            deliveryDays: p.deliveryDays,
            revisions: p.revisions,
            features: p.features.map((f) => f.text),
          })),
          faq: d.faq,
          images,
          cover,
        },
        status,
        existing?.id,
      ),
    );
    if (!r.ok) return setError(r.error);
    toast.success(status === "active" ? "Service published" : "Saved as draft");
    router.push(status === "active" ? `/services/${r.value.id}` : "/my-services");
  }

  const prices = (livePackages ?? []).map((p) => Number(p?.price)).filter((n) => n > 0);
  const preview = {
    category: (category || existing?.category || "design") as CategoryId,
    cover,
  };

  return (
    <Page>
      <PageHeader
        back={{ href: "/my-services", label: "My services" }}
        title={existing ? "Edit service" : "New service"}
        description="Be specific. Clear scope and pricing get more requests and fewer disputes."
      />
      <form noValidate onSubmit={handleSubmit((d) => save(d, "active"))} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex flex-col gap-6">
          <Panel title="Overview">
            <div className="flex flex-col gap-4">
              <Field label="Title" error={errors.title?.message} hint="Say what the client gets, e.g. “Logo and brand identity for your small business”.">
                {(p) => <Input {...p} {...register("title")} />}
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Category" error={errors.category?.message}>
                  {(p) => (
                    <Select {...p} {...register("category")}>
                      <option value="">Choose a category</option>
                      {categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </Select>
                  )}
                </Field>
                <Field label="Tags" optional error={errors.tags?.message} hint="Press Enter after each.">
                  {(p) => <Controller control={control} name="tags" render={({ field }) => <TagInput id={p.id} value={field.value} onChange={field.onChange} max={8} placeholder="e.g. Logo" />} />}
                </Field>
              </div>
              <Field label="Short summary" error={errors.summary?.message} hint="One sentence shown on your service card.">
                {(p) => <Textarea {...p} rows={2} {...register("summary")} />}
              </Field>
              <Field label="Description" error={errors.description?.message} hint="How you work, what you need from the client, and who it's for.">
                {(p) => <Textarea {...p} rows={7} {...register("description")} />}
              </Field>
              <div>
                <CoverUrlField value={cover} onChange={setCover} />
              </div>
            </div>
          </Panel>

          <Panel
            title="Packages"
            action={
              packages.fields.length < 3 && (
                <Button size="sm" variant="secondary" onClick={() => packages.append(emptyPackage(["Basic", "Standard", "Premium"][packages.fields.length]))}>
                  <Plus />Add package
                </Button>
              )
            }
          >
            <p className="mb-4 text-sm text-muted">Offer 1–3 options. What&rsquo;s included becomes the job&rsquo;s agreed deliverables when a client requests it.</p>
            {errors.packages?.root && <p className="mb-3 text-sm text-danger">{errors.packages.root.message}</p>}
            <div className="flex flex-col gap-4">
              {packages.fields.map((f, i) => (
                <PackageFields
                  key={f.id}
                  index={i}
                  control={control}
                  register={register}
                  errors={errors}
                  onRemove={packages.fields.length > 1 ? () => packages.remove(i) : undefined}
                />
              ))}
            </div>
          </Panel>

          <Panel
            title="Questions clients often ask"
            action={faq.fields.length < 6 && <Button size="sm" variant="secondary" onClick={() => faq.append({ q: "", a: "" })}><Plus />Add question</Button>}
          >
            {faq.fields.length === 0 ? (
              <p className="text-sm text-muted">Optional. Answer the questions you get most, like what you need to start or what&rsquo;s not included.</p>
            ) : (
              <div className="flex flex-col gap-4">
                {faq.fields.map((f, i) => (
                  <div key={f.id} className="flex flex-col gap-2 rounded-xl border border-line p-4">
                    <div className="flex gap-2">
                      <Input aria-label={`Question ${i + 1}`} placeholder="Question" aria-invalid={Boolean(errors.faq?.[i]?.q)} {...register(`faq.${i}.q`)} />
                      <Button variant="ghost" size="icon" onClick={() => faq.remove(i)} aria-label={`Remove question ${i + 1}`}><Trash2 /></Button>
                    </div>
                    <Textarea aria-label={`Answer ${i + 1}`} rows={2} placeholder="Answer" aria-invalid={Boolean(errors.faq?.[i]?.a)} {...register(`faq.${i}.a`)} />
                    {(errors.faq?.[i]?.q || errors.faq?.[i]?.a) && (
                      <p className="text-sm text-danger">{errors.faq?.[i]?.q?.message ?? errors.faq?.[i]?.a?.message}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>

        <aside className="flex flex-col gap-4 self-start lg:sticky lg:top-6">
          <div className="overflow-hidden rounded-card border border-line bg-canvas">
            <CoverImage service={preview} sizes="320px" className="aspect-[16/10] border-b border-line" />
            <div className="flex flex-col gap-2 p-4">
              <div className="flex items-center gap-2">
                <Avatar user={me} size="xs" />
                <span className="text-sm font-medium">{me.displayName}</span>
              </div>
              <p className="line-clamp-2 font-medium tracking-tight">{title || "Your service title"}</p>
              <p className="line-clamp-2 text-sm text-muted">{summary || "Your one-line summary"}</p>
              <p className="border-t border-line pt-2 text-sm">
                <span className="text-muted">From </span>
                <span className="font-medium tabular-nums">{prices.length ? formatMoney(nairaToKobo(Math.min(...prices))) : "—"}</span>
              </p>
            </div>
          </div>
          <p className="px-1 text-xs text-muted">Card preview.</p>
          {error && <Alert tone="danger">{error}</Alert>}
          <Button type="submit" size="lg" disabled={isSubmitting}>
            {isSubmitting && <Spinner />}
            {existing?.status === "active" ? "Save changes" : "Publish service"}
          </Button>
          <Button variant="secondary" disabled={isSubmitting} onClick={handleSubmit((d) => save(d, "draft"))}>
            Save as draft
          </Button>
        </aside>
      </form>
    </Page>
  );
}

function PackageFields({
  index,
  control,
  register,
  errors,
  onRemove,
}: {
  index: number;
  control: Control<ServiceFormInput, unknown, ServiceFormData>;
  register: UseFormRegister<ServiceFormInput>;
  errors: FieldErrors<ServiceFormInput>;
  onRemove?: () => void;
}) {
  const features = useFieldArray({ control, name: `packages.${index}.features` });
  const e = errors.packages?.[index];
  return (
    <fieldset className="flex flex-col gap-4 rounded-xl border border-line p-4">
      <legend className="sr-only">Package {index + 1}</legend>
      <div className="flex items-end gap-2">
        <Field label="Package name" error={e?.name?.message} className="flex-1">
          {(p) => <Input {...p} {...register(`packages.${index}.name`)} />}
        </Field>
        {onRemove && <Button variant="ghost" size="icon" onClick={onRemove} aria-label={`Remove package ${index + 1}`}><Trash2 /></Button>}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Price" error={e?.price?.message}>
          {(p) => <PrefixInput {...p} prefix="₦" inputMode="numeric" placeholder="25000" {...register(`packages.${index}.price`)} />}
        </Field>
        <Field label="Delivery (days)" error={e?.deliveryDays?.message}>
          {(p) => <Input {...p} type="number" min={1} max={60} {...register(`packages.${index}.deliveryDays`)} />}
        </Field>
        <Field label="Revisions">
          {(p) => (
            <Select {...p} {...register(`packages.${index}.revisions`)}>
              {[0, 1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
            </Select>
          )}
        </Field>
      </div>
      <Field label="Short description" optional error={e?.description?.message}>
        {(p) => <Input {...p} {...register(`packages.${index}.description`)} />}
      </Field>
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">What&rsquo;s included</p>
        {features.fields.map((f, j) => (
          <div key={f.id} className="flex gap-2">
            <Input aria-label={`Package ${index + 1} item ${j + 1}`} placeholder="e.g. PNG and SVG files" aria-invalid={Boolean(e?.features?.[j]?.text)} {...register(`packages.${index}.features.${j}.text`)} />
            {features.fields.length > 1 && <Button variant="ghost" size="icon" onClick={() => features.remove(j)} aria-label={`Remove item ${j + 1}`}><Trash2 /></Button>}
          </div>
        ))}
        {(e?.features?.root?.message || e?.features?.message) && <p className="text-sm text-danger">{e?.features?.root?.message ?? e?.features?.message}</p>}
        {e?.features && Array.isArray(e.features) && e.features.some((x) => x?.text) && <p className="text-sm text-danger">Describe each included item.</p>}
        {features.fields.length < 8 && (
          <Button variant="ghost" size="sm" className="self-start" onClick={() => features.append({ text: "" })}><Plus />Add item</Button>
        )}
      </div>
    </fieldset>
  );
}

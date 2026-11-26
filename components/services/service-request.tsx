"use client";

import Link from "next/link";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarDays, Check, ChevronLeft, FileSearch, LogIn, RotateCcw, Send } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button, ButtonLink } from "@/components/ui/button";
import { Alert, EmptyState, Spinner } from "@/components/ui/feedback";
import { Field, Textarea } from "@/components/ui/form";
import { AttachmentPicker } from "@/components/jobs/attachments";
import type { Attachment } from "@/lib/domain/types";
import { cn } from "@/lib/cn";
import { formatDate, formatMoney } from "@/lib/format";
import { setReturnTo } from "@/lib/return-to";
import { delay } from "@/lib/simulate";
import { getUser, ops, run, useAppState } from "@/lib/store";
import { serviceRequestSchema } from "@/lib/validation/service";

export function ServiceRequest() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const s = useAppState();
  const svc = s.services.find((x) => x.id === id);
  const freelancer = svc && getUser(s, svc.freelancerId);
  const [pkgId, setPkgId] = useState(params.get("package"));
  const [files, setFiles] = useState<Attachment[]>([]);
  const [now] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<{ requirements: string }>({ resolver: zodResolver(serviceRequestSchema), mode: "onTouched" });

  if (!svc || !freelancer) {
    return (
      <div className="container-page py-16">
        <EmptyState icon={<FileSearch />} title="Service not found" action={<ButtonLink href="/explore" size="sm">Explore services</ButtonLink>} />
      </div>
    );
  }

  const pkg = svc.packages.find((p) => p.id === pkgId) ?? svc.packages[0];
  const back = `/services/${svc.id}`;
  const here = `${pathname}?package=${pkg.id}`;
  // Estimated only for display; the real deadline is set when the request is sent.
  const due = new Date(now + pkg.deliveryDays * 86_400_000).toISOString();

  if (!s.signedIn) {
    return (
      <div className="container-page max-w-lg py-16">
        <div className="flex flex-col items-center gap-4 rounded-panel border border-line p-8 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-surface"><LogIn className="size-5" aria-hidden /></span>
          <h1 className="text-xl font-medium tracking-tight">Create an account to send this request</h1>
          <p className="text-muted">
            It&rsquo;s free, and you won&rsquo;t pay anything until {freelancer.firstName} accepts. We&rsquo;ll bring you straight back here.
          </p>
          <div className="mt-2 flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
            <Button size="lg" onClick={() => { setReturnTo(here); router.push("/signup"); }}>Create an account</Button>
            <Button size="lg" variant="secondary" onClick={() => { setReturnTo(here); router.push("/login"); }}>Log in</Button>
          </div>
          <Link href={back} className="text-sm text-muted hover:text-ink">Back to the service</Link>
        </div>
      </div>
    );
  }

  if (svc.freelancerId === s.currentUserId) {
    return (
      <div className="container-page max-w-lg py-16">
        <Alert tone="info" title="This is your own service" action={<ButtonLink href={back} size="sm" variant="secondary">Back</ButtonLink>}>
          You can&rsquo;t request your own service.
        </Alert>
      </div>
    );
  }

  async function submit({ requirements }: { requirements: string }) {
    setError(null);
    await delay(600);
    const r = run(ops.requestService(s.currentUserId, svc!.id, pkg.id, requirements, files));
    if (!r.ok) return setError(r.error);
    router.push(`/jobs/${r.value.id}`);
  }

  return (
    <div className="container-page max-w-5xl pt-6 pb-20">
      <Link href={back} className="mb-6 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ChevronLeft className="size-4" aria-hidden />
        Back to service
      </Link>
      <h1 className="font-display text-[1.75rem] leading-tight font-medium tracking-[-0.035em] md:text-[2rem]">Send your request</h1>
      <p className="mt-2 max-w-2xl text-muted">
        Tell {freelancer.firstName} what you need. They&rsquo;ll accept or decline, and you&rsquo;ll only pay once they accept.
      </p>

      <form noValidate onSubmit={handleSubmit(submit)} className="mt-8 grid gap-8 lg:grid-cols-[1fr_22rem]">
        <div className="flex flex-col gap-6">
          {svc.packages.length > 1 && (
            <fieldset>
              <legend className="mb-2 text-sm font-medium">Package</legend>
              <div className="grid gap-3 sm:grid-cols-3">
                {svc.packages.map((p) => (
                  <label
                    key={p.id}
                    className={cn(
                      "flex cursor-pointer flex-col gap-1 rounded-card border p-4 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ink",
                      p.id === pkg.id ? "border-ink bg-surface" : "border-line hover:border-line-strong",
                    )}
                  >
                    <input type="radio" name="package" className="sr-only" checked={p.id === pkg.id} onChange={() => setPkgId(p.id)} />
                    <span className="font-medium">{p.name}</span>
                    <span className="text-sm tabular-nums">{formatMoney(p.price)}</span>
                    <span className="text-xs text-muted">{p.deliveryDays} days · {p.revisions} {p.revisions === 1 ? "revision" : "revisions"}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          <Field
            label="What do you need?"
            error={errors.requirements?.message}
            hint="Include the details, style, links or examples that help them get it right first time."
          >
            {(p) => <Textarea {...p} rows={8} {...register("requirements")} />}
          </Field>

          <div>
            <p className="mb-1.5 text-sm font-medium">Files <span className="font-normal text-subtle">· optional</span></p>
            <AttachmentPicker value={files} onChange={setFiles} label="Attach reference files" />
          </div>
        </div>

        <aside className="flex flex-col gap-4 self-start lg:sticky lg:top-24">
          <div className="flex flex-col gap-4 rounded-card border border-line bg-canvas p-5 shadow-card">
            <div className="flex items-center gap-3">
              <Avatar user={freelancer} size="sm" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{svc.title}</p>
                <p className="text-xs text-muted">{freelancer.displayName}{svc.packages.length > 1 ? ` · ${pkg.name}` : ""}</p>
              </div>
            </div>
            <ul className="flex flex-col gap-1.5 border-t border-line pt-4 text-sm">
              {pkg.features.map((x) => <li key={x} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />{x}</li>)}
            </ul>
            <dl className="flex flex-col gap-2 border-t border-line pt-4 text-sm">
              <div className="flex justify-between"><dt className="flex items-center gap-1.5 text-muted"><CalendarDays className="size-3.5" />Delivery</dt><dd>{pkg.deliveryDays} days · around {formatDate(due)}</dd></div>
              <div className="flex justify-between"><dt className="flex items-center gap-1.5 text-muted"><RotateCcw className="size-3.5" />Revisions</dt><dd>{pkg.revisions}</dd></div>
              <div className="mt-1 flex justify-between border-t border-line pt-3 text-base font-medium"><dt>Price</dt><dd className="tabular-nums">{formatMoney(pkg.price)}</dd></div>
            </dl>
            {error && <Alert tone="danger">{error}</Alert>}
            <Button type="submit" size="lg" disabled={isSubmitting}>
              {isSubmitting ? <Spinner /> : <Send />}
              Send request
            </Button>
            <p className="text-xs text-muted">No payment now. You&rsquo;ll fund the job after {freelancer.firstName} accepts, and approve the work before it&rsquo;s released.</p>
          </div>
        </aside>
      </form>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { FileSearch, Lock, Scale, ShieldAlert } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button, ButtonLink } from "@/components/ui/button";
import { Alert, EmptyState } from "@/components/ui/feedback";
import { Field, Textarea } from "@/components/ui/form";
import { StatusPill, type Tone } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { Page, PageHeader, Panel } from "@/components/app/page-header";
import { AttachmentChip, AttachmentPicker } from "@/components/jobs/attachments";
import { JobStatusPill } from "@/components/jobs/job-bits";
import { disputeReasonLabels } from "@/lib/domain/categories";
import type { Attachment, Dispute, DisputeStatus } from "@/lib/domain/types";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";
import { currentUser, getUser, ops, run, useAppState, type AppState } from "@/lib/store";

export const disputeStatusMeta: Record<DisputeStatus, { label: string; tone: Tone }> = {
  open: { label: "Open", tone: "danger" },
  under_review: { label: "Under review", tone: "warning" },
  resolved: { label: "Resolved", tone: "neutral" },
};

const outcomeLabels = {
  release_to_freelancer: "Payment released to the freelancer",
  refund_to_client: "Payment refunded to the client",
  split: "Payment split between both parties",
};

export function DisputesList() {
  const s = useAppState();
  const me = currentUser(s);
  const mine = s.disputes.filter((d) => {
    const j = s.jobs.find((x) => x.id === d.jobId);
    return j && (j.clientId === me.id || j.freelancerId === me.id);
  });
  return (
    <Page className="max-w-4xl">
      <PageHeader
        title="Disputes"
        description="When a job goes wrong and you can't sort it out together, an admin reviews the full job history. Payment is held until it's resolved."
      />
      {mine.length === 0 ? (
        <EmptyState
          icon={<Scale />}
          title="No disputes"
          description="If there's a problem on a job, use “Report a problem” in its workspace."
        />
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-canvas">
          {mine.map((d) => (
            <DisputeRow key={d.id} d={d} s={s} />
          ))}
        </ul>
      )}
    </Page>
  );
}

export function DisputeRow({ d, s, href }: { d: Dispute; s: AppState; href?: string }) {
  const job = s.jobs.find((j) => j.id === d.jobId);
  const opener = getUser(s, d.openedById);
  const m = disputeStatusMeta[d.status];
  return (
    <li>
      <Link href={href ?? `/disputes/${d.id}`} className="flex flex-col gap-2 px-5 py-4 hover:bg-surface/60 sm:flex-row sm:items-center sm:gap-4">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{job?.title}</p>
          <p className="truncate text-sm text-muted">
            {disputeReasonLabels[d.reason]} · opened by {opener?.displayName} · {formatDate(d.createdAt, true)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {job && <span className="text-sm font-medium tabular-nums">{formatMoney(job.budget)}</span>}
          <StatusPill tone={m.tone}>{m.label}</StatusPill>
        </div>
      </Link>
    </li>
  );
}

/** Shared by the participant view and the admin view. */
export function DisputeDetail({ admin = false }: { admin?: boolean }) {
  const { id } = useParams<{ id: string }>();
  const s = useAppState();
  const me = currentUser(s);
  const toast = useToast();
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<Attachment[]>([]);
  const [resolution, setResolution] = useState("");
  const [error, setError] = useState<string | null>(null);
  const d = s.disputes.find((x) => x.id === id);
  const job = d && s.jobs.find((j) => j.id === d.jobId);

  if (!d || !job) {
    return (
      <Page>
        <EmptyState icon={<FileSearch />} title="Dispute not found" action={<ButtonLink href={admin ? "/admin/disputes" : "/disputes"} size="sm">Back</ButtonLink>} />
      </Page>
    );
  }
  const isParty = job.clientId === me.id || job.freelancerId === me.id;
  if (admin ? !me.isAdmin : !isParty) {
    return (
      <Page>
        <EmptyState icon={<Lock />} title="You don't have access to this dispute" action={<ButtonLink href="/dashboard" size="sm">Go to dashboard</ButtonLink>} />
      </Page>
    );
  }

  const client = getUser(s, job.clientId)!;
  const freelancer = getUser(s, job.freelancerId)!;
  const opener = getUser(s, d.openedById);
  const m = disputeStatusMeta[d.status];
  const resolved = d.status === "resolved";
  const author = admin ? "admin" : me.id;

  function post() {
    const r = run(ops.addDisputeUpdate(d!.id, author, body, files));
    if (!r.ok) return setError(r.error);
    setBody("");
    setFiles([]);
    setError(null);
    toast.success("Update added");
  }

  function resolve(release: boolean) {
    if (resolution.trim().length < 10) return setError("Write a short resolution note for both parties (at least 10 characters).");
    const r = run(ops.jobAction(job!.id, release ? "resolve_dispute_release" : "resolve_dispute_refund", { as: "admin", note: resolution.trim() }));
    if (!r.ok) return setError(r.error);
    setError(null);
    toast.success("Dispute resolved (simulated)");
  }

  return (
    <Page wide>
      <PageHeader
        back={{ href: admin ? "/admin/disputes" : "/disputes", label: "Disputes" }}
        eyebrow={<div className="flex items-center gap-2"><StatusPill tone={m.tone}>{m.label}</StatusPill><span className="text-sm text-muted">Opened {formatDate(d.createdAt, true)}</span></div>}
        title={job.title}
        description={disputeReasonLabels[d.reason]}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="flex flex-col gap-6">
          {!resolved && (
            <Alert tone="warning" title="Payment is on hold">
              {formatMoney(job.budget)} won&rsquo;t be released or refunded until an admin resolves this dispute.
            </Alert>
          )}
          {resolved && d.resolution && (
            <Alert tone="success" title={outcomeLabels[d.resolution.outcome]}>
              {d.resolution.note}
            </Alert>
          )}

          <Panel title={`Opened by ${opener?.id === me.id ? "you" : opener?.displayName}`}>
            <p className="leading-relaxed text-ink-soft">{d.details}</p>
            {d.evidence.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {d.evidence.map((f) => <AttachmentChip key={f.id} file={f} />)}
              </div>
            )}
          </Panel>

          <Panel title="Updates">
            {d.updates.length === 0 ? (
              <p className="text-sm text-muted">No updates yet. An admin will respond here.</p>
            ) : (
              <ol className="flex flex-col gap-4">
                {d.updates.map((u) => {
                  const who = u.authorId === "admin" ? null : getUser(s, u.authorId);
                  return (
                    <li key={u.id} className="flex gap-3">
                      {who ? <Avatar user={who} size="sm" /> : <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-ink text-white"><ShieldAlert className="size-4" aria-hidden /></span>}
                      <div className="flex-1">
                        <p className="text-sm">
                          <span className="font-medium">{who ? (who.id === me.id ? "You" : who.displayName) : "CampusHold admin"}</span>{" "}
                          <span className="text-subtle">· {formatDateTime(u.createdAt)}</span>
                        </p>
                        <p className="mt-1 text-ink-soft">{u.body}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
            {!resolved && (
              <div className="mt-6 flex flex-col gap-3 border-t border-line pt-5">
                <Field label={admin ? "Message both parties" : "Add information or evidence"}>
                  {(p) => <Textarea {...p} rows={3} value={body} onChange={(e) => setBody(e.target.value)} />}
                </Field>
                <AttachmentPicker value={files} onChange={setFiles} label="Add evidence" />
                <Button className="self-end" onClick={post}>Post update</Button>
              </div>
            )}
          </Panel>

          {admin && !resolved && (
            <Panel title="Resolve dispute">
              <div className="flex flex-col gap-4">
                {d.status === "open" && (
                  <Button variant="secondary" className="self-start" onClick={() => { run(ops.setDisputeStatus(d.id, "under_review")); toast.success("Moved to review"); }}>
                    Mark as under review
                  </Button>
                )}
                <Field label="Resolution note" hint="Shared with both parties and recorded in the audit log.">
                  {(p) => <Textarea {...p} rows={3} value={resolution} onChange={(e) => setResolution(e.target.value)} />}
                </Field>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => resolve(true)}>Release to freelancer</Button>
                  <Button variant="secondary" onClick={() => resolve(false)}>Refund client</Button>
                </div>
                <p className="text-xs text-muted">Simulated. In production, the outcome must also follow the payment provider&rsquo;s rules for releases and refunds.</p>
              </div>
            </Panel>
          )}
          {error && <Alert tone="danger">{error}</Alert>}
        </div>

        <aside className="flex flex-col gap-4">
          <Panel title="Job">
            <div className="flex flex-col gap-3 text-sm">
              <div className="flex items-center justify-between"><span className="text-muted">Status</span><JobStatusPill status={job.status} /></div>
              <div className="flex items-center justify-between"><span className="text-muted">Amount</span><span className="font-medium tabular-nums">{formatMoney(job.budget)}</span></div>
              <div className="flex items-center justify-between"><span className="text-muted">Deliveries</span><span>{job.submissions.length}</span></div>
              <div className="flex items-center justify-between"><span className="text-muted">Revisions used</span><span>{job.revisionsUsed} of {job.revisionsAllowed}</span></div>
            </div>
            {isParty && <ButtonLink href={`/jobs/${job.id}`} variant="secondary" size="sm" className="mt-4 w-full">Open job workspace</ButtonLink>}
          </Panel>
          <Panel title="Parties">
            {[["Client", client], ["Freelancer", freelancer]].map(([label, u]) => {
              const user = u as typeof client;
              return (
                <div key={label as string} className="flex items-center gap-3 py-1.5">
                  <Avatar user={user} size="sm" />
                  <div className="text-sm">
                    <p className="font-medium">{user.displayName}</p>
                    <p className="text-muted">{label as string}</p>
                  </div>
                </div>
              );
            })}
          </Panel>
          {admin && (
            <Panel title="Job history">
              <ol className="flex flex-col gap-2 text-xs">
                {job.thread.filter((t) => t.kind === "event").map((t) => (
                  <li key={t.id} className="flex justify-between gap-2">
                    <span>{t.kind === "event" ? t.event.replaceAll("_", " ") : ""}</span>
                    <span className="text-subtle">{formatDate(t.createdAt)}</span>
                  </li>
                ))}
              </ol>
            </Panel>
          )}
        </aside>
      </div>
    </Page>
  );
}

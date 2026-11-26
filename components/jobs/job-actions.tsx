"use client";

import { useState } from "react";
import { CheckCircle2, Play, RotateCcw, Scale, Send, Upload, X } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Alert } from "@/components/ui/feedback";
import { Field, Select, Textarea } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { disputeReasonLabels } from "@/lib/domain/categories";
import { can, type JobAction } from "@/lib/domain/job-machine";
import type { Attachment, DisputeReason, Job } from "@/lib/domain/types";
import { formatMoney } from "@/lib/format";
import { ops, run } from "@/lib/store";
import type { JobActionInput } from "@/lib/store/operations";
import { AttachmentPicker } from "./attachments";

type DialogId = "approve" | "revision" | "submit" | "dispute" | "decline" | "cancel" | "accept" | null;

/** Role-aware action buttons for a job, each guarded by the state machine. */
export function JobActions({ job, role, userId }: { job: Job; role: "client" | "freelancer"; userId: string }) {
  const toast = useToast();
  const [open, setOpen] = useState<DialogId>(null);
  const [note, setNote] = useState("");
  const [files, setFiles] = useState<Attachment[]>([]);
  const [reason, setReason] = useState<DisputeReason | "">("");
  const [error, setError] = useState<string | null>(null);

  const allowed = (a: JobAction) => can(job, a, role);
  const close = () => {
    setOpen(null);
    setNote("");
    setFiles([]);
    setReason("");
    setError(null);
  };

  function act(action: JobAction, extra: Omit<JobActionInput, "as" | "byUserId">, success: string) {
    const r = run(ops.jobAction(job.id, action, { as: role, byUserId: userId, ...extra }));
    if (!r.ok) {
      setError(r.error);
      toast.error(r.error);
      return;
    }
    close();
    toast.success(success);
  }

  const revisionsLeft = job.revisionsAllowed - job.revisionsUsed;
  const buttons: React.ReactNode[] = [];

  if (role === "client") {
    if (allowed("send_request")) buttons.push(<Button key="send" onClick={() => act("send_request", {}, "Job request sent")}><Send />Send request</Button>);
    if (allowed("initiate_payment")) buttons.push(<ButtonLink key="fund" href={`/jobs/${job.id}/pay`}>Fund job · {formatMoney(job.budget)}</ButtonLink>);
    if (allowed("approve")) buttons.push(<Button key="approve" onClick={() => setOpen("approve")}><CheckCircle2 />Approve work</Button>);
    if (job.status === "submitted") {
      buttons.push(
        <Button key="rev" variant="secondary" onClick={() => setOpen("revision")} disabled={revisionsLeft <= 0} title={revisionsLeft <= 0 ? "No revisions left" : undefined}>
          <RotateCcw />Request revision
        </Button>,
      );
    }
  } else {
    if (allowed("accept")) buttons.push(<Button key="accept" onClick={() => setOpen("accept")}>Accept job</Button>);
    if (allowed("decline")) buttons.push(<Button key="decline" variant="secondary" onClick={() => setOpen("decline")}>Decline</Button>);
    if (allowed("start_work")) buttons.push(<Button key="start" onClick={() => act("start_work", {}, "Work started")}><Play />Start work</Button>);
    if (allowed("submit_delivery")) buttons.push(<Button key="submit" onClick={() => setOpen("submit")}><Upload />{job.status === "revision_requested" ? "Submit revision" : "Submit delivery"}</Button>);
  }
  if (allowed("cancel") && job.status !== "pending_response") buttons.push(<Button key="cancel" variant="ghost" onClick={() => setOpen("cancel")}><X />Cancel job</Button>);
  if (role === "client" && job.status === "pending_response" && allowed("cancel")) buttons.push(<Button key="withdraw" variant="ghost" onClick={() => setOpen("cancel")}>Withdraw request</Button>);

  const disputable = allowed("open_dispute");

  return (
    <>
      {buttons.length > 0 && <div className="flex flex-wrap gap-2">{buttons}</div>}
      {disputable && (
        <button onClick={() => setOpen("dispute")} className="inline-flex items-center gap-1.5 self-start text-sm text-muted hover:text-danger">
          <Scale className="size-3.5" aria-hidden />
          Report a problem
        </button>
      )}

      {/* Accept */}
      <Dialog
        open={open === "accept"}
        onClose={close}
        title="Accept this job?"
        description="By accepting, you agree to deliver the scope below by the deadline."
        footer={<><Button variant="ghost" onClick={close}>Not yet</Button><Button onClick={() => act("accept", {}, "Job accepted")}>Accept job</Button></>}
      >
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-surface p-3"><dt className="text-muted">Price</dt><dd className="font-medium">{formatMoney(job.budget)}</dd></div>
          <div className="rounded-xl bg-surface p-3"><dt className="text-muted">Revisions included</dt><dd className="font-medium">{job.revisionsAllowed}</dd></div>
        </dl>
        <ul className="mt-4 flex list-disc flex-col gap-1 pl-5 text-sm text-ink-soft">
          {job.deliverables.map((d) => <li key={d.id}>{d.title}</li>)}
        </ul>
        <p className="mt-4 text-sm text-muted">Don&rsquo;t start work until the client&rsquo;s payment is confirmed. We&rsquo;ll notify you.</p>
      </Dialog>

      {/* Decline */}
      <Dialog
        open={open === "decline"}
        onClose={close}
        title="Decline this request?"
        footer={<><Button variant="ghost" onClick={close}>Keep it</Button><Button onClick={() => act("decline", { note: note.trim() || undefined }, "Request declined")}>Decline</Button></>}
      >
        <Field label="Reason" optional hint="Shared with the client.">
          {(p) => <Textarea {...p} rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. I'm fully booked until next month." />}
        </Field>
      </Dialog>

      {/* Cancel */}
      <Dialog
        open={open === "cancel"}
        onClose={close}
        title={job.status === "pending_response" ? "Withdraw this request?" : "Cancel this job?"}
        description="No payment has been made on this job, so nothing needs to be refunded."
        footer={<><Button variant="ghost" onClick={close}>Keep job</Button><Button onClick={() => act("cancel", { note: note.trim() || undefined }, "Job cancelled")}>Confirm</Button></>}
      >
        <Field label="Reason" optional>
          {(p) => <Textarea {...p} rows={2} value={note} onChange={(e) => setNote(e.target.value)} />}
        </Field>
      </Dialog>

      {/* Approve */}
      <Dialog
        open={open === "approve"}
        onClose={close}
        title="Approve this delivery?"
        description="Approving confirms the work meets what you agreed."
        footer={<><Button variant="ghost" onClick={close}>Not yet</Button><Button onClick={() => act("approve", {}, "Work approved")}><CheckCircle2 />Approve and release</Button></>}
      >
        <div className="flex flex-col gap-3 text-sm text-ink-soft">
          <p>
            Once approved, CampusHold requests the payout of <span className="font-medium text-ink">{formatMoney(job.budget)}</span> to the freelancer.
            {job.paymentStatus !== "available" && " Your payment is still settling with the provider, so the release will be requested as soon as it settles."}
          </p>
          <Alert tone="warning">You can&rsquo;t request revisions after approving. If something is wrong, request a revision instead.</Alert>
        </div>
      </Dialog>

      {/* Revision */}
      <Dialog
        open={open === "revision"}
        onClose={close}
        title="Request a revision"
        description={`${revisionsLeft} of ${job.revisionsAllowed} included revisions left.`}
        footer={<><Button variant="ghost" onClick={close}>Cancel</Button><Button onClick={() => act("request_revision", { note }, "Revision requested")}>Send request</Button></>}
      >
        <Field label="What needs to change?" error={error ?? undefined} hint="Be specific and refer to the agreed deliverables.">
          {(p) => <Textarea {...p} rows={5} value={note} onChange={(e) => setNote(e.target.value)} />}
        </Field>
      </Dialog>

      {/* Submit delivery */}
      <Dialog
        open={open === "submit"}
        onClose={close}
        title={job.status === "revision_requested" ? "Submit your revision" : "Submit your delivery"}
        description="The client will review this against the agreed deliverables."
        footer={
          <>
            <Button variant="ghost" onClick={close}>Cancel</Button>
            <Button
              onClick={() => {
                if (note.trim().length < 10) return setError("Describe what you're delivering (at least 10 characters).");
                if (files.length === 0) return setError("Attach at least one file.");
                act("submit_delivery", { submission: { note: note.trim(), files } }, "Delivery submitted");
              }}
            >
              <Upload />Submit
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="rounded-xl bg-surface p-4 text-sm">
            <p className="mb-2 font-medium">Agreed deliverables</p>
            <ul className="flex list-disc flex-col gap-1 pl-5 text-ink-soft">
              {job.deliverables.map((d) => <li key={d.id}>{d.title}</li>)}
            </ul>
          </div>
          <Field label="Delivery note">
            {(p) => <Textarea {...p} rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What's included, and anything the client should know." />}
          </Field>
          <AttachmentPicker value={files} onChange={setFiles} label="Attach delivery files" />
          {error && <Alert tone="danger">{error}</Alert>}
        </div>
      </Dialog>

      {/* Dispute */}
      <Dialog
        open={open === "dispute"}
        onClose={close}
        title="Open a dispute"
        description="An admin will review the job history, messages and deliveries. Payment stays on hold until it's resolved."
        footer={
          <>
            <Button variant="ghost" onClick={close}>Cancel</Button>
            <Button
              onClick={() => {
                if (!reason) return setError("Choose a reason.");
                if (note.trim().length < 20) return setError("Explain what happened (at least 20 characters).");
                act("open_dispute", { dispute: { reason, details: note.trim(), evidence: files } }, "Dispute opened");
              }}
            >
              Open dispute
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Alert tone="info">Try resolving it in the conversation first. Most issues are sorted with a quick message or a revision.</Alert>
          <Field label="Reason">
            {(p) => (
              <Select {...p} value={reason} onChange={(e) => setReason(e.target.value as DisputeReason)}>
                <option value="">Choose a reason</option>
                {Object.entries(disputeReasonLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </Select>
            )}
          </Field>
          <Field label="What happened?">
            {(p) => <Textarea {...p} rows={4} value={note} onChange={(e) => setNote(e.target.value)} />}
          </Field>
          <AttachmentPicker value={files} onChange={setFiles} label="Add evidence" />
          {error && <Alert tone="danger">{error}</Alert>}
        </div>
      </Dialog>
    </>
  );
}

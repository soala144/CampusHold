import { AlertCircle } from "lucide-react";
import { forwardRef, useId, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/cn";

const control =
  "w-full rounded-xl border border-line-strong bg-canvas px-3.5 text-[0.9375rem] text-ink placeholder:text-subtle transition-colors outline-none focus:border-ink focus:ring-4 focus:ring-ink/5 disabled:cursor-not-allowed disabled:bg-surface disabled:text-muted aria-[invalid=true]:border-danger aria-[invalid=true]:focus:ring-danger/10";

/** Label + control + hint/error, wired up for accessibility. */
export function Field({
  label,
  hint,
  error,
  optional,
  className,
  children,
}: {
  label: string;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  className?: string;
  children: (props: { id: string; "aria-invalid": boolean; "aria-describedby"?: string }) => ReactNode;
}) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="flex items-baseline justify-between text-sm font-medium text-ink">
        {label}
        {optional && <span className="text-xs font-normal text-subtle">Optional</span>}
      </label>
      {children({ id, "aria-invalid": Boolean(error), "aria-describedby": describedBy })}
      {error ? (
        <p id={`${id}-error`} className="flex items-center gap-1.5 text-sm text-danger">
          <AlertCircle className="size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, ComponentProps<"input">>(function Input(
  { className, ...props },
  ref,
) {
  return <input ref={ref} className={cn(control, "h-11", className)} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, ComponentProps<"textarea">>(function Textarea(
  { className, rows = 4, ...props },
  ref,
) {
  return <textarea ref={ref} rows={rows} className={cn(control, "resize-y py-3 leading-relaxed", className)} {...props} />;
});

export const Select = forwardRef<HTMLSelectElement, ComponentProps<"select">>(function Select(
  { className, children, ...props },
  ref,
) {
  return (
    <select
      ref={ref}
      className={cn(
        control,
        "h-11 appearance-none bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%235b6271' stroke-width='2' viewBox='0 0 24 24'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")] bg-[length:16px] bg-[right_0.875rem_center] bg-no-repeat pr-10",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
});

/** Input with a fixed prefix, e.g. ₦ for amounts. */
export const PrefixInput = forwardRef<HTMLInputElement, ComponentProps<"input"> & { prefix: string }>(
  function PrefixInput({ prefix, className, ...props }, ref) {
    return (
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-muted">{prefix}</span>
        <input ref={ref} className={cn(control, "h-11 pl-8 tabular-nums", className)} {...props} />
      </div>
    );
  },
);

export const Checkbox = forwardRef<HTMLInputElement, Omit<ComponentProps<"input">, "type"> & { label: ReactNode }>(
  function Checkbox({ label, className, ...props }, ref) {
    return (
      <label className={cn("flex cursor-pointer items-start gap-3 text-sm text-ink-soft", className)}>
        <input
          ref={ref}
          type="checkbox"
          className="mt-0.5 size-4 shrink-0 cursor-pointer rounded border-line-strong accent-ink"
          {...props}
        />
        <span>{label}</span>
      </label>
    );
  },
);

/** Large selectable card used for radio/checkbox choices. */
export function ChoiceCard({
  checked,
  onSelect,
  title,
  description,
  icon,
  type = "radio",
  name,
}: {
  checked: boolean;
  onSelect: () => void;
  title: string;
  description?: string;
  icon?: ReactNode;
  type?: "radio" | "checkbox";
  name: string;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-4 rounded-card border p-4 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ink",
        checked ? "border-ink bg-surface" : "border-line hover:border-line-strong",
      )}
    >
      <input type={type} name={name} checked={checked} onChange={onSelect} className="sr-only" />
      {icon && (
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl [&_svg]:size-5",
            checked ? "bg-ink text-white" : "bg-surface text-ink",
          )}
        >
          {icon}
        </span>
      )}
      <span className="flex flex-1 flex-col gap-0.5">
        <span className="font-medium tracking-tight">{title}</span>
        {description && <span className="text-sm text-muted">{description}</span>}
      </span>
      <span
        aria-hidden
        className={cn(
          "mt-1 flex size-4 shrink-0 items-center justify-center border",
          type === "radio" ? "rounded-full" : "rounded",
          checked ? "border-ink bg-ink" : "border-line-strong",
        )}
      >
        {checked && <span className={cn("size-1.5 bg-white", type === "radio" ? "rounded-full" : "rounded-[1px]")} />}
      </span>
    </label>
  );
}

/** Editable list of short text tags (skills, deliverables). */
export function TagInput({
  id,
  value,
  onChange,
  placeholder,
  invalid,
  max = 15,
}: {
  id?: string;
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  invalid?: boolean;
  max?: number;
}) {
  function add(raw: string) {
    const t = raw.trim().replace(/,$/, "");
    if (!t || value.includes(t) || value.length >= max) return;
    onChange([...value, t]);
  }
  return (
    <div
      className={cn(
        "flex min-h-11 flex-wrap items-center gap-1.5 rounded-xl border bg-canvas px-2 py-1.5 focus-within:border-ink focus-within:ring-4 focus-within:ring-ink/5",
        invalid ? "border-danger" : "border-line-strong",
      )}
    >
      {value.map((t) => (
        <span key={t} className="inline-flex items-center gap-1 rounded-lg bg-surface py-1 pr-1 pl-2.5 text-sm">
          {t}
          <button
            type="button"
            onClick={() => onChange(value.filter((x) => x !== t))}
            className="rounded px-1 text-muted hover:bg-surface-strong hover:text-ink"
            aria-label={`Remove ${t}`}
          >
            ×
          </button>
        </span>
      ))}
      <input
        id={id}
        aria-invalid={invalid}
        placeholder={value.length ? "" : placeholder}
        className="h-8 min-w-32 flex-1 bg-transparent px-1.5 text-[0.9375rem] outline-none placeholder:text-subtle"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add(e.currentTarget.value);
            e.currentTarget.value = "";
          } else if (e.key === "Backspace" && !e.currentTarget.value && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={(e) => {
          add(e.currentTarget.value);
          e.currentTarget.value = "";
        }}
      />
    </div>
  );
}

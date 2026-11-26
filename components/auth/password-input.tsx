"use client";

import { Eye, EyeOff } from "lucide-react";
import { forwardRef, useState, type ComponentProps } from "react";
import { Input } from "@/components/ui/form";

export const PasswordInput = forwardRef<HTMLInputElement, Omit<ComponentProps<"input">, "type">>(
  function PasswordInput(props, ref) {
    const [show, setShow] = useState(false);
    return (
      <div className="relative">
        <Input ref={ref} type={show ? "text" : "password"} className="pr-11" {...props} />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute inset-y-0 right-1 my-auto flex size-9 items-center justify-center rounded-lg text-muted hover:text-ink"
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    );
  },
);

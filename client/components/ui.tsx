"use client";

import { forwardRef } from "react";
import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

/* ─────────── Button ─────────── */

type BtnVariant = "primary" | "glass" | "ghost" | "outline" | "danger" | "buy";
type BtnSize = "sm" | "md" | "lg" | "icon";

const btnBase =
  "relative inline-flex min-w-0 items-center justify-center gap-2 font-medium rounded-full transition-all focus-ring disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap select-none";

const btnVariants: Record<BtnVariant, string> = {
  primary:
    "bg-white text-[hsl(var(--primary-foreground))] hover:bg-white/90 active:scale-[0.98] shadow-[0_8px_24px_-8px_rgba(255,255,255,0.25)]",
  glass:
    "liquid-glass text-foreground hover:scale-[1.03]",
  outline:
    "border border-white/15 bg-white/5 text-foreground hover:bg-white/10 backdrop-blur-md",
  ghost:
    "text-muted-foreground hover:text-foreground hover:bg-white/5",
  danger:
    "bg-[hsl(var(--danger))] text-white hover:opacity-90 active:scale-[0.98]",
  buy:
    "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-[0_10px_30px_-10px_rgba(16,185,129,0.6)] hover:from-emerald-400 hover:to-teal-400 active:scale-[0.98]",
};

const btnSizes: Record<BtnSize, string> = {
  sm: "h-8 px-4 text-xs",
  md: "h-10 px-5 text-sm",
  lg: "h-12 px-7 text-base",
  icon: "h-9 w-9",
};

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: BtnVariant;
    size?: BtnSize;
  }
>(function Button({ variant = "primary", size = "md", className, ...rest }, ref) {
  return (
    <button
      ref={ref}
      className={cx(btnBase, btnVariants[variant], btnSizes[size], className)}
      {...rest}
    />
  );
});

/* ─────────── Field bases ─────────── */

const fieldBase =
  "w-full rounded-xl border border-white/10 bg-white/5 px-3 text-foreground placeholder:text-muted-foreground/60 transition focus:outline-none focus:border-white/40 focus:bg-white/[0.07] disabled:opacity-50";

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & {
    label?: string;
    hint?: string;
    error?: string;
    leading?: React.ReactNode;
  }
>(function Input({ label, hint, error, leading, className, id, ...rest }, ref) {
  const fid = id ?? rest.name;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={fid} className="text-xs uppercase tracking-widest text-muted-foreground">
          {label}
        </label>
      )}
      <div className="relative">
        {leading && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {leading}
          </span>
        )}
        <input
          id={fid}
          ref={ref}
          className={cx(
            fieldBase,
            "h-11 text-sm",
            leading ? "pl-10" : undefined,
            error && "border-[hsl(var(--danger))]/60 focus:border-[hsl(var(--danger))]",
            className,
          )}
          {...rest}
        />
      </div>
      {hint && !error && <p className="text-xs text-muted-foreground/80">{hint}</p>}
      {error && <p className="text-xs text-[hsl(var(--danger))]">{error}</p>}
    </div>
  );
});

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & {
    label?: string;
    hint?: string;
  }
>(function Textarea({ label, hint, className, id, ...rest }, ref) {
  const fid = id ?? rest.name;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={fid} className="text-xs uppercase tracking-widest text-muted-foreground">
          {label}
        </label>
      )}
      <textarea
        id={fid}
        ref={ref}
        className={cx(fieldBase, "py-3 text-sm resize-y min-h-[96px]", className)}
        {...rest}
      />
      {hint && <p className="text-xs text-muted-foreground/80">{hint}</p>}
    </div>
  );
});

export function Select({
  label,
  className,
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs uppercase tracking-widest text-muted-foreground">{label}</label>
      )}
      <select className={cx(fieldBase, "h-11 text-sm pr-9 [&>option]:bg-[hsl(var(--background))]", className)} {...rest}>
        {children}
      </select>
    </div>
  );
}

/* ─────────── Card ─────────── */

export function Card({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cx(
        "rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md shadow-[0_8px_30px_-12px_rgba(0,0,0,0.5)]",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cx("px-6 pt-6 pb-4", className)}>{children}</div>;
}

export function CardBody({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cx("px-6 py-4", className)}>{children}</div>;
}

export function CardFooter({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cx("px-6 pt-4 pb-6 border-t border-white/10", className)}>
      {children}
    </div>
  );
}

/* ─────────── Badge ─────────── */

export function Badge({
  children,
  tone = "default",
  className,
}: {
  children: React.ReactNode;
  tone?: "default" | "accent" | "success" | "warning" | "danger" | "outline";
  className?: string;
}) {
  const tones = {
    default: "bg-white/8 text-foreground border-white/10",
    accent: "bg-white/10 text-foreground border-white/20",
    success: "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border-[hsl(var(--success))]/30",
    warning: "bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))] border-[hsl(var(--warning))]/30",
    danger: "bg-[hsl(var(--danger))]/10 text-[hsl(var(--danger))] border-[hsl(var(--danger))]/30",
    outline: "border-white/20 text-muted-foreground",
  };
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wide uppercase",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ─────────── Container ─────────── */

export function Container({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8", className)}>
      {children}
    </div>
  );
}

/* ─────────── ScoreBar ─────────── */

export function ScoreBar({
  value,
  max = 5,
  showValue = true,
}: {
  value: number;
  max?: number;
  showValue?: boolean;
}) {
  const ratio = Math.max(0, Math.min(1, value / max));
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 bg-white/8 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-white/90 to-white/50 rounded-full transition-all"
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
      {showValue && (
        <span className="font-mono text-xs tabular-nums text-foreground/80 min-w-[3rem] text-right">
          {value.toFixed(2)}
          <span className="text-muted-foreground">/{max}</span>
        </span>
      )}
    </div>
  );
}

/* ─────────── Spinner ─────────── */

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cx(
        "inline-block w-4 h-4 border-2 border-white/15 border-t-white rounded-full animate-spin",
        className,
      )}
      aria-label="loading"
    />
  );
}

/* ─────────── Skeleton ─────────── */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("skeleton rounded-md h-4", className)} />;
}

/* ─────────── EmptyState ─────────── */

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      {icon && (
        <div className="mb-4 w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-muted-foreground">
          {icon}
        </div>
      )}
      <h3
        className="text-2xl text-foreground"
        style={{ fontFamily: "'Instrument Serif', serif" }}
      >
        {title}
      </h3>
      {description && (
        <p className="mt-2 text-sm text-muted-foreground max-w-sm">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

/* ─────────── PageHeader (cinematic) ─────────── */

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-10 animate-fade-rise">
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">
            {eyebrow}
          </p>
        )}
        <h1
          className="break-words text-4xl leading-[0.98] text-foreground sm:text-5xl"
          style={{ fontFamily: "'Instrument Serif', serif" }}
        >
          {title}
        </h1>
        {description && (
          <p className="mt-3 text-muted-foreground text-sm sm:text-base max-w-2xl text-pretty">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end [&>a]:w-full [&>button]:w-full sm:[&>a]:w-auto sm:[&>button]:w-auto [&>a>button]:w-full sm:[&>a>button]:w-auto">
          {actions}
        </div>
      )}
    </div>
  );
}

/* ─────────── Avatar ─────────── */

export function Avatar({
  name,
  size = "md",
  src,
}: {
  name: string;
  size?: "sm" | "md" | "lg";
  src?: string;
}) {
  const sizes = {
    sm: "w-7 h-7 text-xs",
    md: "w-9 h-9 text-sm",
    lg: "w-12 h-12 text-base",
  };
  const initials = name
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        className={cx("rounded-full object-cover ring-1 ring-white/10", sizes[size])}
      />
    );
  }
  return (
    <span
      className={cx(
        "inline-flex items-center justify-center rounded-full bg-white/10 text-foreground font-medium ring-1 ring-white/15",
        sizes[size],
      )}
    >
      {initials || "?"}
    </span>
  );
}

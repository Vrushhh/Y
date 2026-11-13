"use client";
import { forwardRef, useEffect, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, X } from "lucide-react";
import clsx from "clsx";

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "soft" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, BtnProps>(function Button(
  { variant = "primary", size = "md", loading, className, children, disabled, ...rest },
  ref
) {
  return (
    <motion.button
      ref={ref}
      disabled={disabled || loading}
      whileTap={disabled || loading ? undefined : { scale: 0.98 }}
      transition={{ duration: 0.14 }}
      className={clsx(
        "relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blush/70 focus-visible:ring-offset-2 focus-visible:ring-offset-midnight disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" && "h-9 px-4 text-sm",
        size === "md" && "h-11 px-5 text-sm",
        size === "lg" && "h-13 px-7 py-3.5 text-base",
        variant === "primary" &&
          "bg-gradient-to-r from-blush via-rose-300 to-lilac text-midnight font-bold shadow-glow hover:brightness-105 active:brightness-95",
        variant === "soft" &&
          "border border-lilac/25 bg-cloud/10 text-cloud hover:bg-cloud/15 hover:border-lilac/40 shadow-soft",
        variant === "ghost" && "text-lilac hover:bg-cloud/10 hover:text-cloud",
        variant === "danger" &&
          "border border-blush/30 bg-[#5a2340]/40 text-blush hover:bg-[#5a2340]/70",
        className
      )}
      {...(rest as any)}
    >
      {/* Subtle light sweep on primary button */}
      {variant === "primary" && (
        <span
          className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-1000 group-hover:translate-x-full"
          aria-hidden="true"
        />
      )}
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </motion.button>
  );
});

export function Card({
  className,
  children,
  as: Tag = "div",
  interactive = true,
  ...rest
}: {
  className?: string;
  children: ReactNode;
  as?: "div" | "section" | "article";
  interactive?: boolean;
} & Record<string, unknown>) {
  return (
    <Tag
      className={clsx(
        "glass rounded-card p-5",
        interactive && "hover:border-blush/35 hover:shadow-glow motion-safe:hover:-translate-y-0.5",
        className
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center safe-modal-x sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="absolute inset-0 bg-midnight/80" onClick={onClose} aria-hidden />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={clsx(
              "glass-strong relative max-h-[92dvh] w-full overflow-y-auto overscroll-contain rounded-t-[28px] p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:p-6 sm:rounded-[24px] shadow-2xl border border-lilac/25",
              wide ? "sm:max-w-3xl" : "sm:max-w-lg"
            )}
            initial={{ y: 12, opacity: 0, scale: 0.99 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 8, opacity: 0, scale: 0.99 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-lilac/30 sm:hidden" aria-hidden />
            <div className="mb-5 flex items-start justify-between gap-4">
              <h2 className="font-display text-2xl text-cloud font-medium">{title}</h2>
              <IconButton label="Close" onClick={onClose}>
                <X className="h-5 w-5" />
              </IconButton>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm text-lilac font-medium">{label}</span>
      {children}
      {hint && <span className="block text-xs text-lilac/60">{hint}</span>}
    </label>
  );
}

const inputCls =
  "w-full rounded-2xl border border-lilac/20 bg-midnight/60 px-4 py-3 text-[16px] text-cloud placeholder:text-lilac/40 transition-all duration-200 focus:border-blush focus:outline-none focus:ring-4 focus:ring-blush/15";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...p },
  ref
) {
  return <input ref={ref} className={clsx(inputCls, className)} {...p} />;
});

export function TextArea({ className, ...p }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={clsx(inputCls, "min-h-[120px] resize-y", className)} {...p} />;
}

export function Select({ className, children, ...p }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={clsx(inputCls, "appearance-none cursor-pointer", className)} {...p}>
      {children}
    </select>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="break-words font-display text-4xl font-medium leading-tight text-cloud sm:text-5xl">{title}</h1>
        {subtitle && <p className="mt-2 max-w-xl text-lilac leading-relaxed">{subtitle}</p>}
      </div>
      {action && <div className="flex shrink-0 flex-wrap gap-2">{action}</div>}
    </header>
  );
}

export function EmptyState({ icon, title, body, action }: { icon?: ReactNode; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="glass flex flex-col items-center rounded-card px-6 py-12 text-center border border-lilac/15">
      {icon && <div className="mb-4 text-blush">{icon}</div>}
      <h3 className="font-display text-2xl text-cloud">{title}</h3>
      {body && <p className="mt-2 max-w-sm text-sm text-lilac leading-relaxed">{body}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-lilac" role="status">
      <span className="relative flex h-3 w-3">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blush/60" />
        <span className="relative inline-flex h-3 w-3 rounded-full bg-blush" />
      </span>
      <span className="text-sm font-medium">{label}…</span>
    </div>
  );
}

export function DemoBadge({ show }: { show?: boolean }) {
  if (!show) return null;
  return <span className="rounded-full border border-cream/30 bg-cream/10 px-2 py-0.5 text-[11px] text-cream">Demo</span>;
}

export function IconButton({
  label,
  children,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <motion.button
      whileHover={{ scale: 1.15 }}
      whileTap={{ scale: 0.88 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      aria-label={label}
      title={label}
      className={clsx(
        "rounded-full p-2 text-lilac transition-colors hover:bg-cloud/10 hover:text-cloud focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blush/70",
        className
      )}
      {...(rest as any)}
    >
      {children}
    </motion.button>
  );
}

export function ErrorNote({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p className="rounded-2xl border border-blush/30 bg-[#5a2340]/30 px-4 py-3 text-sm text-blush" role="alert">
      {message}
    </p>
  );
}

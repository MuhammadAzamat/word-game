"use client";
import { X } from "lucide-react";
import { useEffect } from "react";

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div className="card max-h-[90dvh] w-full max-w-lg overflow-y-auto p-6 animate-rise" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={title}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">{title}</h2>
          <button className="btn-ghost size-9 p-0" onClick={onClose} aria-label="Close">
            <X className="size-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ConfirmButton({
  onConfirm,
  children,
  message = "Are you sure?",
  className = "btn-ghost",
  label,
}: {
  onConfirm: () => void;
  children: React.ReactNode;
  message?: string;
  className?: string;
  label?: string;
}) {
  return (
    <button type="button" className={className} aria-label={label} title={label} onClick={() => window.confirm(message) && onConfirm()}>
      {children}
    </button>
  );
}

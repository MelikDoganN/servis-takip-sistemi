"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./Button";

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  widthClassName?: string;
}

/** Sağdan açılan hafif panel — Modal yerine detay görünümü için. */
export function Drawer({
  isOpen,
  onClose,
  title,
  children,
  footer,
  widthClassName = "max-w-md",
}: DrawerProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Paneli kapat"
        className="absolute inset-0 bg-navy-deep/40 backdrop-blur-[2px] animate-fade-in"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative z-10 flex h-full w-full flex-col border-l border-slate-200 bg-white shadow-elevated animate-slide-in-right",
          widthClassName
        )}
      >
        {title && (
          <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-3.5">
            <h2 className="text-base font-semibold tracking-tight text-navy">{title}</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              aria-label="Kapat"
              className="!h-8 !w-8 !px-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer && (
          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-100 px-5 py-3.5">
            {footer}
          </div>
        )}
      </aside>
    </div>
  );
}

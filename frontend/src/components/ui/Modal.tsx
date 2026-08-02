"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./Button";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
  footer?: React.ReactNode;
}

const sizeStyles = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
};

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  footer,
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

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
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy-deep/40 p-4 backdrop-blur-[2px] animate-fade-in"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div
        className={cn(
          "flex max-h-[min(90vh,800px)] w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-elevated animate-scale-in",
          sizeStyles[size]
        )}
        role="dialog"
        aria-modal="true"
      >
        {title && (
          <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-3.5 sm:px-6">
            <h2 className="text-base font-semibold tracking-tight text-navy">
              {title}
            </h2>
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
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer && (
          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-100 px-5 py-3.5 sm:px-6">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { X } from 'lucide-react';
import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';

import { Button } from './button';

/**
 * Modal dialog built on the native `<dialog>` element, which gives us a focus
 * trap, Escape-to-close and inert background content for free.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  confirmLabel,
  cancelLabel,
  onConfirm,
  tone = 'neutral',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  /** Adds a confirm/cancel footer when provided. */
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  tone?: 'neutral' | 'danger';
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const element = dialogRef.current;
    if (!element) return;

    if (open && !element.open) {
      element.showModal();
    } else if (!open && element.open) {
      element.close();
    }
  }, [open]);

  useEffect(() => {
    const element = dialogRef.current;
    if (!element) return;

    const handleCancel = (event: Event) => {
      event.preventDefault(); // keep control in React
      onClose();
    };

    element.addEventListener('cancel', handleCancel);
    return () => element.removeEventListener('cancel', handleCancel);
  }, [onClose]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
      aria-labelledby={titleId}
      className="border-line bg-ivory text-ink backdrop:bg-ink/45 m-auto w-[calc(100vw-2rem)] max-w-md rounded-[2px] border p-0 shadow-[var(--shadow-lift)] backdrop:backdrop-blur-[2px]"
    >
      <div className="border-line flex items-start justify-between gap-6 border-b px-6 py-5">
        <div>
          <h2 id={titleId} className="font-serif text-[1.375rem] leading-snug">
            {title}
          </h2>
          {description ? (
            <p className="text-ink-soft mt-2 text-[0.9375rem] leading-relaxed">{description}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="text-ink-muted hover:bg-cream hover:text-ink -mt-1 -mr-1 grid size-9 shrink-0 place-items-center rounded-[2px] transition-colors"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      {children ? <div className="px-6 py-5">{children}</div> : null}

      {confirmLabel ? (
        <div className="border-line flex flex-col-reverse gap-3 border-t px-6 py-5 sm:flex-row sm:justify-end">
          <Button variant="outline" size="md" onClick={onClose} type="button">
            {cancelLabel ?? 'Cancel'}
          </Button>
          <Button
            variant={tone === 'danger' ? 'accent' : 'primary'}
            size="md"
            onClick={onConfirm}
            type="button"
          >
            {confirmLabel}
          </Button>
        </div>
      ) : null}
    </dialog>
  );
}

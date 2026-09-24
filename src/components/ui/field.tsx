'use client';

import { useId } from 'react';
import type { ReactNode, TextareaHTMLAttributes, InputHTMLAttributes } from 'react';

/**
 * Form primitives with accessible labelling baked in: every control gets a
 * visible label, `aria-describedby` for hints/errors and `aria-invalid` when it
 * fails validation. Errors are announced politely by screen readers.
 */

interface FieldShellProps {
  label: string;
  error?: string | undefined;
  hint?: ReactNode;
  optional?: boolean;
  htmlFor: string;
  errorId?: string;
  hintId?: string;
  children: ReactNode;
}

function FieldShell({
  label,
  error,
  hint,
  optional,
  htmlFor,
  errorId,
  hintId,
  children,
}: FieldShellProps) {
  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={htmlFor}
        className="text-ink-soft flex items-baseline justify-between gap-3 font-sans text-[0.8125rem] font-medium tracking-[0.06em] uppercase"
      >
        <span>{label}</span>
        {optional ? (
          <span className="text-ink-muted text-[0.6875rem] tracking-[0.08em] lowercase">
            optional
          </span>
        ) : null}
      </label>
      {children}
      {hint && !error ? (
        <p id={hintId} className="text-ink-muted text-[0.8125rem]">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-danger text-[0.8125rem]">
          {error}
        </p>
      ) : null}
    </div>
  );
}

const controlClasses =
  'w-full rounded-[2px] border bg-ivory px-4 py-3 font-sans text-[0.9375rem] text-ink placeholder:text-ink-muted/70 transition-colors duration-200 h-12 focus:outline-none focus-visible:outline-none';

function stateClasses(error?: string) {
  return error
    ? 'border-danger focus:border-danger'
    : 'border-line-strong hover:border-ink-muted focus:border-accent';
}

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string;
  error?: string | undefined;
  hint?: ReactNode;
  optional?: boolean;
}

export function TextField({
  label,
  error,
  hint,
  optional,
  className = '',
  ...props
}: TextFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  return (
    <FieldShell
      label={label}
      error={error}
      hint={hint}
      optional={optional}
      htmlFor={id}
      errorId={errorId}
      hintId={hintId}
    >
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        className={`${controlClasses} ${stateClasses(error)} ${className}`}
        {...props}
      />
    </FieldShell>
  );
}

export interface TextAreaFieldProps extends Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  'id'
> {
  label: string;
  error?: string | undefined;
  hint?: ReactNode;
  optional?: boolean;
}

export function TextAreaField({
  label,
  error,
  hint,
  optional,
  className = '',
  rows = 4,
  ...props
}: TextAreaFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  return (
    <FieldShell
      label={label}
      error={error}
      hint={hint}
      optional={optional}
      htmlFor={id}
      errorId={errorId}
      hintId={hintId}
    >
      <textarea
        id={id}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        className={`${controlClasses} h-auto resize-y leading-relaxed ${stateClasses(error)} ${className}`}
        {...props}
      />
    </FieldShell>
  );
}

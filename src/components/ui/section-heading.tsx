import type { ReactNode } from 'react';

export function SectionHeading({
  eyebrow,
  title,
  intro,
  align = 'left',
  as: Tag = 'h2',
  children,
}: {
  eyebrow?: string;
  title: ReactNode;
  intro?: ReactNode;
  align?: 'left' | 'center';
  as?: 'h1' | 'h2' | 'h3';
  children?: ReactNode;
}) {
  return (
    <div className={align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
      {eyebrow ? <p className="text-eyebrow mb-4">{eyebrow}</p> : null}
      <Tag className="font-serif text-[2rem] leading-[1.15] tracking-[-0.015em] sm:text-[2.5rem] lg:text-[2.75rem]">
        {title}
      </Tag>
      {intro ? <p className="text-ink-soft mt-5 max-w-xl text-[1.0625rem]">{intro}</p> : null}
      {children}
    </div>
  );
}

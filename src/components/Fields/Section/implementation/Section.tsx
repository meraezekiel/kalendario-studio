'use client';

interface Props {
  title: string;
  open?: boolean;
  children: React.ReactNode;
}

/** Collapsible inspector section. */
export default function Section({ title, open = true, children }: Props) {
  return (
    <details className="isec" open={open}>
      <summary>{title}</summary>
      <div className="ib">{children}</div>
    </details>
  );
}

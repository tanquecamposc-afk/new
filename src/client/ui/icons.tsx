/**
 * Inline icons for the inventory: original silhouettes drawn as SVG paths (no icon font, no
 * image files). Each one mirrors the in-world model of the same item.
 */
import type { ReactNode } from 'react';

const SHAPES: Readonly<Record<string, ReactNode>> = {
  starter_ar: (
    <>
      <path d="M2 11h13l1-2h9v3h5v2h-5v1h-7l-1 2h-3l-1 4h-3l1-6H6l-2 4H2z" />
      <rect x="26" y="9" width="4" height="1.4" />
    </>
  ),
  starter_smg: (
    <>
      <path d="M5 10h15v2h6v2h-6v1h-6v7h-3v-7h-2l-1 4H5l1-5H5z" />
    </>
  ),
  starter_shotgun: (
    <>
      <path d="M2 12h9l1-2h18v2.4H18v1.2h10V16H13l-1 1H9l-2 4H3l2-6H2z" />
    </>
  ),
  starter_sniper: (
    <>
      <path d="M1 13h9l1-1h7v-1h12v1.6H19v1.4h-5l-1 2h-2l-1 4H7l1-5H4l-1 2H1z" />
      <rect x="11" y="7.4" width="9" height="2.6" rx="1.2" />
      <rect x="13" y="9.6" width="1.4" height="2" />
      <rect x="17" y="9.6" width="1.4" height="2" />
    </>
  ),
  starter_pistol: (
    <>
      <path d="M8 10h16v4h-9l-1 2h-2l-1 6H7l1-7H8z" />
    </>
  ),
  shield_cell: <path d="M16 5l8 4.5v9L16 23l-8-4.5v-9zM16 9l-4.5 2.5v5L16 19l4.5-2.5v-5z" fillRule="evenodd" />,
  shield_battery: (
    <>
      <path d="M11 7h10v17H11zM13.5 4h5v3h-5z" />
      <path d="M17 10l-4 6h3l-1 5 4-6h-3z" fill="var(--ink)" />
    </>
  ),
  bandage: (
    <>
      <path d="M6 12a6 6 0 0112 0v8a6 6 0 01-12 0z" />
      <path d="M18 12h8v8h-8z" opacity="0.75" />
      <path d="M21 14.5h2v1.5h1.5v2H23v1.5h-2V18h-1.5v-2H21z" fill="var(--ink)" />
    </>
  ),
  medkit: (
    <>
      <path d="M5 10h22v13H5zM12 6h8v4h-8z" />
      <path d="M14.5 12.5h3V15H20v3h-2.5v2.5h-3V18H12v-3h2.5z" fill="var(--ink)" />
    </>
  ),
};

/** Icon of a weapon or consumable by id; an empty frame when the id is unknown. */
export function ItemIcon({ id, className }: { id: string | null; className?: string }) {
  const shape = id !== null ? SHAPES[id] : undefined;
  return (
    <svg viewBox="0 0 32 28" className={className} aria-hidden="true" focusable="false">
      {shape ?? null}
    </svg>
  );
}

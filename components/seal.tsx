/**
 * 朱文方印 — 牧之.
 * The only signature motif of the brand. Used in footer, at the end of
 * long content, and as favicon. Never as a nav chip. See BRAND.md §4.3.
 *
 * Skeleton: red square with 牧之 set in white serif. When a real 篆刻 or
 * hand-written 牧之 is available, swap the <text> for the path — the
 * surrounding system stays unchanged.
 */
export function Seal({
  size = 40,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label="牧之印"
      className={className}
    >
      <rect
        x="4"
        y="4"
        width="92"
        height="92"
        rx="2"
        fill="var(--color-accent-strong)"
      />
      {/* 朱文方印：两字竖排，传统印章读法上→下。 */}
      <text
        x="50"
        y="42"
        textAnchor="middle"
        fontSize="34"
        fontWeight="700"
        fill="var(--color-accent-ink)"
        fontFamily="var(--font-serif), serif"
      >
        牧
      </text>
      <text
        x="50"
        y="80"
        textAnchor="middle"
        fontSize="34"
        fontWeight="700"
        fill="var(--color-accent-ink)"
        fontFamily="var(--font-serif), serif"
      >
        之
      </text>
    </svg>
  );
}

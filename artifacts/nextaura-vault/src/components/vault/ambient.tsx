import { DIVISION_ORDER, DIVISIONS } from '@/lib/brand';
import type { Division } from '@workspace/api-client-react';

/** Four stacked light fields; only the active one is visible, crossfaded by opacity. Low-intensity so text contrast holds. */
export function Ambient({ division }: { division: Division }) {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-background">
      {DIVISION_ORDER.map((id) => {
        const d = DIVISIONS[id];
        const on = id === division;
        return (
          <div key={id} className="absolute inset-0 transition-opacity duration-[1400ms] ease-out" style={{ opacity: on ? 1 : 0 }}>
            <div className="absolute -left-[10%] -top-[25%] h-[75vh] w-[70vw] rounded-full opacity-[0.16]" style={{ background: `radial-gradient(closest-side, hsl(${d.hsl}), transparent)`, animation: 'drift 26s ease-in-out infinite' }} />
            <div className="absolute -bottom-[30%] -right-[10%] h-[70vh] w-[65vw] rounded-full opacity-[0.12]" style={{ background: `radial-gradient(closest-side, hsl(${d.hsl2}), transparent)`, animation: 'drift 32s ease-in-out infinite reverse' }} />
          </div>
        );
      })}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,hsl(var(--background)/0.7))]" />
    </div>
  );
}

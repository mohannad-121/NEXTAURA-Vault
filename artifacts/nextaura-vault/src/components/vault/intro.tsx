import { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { DIVISIONS } from '@/lib/brand';
import { DivisionLogo } from './logos';
import type { Division } from '@workspace/api-client-react';

const SAT: { id: Division; x: string; y: string; delay: number }[] = [
  { id: 'ai', x: 'calc(50% - var(--r))', y: 'calc(50% - var(--r) * 0.35)', delay: 1.35 },
  { id: 'studios', x: 'calc(50% + var(--r))', y: 'calc(50% - var(--r) * 0.35)', delay: 1.55 },
  { id: 'os', x: '50%', y: 'calc(50% + var(--r) * 0.95)', delay: 1.75 },
];
const LINES: [number, number][] = [[-1, -0.35], [1, -0.35], [0, 0.95]];

/** ~4.5s sequence. Overlay dissolves (opacity only) over the already-mounted dashboard: no cuts, no blank frames. */
export function Intro({ onDone }: { onDone: () => void }) {
  const reduce = useReducedMotion();
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    const t = setTimeout(() => done.current(), reduce ? 1800 : 4500);
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape' || e.key === 'Enter') done.current(); };
    window.addEventListener('keydown', k);
    return () => { clearTimeout(t); window.removeEventListener('keydown', k); };
  }, [reduce]);

  const dur = reduce ? 0.2 : 1;
  return (
    <motion.div
      className="fixed inset-0 z-[100] overflow-hidden bg-[#050403]"
      style={{ ['--r' as string]: 'min(30vw, 170px)' }}
      initial={{ opacity: 1 }}
      animate={{ opacity: [1, 1, 0] }}
      transition={{ duration: reduce ? 1.8 : 4.5, times: [0, reduce ? 0.6 : 0.8, 1], ease: 'easeInOut' }}
      data-testid="intro-overlay"
    >
      <motion.div className="absolute left-1/2 top-1/2 h-[90vmin] w-[90vmin] -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: 'radial-gradient(closest-side, hsl(43 62% 58% / .28), hsl(36 70% 38% / .10) 55%, transparent)' }} initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 2 * dur, ease: 'easeOut' }} />
      {!reduce && SAT.map((s) => (
        <motion.div key={s.id} className="absolute h-[70vmin] w-[70vmin] -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ left: s.x, top: s.y, background: `radial-gradient(closest-side, hsl(${DIVISIONS[s.id].hsl} / .16), transparent)` }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: s.delay, duration: 1.4 }} />
      ))}
      {!reduce && (
        <svg className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" width="600" height="500" viewBox="-300 -250 600 500" style={{ maxWidth: '100vw' }}>
          {LINES.map(([x, y], i) => (
            <motion.line key={i} x1="0" y1="0" x2={x * 170} y2={y * 170} stroke={`hsl(${DIVISIONS[SAT[i].id].hsl} / .55)`} strokeWidth="1" initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: [0, 1, 0.35] }} transition={{ delay: 2.4 + i * 0.12, duration: 1 }} />
          ))}
        </svg>
      )}
      <motion.div className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: '50%', top: '50%' }} initial={{ opacity: 0, scale: 0.86 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: reduce ? 0 : 0.5, duration: 1.4 * dur, ease: [0.22, 1, 0.36, 1] }}>
        <div className="relative">
          <DivisionLogo division="agency" size={190} />
          {!reduce && <div className="absolute inset-0 overflow-hidden"><div className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/25 to-transparent" style={{ animation: 'sweep 1.6s ease-in-out 1.1s 1 both' }} /></div>}
        </div>
      </motion.div>
      {SAT.map((s) => (
        <motion.div key={s.id} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: s.x, top: s.y }} initial={{ opacity: 0, scale: 0.9, y: 14 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ delay: reduce ? 0.3 : s.delay, duration: 1.1 * dur, ease: [0.22, 1, 0.36, 1] }}>
          <DivisionLogo division={s.id} size={110} />
        </motion.div>
      ))}
      <motion.div className="absolute inset-x-0 bottom-[9%] px-6 text-center" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reduce ? 0.4 : 2.7, duration: 1 * dur }}>
        <h1 className="font-display text-[clamp(1.6rem,5vw,3rem)] uppercase tracking-[0.4em] text-[#f1e7d3]">NEXTAURA VAULT</h1>
        <p className="mt-3 text-[clamp(.7rem,1.6vw,.9rem)] uppercase tracking-[0.3em] text-[#b9a77f]">One Ecosystem. One Secure Command Center.</p>
      </motion.div>
      <button type="button" onClick={onDone} data-testid="button-skip-intro" className="absolute right-5 top-5 rounded-full border border-white/15 px-4 py-1.5 text-xs uppercase tracking-[0.22em] text-white/60 transition hover:border-white/40 hover:text-white">Skip</button>
    </motion.div>
  );
}

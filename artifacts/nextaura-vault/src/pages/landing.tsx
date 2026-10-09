import { Link, Redirect } from 'wouter';
import { motion } from 'framer-motion';
import { ArrowRight, Clock, Fingerprint, KeyRound, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/components/auth/provider';
import { DIVISIONS, DIVISION_ORDER } from '@/lib/brand';
import { Ambient } from '@/components/vault/ambient';
import { DivisionLogo } from '@/components/vault/logos';
import { Button } from '@/components/ui/button';

const fade = (d = 0) => ({ initial: { opacity: 0, y: 22 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: '-60px' }, transition: { duration: 0.9, delay: d, ease: [0.22, 1, 0.36, 1] as const } });

const PRINCIPLES = [
  { icon: Fingerprint, t: 'Two founders. Nobody else.', b: 'Access is bound to the identities of Mohannad and Moayad. Every other account is refused at the server.' },
  { icon: ShieldCheck, t: 'Authenticator, always', b: 'Enrollment and a verified second factor are required before a single credential is listed.' },
  { icon: KeyRound, t: 'Secrets stay sealed', b: 'Passwords are encrypted on the server and only returned on an explicit reveal, then wiped from view after twenty seconds.' },
  { icon: Clock, t: 'Locks itself', b: 'Fifteen idle minutes ends the session. Sensitive actions ask for a fresh second factor every five.' },
];

function Landing() {
  return (
    <div className="grain relative min-h-[100dvh] overflow-x-hidden">
      <Ambient division="agency" />
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6">
        <span className="font-display text-sm uppercase tracking-[0.38em]">NextAura <span className="brand-text">Vault</span></span>
        <Button asChild variant="outline" size="sm"><Link href="/sign-in" data-testid="link-header-signin">Sign in</Link></Button>
      </header>

      <section className="relative mx-auto flex min-h-[82dvh] max-w-6xl flex-col items-center justify-center px-5 text-center">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.8, ease: [0.22, 1, 0.36, 1] }} className="relative">
          <div className="absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-40 blur-3xl" style={{ background: 'radial-gradient(closest-side, hsl(43 62% 58% / .5), transparent)' }} />
          <DivisionLogo division="agency" size={230} className="relative" />
        </motion.div>
        <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 1 }} className="font-display mt-2 text-[clamp(2.4rem,8vw,5.6rem)] uppercase leading-none tracking-[0.22em]">NEXTAURA VAULT</motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9, duration: 1 }} className="mt-5 text-sm uppercase tracking-[0.34em] text-[#b9a77f]">Private Access. Complete Control.</motion.p>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2, duration: 0.9 }} className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
          <Button asChild size="lg" className="group h-12 gap-2 px-8 text-[15px]"><Link href="/sign-in" data-testid="link-enter-vault">Enter the vault<ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></Link></Button>
          <span className="px-4 py-2 text-sm text-muted-foreground" data-testid="text-founders-only">Provisioned founders only</span>
        </motion.div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-24">
        <motion.p {...fade()} className="text-center text-[11px] uppercase tracking-[0.35em] brand-text">One ecosystem</motion.p>
        <motion.h2 {...fade(0.05)} className="font-display mx-auto mt-3 max-w-2xl text-center text-4xl sm:text-5xl">Four houses. A single command center.</motion.h2>
        <div className="mt-14 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {DIVISION_ORDER.map((d, i) => (
            <motion.div key={d} {...fade(i * 0.08)} className="relative overflow-hidden rounded-3xl border p-5 text-center" style={{ borderColor: `hsl(${DIVISIONS[d].hsl} / .28)`, background: `radial-gradient(120% 90% at 50% 0%, hsl(${DIVISIONS[d].hsl} / .14), hsl(var(--card)/.6) 70%)` }}>
              <DivisionLogo division={d} size={132} className="mx-auto" />
              <p className="mt-2 font-display text-xl">{DIVISIONS[d].name}</p>
              <p className="mt-1 text-xs text-muted-foreground">{DIVISIONS[d].mood}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-28">
        <div className="hairline mb-16" />
        <div className="grid gap-x-12 gap-y-10 md:grid-cols-2">
          {PRINCIPLES.map((p, i) => (
            <motion.div key={p.t} {...fade(i * 0.06)} className="flex gap-5">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border brand-border bg-[hsl(var(--brand)/.08)]"><p.icon className="h-5 w-5 brand-text" /></span>
              <div><h3 className="font-display text-2xl">{p.t}</h3><p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{p.b}</p></div>
            </motion.div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border/60 py-10 text-center">
        <DivisionLogo division="agency" size={64} className="mx-auto opacity-80" />
        <p className="mt-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">One Ecosystem. One Secure Command Center.</p>
      </footer>
    </div>
  );
}

export default function Home() {
  const { loading, session } = useAuth();
  if (!loading && session) return <Redirect to="/dashboard" />;
  return <Landing />;
}

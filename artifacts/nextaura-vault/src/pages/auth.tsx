import { Link } from 'wouter';
import { SignIn, SignUp } from '@clerk/react';
import { ArrowLeft } from 'lucide-react';
import { basePath } from '@/lib/brand';
import { clerkAppearance } from '@/lib/clerk';
import { Ambient } from '@/components/vault/ambient';

function Shell({ children, line }: { children: React.ReactNode; line: string }) {
  return (
    <div className="grain relative flex min-h-[100dvh] flex-col items-center justify-center px-4 py-10">
      <Ambient division="agency" />
      <Link href="/" className="absolute left-5 top-5 flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-muted-foreground transition hover:text-foreground" data-testid="link-back-home"><ArrowLeft className="h-4 w-4" />Back</Link>
      <p className="mb-5 text-[11px] uppercase tracking-[0.35em] text-[#b9a77f]">{line}</p>
      {children}
      <p className="mt-6 max-w-sm text-center text-xs text-muted-foreground">A verified authenticator is mandatory. Accounts not bound to a NextAura founder are denied.</p>
    </div>
  );
}

export function SignInPage() {
  return <Shell line="Private Access. Complete Control."><SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} appearance={clerkAppearance} /></Shell>;
}
export function SignUpPage() {
  return <Shell line="Founder account registration"><SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} appearance={clerkAppearance} /></Shell>;
}

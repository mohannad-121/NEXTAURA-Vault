import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { TotpChallenge } from './totp';

type Resolver = { resolve: () => void; reject: (error: Error) => void };
type MfaContextValue = { requestVerification: () => Promise<void> };

const MfaContext = createContext<MfaContextValue | null>(null);

export function MfaReverificationProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const resolver = useRef<Resolver | null>(null);

  const requestVerification = useCallback(() => {
    if (resolver.current) return Promise.reject(new Error('Authenticator verification is already in progress.'));
    setOpen(true);
    return new Promise<void>((resolve, reject) => { resolver.current = { resolve, reject }; });
  }, []);

  const cancel = useCallback(() => {
    resolver.current?.reject(new Error('Authenticator verification was cancelled.'));
    resolver.current = null;
    setOpen(false);
  }, []);

  const complete = useCallback(() => {
    resolver.current?.resolve();
    resolver.current = null;
    setOpen(false);
  }, []);

  return (
    <MfaContext.Provider value={{ requestVerification }}>
      {children}
      <Dialog open={open} onOpenChange={(next) => { if (!next) cancel(); }}>
        <DialogContent className="glass max-w-md rounded-3xl p-7">
          <DialogTitle className="font-display text-3xl">Verify sensitive action</DialogTitle>
          <DialogDescription>Enter a fresh code from your authenticator to continue.</DialogDescription>
          <TotpChallenge onComplete={complete} />
          <Button type="button" variant="ghost" onClick={cancel}>Cancel</Button>
        </DialogContent>
      </Dialog>
    </MfaContext.Provider>
  );
}

export function useMfaReverification() {
  const value = useContext(MfaContext);
  if (!value) throw new Error('useMfaReverification must be used inside MfaReverificationProvider');
  return value.requestVerification;
}

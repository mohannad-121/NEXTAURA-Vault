import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Redirect, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { ErrorBoundary } from '@/components/error-boundary';
import { AuthProvider, useAuth } from '@/components/auth/provider';
import { MfaReverificationProvider } from '@/components/auth/mfa-reverification';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { VaultGate } from '@/components/vault/gate';
import { DivisionLogo } from '@/components/vault/logos';
import NotFound from '@/pages/not-found';
import Home from '@/pages/landing';
import { SignInPage } from '@/pages/auth';
import Dashboard from '@/pages/dashboard';
import VaultPage from '@/pages/vault';
import Favorites from '@/pages/favorites';
import Platforms from '@/pages/platforms';
import ActivityPage from '@/pages/activity';
import SettingsPage from '@/pages/settings';

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 15_000, refetchOnWindowFocus: false, gcTime: 120_000 } } });

function AuthLoading() {
  return (
    <div className="grain grid min-h-[100dvh] place-items-center">
      <DivisionLogo division="agency" size={100} className="animate-pulse" />
    </div>
  );
}

function PrivateApp() {
  const [location] = useLocation();
  const { loading, session } = useAuth();
  if (loading) return <AuthLoading />;
  if (!session) return <Redirect to="/sign-in" />;
  return (
    <VaultGate>
      {() => (
        <ErrorBoundary resetKey={location}>
          <Switch>
            <Route path="/dashboard" component={Dashboard} />
            <Route path="/vault/:division" component={VaultPage} />
            <Route path="/favorites" component={Favorites} />
            <Route path="/platforms" component={Platforms} />
            <Route path="/activity" component={ActivityPage} />
            <Route path="/settings" component={SettingsPage} />
            <Route component={NotFound} />
          </Switch>
        </ErrorBoundary>
      )}
    </VaultGate>
  );
}

function Routes() {
  return (
    <TooltipProvider>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/sign-in/*?" component={SignInPage} />
        <Route path="/sign-up/*?">{() => <Redirect to="/sign-in" />}</Route>
        <Route component={PrivateApp} />
      </Switch>
      <Toaster />
    </TooltipProvider>
  );
}

export default function App() {
  return (
    <WouterRouter base={basePath}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <MfaReverificationProvider>
            <Routes />
          </MfaReverificationProvider>
        </AuthProvider>
      </QueryClientProvider>
    </WouterRouter>
  );
}

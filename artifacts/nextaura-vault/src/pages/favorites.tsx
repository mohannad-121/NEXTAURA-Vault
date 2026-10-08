import { Star } from 'lucide-react';
import { Link } from 'wouter';
import { useGetPlatforms, useListCredentials } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { CredentialCard } from '@/components/vault/credential-card';
import { CardSkeletons, EmptyState, ErrorState, PageHeader } from '@/components/vault/states';

export default function Favorites() {
  const { data, isLoading, isError, refetch } = useListCredentials({ favorites: true });
  const { data: platforms } = useGetPlatforms();
  return (
    <div>
      <PageHeader eyebrow="Personal shortcuts" title="Favorites">Your starred accounts across every division. Favorites are personal: your co-founder keeps their own.</PageHeader>
      {isLoading ? <CardSkeletons n={3} /> : isError ? <ErrorState onRetry={() => void refetch()} /> : !data?.length ? (
        <EmptyState title="Nothing starred" body="Open any division vault and press the star on an account to pin it here." action={<Button asChild variant="outline"><Link href="/dashboard" data-testid="link-to-dashboard"><Star className="mr-2 h-4 w-4" />Browse divisions</Link></Button>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{data.map((c, i) => <CredentialCard key={c.id} c={c} platforms={platforms} index={i} />)}</div>
      )}
    </div>
  );
}

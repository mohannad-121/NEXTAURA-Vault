import type { Credential, Division } from '@workspace/api-client-react';

export type DivisionFilter = 'all' | Division;

export function filterCredentials(credentials: Credential[], search: string, division: DivisionFilter): Credential[] {
  const query = search.trim().toLocaleLowerCase();
  return credentials.filter((credential) => {
    if (division !== 'all' && credential.division !== division) return false;
    if (!query) return true;
    return [credential.platform, credential.username, credential.accountName]
      .some((value) => value.toLocaleLowerCase().includes(query));
  });
}

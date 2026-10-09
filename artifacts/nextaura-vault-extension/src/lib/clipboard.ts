type RevealPassword = (credentialId: string) => Promise<{ password: string }>;
type WriteClipboard = (value: string) => Promise<void>;

/**
 * Keeps the plaintext response inside one short-lived async operation. The
 * caller may report success only after this promise resolves.
 */
export async function copyRevealedPassword(
  credentialId: string,
  reveal: RevealPassword,
  writeClipboard: WriteClipboard,
): Promise<void> {
  const { password } = await reveal(credentialId);
  await writeClipboard(password);
}

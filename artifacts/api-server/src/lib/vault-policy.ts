export function configuredFounderRole(id: string): "mohannad" | "moayad" | undefined {
  const first = process.env.FOUNDER_MOHANNAD_USER_ID;
  const second = process.env.FOUNDER_MOAYAD_USER_ID;
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!first || !second || first === second || !uuid.test(first) || !uuid.test(second)) return undefined;
  return id === first ? "mohannad" : id === second ? "moayad" : undefined;
}

export function validSecondFactorAge(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : Infinity;
}

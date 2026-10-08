export function configuredFounderRole(id: string): "mohannad" | "moayad" | undefined {
  const first = process.env.FOUNDER_MOHANNAD_ID;
  const second = process.env.FOUNDER_MOAYAD_ID;
  if (!first || !second || first === second || !/^user_[a-zA-Z0-9]+$/.test(first) || !/^user_[a-zA-Z0-9]+$/.test(second)) return undefined;
  return id === first ? "mohannad" : id === second ? "moayad" : undefined;
}

export function validSecondFactorAge(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : Infinity;
}

interface ChromeSessionStorage {
  get(key: string): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
  remove(key: string): Promise<void>;
  setAccessLevel(options: { accessLevel: 'TRUSTED_CONTEXTS' }): Promise<void>;
}

declare const chrome: {
  storage: { session: ChromeSessionStorage };
  tabs: { create(options: { url: string }): Promise<unknown> };
};

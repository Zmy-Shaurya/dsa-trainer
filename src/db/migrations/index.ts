// Export-file migrations (PRD 10.5): pure functions on the envelope, one per version step.
// `MIGRATIONS[n]` upgrades a version-n envelope to n+1. Nothing to do yet: the first schema is v1.
export type Migration = (envelope: Record<string, unknown>) => Record<string, unknown>;
export const MIGRATIONS: Record<number, Migration> = {};

/** Runs the chain from the file's version up to `target`. Newer-than-target and unversioned files pass through for validation to reject. */
export function migrateEnvelope(
  input: unknown, target: number, chain: Record<number, Migration> = MIGRATIONS,
): unknown {
  if (typeof input !== 'object' || input === null) return input;
  let env = input as Record<string, unknown>;
  while (typeof env.schemaVersion === 'number' && env.schemaVersion < target) {
    const step = chain[env.schemaVersion];
    if (!step) throw new Error(`No migration from schema v${env.schemaVersion}.`);
    env = { ...step(env), schemaVersion: env.schemaVersion + 1 };
  }
  return env;
}

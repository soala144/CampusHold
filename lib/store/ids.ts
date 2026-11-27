/**
 * Ids for records created by store operations.
 *
 * The browser runs an operation first (instant UI), then the server runs the
 * same operation authoritatively. Recording the ids the browser generated and
 * replaying them on the server keeps both sides in agreement, e.g. a new job
 * gets the same id in the URL and in the database.
 * Operations are synchronous, so this module-level state can't interleave.
 */
const ID_PATTERN = /^[a-z]+_[0-9a-f]{8}$/;

let recording: string[] | null = null;
let replay: string[] | null = null;

const fresh = (prefix: string) => `${prefix}_${crypto.randomUUID().replaceAll("-", "").slice(0, 8)}`;

export function newId(prefix: string): string {
  let id: string | undefined;
  if (replay?.length) {
    const candidate = replay.shift()!;
    // Only accept a well-formed id with the expected prefix; otherwise mint one.
    if (ID_PATTERN.test(candidate) && candidate.startsWith(`${prefix}_`)) id = candidate;
  }
  id ??= fresh(prefix);
  recording?.push(id);
  return id;
}

/** Run fn while recording every id it creates. */
export function recordIds<T>(fn: () => T): { result: T; ids: string[] } {
  recording = [];
  try {
    const result = fn();
    return { result, ids: recording };
  } finally {
    recording = null;
  }
}

/** Run fn, handing out the given ids (in order) before minting new ones. */
export function replayIds<T>(ids: string[], fn: () => T): T {
  replay = [...ids];
  try {
    return fn();
  } finally {
    replay = null;
  }
}

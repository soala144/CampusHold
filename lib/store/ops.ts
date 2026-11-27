import * as raw from "./operations";
import type { AppState } from "./state";

type OpResult<T> = { state: AppState; value: T } | { error: string };

/** An operation bound to its arguments, tagged so it can be replayed on the server. */
export type OpCall<T> = ((s: AppState) => OpResult<T>) & { opName: OpName; opArgs: unknown[] };

type Raw = typeof raw;
export type OpName = {
  [K in keyof Raw]: Raw[K] extends (...a: never[]) => (s: AppState) => OpResult<unknown> ? K : never;
}[keyof Raw];

type Wrapped = {
  [K in OpName]: Raw[K] extends (...a: infer A) => (s: AppState) => OpResult<infer T> ? (...a: A) => OpCall<T> : never;
};

/** Operations callable from the UI via `run(ops.x(...))`. */
export const ops = Object.fromEntries(
  Object.entries(raw)
    .filter(([, v]) => typeof v === "function")
    .map(([name, factory]) => [
      name,
      (...args: unknown[]) =>
        Object.assign((factory as (...a: unknown[]) => (s: AppState) => unknown)(...args), { opName: name, opArgs: args }),
    ]),
) as unknown as Wrapped;

/** Look up the raw (untagged) operation factory by name, for the server. */
export function rawOp(name: string): ((...args: unknown[]) => (s: AppState) => OpResult<unknown>) | undefined {
  const fn = (raw as Record<string, unknown>)[name];
  return typeof fn === "function" ? (fn as (...args: unknown[]) => (s: AppState) => OpResult<unknown>) : undefined;
}

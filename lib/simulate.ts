/** Artificial latency so loading states are visible in the mock. */
export const delay = (ms = 700) => new Promise((r) => setTimeout(r, ms));

/** Presentation only: server settings and RPCs remain authoritative. */
export function titleFee(kind: 'identity' | 'passport' | 'registration', lost = false, cv = 5) {
  return kind === 'identity' ? (lost ? 25 : 0) : kind === 'passport' ? 86 : Math.ceil((1376 + 4600 * cv) / 100);
}
/** Matches SQL's nonnegative hashtext mask; takes the server's signed hash. */
export function titleDelay(hash: number) { return 7 + ((hash >>> 0) & 0x7fffffff) % 15; }

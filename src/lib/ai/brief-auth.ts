import { timingSafeEqual } from "crypto";

/**
 * Password gate for on-demand AI briefs.
 * Set AI_BRIEF_PASSWORD in env (required in production).
 */
export function verifyBriefPassword(provided: string | undefined | null): boolean {
  const expected = process.env.AI_BRIEF_PASSWORD;
  if (!expected) {
    // Misconfigured: deny rather than open the endpoint
    return false;
  }
  if (provided == null || provided === "") return false;

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

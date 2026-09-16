/** Decode common HTML entities; loop to unwind double-encoding (&amp;amp; → &). */
export function decodeHtmlEntities(input: string): string {
  let s = input;
  for (let i = 0; i < 4; i++) {
    const next = s
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&nbsp;/gi, " ")
      .replace(/&#39;|&apos;/gi, "'")
      .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => {
        const code = Number.parseInt(hex, 16);
        return Number.isFinite(code) ? String.fromCodePoint(code) : _;
      })
      .replace(/&#(\d+);/g, (_, dec: string) => {
        const code = Number(dec);
        return Number.isFinite(code) ? String.fromCodePoint(code) : _;
      });
    if (next === s) break;
    s = next;
  }
  return s;
}

/** Strip tags and decode entities for RSS titles/summaries. */
export function stripHtml(input: string): string {
  return decodeHtmlEntities(input)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

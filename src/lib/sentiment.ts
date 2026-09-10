export type ToneHit = { positive: number; negative: number };

const EN_POS =
  /\b(rally|surge|gain|beat|hope|strong|rebound|bid|firm|growth|demand|win|boost|record)\b/gi;
const EN_NEG =
  /\b(fall|drop|cut|slow|weak|risk|warn|soft|pressure|loss|fade|miss|crash|fear)\b/gi;

const ID_POS =
  /\b(naik|menguat|melonjak|cuan|laba|positif|optimis|melesat|rekor|tumbuh)\b/gi;
const ID_NEG =
  /\b(turun|melemah|anjlok|rugi|koreksi|tertekan|negatif|merosot|gagal|krisis)\b/gi;

export function countTone(
  text: string,
  language: "en" | "id" | undefined = "en",
): ToneHit {
  const posRe = language === "id" ? ID_POS : EN_POS;
  const negRe = language === "id" ? ID_NEG : EN_NEG;
  // Reset lastIndex for global regexes
  posRe.lastIndex = 0;
  negRe.lastIndex = 0;
  const positive = (text.match(posRe) ?? []).length;
  posRe.lastIndex = 0;
  negRe.lastIndex = 0;
  const negative = (text.match(negRe) ?? []).length;
  return { positive, negative };
}

export function toneScoreFromItems(
  items: { title: string; summary: string; language?: "en" | "id" }[],
): number {
  if (items.length === 0) return 0;
  let tone = 0;
  for (const item of items) {
    const { positive, negative } = countTone(
      `${item.title} ${item.summary}`,
      item.language,
    );
    tone += positive - negative;
  }
  return Math.max(-40, Math.min(40, Math.round((tone / items.length) * 40)));
}

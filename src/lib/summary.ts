export type KeywordSummary = {
  keywords: string[];
  sentence: string;
};

// auto-summary가 생성하는 "키워드1, 키워드2 · 한 줄 문장" 형식을 파싱한다.
// 수동 요약(3~5문장)처럼 구분자가 없는 텍스트는 null을 반환한다.
export function parseKeywordSummary(summaryText: string): KeywordSummary | null {
  const sepIndex = summaryText.indexOf("·");
  if (sepIndex === -1) return null;

  const keywords = summaryText
    .slice(0, sepIndex)
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
  const sentence = summaryText.slice(sepIndex + 1).trim();

  if (keywords.length === 0 || !sentence) return null;
  return { keywords, sentence };
}

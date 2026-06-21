// core/indexing/keywords.ts
const STOPWORDS = new Set([
  // français
  'le','la','les','un','une','des','de','du','et','en','à','au','aux','est','sont',
  'que','qui','pour','dans','sur','par','avec','ce','cette','ces','il','elle','nous',
  'vous','ils','elles','se','sa','son','ses','plus','ne','pas','ou','mais','donc','car',
  // anglais
  'the','a','an','and','or','of','to','in','on','for','is','are','with','this','that',
  'it','as','by','at','from','be','was','were','has','have','had',
]);

export interface Keyword {
  term: string;
  score: number;
}

export function extractKeywords(text: string, limit = 15): Keyword[] {
  const freq = new Map<string, number>();

  for (const token of tokenize(text)) {
    if (STOPWORDS.has(token) || token.length < 3) continue;
    freq.set(token, (freq.get(token) ?? 0) + 1);
  }

  return [...freq.entries()]
    .map(([term, score]) => ({ term, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // enlève les accents (café → cafe)
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}
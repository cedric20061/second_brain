export interface ExtractedPage {
  url: string;
  title: string;
  content: string;
  textContent: string;
  excerpt: string;
  siteName: string | null;
  byline: string | null;
  capturedAt: number;
  lang: string | null;
}

export interface StoredPage extends ExtractedPage {
  id: number;
}

export interface SearchResult {
  id: number;
  url: string;
  title: string;
  excerpt: string;
  siteName: string | null;
  capturedAt: number;
  score: number;           // score hybride final [0..1]
  vectorScore?: number;    // score cosine seul (debug / tri alternatif)
  keywordScore?: number;   // score FTS seul
  matchedTerms?: string[]; // mots-clés correspondants (pour surlignage UI)
}
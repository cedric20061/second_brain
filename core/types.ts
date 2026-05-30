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
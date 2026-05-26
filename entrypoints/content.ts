import { extractContent } from '../core/extraction/extractContent';
import { sendMessage } from '../messaging/messageTypes';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle', // attend que la page soit chargée et stabilisée

  main() {
    console.log('Hello content.');
    // Petit délai pour laisser les SPA (React/Vue) finir leur rendu initial
    setTimeout(() => {
      capturePage();
    }, 1500);
  },
});

function capturePage() {
  // On ignore les pages non pertinentes dès le départ
  if (shouldSkip(location.href)) return;

  const page = extractContent(document, location.href);
  if (!page) return; // Readability a jugé le contenu trop pauvre
  console.log(page);
  sendMessage({ type: 'CAPTURE_PAGE', payload: page });
}

function shouldSkip(url: string): boolean {
  const skipPatterns = [
    /^chrome:\/\//,
    /^chrome-extension:\/\//,
    /^about:/,
    /accounts\.google\.com/,
    /\/login/,
    /\/signin/,
  ];
  return skipPatterns.some((pattern) => pattern.test(url));
}
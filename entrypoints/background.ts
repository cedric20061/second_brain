import type { ExtensionMessage } from '../messaging/messageTypes';
import { savePage } from '../storage/pagesRepository';
import { indexPage } from '../core/indexing/indexPage';

export default defineBackground(() => {
  console.log('Hello background!', { id: browser.runtime.id });

  browser.runtime.onMessage.addListener((message: ExtensionMessage) => {
    console.log('[Second Brain] Message reçu :', message);
    if (message.type === 'CAPTURE_PAGE') {
      console.log('[Second Brain] Capture de la page :', message.payload);
      handleCapture(message.payload);
    }
  });
});


async function handleCapture(page: ExtensionMessage['payload']) {
  try {
    const stored = await savePage(page);
    console.log('[Second Brain] Page sauvegardée :', stored.title, `(id=${stored.id})`);

    await indexPage(stored);
    console.log('[Second Brain] Page indexée (mots-clés + embedding)');
  } catch (err) {
    console.error('[Second Brain] Erreur :', err);
  }
}
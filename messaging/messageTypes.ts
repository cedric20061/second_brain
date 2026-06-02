// messaging/messageTypes.ts
import type { ExtractedPage } from '../core/types';

export type ExtensionMessage =
  | { type: 'CAPTURE_PAGE'; payload: ExtractedPage };

export function sendMessage(message: ExtensionMessage) {
  return browser.runtime.sendMessage(message);
}
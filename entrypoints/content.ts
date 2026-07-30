// entrypoints/content.ts
import { extractContent } from '../core/extraction/extractContent';
import { sendMessage } from '../messaging/messageTypes';
import type { TabMessage } from '../messaging/messageTypes';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  main() {
    setTimeout(capturePage, 1500);

    // Écoute les suggestions envoyées par le background
    browser.runtime.onMessage.addListener((message: TabMessage) => {
      if (message.type === 'SHOW_SUGGESTIONS' && message.results.length > 0) {
        injectSuggestionWidget(message.results);
      }
    });
  },
});

function capturePage() {
  if (shouldSkip(location.href)) return;
  const page = extractContent(document, location.href);
  if (!page) return;
  sendMessage({ type: 'CAPTURE_PAGE', payload: page });
}

function shouldSkip(url: string): boolean {
  return [/^chrome:\/\//, /^chrome-extension:\/\//, /^about:/, /accounts\.google\.com/, /\/login/, /\/signin/]
    .some((p) => p.test(url));
}

// ── Widget de suggestions ─────────────────────────────────────────────────

function injectSuggestionWidget(results: TabMessage['results']) {
  // Évite les doublons si le widget est déjà présent
  if (document.getElementById('sb-widget-host')) return;

  const host = document.createElement('div');
  host.id = 'sb-widget-host';
  host.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:2147483647;';
  document.body.appendChild(host);

  // Shadow DOM : isolation totale vis-à-vis du CSS de la page
  const shadow = host.attachShadow({ mode: 'closed' });

  const css = `
    .widget {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #161B22;
      border: 1px solid #21262D;
      border-radius: 8px;
      width: 280px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.5);
      overflow: hidden;
      animation: slideIn 0.2s ease;
    }
    @keyframes slideIn {
      from { opacity:0; transform:translateY(8px); }
      to   { opacity:1; transform:translateY(0); }
    }
    .header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 8px 12px;
      border-bottom: 1px solid #21262D;
    }
    .title { font-size: 11px; color: #7C6AF7; font-weight: 600; }
    .close {
      background:none; border:none; color:#484F58;
      cursor:pointer; font-size:13px; padding:2px 4px;
      border-radius:3px; line-height:1;
    }
    .close:hover { color:#8B949E; }
    .item {
      display: block; padding: 8px 12px;
      text-decoration: none; color: inherit;
      border-bottom: 1px solid #161B22;
      transition: background 0.1s;
    }
    .item:last-child { border-bottom: none; }
    .item:hover { background: #1C2128; }
    .item-title {
      font-size: 12px; color: #E6EDF3; font-weight: 500;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      display: block; margin-bottom: 2px;
    }
    .item-domain {
      font-size: 10px; color: #484F58;
      font-family: 'SF Mono', monospace;
    }
    .progress {
      height: 2px; background: #21262D;
    }
    .progress-bar {
      height: 2px; background: #7C6AF7;
      animation: shrink 8s linear forwards;
    }
    @keyframes shrink { from{width:100%} to{width:0%} }
  `;

  const style = document.createElement('style');
  style.textContent = css;

  const widget = document.createElement('div');
  widget.className = 'widget';

  const header = document.createElement('div');
  header.className = 'header';
  header.innerHTML = `<span class="title">◎ Dans ta mémoire</span>`;

  const closeBtn = document.createElement('button');
  closeBtn.className = 'close';
  closeBtn.textContent = '✕';
  closeBtn.onclick = () => host.remove();
  header.appendChild(closeBtn);

  widget.appendChild(header);

  for (const r of results) {
    const domain = new URL(r.url).hostname.replace('www.', '');
    const item = document.createElement('a');
    item.className = 'item';
    item.href = r.url;
    item.target = '_blank';
    item.rel = 'noreferrer';
    item.innerHTML = `
      <span class="item-title">${escapeHtml(r.title)}</span>
      <span class="item-domain">${escapeHtml(domain)}</span>
    `;
    widget.appendChild(item);
  }

  // Barre de progression auto-fermeture (8 secondes)
  const progress = document.createElement('div');
  progress.className = 'progress';
  const bar = document.createElement('div');
  bar.className = 'progress-bar';
  progress.appendChild(bar);
  widget.appendChild(progress);

  shadow.appendChild(style);
  shadow.appendChild(widget);

  setTimeout(() => host.remove(), 8000);
}

function escapeHtml(str: string): string {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
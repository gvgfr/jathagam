// Highlights known Tamil/Sanskrit terms in the page and explains them in a
// pop-up when tapped. Runs automatically on any content added to <main>.
import { GLOSSARY } from '../help.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Longest forms first so "Ezharai Sani" wins over "Sani"
const FORMS = Object.entries(GLOSSARY)
  .flatMap(([key, g]) => g.forms.map((f) => ({ key, f })))
  .sort((a, b) => b.f.length - a.f.length);
const FORM_KEY = new Map(FORMS.map((x) => [x.f, x.key]));
const latin = (f) => /^[A-Za-z ]+$/.test(f);
const RE = new RegExp(
  FORMS.map(({ f }) => (latin(f) ? `(?<![A-Za-z])${reEsc(f)}(?![A-Za-z])` : reEsc(f))).join('|'),
  'g'
);

// Never touch form controls, the charts, navigation, or the pop-up itself
const SKIP = 'input, select, option, textarea, button, label, legend, .si-chart, .tabs, .term, #gloss-pop, .temple-overlay, script, style, .gloss-list dt, .no-gloss';
// A term is highlighted only the first time it appears in each of these blocks
const SCOPE = 'details.palan-sec, .dosham-block, .intro, .faq-item, .card, section, .palan-cta';

export function glossify(root) {
  const used = new WeakMap();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      if (!n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      const p = n.parentElement;
      if (!p || p.closest(SKIP) || p.closest('[hidden]')) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    const text = node.nodeValue;
    RE.lastIndex = 0;
    if (!RE.test(text)) continue;
    const scope = node.parentElement.closest(SCOPE) || root;
    // remember terms already highlighted in this block by earlier runs
    if (!used.has(scope)) used.set(scope, new Set([...scope.querySelectorAll('.term')].map((b) => b.dataset.term)));
    const seen = used.get(scope);
    const frag = document.createDocumentFragment();
    let last = 0;
    let changed = false;
    RE.lastIndex = 0;
    for (let m; (m = RE.exec(text)); ) {
      const key = FORM_KEY.get(m[0]);
      if (seen.has(key)) continue;
      seen.add(key);
      changed = true;
      frag.append(text.slice(last, m.index));
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'term';
      b.dataset.term = key;
      b.textContent = m[0];
      frag.append(b);
      last = m.index + m[0].length;
    }
    if (!changed) continue;
    frag.append(text.slice(last));
    node.replaceWith(frag);
  }
}

/**
 * Start highlighting inside `main` and handle taps on terms.
 * @param {() => 'ta'|'en'} lang
 * @param {{close:string, more:string}} labels getter for current labels
 */
export function initGlossary(main, lang, labels) {
  const pop = document.createElement('div');
  pop.id = 'gloss-pop';
  pop.setAttribute('role', 'dialog');
  pop.setAttribute('aria-modal', 'false');
  pop.hidden = true;
  document.body.append(pop);
  let opener = null;

  const close = () => {
    pop.hidden = true;
    opener?.focus();
    opener = null;
  };
  const open = (btn) => {
    const g = GLOSSARY[btn.dataset.term];
    if (!g) return;
    opener = btn;
    const L = lang();
    const names = [...new Set([btn.textContent, ...g.forms.slice(0, 1), g.forms.at(-1)])].join(' · ');
    const lb = labels();
    pop.innerHTML = `
      <div class="gp-head"><strong>${esc(names)}</strong><button type="button" class="gp-close" aria-label="${esc(lb.close)}">✕</button></div>
      <p>${esc(g[L])}</p>
      <a href="#faq" class="gp-more">${esc(lb.more)}</a>`;
    pop.setAttribute('aria-label', btn.textContent);
    pop.hidden = false;
    pop.querySelector('.gp-close').addEventListener('click', close);
    pop.querySelector('.gp-more').addEventListener('click', close);
    pop.querySelector('.gp-close').focus();
  };

  document.addEventListener('click', (e) => {
    const btn = e.target.closest?.('.term');
    if (btn) {
      e.preventDefault();
      e.stopPropagation();
      open(btn);
    } else if (!pop.hidden && !pop.contains(e.target)) close();
  });
  document.addEventListener('keydown', (e) => e.key === 'Escape' && !pop.hidden && close());

  let busy = false;
  let timer = 0;
  const run = () => {
    busy = true;
    glossify(main);
    observer.takeRecords();
    busy = false;
  };
  const observer = new MutationObserver(() => {
    if (busy) return;
    clearTimeout(timer);
    timer = setTimeout(run, 30);
  });
  observer.observe(main, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['hidden'] });
  run();
}

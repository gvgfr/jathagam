// Temple card: a large, high-contrast card with the details a priest asks for
// at an archanai (name, nakshatram, rasi; optionally gothram). It can be saved
// as an image or shared — generated on the device, nothing is uploaded.
import { NAMES } from '../i18n.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const L = {
  ta: { title: 'அர்ச்சனை அட்டை', name: 'பெயர்', star: 'நட்சத்திரம்', pada: 'பாதம்', rasi: 'ராசி', lagnam: 'லக்னம்', gothram: 'கோத்திரம்', gothramHint: 'கோத்திரம் (விருப்பம்)', save: 'படமாகச் சேமி', share: 'பகிர்', close: 'மூடு', saved: 'படம் சேமிக்கப்பட்டது' },
  en: { title: 'Temple card', name: 'Name', star: 'Nakshatram', pada: 'padam', rasi: 'Rasi', lagnam: 'Lagnam', gothram: 'Gothram', gothramHint: 'Gothram (optional)', save: 'Save as image', share: 'Share', close: 'Close', saved: 'Image saved' },
};

function details(chart, name, gothram) {
  const s = chart.summary;
  return {
    name,
    gothram,
    starTa: NAMES.nakshatra.ta[s.nakshatra],
    starEn: NAMES.nakshatra.en[s.nakshatra],
    pada: s.pada,
    rasiTa: NAMES.rasi.ta[s.rasi],
    rasiEn: NAMES.rasi.en[s.rasi],
    lagTa: NAMES.rasi.ta[s.lagnam],
    lagEn: NAMES.rasi.en[s.lagnam],
  };
}

/** Draw the card on a canvas (1080 x 1440, 3:4 phone-friendly portrait). */
async function drawCard(d) {
  await document.fonts.ready;
  const W = 1080;
  const H = 1440;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const x = c.getContext('2d');
  const font = (w, px) => `${w} ${px}px "Noto Sans Tamil", sans-serif`;
  x.fillStyle = '#fdf6e7';
  x.fillRect(0, 0, W, H);
  x.strokeStyle = '#6b1d1d';
  x.lineWidth = 16;
  x.strokeRect(28, 28, W - 56, H - 56);
  x.strokeStyle = '#e8891c';
  x.lineWidth = 4;
  x.strokeRect(56, 56, W - 112, H - 112);
  x.textAlign = 'center';
  x.fillStyle = '#6b1d1d';
  x.font = font(700, 58);
  x.fillText(`🙏 ${L.ta.title}`, W / 2, 160);
  let y = 260;
  const row = (labelTa, labelEn, big, small) => {
    x.fillStyle = '#7a5c4a';
    x.font = font(600, 34);
    x.fillText(`${labelTa} · ${labelEn}`, W / 2, y);
    x.fillStyle = '#2b1a12';
    x.font = font(700, 76);
    x.fillText(big, W / 2, y + 92);
    if (small) {
      x.fillStyle = '#6b1d1d';
      x.font = font(600, 38);
      x.fillText(small, W / 2, y + 162);
    }
    y += small ? 232 : 172;
  };
  if (d.name) row(L.ta.name, L.en.name, d.name, '');
  row(L.ta.star, L.en.star, d.starTa, `${d.starEn} · ${L.ta.pada} ${d.pada}`);
  row(L.ta.rasi, L.en.rasi, d.rasiTa, d.rasiEn);
  if (d.gothram) row(L.ta.gothram, L.en.gothram, d.gothram, '');
  row(L.ta.lagnam, L.en.lagnam, d.lagTa, d.lagEn);
  x.fillStyle = '#7a5c4a';
  x.font = font(400, 28);
  x.fillText('GV Jathagam', W / 2, H - 80);
  return new Promise((res) => c.toBlob(res, 'image/png'));
}

/**
 * Open the temple card overlay for a chart.
 * @param {object} chart computeChart() result
 * @param {string} name
 * @param {'ta'|'en'} lang
 */
export function openTempleCard(chart, name, lang) {
  const t = L[lang];
  const ov = document.createElement('div');
  ov.className = 'temple-overlay';
  ov.setAttribute('role', 'dialog');
  ov.setAttribute('aria-modal', 'true');
  ov.setAttribute('aria-label', t.title);
  const render = (goth) => {
    const d = details(chart, name, goth);
    return `
      <div class="temple-card">
        <div class="tc-head">🙏 ${L.ta.title}<small>${L.en.title}</small></div>
        ${d.name ? `<div class="tc-row"><span>${L.ta.name} · ${L.en.name}</span><strong>${esc(d.name)}</strong></div>` : ''}
        <div class="tc-row tc-main"><span>${L.ta.star} · ${L.en.star}</span><strong>${d.starTa}</strong><em>${d.starEn} · ${L.ta.pada} ${d.pada}</em></div>
        <div class="tc-row tc-main"><span>${L.ta.rasi} · ${L.en.rasi}</span><strong>${d.rasiTa}</strong><em>${d.rasiEn}</em></div>
        ${d.gothram ? `<div class="tc-row"><span>${L.ta.gothram} · ${L.en.gothram}</span><strong>${esc(d.gothram)}</strong></div>` : ''}
        <div class="tc-row"><span>${L.ta.lagnam} · ${L.en.lagnam}</span><strong>${d.lagTa}</strong><em>${d.lagEn}</em></div>
      </div>`;
  };
  ov.innerHTML = `
    <div class="tc-wrap">
      <div class="tc-card-slot">${render('')}</div>
      <div class="tc-controls">
        <input type="text" class="tc-goth" maxlength="40" placeholder="${t.gothramHint}" aria-label="${t.gothramHint}" />
        <div class="tc-buttons">
          <button type="button" class="btn-cta tc-save">${t.save}</button>
          ${navigator.canShare ? `<button type="button" class="btn-ghost tc-share">${t.share}</button>` : ''}
          <button type="button" class="btn-ghost tc-close">${t.close}</button>
        </div>
        <p class="tc-status" role="status"></p>
      </div>
    </div>`;
  document.body.append(ov);
  document.body.classList.add('no-scroll');
  const q = (s) => ov.querySelector(s);
  const goth = () => q('.tc-goth').value.trim();
  q('.tc-goth').addEventListener('input', () => (q('.tc-card-slot').innerHTML = render(goth())));
  const fileName = `temple-card-${NAMES.nakshatra.en[chart.summary.nakshatra].toLowerCase()}.png`;
  q('.tc-save').addEventListener('click', async () => {
    const blob = await drawCard(details(chart, name, goth()));
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    q('.tc-status').textContent = t.saved;
  });
  q('.tc-share')?.addEventListener('click', async () => {
    const blob = await drawCard(details(chart, name, goth()));
    const file = new File([blob], fileName, { type: 'image/png' });
    try {
      if (navigator.canShare({ files: [file] })) await navigator.share({ files: [file], title: L[lang].title });
    } catch {
      /* user cancelled */
    }
  });
  const close = () => {
    ov.remove();
    document.body.classList.remove('no-scroll');
    document.removeEventListener('keydown', onKey);
  };
  const onKey = (e) => e.key === 'Escape' && close();
  document.addEventListener('keydown', onKey);
  q('.tc-close').addEventListener('click', close);
  ov.addEventListener('click', (e) => e.target === ov && close());
  q('.tc-close').focus();
}

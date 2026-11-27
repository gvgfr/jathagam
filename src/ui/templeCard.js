// Temple card: a large, high-contrast card with the details a priest asks for
// at an archanai (name, nakshatram, rasi; optionally gothram and kula deivam). It can be saved
// as an image or shared — generated on the device, nothing is uploaded.
import { NAMES } from '../i18n.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const L = {
  ta: { title: 'அர்ச்சனை அட்டை', name: 'பெயர்', star: 'நட்சத்திரம்', pada: 'பாதம்', rasi: 'ராசி', lagnam: 'லக்னம்', gothram: 'கோத்திரம்', gothramHint: 'கோத்திரம் (விருப்பம்)', kula: 'குல தெய்வம்', kulaHint: 'குல தெய்வம், ஊர் (விருப்பம்)', help: 'கோத்திரம் தெரியவில்லையா? தந்தை வழிப் பெரியோரையோ குடும்பப் புரோகிதரையோ கேளுங்கள். கண்டுபிடிக்க முடியாவிட்டால் “சிவ கோத்திரம்” (அல்லது “காஸ்யப”) என்று தேர்ந்தெடுத்து எல்லாக் கோயில்களிலும் அதையே சொல்லுங்கள்.', remembered: 'உங்கள் பிறப்பு விவரங்களுடன் இந்த போனில் நினைவில் வைக்கப்படும்.', save: 'படமாகச் சேமி', share: 'பகிர்', close: 'மூடு', saved: 'படம் சேமிக்கப்பட்டது' },
  en: { title: 'Temple card', name: 'Name', star: 'Nakshatram', pada: 'padam', rasi: 'Rasi', lagnam: 'Lagnam', gothram: 'Gothram', gothramHint: 'Gothram (optional)', kula: 'Kula deivam', kulaHint: 'Kula deivam and place (optional)', help: 'Don’t know your gothram? Ask elders on your father’s side or your family priest. If it can’t be found, choose “Shiva gothram” (or “Kashyapa”) and use it at every temple.', remembered: 'Remembered on this phone with your birth details.', save: 'Save as image', share: 'Share', close: 'Close', saved: 'Image saved' },
};

function details(chart, name, gothram, kula) {
  const s = chart.summary;
  return {
    name,
    gothram,
    kula,
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
  // taller canvas when the optional rows are filled, so nothing runs off the card
  const H = Math.max(1440, 260 + (d.name ? 172 : 0) + 232 * 3 + (d.gothram ? 172 : 0) + (d.kula ? 172 : 0) + 200);
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
    // shrink long text (e.g. a kula deivam with its place) so it stays inside the border
    let px = 76;
    x.font = font(700, px);
    while (x.measureText(big).width > W - 200 && px > 34) {
      px -= 4;
      x.font = font(700, px);
    }
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
  if (d.kula) row(L.ta.kula, L.en.kula, d.kula, '');
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
 * @param {{extras?: {gothram?: string, kula?: string}, onChange?: (extras: {gothram: string, kula: string}) => void, remembered?: boolean}} opts
 */
export function openTempleCard(chart, name, lang, opts = {}) {
  const t = L[lang];
  const ov = document.createElement('div');
  ov.className = 'temple-overlay';
  ov.setAttribute('role', 'dialog');
  ov.setAttribute('aria-modal', 'true');
  ov.setAttribute('aria-label', t.title);
  const render = (goth, kula) => {
    const d = details(chart, name, goth, kula);
    return `
      <div class="temple-card">
        <div class="tc-head">🙏 ${L.ta.title}<small>${L.en.title}</small></div>
        ${d.name ? `<div class="tc-row"><span>${L.ta.name} · ${L.en.name}</span><strong>${esc(d.name)}</strong></div>` : ''}
        <div class="tc-row tc-main"><span>${L.ta.star} · ${L.en.star}</span><strong>${d.starTa}</strong><em>${d.starEn} · ${L.ta.pada} ${d.pada}</em></div>
        <div class="tc-row tc-main"><span>${L.ta.rasi} · ${L.en.rasi}</span><strong>${d.rasiTa}</strong><em>${d.rasiEn}</em></div>
        ${d.gothram ? `<div class="tc-row"><span>${L.ta.gothram} · ${L.en.gothram}</span><strong>${esc(d.gothram)}</strong></div>` : ''}
        ${d.kula ? `<div class="tc-row"><span>${L.ta.kula} · ${L.en.kula}</span><strong>${esc(d.kula)}</strong></div>` : ''}
        <div class="tc-row"><span>${L.ta.lagnam} · ${L.en.lagnam}</span><strong>${d.lagTa}</strong><em>${d.lagEn}</em></div>
      </div>`;
  };
  ov.innerHTML = `
    <div class="tc-wrap">
      <div class="tc-card-slot">${render(opts.extras?.gothram || '', opts.extras?.kula || '')}</div>
      <div class="tc-controls">
        <input type="text" class="tc-goth" maxlength="40" placeholder="${t.gothramHint}" aria-label="${t.gothramHint}" value="${esc(opts.extras?.gothram || '')}" />
        <input type="text" class="tc-kula" maxlength="60" placeholder="${t.kulaHint}" aria-label="${t.kulaHint}" value="${esc(opts.extras?.kula || '')}" />
        <p class="tc-help">${esc(t.help)}${opts.remembered ? ` ${esc(t.remembered)}` : ''}</p>
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
  const kula = () => q('.tc-kula').value.trim();
  const update = () => {
    q('.tc-card-slot').innerHTML = render(goth(), kula());
    opts.onChange?.({ gothram: goth(), kula: kula() });
  };
  q('.tc-goth').addEventListener('input', update);
  q('.tc-kula').addEventListener('input', update);
  const fileName = `temple-card-${NAMES.nakshatra.en[chart.summary.nakshatra].toLowerCase()}.png`;
  q('.tc-save').addEventListener('click', async () => {
    const blob = await drawCard(details(chart, name, goth(), kula()));
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    q('.tc-status').textContent = t.saved;
  });
  q('.tc-share')?.addEventListener('click', async () => {
    const blob = await drawCard(details(chart, name, goth(), kula()));
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

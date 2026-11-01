/* Bokmotorns figurer: funktionella figurer, specificerade i data och ritade här som SVG i fysiktemats färger (klasserna
 * fig-* i bok.css). Bara figurer där en riktning eller ett läge bär betydelsen – inga dekorativa symboler.
 *
 * I innehållet:  {typ: 'figur', namn: '<figur>', ...figurens data, bildtext?, beskrivning?}
 * Figurens data avgör vad som ritas; motorn räknar ut lägen och riktningar (hur djupt något flyter, åt vilket håll
 * värmen flödar, hur lång en kraftpil är). beskrivning läses upp av skärmläsare; utan den skriver figuren en själv.
 *
 *   aggregationsformer  exempel?: ['is', 'vatten', 'vattenånga'], overgangar?: true
 *   flyter_sjunker      vatska?: {namn, densitet}, foremal: [{namn, densitet, ca?, stil?}] (1–4), enhet?: 'g/cm³'
 *   varmeflode          foremal?: [{namn, temp}, {namn, temp}], efter?: 'lika varm', slutrad?, enhet?: '°C'
 *   kraftpilar          foremal?: {namn?, form?: 'lada'|'boll'}, underlag?: false,
 *                       krafter: [{namn, riktning: 'upp'|'ner'|'vanster'|'hoger'|grader, storlek?}], enhet?: 'N', resultant?
 *
 * Figurerna ritas ungefär i textspaltens bredd (440 enheter), så att texten i dem blir läsbar (≈ 14–17 px).
 * Hela partiklar ritas i neutral sandfärg, som i filmernas modeller (bok.py: ATOM). En ny sorts figur är en ny
 * funktion här (motorn), inte något den som skriver innehåll gör. */
(function () {
  'use strict';

  const f = v => Math.round(v * 10) / 10;
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const svg = (b, h, inne) => `<svg viewBox="0 0 ${b} ${h}" xmlns="http://www.w3.org/2000/svg">${inne}</svg>`;
  const text = (x, y, s, k = 'fig-text') => `<text x="${f(x)}" y="${f(y)}" class="${k}">${esc(s)}</text>`;
  const partikel = (x, y, r = 7.5) => `<circle class="fig-partikel" cx="${f(x)}" cy="${f(y)}" r="${r}"/>`;
  // Tal som i texten: decimalkomma och mellanslag mellan tusental (1 538). minDec: antal decimaler som alltid visas.
  const tal = (v, minDec = 0) => Number(v).toLocaleString('sv-SE', { minimumFractionDigits: minDec, maximumFractionDigits: 2 }).replace(/ /g, ' ');
  const fel = s => { throw new Error(s); };

  function pil(x1, y1, x2, y2, spets = 8, klass = '') {
    const a = Math.atan2(y2 - y1, x2 - x1), c = Math.cos(a), s = Math.sin(a);
    const bx = x2 - spets * 1.4 * c, by = y2 - spets * 1.4 * s, w = spets * 0.75;
    return `<line class="fig-pil ${klass}" x1="${f(x1)}" y1="${f(y1)}" x2="${f(bx)}" y2="${f(by)}"/>` +
      `<polygon class="fig-pilspets ${klass}" points="${f(x2)},${f(y2)} ${f(bx - w * s)},${f(by + w * c)} ${f(bx + w * s)},${f(by - w * c)}"/>`;
  }

  // Samma "slumpmässiga" oordning varje gång figuren ritas.
  function slump(fro) { let x = fro; return () => ((x = (x * 16807) % 2147483647) / 2147483647) - 0.5; }

  /* Fast, flytande, gas – och övergångarna mellan dem. Kolumner: 0–88, 176–264, 352–440. */
  Bok.figur('aggregationsformer', d => {
    const [exFast, exFlyt, exGas] = d.exempel || ['is', 'vatten', 'vattenånga'];
    const golv = 196, sl = slump(7);
    let s = `<line class="fig-bord" x1="0" y1="${golv + 1}" x2="440" y2="${golv + 1}"/>`;

    // Fast: tätt och i ordning, egen form
    for (let rad = 0; rad < 4; rad++) for (let k = 0; k < 5; k++) s += partikel(12 + k * 16, golv - 7.5 - rad * 16);

    // Flytande: tätt men oordnat, tar kärlets form
    s += `<rect class="fig-vatten" x="177" y="146" width="86" height="49" opacity=".55"/>`;
    [[186, 5, 188], [194, 4, 173], [186, 5, 158]].forEach(([x0, n, y]) => {
      for (let k = 0; k < n; k++) s += partikel(x0 + k * 16.5 + sl() * 4, y + sl() * 3);
    });
    s += `<line class="fig-vattenyta" x1="177" y1="146" x2="263" y2="146"/>`;
    s += `<path class="fig-kontur" d="M176 92 L176 ${golv} L264 ${golv} L264 92"/>`;

    // Gas: långt isär, rör sig fritt och fyller det stängda kärlet
    [[372, 86, 1, .4], [416, 80, -1, .3], [426, 124, -.3, -1], [380, 132, 1, -.6],
     [418, 166, -1, .5], [370, 178, .5, -1], [400, 104, .2, 1]].forEach(([x, y, dx, dy]) => {
      const l = Math.hypot(dx, dy), ux = dx / l, uy = dy / l;
      s += `<line class="fig-spar" x1="${f(x - ux * 11)}" y1="${f(y - uy * 11)}" x2="${f(x - ux * 21)}" y2="${f(y - uy * 21)}"/>`;
      s += partikel(x, y);
    });
    s += `<rect class="fig-kontur" x="353" y="64" width="86" height="${golv - 64}"/>`;

    // Rubriker, exempel och övergångar
    s += text(44, 24, 'Fast', 'fig-rubrik') + text(220, 24, 'Flytande', 'fig-rubrik') + text(396, 24, 'Gas', 'fig-rubrik');
    s += text(44, 222, exFast, 'fig-text fig-mitt fig-dampad') + text(220, 222, exFlyt, 'fig-text fig-mitt fig-dampad') +
         text(396, 222, exGas, 'fig-text fig-mitt fig-dampad');
    const overgangar = d.overgangar !== false;
    if (overgangar) {
      s += pil(96, 106, 168, 106) + text(132, 95, 'smälter', 'fig-pil-text');
      s += pil(168, 136, 96, 136) + text(132, 157, 'stelnar', 'fig-pil-text');
      s += pil(272, 106, 344, 106) + text(308, 95, 'förångas', 'fig-pil-text');
      s += pil(344, 136, 272, 136) + text(308, 157, 'kondenserar', 'fig-pil-text');
    }
    return { svg: svg(440, 230, s), beskrivning: `Fast (${exFast}), flytande (${exFlyt}) och gas (${exGas}).` +
      (overgangar ? ' Pilar: fast smälter till flytande och flytande stelnar till fast; flytande förångas till gas och gas kondenserar till flytande.' : '') };
  });

  /* Flyter eller sjunker – läget räknas ur densiteten. Den del av ett flytande föremål som är under ytan är
     föremålets densitet delad med vätskans; har föremålet högre densitet ligger det på botten. */
  const MATERIAL = { tra: [72, 36], is: [46, 46], jarn: [54, 29], foremal: [56, 36] };
  Bok.figur('flyter_sjunker', d => {
    const vatska = Object.assign({ namn: 'Vatten', densitet: 1 }, d.vatska), enhet = d.enhet || 'g/cm³';
    const foremal = d.foremal || fel('flyter_sjunker behöver foremal: [{namn, densitet}]');
    if (!foremal.length || foremal.length > 4) fel('flyter_sjunker ritar 1–4 föremål');
    const yta = 118, botten = 239, hoger = 429, vanster = 11;
    const rho = x => (x.ca ? 'ca ' : '') + tal(x.densitet, 1) + ' ' + enhet;
    let foremalen = '', etiketter = '', beskr = [];
    const steg = (hoger - vanster) / foremal.length;
    foremal.forEach((x, i) => {
      if (!(x.densitet > 0)) fel(`flyter_sjunker: ”${x.namn}” saknar densitet`);
      const stil = MATERIAL[x.stil] ? x.stil : 'foremal', [b, hjd] = MATERIAL[stil];
      const cx = vanster + steg * (i + 0.5), kvot = x.densitet / vatska.densitet;
      const utfall = kvot < 1 ? 'flyter' : kvot > 1 ? 'sjunker' : 'svävar';
      const y = kvot < 1 ? yta - hjd * (1 - kvot) : kvot > 1 ? botten - hjd : (yta + botten - hjd) / 2;
      foremalen += `<rect class="fig-${stil}" x="${f(cx - b / 2)}" y="${f(y)}" width="${b}" height="${hjd}" rx="${stil === 'is' ? 4 : 2}"/>`;
      // Det som flyter får sin etikett ovanför karet; det som sjunker eller svävar ovanför sig, i vätskan.
      const ey = kvot < 1 ? 19 : y - 49;
      etiketter += text(cx, ey, x.namn, 'fig-rubrik') + text(cx, ey + 20, rho(x), 'fig-text fig-mitt') +
        text(cx, ey + 39, utfall, 'fig-text fig-mitt fig-utfall fig-halo');
      beskr.push(`${x.namn}, ${rho(x)}, ${utfall}${kvot < 1 ? (kvot > 0.75 ? ' nästan helt under ytan' : kvot >= 0.4 ? ' delvis under ytan' : ' högt i ytan') : kvot > 1 ? ' och ligger på botten' : ''}.`);
    });
    // vätskans namn i ett hörn där inget föremål ligger på botten
    const nere = i => foremal[i].densitet >= vatska.densitet;
    const vx = !nere(0) ? 22 : !nere(foremal.length - 1) ? 418 : null;
    const vatskeEtikett = vx === null
      ? text(22, 60, vatska.namn + ', ' + tal(vatska.densitet, 1) + ' ' + enhet, 'fig-text fig-vanster')
      : text(vx, 207, vatska.namn, 'fig-rubrik ' + (vx < 220 ? 'fig-vanster' : 'fig-hoger')) +
        text(vx, 227, tal(vatska.densitet, 1) + ' ' + enhet, 'fig-text' + (vx < 220 ? '' : ' fig-hoger'));
    let s = foremalen;
    // vätskan läggs över, så att det som är under ytan syns genom den
    s += `<rect class="fig-vatten" x="${vanster}" y="${yta}" width="${hoger - vanster}" height="${botten + 1 - yta}" opacity=".5"/>`;
    s += `<line class="fig-vattenyta" x1="${vanster}" y1="${yta}" x2="${hoger}" y2="${yta}"/>`;
    s += `<path class="fig-kontur" d="M10 70 L10 240 L430 240 L430 70"/>`;
    s += etiketter + vatskeEtikett;
    return { svg: svg(440, 248, s), beskrivning: `Ett kar med ${vatska.namn.toLowerCase()}, ${tal(vatska.densitet, 1)} ${enhet}. ` + beskr.join(' ') };
  });

  /* Värme flödar från varmt till kallt – tills temperaturen är densamma. Pilen pekar från det varmare. */
  Bok.figur('varmeflode', d => {
    const [a, b] = d.foremal || [{ namn: 'varm', temp: 80 }, { namn: 'kall', temp: 20 }];
    const enhet = d.enhet || '°C', efter = d.efter || 'lika varm';
    const slutrad = d.slutrad || 'samma temperatur – inget mer värmeflöde';
    if (a.temp === b.temp) fel('varmeflode: föremålen har samma temperatur – då flödar ingen värme');
    const aVarm = a.temp > b.temp;
    let s = '';
    s += text(10, 18, 'Först', 'fig-rubrik fig-vanster');
    s += `<rect class="${aVarm ? 'fig-varm' : 'fig-kall'}" x="10" y="28" width="205" height="72" rx="3"/>`;
    s += `<rect class="${aVarm ? 'fig-kall' : 'fig-varm'}" x="215" y="28" width="205" height="72" rx="3"/>`;
    s += text(66, 54, a.namn, 'fig-text fig-mitt fig-dampad') + text(66, 86, `${tal(a.temp)} ${enhet}`, 'fig-text fig-stor fig-mitt');
    s += text(364, 54, b.namn, 'fig-text fig-mitt fig-dampad') + text(364, 86, `${tal(b.temp)} ${enhet}`, 'fig-text fig-stor fig-mitt');
    s += (aVarm ? pil(128, 70, 302, 70, 10) : pil(302, 70, 128, 70, 10)) + text(215, 56, 'värme', 'fig-pil-text fig-halo');

    s += text(10, 136, 'Sedan', 'fig-rubrik fig-vanster');
    s += `<rect class="fig-ljum" x="10" y="146" width="205" height="62" rx="3"/>`;
    s += `<rect class="fig-ljum" x="215" y="146" width="205" height="62" rx="3"/>`;
    const sedan = d.sluttemp != null ? `${tal(d.sluttemp)} ${enhet}` : efter;
    s += text(112, 183, sedan, 'fig-text fig-mitt') + text(318, 183, sedan, 'fig-text fig-mitt');
    s += text(215, 232, slutrad, 'fig-text fig-mitt fig-dampad');
    const [varm, kall] = aVarm ? [a, b] : [b, a];
    return { svg: svg(440, 240, s), beskrivning: `Först: ${a.namn} ${tal(a.temp)} ${enhet} och ${b.namn} ${tal(b.temp)} ${enhet}. ` +
      `En pil visar att värme flödar från det som är ${tal(varm.temp)} ${enhet} till det som är ${tal(kall.temp)} ${enhet}. Sedan: ${sedan} båda, ${slutrad}.` };
  });

  /* Kraftpilar: krafterna på ett föremål, ritade från dess mitt. Pilens riktning är kraftens riktning och dess
     längd är proportionell mot storleken (den största kraften får den längsta pilen). */
  const RIKTNING = { upp: 90, ner: 270, hoger: 0, vanster: 180, 'höger': 0, 'vänster': 180 };
  const RIKTORD = { 90: 'uppåt', 270: 'nedåt', 0: 'åt höger', 180: 'åt vänster' };
  Bok.figur('kraftpilar', d => {
    const krafter = d.krafter || fel('kraftpilar behöver krafter: [{namn, riktning, storlek}]');
    if (!krafter.length) fel('kraftpilar behöver minst en kraft');
    const enhet = d.enhet || 'N', form = (d.foremal && d.foremal.form) || 'lada';
    const grader = g => ((g % 360) + 360) % 360;
    const vinkel = r => grader(typeof r === 'number' ? r : RIKTNING[r] != null ? RIKTNING[r] : fel(`kraftpilar: okänd riktning ”${r}”`));
    const riktord = g => RIKTORD[g] || `i riktningen ${g}°`;
    // Föremålet är litet (64 × 48). Den största kraften får längden L; en kraft under ungefär en tredjedel av den
    // största ritas över föremålet. Figurens höjd följer krafterna, så att en figur med bara vågräta krafter blir låg.
    const B = 440, L = 104, bh = 24, cx = 220, KANT = 12;
    const storst = Math.max(...krafter.map(k => k.storlek || 1));
    const varde = m => m != null ? `${tal(m)} ${enhet}` : '';
    const pilar = krafter.map(k => ({ namn: k.namn, g: vinkel(k.riktning), m: k.storlek, klass: '' }));
    const beskr = pilar.map(p => `${p.namn}${p.m != null ? ' ' + varde(p.m) : ''} ${riktord(p.g)}`);
    if (d.resultant) {
      let rx = 0, ry = 0;
      krafter.forEach(k => { const v = vinkel(k.riktning) * Math.PI / 180, m = k.storlek || 0; rx += m * Math.cos(v); ry += m * Math.sin(v); });
      const m = Math.round(Math.hypot(rx, ry) * 100) / 100;
      if (m > 0) {
        const g = grader(Math.round(Math.atan2(ry, rx) * 180 / Math.PI));
        // Parallell med en av krafterna: resultanten ritas en bit vid sidan om, med etiketten på andra sidan.
        pilar.push({ namn: 'Resultant', g, m, klass: 'fig-resultant', bredvid: pilar.some(p => p.g === g) });
        beskr.push(`Resultanten ${varde(m)} ${riktord(g)}`);
      } else beskr.push('krafterna tar ut varandra');
    }
    // Lägen i förhållande till föremålets mitt
    for (const p of pilar) {
      const v = p.g * Math.PI / 180, l = Math.max(16, L * (p.m || storst) / storst);   // 16: pilspetsens egen längd
      p.lodrat = Math.abs(Math.sin(v)) >= Math.abs(Math.cos(v));
      p.x1 = p.bredvid ? (p.lodrat ? -18 : 0) : 0; p.y1 = p.bredvid && !p.lodrat ? 18 : 0;
      p.x2 = p.x1 + l * Math.cos(v); p.y2 = p.y1 - l * Math.sin(v);
    }
    const overst = Math.min(-bh, ...pilar.map(p => p.y2 - 6)), nederst = Math.max(bh + (d.underlag ? 13 : 0), ...pilar.map(p => p.y2 + 6));
    const cy = KANT - overst, H = Math.ceil(nederst - overst + 2 * KANT);

    let s = '';
    if (d.underlag) s += `<line class="fig-bord" x1="70" y1="${cy + bh}" x2="370" y2="${cy + bh}"/>` +
      Array.from({ length: 15 }, (_, i) => `<line class="fig-skraffer" x1="${80 + i * 20}" y1="${cy + bh + 1}" x2="${70 + i * 20}" y2="${cy + bh + 12}"/>`).join('');
    s += form === 'boll' ? `<circle class="fig-foremal" cx="${cx}" cy="${cy}" r="${bh + 2}"/>`
      : `<rect class="fig-foremal" x="${cx - 32}" y="${cy - bh}" width="64" height="${2 * bh}" rx="2"/>`;
    if (d.foremal && d.foremal.namn) s += text(cx - 38, cy - bh - 8, d.foremal.namn, 'fig-text fig-hoger fig-dampad');
    for (const p of pilar) {
      const x1 = cx + p.x1, y1 = cy + p.y1, x2 = cx + p.x2, y2 = cy + p.y2;
      s += pil(x1, y1, x2, y2, 9, p.klass);
      if (p.lodrat) {
        // bredvid spetsen, namnet över värdet; resultanten till vänster om pilen
        const ty = y2 < y1 ? y2 + 10 : y2 - 20, tx = p.bredvid ? x2 - 10 : x2 + 10, ank = p.bredvid ? 'fig-hoger' : 'fig-vanster';
        s += text(tx, ty, p.namn, `fig-pil-text ${ank} ${p.klass}`) + (p.m != null ? text(tx, ty + 17, varde(p.m), `fig-text ${ank}`) : '');
      } else {
        // bortom spetsen, på en rad
        const hoger = x2 > x1, tx = x2 + (hoger ? 8 : -8), ank = hoger ? 'fig-vanster' : 'fig-hoger';
        s += `<text x="${f(tx)}" y="${f(y2 + 5)}" class="fig-pil-text fig-halo ${ank} ${p.klass}">${esc(p.namn)}` +
          (p.m != null ? ` <tspan class="fig-varde">${esc(varde(p.m))}</tspan>` : '') + `</text>`;
      }
    }
    s += `<circle class="fig-angrepp" cx="${cx}" cy="${f(cy)}" r="3.5"/>`;
    const vad = (d.foremal && d.foremal.namn) || (form === 'boll' ? 'en boll' : 'en låda');
    return { svg: svg(B, H, s), beskrivning: `Kraftpilar på ${vad}: ${beskr.join(', ')}.` };
  });
})();

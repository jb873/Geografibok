/* PROVDATA för verktyg/bok-grind.js – inte elevinnehåll. Provboken prövar det som det riktiga innehållet inte använder
 * än: en bok per text (texter, innehall/<text>/<nivå>.js) – också en nivå som bara en text har och en text som är
 * "kommer" –, hjälpmedel med adress (också som flik), begrepp som länkar, en fjärde nivå (djupdykning) och
 * kraftpilarna. Den är byggd med mallen precis som ett delkapitel – utan en rad i motorn. */
Bok.delkapitel({
  id: 'fysik-provbok',
  amne: 'Fysik',
  smulor: ['Fysik', 'Provdata'],
  nummer: 9,
  titel: 'Provbok',
  undertitel: 'inte elevinnehåll',
  overrad: 'Provdata för bok-grind',
  kapitel: '../provkapitel.js',               // omslaget (provkapitlet)
  omslag: { undertitel: 'Prov: {text}' },     // omslagets undertitel ur en mall
  texter: [
    { id: 'krafter', titel: 'Krafter', undertitel: 'inte elevinnehåll' },   // alla fyra nivåer, Djupdykning bara här
    { id: 'tryck', titel: 'Tryck' },                                         // bara Standard
    { id: 'energi', titel: 'Energi' }                                        // tom på alla nivåer: "kommer"
  ],
  nivaer: [
    { id: 'enkel', namn: 'Enkel', ikon: '📗' },
    { id: 'standard', namn: 'Standard', ikon: '📘' },
    { id: 'fordjupning', namn: 'Fördjupning', ikon: '📕' },
    { id: 'djupdykning', namn: 'Djupdykning' }
  ],
  standardniva: 'standard',
  hjalpmedel: {
    forelasning:    { href: null },
    ova:            { href: 'hjalpmedel.html?vad=ova&avsnitt={avsnitt}' },
    sjalvskattning: { href: 'hjalpmedel.html?vad=sjalvskattning' },
    begreppslista:  { href: 'hjalpmedel.html?vad=begrepp#{begrepp}' },
    elevbok:        { href: null }
  }
});

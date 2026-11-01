/* PROVDATA för verktyg/bok-grind.js – inte elevinnehåll. Provboken prövar det som det riktiga innehållet inte använder
 * än: hjälpmedel med adress (också som flik), begrepp som länkar, en fjärde nivå (djupdykning) och kraftpilarna. Den
 * är byggd med mallen precis som ett delkapitel – utan en rad i motorn. */
Bok.delkapitel({
  id: 'fysik-provbok',
  amne: 'Fysik',
  smulor: ['Fysik', 'Provdata'],
  nummer: 9,
  titel: 'Provbok',
  undertitel: 'inte elevinnehåll',
  overrad: 'Provdata för bok-grind',
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

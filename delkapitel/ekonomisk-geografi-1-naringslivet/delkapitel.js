/* Ekonomisk geografi, delkapitel 1 Näringslivet – en bok per text (A–D), bokmotorn i bokskal/.
 * Kapitlets sida är delkapitel/ekonomisk-geografi/index.html. Bara data här: titel, texter, nivåer och hjälpmedel.
 * Innehållet ligger i innehall/<text>/<nivå>.js, ordagrant ur kallor/<text>-<nivå>.md (order 17).
 * Den gamla bokversionen (sidformat, v4-text) ligger i Arkiv/naringslivet-gammal-bok/. */
Bok.delkapitel({
  id: 'geografi-ekonomisk-1-naringslivet-bok',
  amne: 'Geografi',
  smulor: [{ text: 'Geografi', href: '../../index.html' }, { text: 'Ekonomisk geografi', href: '../ekonomisk-geografi/index.html' }],
  nummer: 1,
  titel: 'Näringslivet',
  undertitel: 'Sektorer, lokalisering och Sveriges näringsliv',
  overrad: 'Ekonomisk geografi',
  texter: [
    { id: 'a', titel: 'Ekonomisk geografi och näringslivet' },
    { id: 'b', titel: 'Näringslivets sektorer' },
    { id: 'c', titel: 'Lokaliseringsfaktorer' },
    { id: 'd', titel: 'Sveriges näringsliv' }
  ],
  // Plattformens tre nivåer och djupdykningen som fjärde nivå
  nivaer: [{ id: 'enkel', namn: 'Enkel', ikon: '📗' }, { id: 'standard', namn: 'Standard', ikon: '📘' },
    { id: 'fordjupning', namn: 'Fördjupning', ikon: '📕' }, { id: 'djupdykning', namn: 'Djupdykning' }],
  // Hjälpmedlen finns inte än: utan adress visas de som "kommer".
  hjalpmedel: {
    forelasning:    { href: null },
    ova:            { href: null },
    sjalvskattning: { href: null },
    begreppslista:  { href: null },
    elevbok:        { href: null }
  }
});

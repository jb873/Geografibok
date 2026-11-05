/* Ekonomisk geografi, delkapitel 1 Näringslivet – en bok per text (A–D), bokmotorn i bokskal/.
 * Kapitlets sida är delkapitel/ekonomisk-geografi/index.html. Bara data här: titel, texter, nivåer och hjälpmedel.
 * Innehållet ligger i innehall/<text>/<nivå>.js, ordagrant ur kallor/<text>-<nivå>.md (order 17). Djupdykningarna är
 * plattformens egna sidor (delkapitel/ekonomisk-geografi/djupdykning-*.html), länkade under Vill du veta mer? (order 18).
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
  // Nivåerna är plattformens tre (Enkel, Standard, Fördjupning). Djupdykningarna är egna sidor, länkade under Vill du veta mer?
  villVetaMer: [
    {href: "../ekonomisk-geografi/djupdykning-tshirtens-resa.html",ikon: "👕",titel: "En t-shirts resa – från bomullsåker till butikshylla",sammanfattning: "Bomullen kan ha vuxit i Indien och tröjan sytts i Bangladesh. Följ en t-shirt jorden runt och se vem som får pengarna du betalar."},
    {href: "../ekonomisk-geografi/djupdykning-robotarna.html",ikon: "🤖",titel: "Robotarna kommer – när maskinerna tar över arbetet",sammanfattning: "Sverige har nästan tre gånger fler industrirobotar per anställd än världsgenomsnittet. Försvinner jobben – eller förändras de?"},
    {href: "../ekonomisk-geografi/djupdykning-gnosjoandan.html",ikon: "🔧",titel: "Gnosjöandan – hur en fattig bygd blev en industribygd",sammanfattning: "Stenig mark, inga naturtillgångar – och ändå nästan 900 företag. Hur blev Gnosjö ett av Sveriges mest kända industriområden?"},
    {href: "../ekonomisk-geografi/djupdykning-ikea.html",ikon: "🪑",titel: "IKEA – från Agunnaryd till världen",sammanfattning: "En sjuttonårig pojke, en mjölkbil och ett bord som inte fick plats i bilen. Så blev ett postorderföretag i Småland ett av världens största företag."}
  ],
  // Hjälpmedlen finns inte än: utan adress visas de som "kommer".
  hjalpmedel: {
    forelasning:    { href: null },
    ova:            { href: null },
    sjalvskattning: { href: null },
    begreppslista:  { href: null },
    elevbok:        { href: null }
  }
});

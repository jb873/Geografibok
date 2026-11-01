/* Ekonomisk geografi, avsnitt 2 Näringslivets sektorer – Standard-nivåns bok.
 * Joachims text, strukturerad till bokformatet (en idé per sida, påstående-rubriker, punktlistor) och kortad från
 * 1 172 till ca 750 ord (ram 600–800): överlapp med avsnitt 1 struket (privata/offentliga tjänster, förädling,
 * inledningen om att näringslivet ser olika ut) och enskilda exempel. Begreppen (*så här*) = de fetade i originalet.
 * En bok per avsnitt: avsnittsnumret står i hubbens banner, därför numrerad: false här. */
Bok.niva('standard', {
  avsnitt: [
    {
      id: 'sektorer', titel: 'Näringslivets sektorer', numrerad: false,
      sidor: [
        { titel: 'Näringslivet delas in i fyra sektorer', block: [
          { typ: 'text', text: 'För att förstå hur ett lands näringsliv är uppbyggt brukar man dela in det i fyra sektorer:' },
          { typ: 'punkter', punkter: [
            'den *primära sektorn* – naturens råvaror',
            'den *sekundära sektorn* – förädling och tillverkning',
            'den *tertiära sektorn* – service och tjänster',
            'den *kvartära sektorn* – kunskap och forskning.'
          ] },
          { typ: 'text', text: 'Hur stor andel av de sysselsatta som arbetar i varje sektor ger en bild av landets ekonomiska utveckling.' }
        ] },
        { titel: 'Den primära sektorn hämtar råvaror från naturen', block: [
          { typ: 'text', text: 'Råvarorna används direkt eller förädlas inom industrin. Sektorn delas in i fyra näringar:' },
          { typ: 'punkter', punkter: [
            '*Jordbruk* – odlar grödor och föder upp djur, till exempel spannmål, grönsaker, kött och mjölk.',
            '*Fiske* – fångar fisk och andra vattenlevande djur.',
            '*Skogsbruk* – avverkar träd som blir virke, papper och möbler.',
            '*Gruvdrift* – bryter mineral och malmer ur berggrunden.'
          ] }
        ] },
        { titel: 'Naturen avgör var fiske, skogsbruk och gruvdrift finns', block: [
          { typ: 'text', text: 'Där kalla, näringsrika havsströmmar stiger mot ytan finns ofta stora fiskbestånd. Norge och Island är exempel på länder där fisket har stor ekonomisk betydelse.' },
          { typ: 'text', text: 'Sverige och Finland har stora skogar och en omfattande skogsindustri. I Sverige bryts dessutom järnmalm, bland annat i Kiruna och Malmberget.' }
        ] },
        { titel: 'I rika länder arbetar få i den primära sektorn', block: [
          { typ: 'text', text: 'I ekonomiskt utvecklade länder har maskiner och modern teknik ersatt mycket av det arbete som människor tidigare gjorde. I Sverige arbetar bara några få procent i den primära sektorn.' },
          { typ: 'text', text: 'I många låginkomstländer är jordbruket däremot fortfarande den viktigaste arbetsgivaren. Där kan över hälften av de sysselsatta arbeta i den primära sektorn.' }
        ] },
        { titel: 'Den sekundära sektorn förädlar råvaror till produkter', block: [
          { typ: 'text', text: 'Den sekundära sektorn omfattar framför allt industri och tillverkning. Även byggverksamhet räknas hit.' },
          { typ: 'text', text: 'Förädlingen ökar råvarornas värde. Ett land som förädlar sina egna råvaror kan därför skapa fler arbetstillfällen och få större inkomster än om det bara exporterar råvarorna.' }
        ] },
        { titel: 'Industrin tillverkar halvfabrikat och färdiga varor', block: [
          { typ: 'punkter', punkter: [
            '*Halvfabrikat* har bearbetats men ska användas i ytterligare tillverkning, till exempel virke och stål.',
            '*Färdiga varor|färdig vara* är klara att användas eller säljas, till exempel möbler, bilar och kläder.'
          ] },
          { typ: 'text', text: 'Många industrier är beroende av *underleverantörer|underleverantör*, företag som tillverkar delar åt andra företag. En bil består av tusentals delar från olika tillverkare och länder.' }
        ] },
        { titel: 'Robotar och utflyttning har förändrat industrin', block: [
          { typ: 'text', text: 'Moderna fabriker använder robotar och automatiserade maskiner som tillverkar stora mängder med relativt få anställda.' },
          { typ: 'text', text: 'Många företag har också flyttat tillverkning till länder där arbetskraften är billigare. En produkt kan därför utvecklas i ett land, tillverkas i ett annat och säljas över hela världen.' }
        ] },
        { titel: 'Den tertiära sektorn erbjuder service och tjänster', block: [
          { typ: 'text', text: 'Den tertiära sektorn producerar tjänster i stället för fysiska varor. Den är mycket omfattande. Hit hör *service och upplevelser*, som hotell, restauranger, turism och frisörer, men också handel, banker, transporter, skolor, sjukvård och polis.' },
          { typ: 'text', text: 'Både de privata och de offentliga tjänsterna från förra avsnittet hör alltså till den tertiära sektorn.' }
        ] },
        { titel: 'Tjänstesektorn växer när jordbruk och industri blir effektivare', block: [
          { typ: 'text', text: 'När jordbruk och industri blir effektivare behövs färre anställda för att producera samma mängd varor. Samtidigt ökar ofta efterfrågan på utbildning, sjukvård, handel och transporter.' },
          { typ: 'text', text: 'Därför arbetar en stor del av befolkningen i ekonomiskt utvecklade länder i den tertiära sektorn. I Sverige gäller det en tydlig majoritet av de sysselsatta.' }
        ] },
        { titel: 'Den kvartära sektorn producerar kunskap', block: [
          { typ: 'text', text: 'Den kvartära sektorn arbetar med kunskap, forskning, information och teknisk utveckling. Den räknas ofta som en särskild del av tjänstesektorn.' },
          { typ: 'punkter', punkter: [
            '*Informationsteknik* – till exempel datorprogram, AI och skydd mot cyberattacker.',
            '*Forskning och utveckling* – ny kunskap, nya produkter och metoder, till exempel läkemedel och teknik som minskar utsläppen.'
          ] }
        ] },
        { titel: 'Forskning utvecklar de andra sektorerna', block: [
          { typ: 'text', text: 'Forskare kan till exempel ta fram grödor som ger större skördar eller klarar torka bättre. Så bidrar den kvartära sektorn till att utveckla de andra sektorerna.' },
          { typ: 'text', text: 'Sektorn kräver ofta högutbildad arbetskraft, avancerad teknik och stora investeringar. Den är särskilt viktig i ekonomiskt utvecklade länder, som Sverige.' }
        ] },
        { titel: 'Sektorerna förändras när ett land utvecklas', block: [
          { typ: 'punkter', punkter: [
            'Där jordbruket dominerar arbetar många i den primära sektorn.',
            'När jordbruket moderniseras och industrier växer fram börjar fler arbeta i den sekundära sektorn.',
            'När industrin automatiseras växer den tertiära sektorn, och forskning och teknisk utveckling blir allt viktigare.'
          ] },
          { typ: 'text', text: 'I Sverige arbetade en stor del av befolkningen i jordbruket i mitten av 1800-talet. Industrialiseringen förändrade näringslivet, och under 1900-talet växte tjänstesektorn kraftigt.' }
        ] },
        { titel: 'Sektorerna säger inte allt om ett lands ekonomi', block: [
          { typ: 'text', text: 'Alla länder följer inte samma utveckling. Ett land med stora olje- eller mineraltillgångar kan ha en ekonomiskt viktig primär sektor fast få arbetar där. Ett land kan också ha mycket industri utan att vara rikt.' },
          { typ: 'text', text: 'Fördelningen mellan sektorerna ger viktiga ledtrådar om ett lands ekonomi, men den räcker inte ensam för att avgöra hur utvecklat eller rikt landet är.' },
          { typ: 'lank', till: ['ova', 'sjalvskattning'] }
        ] }
      ]
    }
  ]
});

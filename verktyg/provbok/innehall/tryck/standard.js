/* PROVDATA för verktyg/bok-grind.js – inte elevinnehåll. Text B: en egen bok, bara på standardnivån (Djupdykning
 * och de andra nivåerna är "kommer" för den här texten). Skriven i strömformatet (block, inga sidor): grinden prövar
 * en sidbrytning och regelkonflikten – ett stycke och en figur som inte ryms tillsammans på en sida – och
 * rörelsespåren (alla fyra rörelsetyperna, med och utan tider, 4–8 prickar), kraftparen (drag och knuff, med och
 * utan värde) och kraftpilar utan värden med en gemensam skala. */
Bok.niva('standard', {
  avsnitt: [
    {
      id: 'tryck', titel: 'Tryck',
      block: [
        { typ: 'rubrik', text: 'Provrubrik i en egen bok' },
        { typ: 'text', id: 'fore-brytning', text: 'Provtext: den här texten är en egen bok, med en egen innehållsförteckning. Den är skriven som en ström av block, och motorn bryter sidorna.' },
        { typ: 'sidbrytning' },
        { typ: 'rubrik', id: 'efter-brytning', text: 'Provrubrik efter en sidbrytning' },
        { typ: 'text', text: 'Provtext: rubriken ovanför börjar en ny sida, eftersom en sidbrytning står före den.' },
        { typ: 'rubrik', text: 'Ett långt stycke och en figur' },
        { typ: 'text', id: 'langt-stycke', text: 'Provtext: det här stycket är långt med flit. Tillsammans med figuren efter det ryms det inte på en sida, så stycket stannar där det står och figuren börjar nästa sida. Figuren delas aldrig. Provtext som fyller ut stycket, så att det blir ungefär två tredjedelar av en sida. Provtext som fyller ut stycket, så att det blir ungefär två tredjedelar av en sida. Provtext som fyller ut stycket, så att det blir ungefär två tredjedelar av en sida. Provtext som fyller ut stycket, så att det blir ungefär två tredjedelar av en sida. Provtext som fyller ut stycket, så att det blir ungefär två tredjedelar av en sida. Provtext som fyller ut stycket, så att det blir ungefär två tredjedelar av en sida. Provtext som fyller ut stycket, så att det blir ungefär två tredjedelar av en sida.' },
        { typ: 'figur', id: 'figur-efter', namn: 'flyter_sjunker', foremal: [
          { namn: 'Kork', densitet: 0.25 },
          { namn: 'Sten', densitet: 2.6 }
        ] },
        // Rörelsespåret: grinden mäter att avstånden följer rörelsetypen (lika / växande / krympande / ojämna)
        { typ: 'rubrik', text: 'Provrubrik: rörelsespår' },
        { typ: 'text', text: 'Provtext: likformig rörelse med tiderna under prickarna.' },
        { typ: 'figur', id: 'spar-likformig', namn: 'rorelsespar', rorelse: 'likformig', tider: true },
        { typ: 'text', text: 'Provtext: accelererande rörelse, åtta prickar.' },
        { typ: 'figur', id: 'spar-accelererande', namn: 'rorelsespar', rorelse: 'accelererande', prickar: 8 },
        { typ: 'text', text: 'Provtext: retarderad rörelse med tiderna – de två sista prickarna nästan ihop.' },
        { typ: 'figur', id: 'spar-retarderad', namn: 'rorelsespar', rorelse: 'retarderad', tider: true },
        { typ: 'text', text: 'Provtext: olikformig rörelse, fyra prickar.' },
        { typ: 'figur', id: 'spar-olikformig', namn: 'rorelsespar', rorelse: 'olikformig', prickar: 4, bildtext: 'Provbildtext under ett rörelsespår.' },
        // Tal och enhet: skrivet med vanliga mellanslag – motorn gör dem hårda, så att raden aldrig bryts där
        { typ: 'text', id: 'tal-och-enhet', text: 'Provtext: resultanten blir 16 − 6 = 10 N, och järn smälter vid 1 538 °C. Farten är 5 m/s, eller 18 km/h.' },
        // Symboler och enheter i rubriker och tabellhuvuden: grinden prövar att g och N/kg står i vanlig stil med rätt
        // skiftläge (inte kapitäler, där g blir G)
        { typ: 'rubrik', text: 'Provrubrik: tyngdfaktorn g i N/kg' },
        { typ: 'underrubrik', text: 'Provunderrubrik: F = m · g' },
        { typ: 'tabell', rubriker: ['Prov', 'g (N/kg)', 'm (kg)'], rader: [['Jorden', '9,8', '1'], ['Månen', '1,6', '1']] },
        // Lutande plan (Galileos tankeexperiment) med två steg och motorns egen beskrivning
        { typ: 'text', text: 'Provtext: lutande plan i två steg.' },
        { typ: 'figur', id: 'lutande-plan-2', namn: 'lutande_plan', steg: 2, bildtext: 'Provbildtext under de lutande planen.' },
        // Stoppsträckan med ett decimaltal och en markering, och friktion i två paneler (grinden mäter båda)
        { typ: 'text', text: 'Provtext: stoppsträckan i två rader.' },
        { typ: 'figur', id: 'stoppstracka-prov', namn: 'stoppstracka', rader: [{ fart: 'Prov 1', reaktion: 6.5, broms: 3 }, { fart: 'Prov 2', reaktion: 12, broms: 10 }],
          markering: { varde: 15, text: 'provmärke' }, enhet: 'm' },
        { typ: 'text', text: 'Provtext: två ytor i förstoring.' },
        { typ: 'figur', id: 'friktion-paneler', namn: 'friktion', paneler: [{ rubrik: 'Prov grov', foremal: 'Låda', underlag: 'Golv', ytor: 'grov' }, { rubrik: 'Prov slät', foremal: 'Låda', underlag: 'Is', ytor: 'slat' }] },
        // Den fallande hissen och Newtons kanon med motorns egna beskrivningar
        { typ: 'text', text: 'Provtext: den fallande hissen.' },
        { typ: 'figur', id: 'fallande-hiss-prov', namn: 'fallande_hiss' },
        { typ: 'text', text: 'Provtext: Newtons kanon.' },
        { typ: 'figur', id: 'newtons-kanon-prov', namn: 'newtons_kanon', bildtext: 'Provbildtext under kanonen.' },
        // Kraftparen: grinden mäter att pilarna är lika långa, motriktade och börjar i var sitt föremåls mitt
        { typ: 'rubrik', text: 'Provrubrik: kraftpar' },
        { typ: 'text', text: 'Provtext: ett kraftpar med snöre, med värdet.' },
        { typ: 'figur', id: 'par-drag', namn: 'kraftpar', satt: 'drag', foremal: [{ namn: 'Provföremål A' }, { namn: 'B' }],
          krafter: ['A dras mot B', 'B dras mot A'], storlek: 12.5, enhet: 'N' },
        { typ: 'text', text: 'Provtext: ett kraftpar där föremålen knuffar varandra, långa namn, utan värde.' },
        { typ: 'figur', id: 'par-knuff', namn: 'kraftpar', satt: 'knuff', foremal: [{ namn: 'Provföremål nr 1' }, { namn: 'Provföremål nr 2' }],
          krafter: ['Kraften på föremål 1', 'Kraften på föremål 2'], bildtext: 'Provbildtext under ett kraftpar.' },
        // Kraftpilar utan värden och med en gemensam skala: 5 av 20 ger en fjärdedel så lång pil som 20 skulle ge
        { typ: 'text', text: 'Provtext: kraftpilar utan värden, med skalan 20.' },
        { typ: 'figur', id: 'pilar-utan-varden', namn: 'kraftpilar', foremal: { form: 'lada', namn: 'Provlåda' }, underlag: true, varden: false, skala: 20, resultant: true,
          krafter: [{ namn: 'Framåt', riktning: 'hoger', storlek: 10 }, { namn: 'Bakåt', riktning: 'vanster', storlek: 5 }] },
        // Friktion: ytorna i förstoring, med pilar (som i texten) och utan pilar, grova ytor och andra namn
        { typ: 'text', text: 'Provtext: friktion i förstoring.' },
        { typ: 'figur', id: 'friktion-pilar', namn: 'friktion', bildtext: 'Provbildtext under friktionen.' },
        { typ: 'text', text: 'Provtext: friktion utan pilar, grova ytor.' },
        { typ: 'figur', id: 'friktion-grov', namn: 'friktion', foremal: 'Låda', underlag: 'Hylla', pilar: false, ytor: 'grov' },
        // Bildpilar: ett utsnitt av fotot (avsnittssida III), två lika långa pilar, beskrivningen ur data
        { typ: 'text', text: 'Provtext: ett foto med kraftpilar, ett utsnitt.' },
        { typ: 'figur', id: 'bildpilar-utsnitt', namn: 'bildpilar', bild: 'bilder/block-rep.jpg',
          bredd: 1672, hojd: 941, utsnitt: [600, 380, 900, 360],
          pilar: [{ namn: 'provpil 1', fran: [690, 503], till: [950, 503], etikett: [820, 460] },
                  { namn: 'provpil 2', fran: [1255, 525], till: [995, 525] }],
          lika: [[0, 1]], beskrivning: 'Provbeskrivning av fotot.', bildtext: 'Provbildtext under fotot.' },
        { typ: 'lank', till: ['ova'] }
      ]
    }
  ]
});

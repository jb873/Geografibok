/* Ekonomisk geografi, avsnitt 3 Lokaliseringsfaktorer – Standard-nivåns bok.
 * Joachims text, strukturerad till bokformatet (en idé per sida, påstående-rubriker, punktlistor) och kortad från
 * 1 260 till ca 800 ord (ram 600–800). Struket: sockerbruket, Lund/Malmö, Storbritanniens stenkol, Volvo i Göteborg,
 * avslutande "det visar"-meningar och upprepningar. Begreppet (*så här*) = det fetade i originalet.
 * En bok per avsnitt: avsnittsnumret står i hubbens banner, därför numrerad: false här. */
Bok.niva('standard', {
  avsnitt: [
    {
      id: 'lokalisering', titel: 'Lokaliseringsfaktorer', numrerad: false,
      sidor: [
        { titel: 'Lokaliseringsfaktorer avgör var företag ligger', block: [
          { typ: 'text', text: 'Varför ligger många sågverk nära stora skogsområden? Varför finns högteknologiska företag ofta i universitetsstäder? Och varför tillverkas många av våra kläder långt bort från Sverige?' },
          { typ: 'text', text: 'Olika platser erbjuder olika förutsättningar för produktion, transporter och försäljning. De förhållanden som påverkar var ett företag etablerar sin verksamhet kallas *lokaliseringsfaktorer|lokaliseringsfaktor*.' }
        ] },
        { titel: 'Företag söker den plats där verksamheten blir mest lönsam', block: [
          { typ: 'text', text: 'Det kan handla om att minska transportkostnaderna, få tillgång till lämplig arbetskraft eller finnas nära kunderna. Vilka faktorer som väger tyngst beror på verksamheten. Här tar vi upp fyra viktiga:' },
          { typ: 'punkter', punkter: ['närhet till råvaror', 'närhet till arbetskraft', 'närhet till energi', 'närhet till marknaden.'] }
        ] },
        { titel: 'Tunga råvaror förädlas nära råvarukällan', block: [
          { typ: 'text', text: 'Om råvarorna väger mer än den färdiga produkten kan industrin minska sina transportkostnader genom att ligga nära råvaran.' },
          { typ: 'text', text: 'Sågverk ligger därför ofta i skogsrika områden. Stockar är stora och tunga att transportera. Om de sågas upp till virke nära skogen blir transporterna effektivare.' }
        ] },
        { titel: 'Behövs flera råvaror kan läget mellan dem vara bäst', block: [
          { typ: 'text', text: 'Vissa industrier behöver flera råvaror som finns på olika platser. Då kan fabriken ligga mellan råvarukällorna eller där transportmöjligheterna är goda.' },
          { typ: 'text', text: 'Stålindustrin i Luleå använder järnmalm från Malmfälten, som kommer med järnväg, och importerat kol, som kommer med fartyg till hamnen. Det är kombinationen av råvaror, hamn och järnväg som har gjort Luleå viktigt för svensk stålproduktion.' }
        ] },
        { titel: 'Högteknologiska företag söker utbildad arbetskraft', block: [
          { typ: 'text', text: 'Högteknologiska företag behöver ingenjörer, forskare, programmerare och andra specialister. Därför etablerar de sig gärna nära universitet och i större städer.' },
          { typ: 'text', text: 'Saab har till exempel en stor verksamhet i Linköping, nära universitetet, och Kista i Stockholm har blivit ett centrum för informationsteknik. När många företag i samma bransch samlas kan de dra nytta av varandras kunskaper, arbetskraft och forskning.' }
        ] },
        { titel: 'Tillverkning med mycket handarbete söker låga löner', block: [
          { typ: 'text', text: 'I vissa industrier är lönerna en stor del av kostnaden. Många företag har därför flyttat produktion till länder där lönerna är lägre. En stor del av kläderna som säljs i Europa tillverkas i Bangladesh, Indien, Kina och Vietnam.' },
          { typ: 'text', text: 'Låga löner gör produktionen billigare, men arbetsvillkoren kan vara dåliga, med långa arbetsdagar och bristande säkerhet.' }
        ] },
        { titel: 'Robotar och nya krav kan flytta produktionen tillbaka', block: [
          { typ: 'text', text: 'Under senare år har vissa företag flyttat produktion närmare sina marknader eller tillbaka till hemlandet. Det ger bättre kontroll över kvalitet, leveranser, miljökrav och arbetsvillkor.' },
          { typ: 'text', text: 'Robotar och automatisering gör dessutom att färre människor behövs i fabrikerna. Då får låga löner mindre betydelse.' }
        ] },
        { titel: 'Förr låg industrin där vattenkraften och träkolet fanns', block: [
          { typ: 'text', text: 'Under den tidiga industrialiseringen drevs många fabriker med vattenkraft. Kvarnar, sågverk och järnbruk byggdes därför vid forsar och strömmande vatten.' },
          { typ: 'text', text: 'I Sverige behövdes också stora mängder träkol för att framställa järn. Många järnbruk växte därför fram i skogsrika områden. Även när energin ändrades blev många industrier kvar på sina gamla platser.' }
        ] },
        { titel: 'Elintensiv industri söker billig el', block: [
          { typ: 'text', text: 'Vissa industrier behöver mycket stora mängder el. Aluminium utvinns till exempel ur aluminiumoxid med hjälp av elektrisk ström.' },
          { typ: 'text', text: 'Island har stora aluminiumsmältverk som drivs med el från vattenkraft och geotermisk energi, trots att råvaran importeras. I Sverige finns aluminiumsmältverket Kubal i Sundsvall. En industri kan alltså ligga långt från sina råvaror om tillgången till energi är tillräckligt god.' }
        ] },
        { titel: 'Tunga slutprodukter tillverkas nära kunderna', block: [
          { typ: 'text', text: 'Marknaden är de människor och företag som köper varorna eller tjänsterna. Om den färdiga produkten är tung kan det vara billigare att tillverka den nära marknaden.' },
          { typ: 'text', text: 'Läskedrycker består mest av vatten, som är tungt. Därför transporteras koncentratet, och drycken blandas nära kunderna. Stora biltillverkare har av liknande skäl fabriker i flera världsdelar.' }
        ] },
        { titel: 'Färskvaror och tjänster behöver ofta finnas nära kunderna', block: [
          { typ: 'text', text: 'Mejerier och bagerier har ofta legat nära större städer, eftersom färskvaror snabbt blir sämre. Med kyltransporter och bättre förpackningar kan de i dag fraktas längre.' },
          { typ: 'text', text: 'Frisörer, restauranger och bilverkstäder måste finnas där kunderna är. Banker och försäkringsbolag kan däremot nå kunder över hela världen via internet.' }
        ] },
        { titel: 'Oftast avgör flera faktorer tillsammans', block: [
          { typ: 'text', text: 'Det är sällan en enda lokaliseringsfaktor som avgör. En fabrik kan behöva både billig energi, utbildad arbetskraft, goda transporter och närhet till kunderna. Företaget väljer då platsen med den bästa kombinationen.' },
          { typ: 'text', text: 'Lokaliseringsfaktorerna förändras också över tid. Nya transporter, teknisk utveckling, automatisering och internationell handel kan göra att en plats förlorar sin fördel.' },
          { typ: 'lank', till: ['ova', 'sjalvskattning'] }
        ] }
      ]
    }
  ]
});

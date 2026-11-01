/* Ekonomisk geografi, delkapitel 1 Näringslivet – Standard-nivåns bok (texterna A–D).
 * v4: byggd direkt ur källtexterna (Joachims texter A–C, text D från ChatGPT efter Joachims beskrivning) med
 * kalla/bygg-standard.js ur kalla/*.md: texten är oförändrad, rubrikerna är källans (## = sidrubrik, fet rad =
 * underrubrik), begreppen är källans fetade ord. Hela meningar i fetstil har reducerats till begreppet.
 * Sidbrytning efter längd, så att sidorna fylls. Tidigare versioner: se git-historiken. */
Bok.niva('standard', {
  avsnitt: [
    {
      id: 'naringslivet', titel: 'Ekonomisk geografi och näringslivet',
      sidor: [
        { titel: 'Vad är ekonomisk geografi?', block: [
          { typ: 'text', text: 'Varför finns det stora industrier på vissa platser medan andra områden domineras av jordbruk? Varför tillverkas många av de varor vi köper i länder långt bort från Sverige? Och varför är vissa länder rika medan andra är fattiga?' }
        ] },
        { block: [
          { typ: 'text', text: 'Detta är frågor som vi studerar inom *ekonomisk geografi*. Det handlar om hur människor använder jordens resurser för att producera varor och tjänster och hur ekonomisk verksamhet är fördelad mellan olika platser i världen.' },
          { typ: 'text', text: 'Förutsättningarna skiljer sig mellan olika länder och områden. Tillgången till naturresurser, arbetskraft, kapital, teknik och transporter påverkar vilka verksamheter som kan utvecklas. Samtidigt förändras näringslivet när ny teknik utvecklas, människor flyttar och handeln mellan länder ökar.' },
          { typ: 'text', text: 'Genom att studera ekonomisk geografi kan vi förstå varför näringslivet ser olika ut i världen och hur människor, företag och länder är beroende av varandra.' }
        ] },
        { titel: 'Näringslivet – samhällets ekonomiska verksamhet', block: [
          { typ: 'text', text: 'I alla samhällen behöver människor mat, kläder, bostäder och många andra saker. Vi behöver också tjänster som sjukvård, utbildning, transporter och kommunikation. För att tillgodose dessa behov måste varor tillverkas och tjänster utföras.' },
          { typ: 'text', text: '*Näringslivet|näringsliv* är den samlade ekonomiska verksamhet där varor och tjänster produceras och säljs. Det omfattar exempelvis jordbruk, industrier, byggföretag, butiker, banker och transportföretag. Näringslivet brukar framför allt förknippas med företag, men varor och tjänster produceras också inom den offentliga sektorn.' }
        ] },
        { block: [
          { typ: 'text', text: 'Näringslivet skapar arbetstillfällen och inkomster. Människor arbetar och får lön, företag säljer sina produkter och staten får skatteinkomster som bland annat används för att finansiera skolor, sjukvård och vägar.' },
          { typ: 'text', text: 'För att förstå hur näringslivet fungerar behöver vi känna till några grundläggande begrepp.' }
        ] },
        { titel: 'Konsumtion – att använda varor och tjänster', block: [
          { typ: 'text', text: 'Varje dag konsumerar vi olika varor och tjänster. När vi äter frukost, använder mobilen, åker buss eller besöker en läkare handlar det om *konsumtion*.' },
          { typ: 'text', text: 'Konsumtion innebär att människor använder varor och tjänster för att tillgodose sina behov och önskemål.' },
          { typ: 'text', text: 'En del av vår konsumtion betalar vi direkt för, exempelvis när vi köper mat eller kläder. Andra tjänster, som undervisning i skolan och sjukvård, finansieras till stor del genom skatter.' }
        ] },
        { block: [
          { typ: 'text', text: 'Konsumtionen påverkar näringslivet eftersom företag och andra verksamheter behöver producera det som människor efterfrågar. När efterfrågan på en vara ökar kan produktionen behöva öka. Om människor slutar köpa en produkt kan företagen i stället behöva minska tillverkningen.' }
        ] },
        { titel: 'Varor – fysiska produkter', block: [
          { typ: 'text', text: '*Varor|vara* är fysiska produkter som tillverkas eller tas fram för att användas eller säljas. Det kan exempelvis vara livsmedel, kläder, möbler, bilar och mobiltelefoner.' },
          { typ: 'text', text: 'För att tillverka varor behövs råvaror. Råvaror är material som kommer från naturen, exempelvis trä från skogen, järnmalm från berggrunden och bomull från bomullsplantor.' },
          { typ: 'text', text: 'Många råvaror måste bearbetas innan de kan användas. Denna process kallas *förädling*. Träd kan förädlas till virke som används för att bygga hus eller tillverka möbler. Järnmalm kan förädlas till järn och stål som används i exempelvis bilar och maskiner.' }
        ] },
        { block: [
          { typ: 'text', text: 'Vissa varor tillverkas i flera steg och i olika länder. En mobiltelefon kan innehålla råvaror från Afrika, komponenter från Asien och teknik som utvecklats i Europa eller USA. Det visar hur produktionen av varor kan knyta samman olika delar av världen.' }
        ] },
        { titel: 'Tjänster – arbete som utförs åt andra', block: [
          { typ: 'text', text: 'Alla verksamheter producerar inte fysiska varor. Många erbjuder i stället *tjänster|tjänst*, vilket innebär att någon utför ett arbete eller erbjuder en service åt andra.' },
          { typ: 'text', text: 'När en frisör klipper hår, en läkare undersöker en patient eller en lärare undervisar elever produceras tjänster. Även transporter, bankverksamhet, hotell och restauranger erbjuder tjänster.' },
          { typ: 'text', text: 'Tjänster kan delas in i två huvudgrupper.' },
          { typ: 'text', text: '*Privata tjänster* erbjuds av företag och finansieras vanligtvis genom att kunderna betalar. Exempel är frisörer, banker, hotell och många butiker.' }
        ] },
        { block: [
          { typ: 'text', text: '*Offentliga tjänster* erbjuds av stat, regioner och kommuner och finansieras huvudsakligen genom skatter. Exempel är polis, kommunala skolor och offentlig sjukvård.' },
          { typ: 'text', text: 'Gränsen mellan privata och offentliga tjänster är inte alltid tydlig. En skola kan exempelvis drivas av ett privat företag men finansieras genom offentliga medel.' }
        ] },
        { titel: 'Produktion – att skapa varor och tjänster', block: [
          { typ: 'text', text: '*Produktion* innebär att varor tillverkas eller att tjänster utförs. All ekonomisk verksamhet bygger på någon form av produktion.' },
          { typ: 'text', text: 'En bonde som odlar vete, en fabrik som tillverkar bilar och en frisör som klipper hår deltar alla i produktionen. Skillnaden är att bonden och fabriken producerar varor medan frisören producerar en tjänst.' },
          { typ: 'text', text: 'För att produktionen ska fungera behövs olika resurser. Naturresurser används som råvaror, människor bidrar med arbetskraft och kunskap, medan maskiner, byggnader och pengar gör det möjligt att organisera och utveckla verksamheten.' }
        ] },
        { block: [
          { typ: 'text', text: 'Produktion och konsumtion är nära sammankopplade. Varor och tjänster produceras för att någon ska använda dem. Samtidigt skapar produktionen arbetstillfällen och inkomster som gör det möjligt för människor att konsumera.' },
          { typ: 'text', text: 'En vara behöver inte produceras i samma land som den konsumeras. Sverige importerar exempelvis kläder, elektronik och livsmedel från andra länder. Samtidigt exporterar svenska företag bland annat fordon, maskiner och läkemedel.' },
          { typ: 'text', text: 'Det innebär att ländernas näringsliv binds samman genom internationell handel.' }
        ] },
        { titel: 'Näringslivet ser olika ut i världen', block: [
          { typ: 'text', text: 'Näringslivet är inte likadant överallt. I vissa länder arbetar en stor del av befolkningen inom jordbruket, medan andra länder har omfattande industriproduktion. I ekonomiskt utvecklade länder arbetar en stor andel av befolkningen med olika tjänster.' },
          { typ: 'text', text: 'Skillnaderna beror bland annat på ländernas naturresurser, utbildningsnivå, tekniska utveckling och ekonomiska förutsättningar.' },
          { typ: 'text', text: 'För att kunna jämföra näringslivet mellan olika länder brukar man dela in produktionen i fyra sektorer: den primära, sekundära, tertiära och kvartära sektorn.' }
        ] },
        { block: [
          { typ: 'text', text: 'Genom att studera hur många människor som arbetar inom dessa sektorer kan vi få en bild av hur ett lands ekonomi är uppbyggd och hur den har förändrats över tid.' },
          { typ: 'lank', till: ['ova', 'sjalvskattning'] }
        ] }
      ]
    },
    {
      id: 'sektorer', titel: 'Näringslivets sektorer',
      sidor: [
        { block: [
          { typ: 'text', text: 'Näringslivet ser olika ut i olika delar av världen. I vissa länder arbetar en stor del av befolkningen med jordbruk, fiske eller gruvdrift. I andra länder arbetar de flesta inom industrin eller med olika tjänster.' },
          { typ: 'text', text: 'För att förstå hur ett lands näringsliv är uppbyggt brukar man dela in det i fyra sektorer: den *primära sektorn*, den *sekundära sektorn*, den *tertiära sektorn* och den *kvartära sektorn*.' }
        ] },
        { block: [
          { typ: 'text', text: 'Genom att undersöka hur stor andel av de sysselsatta som arbetar inom varje sektor kan vi få en bild av landets ekonomiska utveckling. Fördelningen påverkas också av landets naturresurser, tekniska utveckling, utbildningsnivå och handel med andra länder.' }
        ] },
        { titel: '1. Primära sektorn – Naturens råvaror', block: [
          { typ: 'text', text: 'Den primära sektorn omfattar verksamheter som hämtar råvaror från naturen. Råvarorna används antingen direkt eller förädlas till olika produkter inom industrin.' },
          { typ: 'text', text: 'Den primära sektorn delas vanligtvis in i fyra näringar.' },
          { typ: 'text', text: '*Jordbruk* är en av människans äldsta näringar och har stor betydelse för livsmedelsförsörjningen. Genom att odla grödor och föda upp djur producerar jordbruket exempelvis spannmål, grönsaker, kött och mjölk. I många fattiga länder arbetar fortfarande en stor del av befolkningen inom jordbruket.' }
        ] },
        { block: [
          { typ: 'text', text: '*Fiske* innebär att människor fångar fisk och andra vattenlevande djur. Fisket är särskilt betydelsefullt i länder med tillgång till fiskrika hav. Där kalla, näringsrika havsströmmar stiger mot ytan finns ofta goda förutsättningar för stora fiskbestånd. Norge och Island är exempel på länder där fisket har stor ekonomisk betydelse.' },
          { typ: 'text', text: '*Skogsbruk* innebär att skogen används som naturresurs. Träden avverkas och blir råvaror till exempelvis virke, papper och möbler. Sverige och Finland har stora skogstillgångar och en omfattande skogsindustri. Tack vare moderna skogsmaskiner behövs betydligt färre arbetare än tidigare.' }
        ] },
        { block: [
          { typ: 'text', text: '*Gruvdrift* innebär att mineral och malmer bryts ur berggrunden. Järnmalm används exempelvis för att framställa stål, medan koppar behövs i elektriska ledningar och elektronik. Sverige har en lång tradition av gruvdrift, bland annat i Kiruna och Malmberget där järnmalm bryts.' },
          { typ: 'text', text: 'I ekonomiskt utvecklade länder har maskiner och modern teknik ersatt mycket av det arbete som människor tidigare utförde. Därför arbetar en liten andel av befolkningen inom den primära sektorn. I Sverige handlar det om några få procent.' },
          { typ: 'text', text: 'I många låginkomstländer är däremot jordbruket fortfarande den viktigaste arbetsgivaren. I vissa länder arbetar över hälften av de sysselsatta inom den primära sektorn.' }
        ] },
        { titel: '2. Sekundära sektorn – Förädling och tillverkning', block: [
          { typ: 'text', text: 'Den sekundära sektorn omfattar framför allt industri och tillverkning. Här bearbetas råvaror från den primära sektorn och förädlas till produkter som kan användas eller säljas. Även byggverksamhet brukar räknas till den sekundära sektorn.' },
          { typ: 'text', text: 'Genom förädling kan råvarornas ekonomiska värde öka. Järnmalm kan exempelvis förädlas till stål som sedan används för att tillverka bilar, maskiner och verktyg. Ett land som har möjlighet att förädla sina egna råvaror kan därför skapa fler arbetstillfällen och få större inkomster än om råvarorna enbart exporteras.' },
          { typ: 'text', text: 'Inom industrin tillverkas både halvfabrikat och färdiga varor.' }
        ] },
        { block: [
          { typ: 'text', text: '*Halvfabrikat* är produkter som har bearbetats men som ska användas i ytterligare tillverkning. Träd kan exempelvis förädlas till virke som sedan används för att bygga hus eller tillverka möbler. Järnmalm förädlas till stål som används för att tillverka andra produkter.' },
          { typ: 'text', text: 'Många industrier är beroende av *underleverantörer|underleverantör*, alltså företag som tillverkar delar eller komponenter åt andra företag. En bil består exempelvis av tusentals delar som kan komma från olika tillverkare och länder.' },
          { typ: 'text', text: '*Färdiga varor|färdig vara* är produkter som är klara att användas eller säljas till konsumenter. Exempel är möbler, bilar, mobiltelefoner och kläder.' }
        ] },
        { block: [
          { typ: 'text', text: 'Industriproduktionen har förändrats mycket genom teknisk utveckling. Moderna fabriker använder robotar och automatiserade maskiner som kan tillverka stora mängder produkter med relativt få anställda.' },
          { typ: 'text', text: 'Samtidigt har många företag flyttat delar av sin tillverkning till länder där arbetskraften är billigare. Därför kan en produkt utvecklas i ett land, tillverkas i ett annat och säljas över hela världen.' }
        ] },
        { titel: '3. Tertiära sektorn – Service och tjänster', block: [
          { typ: 'text', text: 'Den tertiära sektorn omfattar verksamheter som erbjuder olika former av service och tjänster i stället för att huvudsakligen producera fysiska varor.' },
          { typ: 'text', text: 'Tjänstesektorn är mycket omfattande och kan delas in i flera grupper.' },
          { typ: 'text', text: '*Service och upplevelser* omfattar exempelvis hotell, restauranger, caféer, biografer och turistverksamhet. Hit hör också personlig service som frisörer, flyttfirmor och personliga tränare. Dessa verksamheter erbjuder tjänster som människor använder i sin vardag eller på fritiden.' }
        ] },
        { block: [
          { typ: 'text', text: '*Privata tjänster* erbjuds av företag. Här finns exempelvis handel, banker, försäkringsbolag, transportföretag och medieföretag. Företagen får vanligtvis sina inkomster genom att kunder betalar för deras varor eller tjänster.' },
          { typ: 'text', text: '*Offentliga tjänster* omfattar verksamheter som finansieras och ansvaras för av staten, regionerna eller kommunerna. Hit hör bland annat skolor, sjukvård, äldreomsorg, polis, domstolar och försvar. Verksamheterna finansieras huvudsakligen genom skatter, även om vissa tjänster utförs av privata företag på uppdrag av det offentliga.' }
        ] },
        { block: [
          { typ: 'text', text: 'I ekonomiskt utvecklade länder arbetar en stor del av befolkningen inom den tertiära sektorn. När jordbruk och industri blir mer effektiva behövs färre anställda för att producera samma mängd varor. Samtidigt ökar ofta efterfrågan på utbildning, sjukvård, handel, transporter och andra tjänster.' },
          { typ: 'text', text: 'I Sverige arbetar en tydlig majoritet av de sysselsatta inom tjänstesektorn.' }
        ] },
        { titel: '4. Kvartära sektorn – Kunskap och forskning', block: [
          { typ: 'text', text: 'Den kvartära sektorn omfattar verksamheter som arbetar med kunskap, forskning, information och teknisk utveckling.' },
          { typ: 'text', text: 'Sektorn brukar beskrivas som en särskild del av tjänstesektorn eftersom verksamheterna framför allt producerar kunskap och avancerade tjänster.' },
          { typ: 'text', text: '*Informationsteknik* är en viktig del av den kvartära sektorn. Här utvecklas exempelvis datorprogram, artificiell intelligens (AI) och system för informationssäkerhet. Företag kan utveckla program som skyddar datorer mot cyberattacker eller AI-system som hjälper företag och organisationer att lösa problem.' }
        ] },
        { block: [
          { typ: 'text', text: '*Forskning och utveckling* innebär att universitet, forskningsinstitut och företag arbetar för att skapa ny kunskap och utveckla produkter och metoder. Det kan handla om att utveckla läkemedel mot sjukdomar, teknik som minskar utsläppen av växthusgaser eller effektivare sätt att producera energi.' },
          { typ: 'text', text: 'Inom jordbruket kan forskare exempelvis utveckla grödor som ger större skördar eller klarar torka bättre. På så sätt kan forskning inom den kvartära sektorn bidra till att utveckla verksamheter inom de andra sektorerna.' },
          { typ: 'text', text: 'Den kvartära sektorn är särskilt betydelsefull i många ekonomiskt utvecklade länder. Verksamheterna kräver ofta högutbildad arbetskraft, avancerad teknik och stora investeringar.' }
        ] },
        { block: [
          { typ: 'text', text: 'Sverige är ett exempel på ett land där forskning, teknisk utveckling och kunskapsintensiva företag spelar en viktig roll för ekonomin.' }
        ] },
        { titel: 'Näringslivets sektorer och ekonomisk utveckling', block: [
          { typ: 'text', text: 'Hur människor arbetar förändras när ett land utvecklas ekonomiskt.' },
          { typ: 'text', text: 'I samhällen där jordbruket dominerar arbetar ofta en stor del av befolkningen inom den primära sektorn. När jordbruket moderniseras och industrier växer fram kan fler människor börja arbeta inom den sekundära sektorn.' },
          { typ: 'text', text: 'När industrin senare blir mer automatiserad ökar ofta tjänstesektorns betydelse. I många ekonomiskt utvecklade länder arbetar därför de flesta inom den tertiära sektorn, samtidigt som forskning och teknisk utveckling spelar en allt större roll.' }
        ] },
        { block: [
          { typ: 'text', text: 'Denna utveckling har bland annat skett i Sverige. Under mitten av 1800-talet arbetade en stor del av befolkningen inom jordbruket. Industrialiseringen förändrade sedan näringslivet, och under 1900-talet växte tjänstesektorn kraftigt.' },
          { typ: 'text', text: 'Men alla länder följer inte exakt samma utveckling. Ett land med stora olje- eller mineraltillgångar kan ha en ekonomiskt viktig primär sektor även om få människor arbetar där. Ett land kan också ha omfattande industriproduktion utan att vara ekonomiskt rikt.' },
          { typ: 'text', text: 'Fördelningen mellan sektorerna ger därför viktiga ledtrådar om ett lands ekonomi, men den räcker inte ensam för att avgöra hur utvecklat eller rikt landet är.' },
          { typ: 'lank', till: ['ova', 'sjalvskattning'] }
        ] }
      ]
    },
    {
      id: 'lokalisering', titel: 'Lokaliseringsfaktorer',
      sidor: [
        { block: [
          { typ: 'text', text: 'Varför ligger många sågverk nära stora skogsområden? Varför finns högteknologiska företag ofta i universitetsstäder? Och varför tillverkas många av våra kläder i länder långt bort från Sverige?' },
          { typ: 'text', text: 'Företag kan inte alltid välja sin placering fritt. Olika platser erbjuder olika förutsättningar för produktion, transporter och försäljning. De förhållanden som påverkar var ett företag väljer att etablera sin verksamhet kallas *lokaliseringsfaktorer|lokaliseringsfaktor*.' }
        ] },
        { block: [
          { typ: 'text', text: 'Företag försöker vanligtvis hitta en plats där verksamheten kan bedrivas effektivt och lönsamt. Det kan handla om att minska transportkostnader, få tillgång till lämplig arbetskraft eller finnas nära kunderna.' },
          { typ: 'text', text: 'Vilka faktorer som är viktigast beror på vilken verksamhet företaget bedriver. Vi ska undersöka fyra viktiga lokaliseringsfaktorer.' }
        ] },
        { titel: '1. Närhet till råvaror', block: [
          { typ: 'text', text: 'Många industrier behöver stora mängder råvaror för sin tillverkning. Om råvarorna är tunga, skrymmande eller dyra att transportera kan det vara lönsamt att placera industrin nära råvarukällan.' },
          { typ: 'rubrik', text: 'Tunga och stora råvaror' },
          { typ: 'text', text: 'En viktig faktor är hur mycket det kostar att transportera råvarorna jämfört med den färdiga produkten. Om råvarorna väger mycket men den färdiga produkten väger mindre kan industrin minska sina transportkostnader genom att ligga nära råvaran.' }
        ] },
        { block: [
          { typ: 'text', text: 'Ett exempel är sågverk som ofta ligger i skogsrika områden. Stockar är stora och tunga att transportera. Genom att såga upp dem till virke nära skogen kan transporterna av färdiga produkter bli effektivare.' },
          { typ: 'text', text: 'Även sockerbruk har traditionellt placerats nära områden där sockerbetor odlas. Betorna är tunga och innehåller mycket vatten. Vid tillverkningen utvinns sockret, som väger betydligt mindre än de ursprungliga betorna.' },
          { typ: 'rubrik', text: 'Mellan flera råvaror' },
          { typ: 'text', text: 'Vissa industrier behöver flera olika råvaror som finns på skilda platser. Då kan det vara fördelaktigt att placera fabriken mellan råvarukällorna eller vid en plats med goda transportmöjligheter.' }
        ] },
        { block: [
          { typ: 'text', text: 'Ett exempel är järn- och stålindustrin i Luleå. Där används järnmalm från Malmfälten i norra Sverige och kol som importeras från andra länder för att framställa koks till masugnarna.' },
          { typ: 'text', text: 'Järnmalmen transporteras med järnväg och kolet kommer med fartyg till hamnen. Genom sitt läge vid kusten och tillgången till järnväg har Luleå blivit en viktig plats för svensk stålproduktion.' },
          { typ: 'text', text: 'Det visar att det inte alltid är närheten till en enskild råvara som avgör placeringen. Ibland är det kombinationen av råvaror, hamnar och järnvägar som är viktigast.' }
        ] },
        { titel: '2. Närhet till arbetskraft', block: [
          { typ: 'text', text: 'Företag behöver människor som kan utföra arbetet. Vilken arbetskraft som behövs varierar mellan olika verksamheter. För vissa företag är det viktigast att hitta personal med hög utbildning och särskilda kunskaper. För andra är låga lönekostnader en viktig faktor.' },
          { typ: 'rubrik', text: 'Utbildad arbetskraft' },
          { typ: 'text', text: 'Högteknologiska företag behöver ofta ingenjörer, forskare, programmerare och andra specialister. Därför etablerar de sig gärna i närheten av universitet och större städer där det finns tillgång till utbildad arbetskraft.' }
        ] },
        { block: [
          { typ: 'text', text: 'I Linköping har exempelvis flyg- och försvarsföretaget Saab en omfattande verksamhet. Närheten till Linköpings universitet och tillgången till tekniskt utbildad personal är viktiga förutsättningar.' },
          { typ: 'text', text: 'I Lund och Malmö finns många företag inom läkemedel, medicinsk teknik och forskning. Även Kista i Stockholm har utvecklats till ett betydande centrum för informationsteknik och telekommunikation.' },
          { typ: 'text', text: 'När många företag inom samma bransch samlas på en plats kan de dra nytta av varandras kunskaper, arbetskraft och forskning.' },
          { typ: 'rubrik', text: 'Billig arbetskraft' },
          { typ: 'text', text: 'I vissa industrier utgör lönerna en stor del av produktionskostnaden. Det gäller särskilt tillverkning som kräver mycket manuellt arbete.' }
        ] },
        { block: [
          { typ: 'text', text: 'Därför har många företag flyttat delar av sin produktion till länder där lönerna är lägre. Klädindustrin är ett tydligt exempel. En stor del av de kläder som säljs i Europa tillverkas i länder som Bangladesh, Indien, Kina och Vietnam.' },
          { typ: 'text', text: 'Låga löner kan göra produktionen billigare, men arbetsvillkoren kan ibland vara dåliga. Långa arbetsdagar, bristande säkerhet och låga löner är problem som förekommer inom delar av den globala industrin.' },
          { typ: 'text', text: 'Under senare år har vissa företag börjat flytta produktion närmare sina marknader eller tillbaka till hemlandet. Det kan ge bättre kontroll över kvalitet, leveranser, miljökrav och arbetsvillkor.' }
        ] },
        { block: [
          { typ: 'text', text: 'Samtidigt har robotar och automatisering gjort att färre människor behövs i många fabriker. Därför kan låga löner få mindre betydelse för vissa typer av tillverkning.' }
        ] },
        { titel: '3. Närhet till energi', block: [
          { typ: 'text', text: 'Industrier behöver energi för att driva maskiner, värma upp material och tillverka produkter. Vissa verksamheter använder så mycket energi att tillgången och priset på el eller bränslen blir avgörande för var de placeras.' },
          { typ: 'rubrik', text: 'Historiska energikällor' },
          { typ: 'text', text: 'Under industrialiseringens tidiga utveckling var många fabriker beroende av vattenkraft. Därför byggdes exempelvis kvarnar, sågverk och järnbruk nära forsar och strömmande vatten.' },
          { typ: 'text', text: 'I Sverige användes också stora mängder träkol från skogen vid järnframställning. Många järnbruk växte därför fram i skogsrika områden där det fanns tillgång till både träkol och vattenkraft.' }
        ] },
        { block: [
          { typ: 'text', text: 'I Storbritannien utvecklades stora industriområden nära stenkolsfälten. Stenkol användes för att driva ångmaskiner och som bränsle inom industrin.' },
          { typ: 'text', text: 'Även när energisystemen förändrades blev många industrier kvar på sina ursprungliga platser.' },
          { typ: 'rubrik', text: 'Billig energi' },
          { typ: 'text', text: 'Vissa industrier behöver mycket stora mängder elektricitet. Ett exempel är framställning av aluminium, där aluminium utvinns ur aluminiumoxid med hjälp av elektrisk ström.' },
          { typ: 'text', text: 'Eftersom tillverkningen är mycket energikrävande är tillgången till billig och stabil el viktig.' },
          { typ: 'text', text: 'På Island finns stora aluminiumsmältverk som använder el från framför allt vattenkraft men även geotermisk energi. Landets tillgång till energi har gjort aluminiumindustrin betydelsefull, trots att råvaran importeras.' }
        ] },
        { block: [
          { typ: 'text', text: 'I Sverige finns aluminiumsmältverket Kubal i Sundsvall. Aluminiumframställningen är elintensiv och är beroende av en omfattande och tillförlitlig elförsörjning.' },
          { typ: 'text', text: 'Det visar att en industri ibland kan ligga långt från sina råvaror om tillgången till energi är tillräckligt fördelaktig.' }
        ] },
        { titel: '4. Närhet till marknaden', block: [
          { typ: 'text', text: 'Marknaden är de människor och företag som köper en verksamhets varor eller tjänster. För vissa företag är det viktigast att ligga nära kunderna för att minska transportkostnader, kunna leverera snabbt eller erbjuda personlig service.' },
          { typ: 'rubrik', text: 'Tunga slutprodukter' },
          { typ: 'text', text: 'Om den färdiga produkten är tung eller skrymmande kan det vara billigare att placera tillverkningen nära marknaden.' },
          { typ: 'text', text: 'Ett exempel är läskedrycker. Vid tillverkningen blandas bland annat vatten med koncentrat och andra ingredienser. Eftersom vatten är tungt kan det vara mer ekonomiskt att transportera koncentratet och sedan tillverka drycken nära kunderna.' }
        ] },
        { block: [
          { typ: 'text', text: 'Även bilindustrin påverkas av närheten till marknaden. Stora biltillverkare har ofta fabriker i flera världsdelar för att komma närmare kunderna, minska transportkostnader och anpassa produktionen till olika marknader.' },
          { typ: 'text', text: 'Volvos tillverkning i Göteborg har samtidigt historiska kopplingar till stadens industriella traditioner, arbetskraft och goda transportmöjligheter.' },
          { typ: 'rubrik', text: 'Färskvaror' },
          { typ: 'text', text: 'Varor som snabbt försämras har traditionellt behövt produceras nära kunderna. Det gäller exempelvis mjölkprodukter, färskt bröd och vissa livsmedel.' },
          { typ: 'text', text: 'Därför har mejerier och bagerier ofta funnits i närheten av större städer och tätorter.' }
        ] },
        { block: [
          { typ: 'text', text: 'Med moderna kyltransporter, bättre vägar och effektivare förpackningar kan många färskvaror numera transporteras betydligt längre än tidigare. Närheten till marknaden är därför inte alltid lika avgörande.' },
          { typ: 'rubrik', text: 'Nära kontakt med kunden' },
          { typ: 'text', text: 'Vissa verksamheter behöver finnas nära sina kunder eftersom tjänsterna måste utföras på plats.' },
          { typ: 'text', text: 'Det gäller exempelvis bilverkstäder, frisörer, restauranger och olika serviceföretag. Kunderna vill ofta kunna nå verksamheten snabbt och enkelt.' },
          { typ: 'text', text: 'Digitaliseringen har samtidigt förändrat många företags behov av närhet. Banker, försäkringsbolag och andra tjänsteföretag kan i dag erbjuda stora delar av sin service via internet.' }
        ] },
        { block: [
          { typ: 'text', text: 'Det innebär att vissa företag kan nå kunder över hela världen utan att behöva finnas fysiskt nära dem.' }
        ] },
        { titel: 'Flera faktorer påverkar placeringen', block: [
          { typ: 'text', text: 'Det är sällan en enda lokaliseringsfaktor som avgör var ett företag etablerar sig. Ofta handlar det om att väga flera olika förutsättningar mot varandra.' },
          { typ: 'text', text: 'En fabrik kan exempelvis behöva billig energi, utbildad arbetskraft, goda transportmöjligheter och närhet till sina kunder. Företaget måste då välja den plats som ger den bästa kombinationen av dessa faktorer.' },
          { typ: 'text', text: 'Lokaliseringsfaktorer förändras också över tid. Nya transportmöjligheter, teknisk utveckling, automatisering och internationell handel kan göra att en plats som tidigare var fördelaktig förlorar sin betydelse.' }
        ] },
        { block: [
          { typ: 'text', text: 'Genom att studera lokaliseringsfaktorer kan vi förstå varför olika näringar och industrier finns på vissa platser och varför företag ibland väljer att flytta sin produktion till andra delar av världen.' },
          { typ: 'lank', till: ['ova', 'sjalvskattning'] }
        ] }
      ]
    },
    {
      id: 'sverige', titel: 'Sveriges näringsliv',
      sidor: [
        { titel: 'Sverige var länge ett land där de flesta levde av jordbruket', block: [
          { typ: 'text', text: 'Under 1850-talet var Sverige fortfarande ett jordbruksland. Omkring 80 procent av befolkningen levde av jordbruket, och många producerade främst mat för det egna hushållet. De flesta människor bodde på landsbygden och arbetade med att odla jorden eller sköta djur.' }
        ] },
        { block: [
          { typ: 'text', text: 'Jordbruket började förändras genom nya odlingsmetoder, bättre redskap och effektivare arbetsorganisation. När större skördar kunde produceras med mindre arbetskraft behövdes inte lika många människor inom jordbruket. Därför kunde fler söka arbete inom andra delar av näringslivet.' },
          { typ: 'text', text: 'Förändringen gick gradvis. År 1870 levde fortfarande drygt 70 procent av befolkningen av jordbruket, men 1920 hade andelen minskat till omkring 45 procent. Sverige höll på att förändras från ett jordbruksland till ett industriland.' }
        ] },
        { titel: 'Industrin växte när jordbruket moderniserades', block: [
          { typ: 'text', text: 'Från 1850-talet började den svenska industrin utvecklas snabbt. Denna förändring kallas *industrialisering* och innebar att allt fler varor tillverkades i fabriker med hjälp av maskiner. Industrin behövde arbetskraft, och många människor lämnade landsbygden för att arbeta i växande industristäder.' },
          { typ: 'text', text: 'Sverige hade god tillgång till skog, järnmalm och vattenkraft. Dessa naturresurser gav industrin viktiga förutsättningar att utvecklas. Samtidigt förbättrades transporterna, vilket gjorde det lättare att frakta råvaror och sälja färdiga produkter.' },
          { typ: 'text', text: 'Industrialiseringen skedde i flera steg:' }
        ] },
        { block: [
          { typ: 'punkter', punkter: ['1850–1870 växte sågverken, järnbruken och textilindustrin.', '1870–1890 byggdes järnvägarna ut, stålindustrin utvecklades och exporten ökade kraftigt.', '1890–1914 expanderade verkstadsindustrin med tillverkning av maskiner och tekniska produkter.', '1914–1950 utvecklades tillverkningen av bilar och många nya maskiner.', '1950–1970 upplevde svensk industri en storhetstid med kraftigt växande produktion och export.'] },
          { typ: 'text', text: 'Industrins tillväxt förändrade hela samhället. Nya arbetstillfällen skapades, städerna växte och Sverige kunde sälja allt fler industriprodukter till andra länder. Exportinkomsterna bidrog till att höja levnadsstandarden och utveckla landets ekonomi.' }
        ] },
        { titel: 'Maskiner och automatisering minskade behovet av industriarbetare', block: [
          { typ: 'text', text: 'Under industrins storhetstid arbetade många svenskar inom den sekundära sektorn. Fabrikerna behövde stora mängder arbetskraft för att tillverka bilar, maskiner, stål och andra produkter.' },
          { typ: 'text', text: 'Med tiden blev industrin alltmer effektiv. Genom *automatisering* kunde maskiner och robotar utföra arbetsuppgifter som människor tidigare hade gjort. Företagen kunde därför öka produktionen utan att behöva anställa lika många arbetare.' },
          { typ: 'text', text: 'Samtidigt ökade konkurrensen från andra länder. Vissa företag flyttade delar av tillverkningen utomlands, där produktionskostnaderna kunde vara lägre. Andra satsade på avancerad teknik och tillverkning som krävde färre men mer specialiserade anställda.' }
        ] },
        { block: [
          { typ: 'text', text: 'I dag arbetar omkring 12 procent av de sysselsatta i Sverige inom tillverkningsindustrin. Industrin har fortfarande stor betydelse för Sveriges ekonomi och export, trots att betydligt färre människor arbetar där än tidigare.' }
        ] },
        { titel: 'Tjänstesektorn växte och blev den största delen av näringslivet', block: [
          { typ: 'text', text: 'När jordbruket och industrin blev effektivare minskade behovet av arbetskraft inom dessa sektorer. Samtidigt ökade människors inkomster och efterfrågan på handel, transporter, utbildning, sjukvård och andra tjänster.' },
          { typ: 'text', text: 'Den offentliga sektorn byggdes också ut och skapade många arbetstillfällen inom exempelvis skola, vård och omsorg. Dessutom började företag köpa fler tjänster från andra företag, bland annat inom ekonomi, informationsteknik och transporter.' },
          { typ: 'text', text: 'Sverige utvecklades därför till ett *tjänstesamhälle*, där de flesta sysselsatta arbetar inom tjänstesektorn i stället för inom jordbruket eller industrin.' },
          { typ: 'text', text: 'I dag är fördelningen mellan sektorerna ungefär följande:' }
        ] },
        { block: [
          { typ: 'punkter', punkter: ['Jordbruk, skogsbruk och fiske sysselsätter omkring 2 procent.', 'Industri och byggverksamhet sysselsätter ungefär en femtedel.', 'Tjänster sysselsätter omkring tre av fyra.'] },
          { typ: 'text', text: 'Den kvartära sektorn räknas oftast in i tjänsterna när sysselsättningen redovisas.' }
        ] },
        { titel: 'Nya företag växer genom idéer, handel och teknik', block: [
          { typ: 'text', text: 'Sveriges näringsliv förändras också genom att nya företag skapas. En *entreprenör* är en person som utvecklar en affärsidé och startar eller bygger upp en verksamhet. En framgångsrik idé kan göra att ett litet företag växer och börjar sälja sina produkter eller tjänster i andra länder.' },
          { typ: 'text', text: 'IKEA, som grundades 1943, utvecklade en affärsidé med möbler som kunderna själva transporterar och monterar. H&M, som grundades 1947, växte genom att sälja kläder till en bred marknad. Båda företagen utvecklades till internationella handelsföretag.' }
        ] },
        { block: [
          { typ: 'text', text: 'Digitaliseringen har skapat nya möjligheter att starta företag. Klarna, som grundades 2005, utvecklade digitala betaltjänster för handel på internet. Spotify, som grundades 2006, byggde sin verksamhet kring strömning av musik via internet.' },
          { typ: 'text', text: 'Dessa företag visar hur affärsidéer kan utvecklas till internationella verksamheter. I dag behöver ett framgångsrikt företag inte äga stora fabriker. Kunskap, teknik, digitala tjänster och förmågan att nå kunder kan vara minst lika viktiga.' },
          { typ: 'text', text: 'Sverige har gått från jordbruksland till industriland och vidare till tjänstesamhälle, samtidigt som den kvartära sektorn med kunskap, forskning och teknik blir allt viktigare.' },
          { typ: 'lank', till: ['ova', 'sjalvskattning'] }
        ] }
      ]
    }
  ]
});

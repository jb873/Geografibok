# Plattforms-ändringar — Alphaskolans lärplattform

> Pedagogisk arbetsdagbok. Här samlas observationer som *kan* påverka 
> plattformen — innan de blir formella ändringar. Förhindrar drift 
> mellan böcker och kapitel.

**Starta varje arbetsdag med att kolla 🔵-listan.** 
**Veckogenomgång:** söndagar (eller när 🔵-listan har 3-5 poster).

---

## Snabbreferens — tre typer av ändringar

| Typ | Vad | Hantering |
|---|---|---|
| **A** Innehåll | Texten i ett avsnitt, en bild, en faktaformulering | Fixa direkt. Gå vidare. Hör inte hemma här. |
| **B** Mönster | Hur en komponent ser ut eller fungerar (flikar, kort, navigation) | Lägg i 🔵-listan nedan. Ändra INTE direkt i boken. |
| **C** Plattform | Pedagogisk modell (trösklar, lägen, korttyper, kunskapskrav-modell) | Lägg i 🔵-listan nedan. Ändra INTE direkt i boken. |

**Tumregel:** Om upptäckten kan tänkas påverka *ett annat avsnitt eller en annan bok* → det är B eller C. Skriv ner.

---

## Statuskoder

| Symbol | Betydelse |
|---|---|
| 🔵 | Ny observation — att bedöma på nästa veckogenomgång |
| 🟡 | Beslutat — väntar på implementation |
| 🟢 | Implementerat i plattformsspec — väntar migration av befintliga böcker |
| ✅ | Klart överallt |
| ⏸️ | Pausat / skjutet framåt |
| ❌ | Förkastat efter övervägande |

---

## 🔵 Aktiv lista — att bedöma

| Datum | Typ | Var upptäckt | Observation | Förslag |
|---|---|---|---|---|
| | | | | |

*(Tom rad ovan är till för nya poster — fyll på underifrån)*

### Exempel på hur en post fylls i:

| Datum | Typ | Var upptäckt | Observation | Förslag |
|---|---|---|---|---|
| 2026-06-15 | C | Demografi-pilot, klassrum | 15 ord + nyckelord = för högt tröskel. Eleverna skrev korrekt men "fel" ord, blev blockerade. | 8 ord, inga nyckelord, dynamisk upplåsning |

---

## 🟡 Beslutat — väntar implementation

| Datum | Beslut | Påverkar | Status |
|---|---|---|---|
| 2026-06-15 | Begreppsbank: 15→8 ord, inga nyckelord, dynamisk upplåsning | Demografi-pilot, alla framtida ämnen | Arbetsorder skickad till Code |
| 2026-06-14 | Föreläsning blir egen flik bredvid Läs | Geologi, alla framtida avsnitt | Väntar tills Geologi-innehåll klart |
| 2026-06-14 | Historia byter till plattformens fonter (Marcellus SC + EB Garamond) | Historiabok Projekt 4 (50 filer) | Väntar tills Medeltiden är klar som ny mall |
| 2026-06-14 | Historia använder kapitel→delkapitel→avsnitt-terminologi | Hela Historiaboken | Migreras med Projekt 4 |

---

## 🟢 Implementerat i spec — väntar migration

| Datum | Ändring | Spec-version | Migration kvar |
|---|---|---|---|
| 2026-06-15 | Plattformsspec för elevbok/begreppsbank/självskattning/elevdata | Lager 2-3 v0.1 | Geografi: harmoniseras till `as-`-prefix vid BEM-migration |

---

## ⏸️ Pausat / skjutet framåt

| Datum | Vad | Anledning |
|---|---|---|
| 2026-06-10 | Elevbok-stödläraren | Eleverna skriver i frågerutorna, inte i sammanfattning. Återupptas om elevbehov dyker upp. |
| 2026-06-14 | Dark mode | Vintageatlas-paletten är hela designens kärna. Bryts av dark mode. |
| 2026-06-14 | AI-stöd i läromedlet | Tills kostnadseffektiv lösning finns. |

---

## ✅ Klart överallt (för historik)

| Datum | Ändring |
|---|---|
| 2026-06-14 | Geografibokens palett kodifierad som plattformens Lager 1 |
| 2026-06-14 | Marcellus SC + EB Garamond låsta på plattformsnivå |
| 2026-06-14 | Geografi-piloten klar (6 avsnitt × 3 nivåer, 145 flipcards, 11 djupdykningar) |

---

## ❌ Förkastat

| Datum | Förslag | Anledning |
|---|---|---|
| | | |

---

## Veckogenomgång — söndag (eller när 🔵-listan har 3-5 poster)

**Tid:** ~30 minuter

**Steg:**

1. **Gå igenom 🔵-listan post för post.**
   - För varje: är det A (fel kategori — flytta ut)? B eller C (rätt)?
   - Bedöm pedagogiskt: är det rätt riktning?
   - Bedöm omfattning: är det en isolerad ändring eller pekar det på något större?

2. **Tre möjliga utfall per post:**
   - 🟡 **Godkänd** → flytta till 🟡-listan + skapa arbetsorder till ramverks-chatten
   - ❌ **Förkastad** → flytta till ❌-listan med kort motivering
   - 🔵 **Behöver mer underlag** → behåll i 🔵, anteckna vad som behöver utforskas först

3. **Granska 🟡-listan:**
   - Vilka kan släppas till implementation den här veckan?
   - Vilka väntar på något (t.ex. annan komponent klar)?
   - Finns det blockeringar att hantera?

4. **Granska 🟢-listan:**
   - Vilka migrationer ska göras den här veckan?
   - Behövs prioritering om kö växer?

5. **Reflektera över mönster:**
   - Dyker liknande observationer upp upprepade gånger?
   - Då pekar de mot något större — kanske en arkitektur-ändring snarare än enskild komponent.

**När det är klart:** stäng filen, fortsätt arbeta tryggt vetande att inget glöms.

---

## Regler

**1. Ändra aldrig direkt i en bok när du upptäcker B eller C.**
Lägg i 🔵-listan. Geologi-kapitlet får ha sin ofullständighet en dag till.

**2. Innehållsproduktion-chatten lägger till i 🔵.**
Den ändrar aldrig plattformen själv.

**3. Ramverks-chatten är den som flyttar mellan listor.**
Veckogenomgång görs där.

**4. Code-chatten implementerar 🟡 och 🟢.**
Den uppdaterar inte den här filen — det gör ramverks-chatten efter Code rapporterat klart.

**5. När i tvivel — skriv ner.**
Hellre en post för mycket än en ändring som glöms.

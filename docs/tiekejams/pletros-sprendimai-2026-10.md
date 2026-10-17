# G-Procure Tiekėjams: plėtros sprendimai (2026-10-17)

Pagrindas - išorinė technologinė analizė „G-Procure tiekėjų modulio tobulinimas“ (2026-10-17, vertinimas iš LITGRID
pirkimuose dalyvaujančio tiekėjo perspektyvos) ir tos pačios dienos patikra (`cvpis-feasibility.md`, skyrius
„Atnaujinimas 2026-10-17“).

## 1. Vertinimas

Su pagrindine analizės išvada sutinku: tiekėjui svarbiausia ne pokalbio langas, o patikimas atsakymas, ką ir kada
pateikti, ir aiškumas, ar perskaityti visi paskelbti dokumentai. Du gyvi scenarijai, kuriuos analizė aprašė, pasitvirtino:
teksto paieška atverdavo tuščią CVP IS paiešką, o vien pradinio dokumentų ZIP įkėlimas tyliai praleisdavo vėliau
paskelbtus papildymus. Teiginys „CVP IS neturi viešos API“ buvo pasenęs.

Su technologiniu komplektu (PostgreSQL, FastAPI, Docling, foniniai darbuotojai) dabar nesutinku - ne todėl, kad jis
blogas, o todėl, kad jam reikia sprendimų, kurie yra jūsų (2 skyrius), ir dalį vertės galima gauti be serverio.

## 2. Padaryta be serverio (2026-10-17)

| Analizės punktas | Kas padaryta |
|---|---|
| Paieška veda į tuščią CVP IS formą | Teksto paieška atveria CVP IS rezultatus pagal pavadinimą (`title=`; GET be sesijos, patikrinta) |
| ZIP gali praleisti atskirai paskelbtus patikslinimus | Visų dokumentų ZIP esantis CVP IS dokumentų sąrašas („List of Contract Documents“) skaitomas ir sulyginamas su perskaitytais failais: „Perskaityta N iš M“, papildymai su ID, kas nerasta ar neperskaityta; vien pradinis ZIP - įspėjimas su nuoroda į dokumentų sąrašą |
| Aprėptis skaičiais, ne „perskaityta visa“ | Būsena „Dokumentų rinkinys perskaitytas visas“ pakeista į „Visi įkelti failai perskaityti“ (tai, ką įrankis tikrai žino) |
| „Nėra viešos API“ per platu | Modulio tekstai, būsena ir dokumentacija: VPT dokumentuota API yra, bet reikalauja prieigos rakto ir veikia tik per serverį |

Išbandyta su dviem tikrais LITGRID paketais ir testais (PP-tiekejams 138, mutacijos - 7 iš 7 pagaunamos).

## 3. Laukia jūsų sprendimo

1. **Serverio sluoksnis viešiems pirkimų duomenims** (paieška G-Procure viduje, metaduomenys, versijos, pakeitimų
   stebėjimas). Tai keičia CLAUDE.md 7 sk. nuostatą „jokios serverio duomenų bazės“ - nors saugomi būtų vieši duomenys,
   ne naudotojų darbas. Reikia: kas administruos serverį (Hetzner), kur saugoma, kiek laiko, ir atnaujinti privatumo politiką.
2. **Duomenų šaltinis.** Rekomenduoju pirmiausia kreiptis į VPT dėl API prieigos rakto ir naudojimo sąlygų (limitai,
   ar leidžiama naudoti viešai paslaugai). Viešų puslapių nuskaitymą naudoti tik gavus VPT ar LITGRID sutikimą.
3. **Teisinė patikra.** Ankstesnis klausimas lieka: ar asistentas apie konkretų pirkimą nelaikomas neoficialiu
   paaiškinimų kanalu (PĮ 48 str. 2 d. 20 p., 49 str.). Prieš viešai žadant pirkimo santrauką - teisininko nuomonė.
4. **Stebėjimas ir pranešimai** (analizės P3) reikalauja paskyrų ar el. pašto - tai asmens duomenys serveryje; siūlau
   tik po 1-3 punktų.
5. **Reikalavimų schema iš PP-SALYGOS ir PP-QUAL į PP-TIEKEJAMS** (analizės strateginis pranašumas) - perspektyvi, bet
   reikalauja LITGRID sutarimo, kas ir kada viešinama; nevieša vertė ir vidaus komentarai niekada neperduodami.

## 4. Siūloma eilė

P0 (be kodo): VPT užklausa dėl API rakto ir sąlygų; 10-20 įvairių LITGRID pirkimų aprėpties lentelė (procedūros, dalys,
pratęsti terminai, pakeisti dokumentai, skenuoti PDF) - dvi jau patikrintos. P1: tik priėmus 1-2 sprendimus - serverio
paieška ir metaduomenys su paskutinio patikrinimo laiku. P2-P3 - kaip analizėje, po kokybės etalono (20-30 pirkimų).

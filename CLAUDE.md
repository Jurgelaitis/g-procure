# G-Procure

Šis failas yra bendros instrukcijos Claude Code (ir Cowork) visai G-Procure sistemai.
Skaitomas automatiškai kiekvienos sesijos pradžioje. Laikyk jį `g-procure/` root'e.

---

## 1. Apie projektą

G-Procure - EPSO-G grupės viešųjų pirkimų skaitmeninių įrankių sistema.
Kiekvienas modulis yra savarankiškas įrankis (HTML/JS/CSS, be build žingsnio), padedantis
pirkimų komandai per visą pirkimo ciklą: planavimas -> techninė specifikacija ->
kvalifikacija -> pirkimo sąlygos -> grafikai -> komisijos sprendimai -> derybos -> ataskaitos.

Moduliai kol kas vystomi ir testuojami atskirai, bet gyvena viename repozitoriume
(monorepo). Bendra logika iškeliama į `shared/`, kad būtų taisoma vieną kartą.

---

## 2. EPSO-G grupė ir teisinis kontekstas (SVARBU - skaityk pirmiausia)

Sistema aptarnauja keturias grupės įmones su SKIRTINGU teisiniu statusu. Statusas
lemia, koks įstatymas ir kokios vertės ribos taikomos. Niekada nemaišyk VPĮ ir PĮ taisyklių.

| Įmonė | Statusas | Įstatymas | Direktyva |
|---|---|---|---|
| UAB EPSO-G | Perkančioji organizacija | VPĮ | 2014/24/ES (klasikinė) |
| LITGRID AB | Perkantysis subjektas | PĮ (sektorinis) | 2014/25/ES (sektorinė) |
| AB Amber Grid | Perkantysis subjektas | PĮ (sektorinis) | 2014/25/ES (sektorinė) |
| UAB Energy cells | Perkantysis subjektas | PĮ (sektorinis) | 2014/25/ES (sektorinė) |

- PĮ (sektorinis) = Pirkimų, atliekamų vandentvarkos, energetikos, transporto ar
  pašto paslaugų srities perkančiųjų subjektų įstatymas. Kai kuriuose moduliuose
  trumpinamas PSĮ - tai tas pats įstatymas.
- Daugumos modulių numatytasis kontekstas - LITGRID (PĮ, elektros perdavimas, TSO).
- Priežiūros institucija - VPT (Viešųjų pirkimų tarnyba).

---

## 3. Moduliai (kanoniniai pavadinimai)

Lentelėje - katalogų vardai, tokie kaip diske, raidė į raidę. Katalogo vardas kartu yra
ir gyvas URL (`g-procure.com/PP-protocol/...`), tad pervadinti negalima nesulaužius
portalo kortelių, „Apie projektą" nuorodų ir išorinių žymių.

Tekste ir commit'uose modulį rašyk mažosiomis su brūkšneliu (`pp-protocol: ...`) -
tai rašybos konvencija, ne katalogo vardas. Jei rasi senų variantų (PP-Planing,
"PP-market KPI", PP-negotation), traktuok juos kaip tą patį modulį.

| Folder | Paskirtis |
|---|---|
| `PP-home` | Portalo puslapiai gyvena SVETAINĖS ŠAKNYJE (`index.html`, `G-Procure_About.html`, `G-Procure_Project.html`, `atsargine-kopija.html`), nes `g-procure.com/` turi būti tikras pradžios puslapis. `PP-home/` liko tik trys nukreipimo failai seniems adresams - naujo turinio ten nedėk. Šaknyje ir `pirkimu-korteles.html` - bendros pirkimo kortelės puslapis (A1, bandomasis, `noindex`, į žemėlapį neįtrauktas; nuo 2026-09-26 (A2) pildomas ir iš CVP IS skelbimo PDF; žr. 4 sk. `shared/pirkimo-kortele.js`). Portale nuo 2026-09-26 (U1) - blokas „Mano pirkimai“ tarp įžangos ir katalogo (`shared/mano-pirkimai.js`; be kortelių paslėptas, tad naujam naudotojui portalas nesikeičia) ir poraštės nuoroda „Pirkimų kortelės“ |
| `PP-plan` | Metinio pirkimų plano (MPP) analizė ir grupės centralizavimas. „AI centralizavimas“ skirtuke - algoritmas naršyklėje (BVPŽ CPV5 ir Jaccard), ne dirbtinis intelektas; planas saugomas tik naršyklėje. Nuo 2026-09-26 (A2) prie pirkimo - „+ Kortelė“: plano eilutė perduodama kortelių puslapiui naujame skirtuke (`kortelesLaukaiIsPlano`: įmonė, rūšis, būdas bendru kodu, BVPŽ, iniciatorius su padaliniu, trukmė, inicijavimo data - pradžia, pirkimo data - paskelbimas), išsaugotos kortelės id įsimenamas įraše (`kortele`), antras paspaudimas atveria tą pačią. BVPŽ žodynas - `shared/cpv-data.js` (iki 2026-09-26 - `PP-plan/`). Testai - `PP-plan/testai.html` (12, nuo 2026-09-26) |
| `PP-market-KPI` | Rinkos rodiklių stebėsena (kainos, lead time, indeksavimas; C lygmuo „tiekimo nutrūkimo rizika" pašalintas 2026-09-10 naudotojo sprendimu - negrąžinti) |
| `PP-ts` | Techninių specifikacijų asistentas (AI generavimas + auditas). Nuo 2026-09-26 (Q3) AI veiksmai - per `GP_BUSENA` su „Atšaukti“ (vienas aktyvus veiksmas, signalas visoms jo užklausoms ir pauzėms), nepavykusios dalys (skyriai, atitikties lentelė, kaina, rinka) sakomos, ne nutylimos; CVP IS be ryšio - klaida, ne „0 sutarčių“; „Pradėti naują“ išvalo ir ankstesnio pirkimo analogus. Nuo 2026-09-26 (A1 2 etapas) kortelę tik skaito: pavadinimas, objektas, BVPŽ, vertė, trukmė ir dalys pildomi ir TS kūrimo vediklyje (gen*), ir pirkimo kontekste (meta*), būdas - pirkimo kontekste (T-* - tarptautinis); kitas vykdytojas ar VPĮ tik įvardijami. Testai - `PP-ts/testai.html` (36) |
| `PP-qual` | Tiekėjų kvalifikacijos reikalavimų modulis (AI, proporcingumas). Nuo 2026-09-23 skaičiuoklė ir taisyklės remiasi VPT Metodika pagal e-tar (`proporcingumas()`: vertės kategorija, pajamų riba, patirties laikotarpis). Patvirtinimas, EN vertimas ir audito pastabos galioja reikalavimo REDAKCIJAI (`rev`, ankstesnės - `hist`); patikros būsena (`auditoBusena()`: neatlikta / dalinė / atlikta / pasenusi) neatlikta niekada nerodoma kaip „be pastabų“; Word - tik per `eksportoPatikra()`: tuščias rinkinys, tuščias tekstas ar nepilnas EN vertimas stabdo, o nepatvirtintas ar nepatikrintas rinkinys žymimas JUODRAŠČIU; AI pataisas taiko tik žmogus, jas pažymėjęs. Naujas pirkimas išvalo VISĄ ankstesnio būseną (esant pradėtam darbui - „Tęsti“ / „Pradėti naują“), IT gairių taisyklės - tik objektui „Paslaugos (IT/IS)“, žaliasis pirkimas - pagal Žaliųjų pirkimų tvarkos aprašo 4 p. (savaime kvalifikacijos reikalavimo nereiškia), Word - vidiniam naudojimui arba tiekėjams (be numatomos vertės ir 4 skyriaus), priedo numeris keičiamas. Klausimai, generavimas ir patikra gauna VIENĄ pirkimo kontekstą (`pirkimoKontekstas()`: trukmė, apmokėjimas, avansas, priklausomybė, dalys, aprašymas, atsakymai - Metodikos 7.2, 7.6, 11 p.), jo pokytis patikrą daro pasenusia; pastabos grupuojamos pagal reikalavimą. Nuo 2026-09-26 (A1) kortelę TIK SKAITO (`GP_KORTELE.mount`): pavadinimas, objektas (`paslaugos_it` -> „Paslaugos (IT/IS)“), vertė, trukmė (kortelės mėnesiai lyginami su tekstu per `trukmeMen()`), dalys (tekstu), režimas ir vykdytojas; laukai - `PPQ.procurement` ir vediklio (p-) bei audito (a-) formos. Vykdytojas be kortelės - kaip iki šiol (LITGRID AB / UAB EPSO-G pagal režimą), su kortele - organizacija iš `shared/organizacijos.js` (antraštė, poraštė, AI instrukcija, Word; LITGRID TSO aprašas - tik LITGRID). Kortelės režimas priklauso pirkimui (naujas pirkimas grąžina numatytąjį), žmogaus Nustatymuose pasirinktas - ne: tada kortelės kitas režimas ir vykdytojas rodomi kaip skirtumai. Pradėtas kito pirkimo darbas - klausiama tuo pačiu „Tęsti / Pradėti naują“. Testai - `PP-qual/testai.html` (72) |
| `PP-salygos` | Pirkimo sąlygų generatorius (BPS/SPS/formos iš LITGRID šablonų, deterministinis). Nuo 2026-09-25 (planas A5, bandomoji) 2 žingsnyje - AI atsakymų PASIŪLYMAI iš rengėjo dokumentų (TS, kvalifikacijos reikalavimai, sutarties projektas; tekstas - `shared/dokumentai.js`, logika - `ai-patarejas.js`): AI renkasi tik šablono variantą arba reikšmę, pažodžiui esančią dokumente; citata tikrinama PRIEŠ rodant (be rastos citatos „Priimti“ nėra; citata, neįvardijanti klausimo dalyko, pažymima įspėjimu); kiekvieną pasiūlymą priima ar atmeta žmogus, niekas netaikoma savaime; siunčiama tik mygtuku per tarpinę, numatoma vertė nesiunčiama. AI neklausiama: 1 žingsnio išvestinių sprendimų (režimas, derybos, nacionalinis saugumas), lentelių ir SPS priedų sąrašo eilučių be failo (seka kitus sprendimus - su tikrais paketais AI čia klydo), angliškų dvynių ir redagavimo pastabų. Tikslumas matuotas su 4 viešais LITGRID CVP IS paketais (paskelbta SPS - atsakymų raktas). Nuo 2026-09-26 (A1 2 etapas) kortelę tik skaito: būdas, vertė, objektas ir pavadinimas - kilmininku be „pirkimas“ (kortelės „X pirkimas“ -> „X“, kitaip parašytas neįrašomas); kortelės įrašyti būdas ir objektas nežymimi „paliestais ranka“ (`PZ_TAIKOMA`), tad paraiškos pasiūlymai jų nelaiko žmogaus pasirinkimu; kitas vykdytojas ar VPĮ tik įvardijami (šablonai - LITGRID, PĮ). Testai - `PP-salygos/testai.html` (43) |
| `PP-cost-benefit` | Dvi dalys (nuo 2026-09-19): `ekonominio_naudingumo_skaiciuokle.html` - ekonominio naudingumo skaičiuoklė kasdieniam pasiūlymų vertinimui (kriterijai, svoriai, VPT gairių formulės, balai; VPĮ 55 str. / PĮ 64 str.); `kastu_naudos_analize.html` - kaštų ir naudos analizė (didelės vertės pirkimai >= 20 mln. EUR). Portalo kortelė veda į `index.html` - dalių pasirinkimo puslapį (dvi kortelės su „kam / kada / rezultatas“ ir trys klausimai); abi dalys turi tarpusavio jungiklį ir nuorodą atgal. Nuo 2026-09-26 (A1 2 etapas) abi dalys kortelę tik skaito: skaičiuoklė - pavadinimas, perkantysis subjektas ir objektas (režimą lemia subjektas: nesutampantis kortelės režimas, pvz. Energy cells ir VPĮ, neįrašomas ir įvardijamas; skaičiuoklės „būdas“ - kaip išrenkamas pasiūlymas, ne pirkimo būdas); KNA - pavadinimas, numeris, vertė, tipas, procedūra, trukmė (tik sveikais metais) ir teisinis pagrindas, įrašomi BE įvykių, o kortelės juostos pasirinkimas automatinio saugojimo neįjungia (`[data-darbas-ne]`) - kitaip vien kortelės pasirinkimas perrašytų išsaugotą, dar neatvertą analizę. Testai - `PP-cost-benefit/testai.html` (47) |
| `PP-graphs` | Pirkimų grafikų generatorius ir trukmių skaičiuoklė. Nuo 2026-09-26 (A1) kortelę TIK SKAITO: įmonė, pavadinimas, iniciatorius, organizatorius, būdas (tik tie, kuriems yra grafikas; kitas - įvardijamas) ir pradžios data (numatytoji artimiausia darbo diena laikoma tuščia); kortelė jungiama PRIEŠ `GP_DARBAS`. Testai - `PP-graphs/testai.html` (9, nuo 2026-09-26; datos fiksuotos, nuo šiandienos nepriklauso; kortelės testai - `?saugykla=testine`) |
| `PP-protocol` | Pirkimų komisijos sprendimų centras (protokolai, pranešimai, auditas). Nuo 2026-09-26 protokolo Word - su bendru `GP_DOCX_STILIAI` (iki tol vienintelis naudojo `styles`), nepavykus protokolui pranešimai nebekuriami, nepavykę pranešimų failai sakomi juosta. Nuo 2026-09-26 (A1 2 etapas) kortelė pildo TIK naujo pirkimo vedlį (atvėrus „+ Naujas pirkimas“: numeris, pavadinimas, vertė, objektas, trukmė, dalys, būdas, CVP IS Nr.); esami pirkimai ir protokolai iš kortelės nekeičiami; juosta (`#kortelesVieta`) rodoma tik sąraše ir vedlyje. Pirkimai į korteles perkeliami kortelių puslapyje („Perkelti iš PP-protocol“). Testai - `PP-protocol/testai.html` (8) |
| `PP-negotiation` | Derybų pasirengimo įrankis (BATNA/ZOPA, MEAT). Nuo 2026-09-26 (A1 2 etapas) projekto laukai pildomi iš kortelės (pavadinimas, vykdytojas, režimas, vertė be PVM, būdas, trukmė; dar nepavadinto projekto numatytosios reikšmės laikomos tuščiomis, vertė su PVM neperrašoma); atvertas projektas tik palyginamas, „Naujas“ - be kortelės. Testai - `PP-negotiation/testai.html` (11, nuo 2026-09-26) |
| `PP-report` | Mažos vertės pirkimo pažymos (Aprašo 1 ir 2 priedai). Nuo 2026-09-26 (A1 2 etapas) kortelę tik skaito: kol forma nepasirinkta, juosta sako, kad laukia (`nerodoma`), atvėrus 1 ar 2 priedą - pildo tuščius laukus (pavadinimas, kortelės ir CVP IS numeriai, vertė, BVPŽ, būdas per `GP_METHODS.toModule('pp-report')`, dalys, iniciatorius „Vardas, padalinys“, organizatorius); ko forma neturi (1 priede - dalių, numerio, organizatoriaus), kitas vykdytojas ar ne mažos vertės būdas - įvardijama; įkeltas juodraštis tik palyginamas, išvalius formą kortelė atsiejama. Testai - `PP-report/testai.html` (88) |
| `PP-esg` | Centrinis ESG ir atitikties variklis (rizikos registras, sankcijos, ESRS). Neperskaitytuose duomenyse demonstraciniai neįrašomi; nepavykus CVP IS paieškai pavyzdys - tik paspaudus ir jo importuoti negalima. Testai - `PP-esg/testai.html` (8, nuo 2026-09-26) |
| `PP-carbon` | Anglies pėdsako skaičiuoklė ir tiekėjo EPD įrankis (viešas) |
| `PP-tiekejams` | G-Procure Tiekėjams - viešas informacinis asistentas tiekėjams apie CVP IS pirkimus (CVP IS dokumentų paketas naršyklėje, Q&A su citatomis, kontrolinis sąrašas, klausimo projektas; gyvos CVP IS jungties nėra - žr. `docs/tiekejams/`). Nuo 2026-09-24 (B1) NEBE tik LITGRID: pirkimo vykdytojas ir teisinis režimas (PĮ / VPĮ) atpažįstami iš skelbimo PDF (`cvpis.js` `atpazinkPirkeja` / `atpazinkRezima`, nuo 2026-09-26 - nuorodos į `shared/skelbimas.js`: „1.1 Pirkėjas / Oficialus pavadinimas“, „Perkančiojo subjekto“ = PĮ, „Perkančiosios organizacijos“ = VPĮ, direktyva 2014/25 ar 2014/24, failo vardas „komunalinio sektoriaus / bendroji direktyva“; sandara iš 4 tikrų skelbimų) ir galioja tik NAUDOTOJUI PATVIRTINUS - nepatvirtintas kontekstas AI prompte reiškia „jokio įstatymo neteigti“ (`asistentas.js` `kontekstoEilute`, ta pati kopija `worker/tiekejams-proxy.js`). Organizacijų registras `shared/organizacijos.js` (iki 2026-09-26 - šiame kataloge; dabar bendras su pirkimo kortele) (LITGRID su patikrintomis taisyklėmis, Amber Grid, EPSO-G, Energy cells tik su CVP IS sąrašais); režimą lemia SKELBIMAS, ne registras (2026-09-24 Energy cells skelbimas 9614756 buvo perkančiosios organizacijos formos). Žinių bazė `zinios.js` - tik PĮ (temos turi `rezimas`), VPĮ atitikmenų DAR NĖRA ir sąsaja tai sako (B2). Nuo 2026-09-22 veikia ir be interneto (`sw.js`, išskyrus AI atsakymus): pridėjus modulio failą - įrašyk jį į `sw.js` sąrašą `SAVI` (testai tikrina) |
| `PP-teise` | Pirkimų teisės stebėsena (nuo 2026-09-24): kas pasikeitė, kas įsigalios, ką peržiūrėti - vienas registras `PP-teise/duomenys/registras.json` (13 tikrų įrašų, perskaitytų iš e-tar ir Liteko per Lietuvos viešųjų duomenų jungtį: PĮ ir VPĮ vidaus sandorių pakeitimai nuo 2027-01-01 su pereinamosiomis nuostatomis, VPT Metodikos 1S-82 redakcija, žaliųjų pirkimų aprašo D1-20, LRV pozicija dėl projektų XVP-467(2) ir XVP-763, VPT 1S-97 ir 1S-65, LAT ir dvi LVAT nutartys) ir šaltinių registras `saltiniai.json` su patikrų žurnalu. Branduolys - `shared/teise-stebesena.js`; portalo blokas ir PP-qual / PP-salygos kontekstiniai blokai piešiami tuo pačiu `mount()`. Portale modulis NETURI katalogo kortelės (katalogas - 12 įrankių): jis rodomas vienu viso pločio bloku PO katalogo, prieš tiekėjų dalį, o įrašai jame - TIK pagal redakcinį prioritetą (`portalas.prioritetas`, nustatomas `admin.html`, automatiškai neskaičiuojamas; be prioriteto blokas sako, kad įrašai neparinkti). Modulio tvarka (nuo 2026-09-25 antros vizualinės pertvarkos, logika nekeista): tamsi modulio antraštė kaip kituose moduliuose (`--gradient-dark`, ikonos plytelė, grupės eilutė, baltas pavadinimas ir vienas sakinys), dešinėje - sąžiningumo skydelis („Atnaujinama rankiniu būdu - ne automatinė stebėsena. Paaiškinimai patvirtinti specialisto: X iš Y.“ ir išskleidžiama „Apie šaltinių patikrą“); trys klausimai - trys KPI kortelės (klausimas, po juo skaičius; tai tie patys vaizdų skirtukai; kol registras neįkeltas - „–“, ne 0), po jomis maži „Trūksta duomenų“ ir „Archyvas“, tada kompaktiški pranešimai; VIENA balta darbo sritis: įrankių juosta (paieška, tema, susijęs įrankis, suskleistas „Daugiau filtrų“ ir neprivalomas „Mano pirkimas“), sąrašas kairėje (~36 %, kompaktiškos eilutės su dokumento rūšies ženkliuku) ir pasirinkto įrašo detalės dešinėje (A-G tvarka: antraštė ir statusai, pokyčio esmė, kam aktualu su „Kodėl man aktualu?“ ir įvardytais trūkstamais konteksto duomenimis, nuo kada taikoma su pereinamosiomis, ką peržiūrėti, pagrindimas su PAŽODINE ištrauka iš šaltinio ir dokumento istorija, rekvizitai sutraukti); administravimas, testai, dokumentacija ir techninė diagnostika (CORS, 403, patikrų žurnalas) - poraštėje. Dizainas - tik `shared/epso-g.css` žetonai (permatomas baltas - `color-mix`), tipografija 24 / 20 / 16 / 15 / 14 / 12 px, visas tekstas >= 4,5:1 (antraštėje - pagal tikrą gradiento spalvą po tekstu): smaragdas ant balto 3,35:1, smaragdas-50 ant gradiento 3,7:1, todėl jie - juostos, rėmeliai, pabraukimai ir ikona, ne teksto spalva (kortelių skaičiai grafitu); pasirinkimas keičia TIK detales, jis gyvena adrese `#irasas=id` (naršyklės Atgal / Pirmyn), filtrai - adreso parametruose; filtrui pašalinus pasirinktą įrašą pasirinkimas keičiamas su pranešimu gyvoje srityje; telefone (<= 899 px) - sąrašas, tada detalės su „Grįžti į pokyčius“, atkuriančiu slinktį ir fokusą. „Buvo / tapo“ rodoma TIK su tikru `palyginimas` objektu (buvo IR tapo su šaltiniu; registre tokių dar nėra ir puslapis taip sako - nuoroda į e-tar redakcijų sąrašą palyginimu nevadinama); keturi patikimumo matmenys iš duomenų (`patikimumas()`: registras atnaujintas, rankinis režimas, šaltiniai tikrinti, paaiškinimai patvirtinti) ir naudotojo peržiūra, kuri NIEKADA netampa specialisto patvirtinimu. Naršyklė šaltinių automatiškai NEtikrina (e-tar be CORS, e-seimas 403, VPT naujienų adresas 404 - patikrinta 2026-09-24), tad registras pildomas per `admin.html` (vietinis režimas be serverio autorizacijos: darbinė kopija localStorage, eksportas -> commit); būsenos aptikta / laukia / patvirtinta / archyvuota, nė vienas įrašas dar nepatvirtintas teisės specialisto ir puslapis tai sako; nepavykusi patikra NIEKADA nerodoma kaip „pokyčių nėra“ (ir nepavykęs registro įkėlimas lieka „būsena nežinoma“ pakeitus lango plotį ar „Mano pirkimas“ lauką), trūkstamos datos NEspėjamos, demonstraciniai įrašai žymimi ir portale nerodomi. Be interneto - `sw.js` (keičiant kodą ar duomenis kelk `VERSIJA`; testai tikrina `SAVI`). Naudotojo peržiūrų žurnalas ir kontekstas - localStorage `ppteise.*` (į registrą nepatenka). Testai - `PP-teise/testai.html` (75, su `testai-registras.json` ir `?saugykla=testine`, kad tikri duomenys nebūtų liečiami; puslapis įkėlimą praneša `<html data-busena>`; nuo 2026-09-25 nepriklauso nuo šiandienos datos ir registro pildymo: laukiamos datos, skaičiai ir patvirtinimų būsenos imamos iš `duomenys/*.json`, vaizdų testai skaičiuoja su `DABAR` - naujus testus rašyk taip pat); dokumentai - `docs/teise/` (šaltiniai, administravimas, diegimas su tarpinio serverio kontraktu, kuris NEĮDIEGTAS) |

Senus / testinius repo (PP-Test, PP-Test-NT, PP-Durations, qskigali) NEįtraukti -
jie skirti archyvavimui, ne plėtrai.

---

## 4. Bendras kodas - `shared/` (vienas tiesos šaltinis)

Kertinė taisyklė: kross-modulinė logika gyvena `shared/`, NIEKADA nedubliuojama
kiekviename modulyje. Jei modulyje randi dubliuotą logiką - pasiūlyk ją perkelti į `shared/`.

| Failas | Ką laiko |
|---|---|
| `shared/thresholds.js` | VPT vertės ribos (galioja nuo 2026-01-01). Peržiūrimos kas 2 metus - atnaujink TIK čia |
| `shared/workdays.js` | Darbo dienų skaičiavimas + LR šventės. Lentelės NĖRA ir pratęsti nereikia: fiksuotos šventės iš sąrašo, Velykos - computus algoritmu, Motinos ir Tėvo diena - pirmas gegužės / birželio sekmadienis, tad kalendorius galioja bet kuriems metams. Keičiantis LR švenčių sąrašui - taisyk TIK čia |
| `shared/procurement-methods.js` | Kanoninis pirkimo būdų klasifikatorius (`GP_METHODS`): 11 pagrindinių būdų, kodai (T-AK, MV-NR...), etiketės ir migracijos adapteriai seniems moduliams. Naudoja 7 moduliai - būdą ar pavadinimą keisk TIK čia. Nuo 2026-09-26 `toModule()` moka ir `pp-report` (mažos vertės apklausos) bei `pp-cost-benefit` (KNA procedūros) - pirkimo kortelės būdą moduliai verčia tik per jį |
| `shared/ai-proxy.js` | g-procure backend iškvietimas (Claude API), numatytasis AI modelis (`DEFAULT_MODEL`) ir užklausos kūno riba (`MAX_BASE64`, `MAX_PDF_BAITU`). Ribą naudoja `PP-salygos` ir `PP-carbon` - moduliuose jos NEdubliuok. Nuo 2026-09-25 ir struktūrinis modelio JSON taisymas `taisykJson` (neekranuota kabutė, eilutės lūžis eilutėje; nutrūkęs JSON netaisomas) - perkeltas iš PP-tiekejams, naudoja ir PP-salygos. Nuo 2026-09-26 atšaukus (`signal`) nutraukiama ir pauzė tarp pakartojimų - „Atšaukti“ grįžta iškart |
| `shared/dokumentai.js` | Dokumentų teksto skaitymas naršyklėje (`GP_DOK`): PDF (pdf.js, tarpai žodžiuose pagal geometriją), DOCX (pastraipos ir lentelių eilutės), ODT, XLSX, XML, HTML, TXT, ZIP su saugumo ribomis; blokai su vieta (psl. / pastr. / lentelė) citatoms. Iki 2026-09-25 gyveno `PP-tiekejams/`; dabar jungia PP-tiekejams ir PP-salygos. Keičiant - paleisk abiejų modulių testus; PP-tiekejams `sw.js` jį turi sąraše `SAVI` |
| `shared/epso-g.css` | EPSO-G prekės ženklo dizaino žetonai (spalvos, `--font-base`, maketas) ir tamsus prekės ženklo gradientas `--gradient-dark` (hero/header blokams; naudoja 6 vietos, tarp jų `gprocure-info-panel.js`). Prijungtas VISUOSE moduliuose. Prieinamumo tonai (NE brandbook, nuo 2026-09-25, Q6): `--color-emerald-strong` #007554 (hover `--color-emerald-strong-hover` #006649) - smaragdo TEKSTUI, nuorodoms, aktyviems skirtukams ir pagrindinių mygtukų fonui su baltu tekstu (5,72:1 ant balto, 4,67:1 ant green-15); `--color-emerald` (3,35:1) ir `--color-emerald-120` (4,27:1) tekstui nenaudok - tik linijoms, rėmeliams, ikonoms (testai tikrina) |
| `shared/lang-detect.js` | Pradinė sąsajos kalba dvikalbiams puslapiams (`GP_LANG.detect(raktas)` / `remember`): adreso parametras `?lang=lt\|en` -> rankinis pasirinkimas -> lankytojas iš Lietuvos (laiko juosta Europe/Vilnius arba naršyklės kalba lt) = LT, kiti = EN. `?lang=` į localStorage NEįrašomas (vienkartinė peržiūra) ir yra hreflang pagrindas: be atskiro URL kiekvienai kalbai hreflang būtų melagingas. `GP_LANG.markCanonical()` vykdymo metu pataiso `<link rel="canonical">` į tą patį adresą - kitaip visi puslapio adresai kanonizuotųsi į vieną ir hreflang būtų ignoruojamas. Naudoja PP-tiekejams, PP-carbon (abu puslapiai), PP-esg, PP-market-KPI ir VISI trys PP-home puslapiai (portalas, „Apie projektą", „Apie"). PP-home puslapiai dalijasi raktu `gprocure-lang`, tad kalba tarp jų nešokinėja - taisyklę keisk TIK čia |
| `shared/portal-link.js` | Grįžimo į portalą juosta modulio viršuje (`← G-Procure · Visi įrankiai`). Prijungiama VIENA eilute iškart po `<body>`: `<script src="../shared/portal-link.js"></script>`. Iki 2026-09-20 šešiolika modulio puslapių neturėjo jokio kelio atgal. Kalbą ima iš `<html lang>`, tad dvikalbiuose moduliuose persijungia kartu; spausdinant nerodoma. Testai - `shared/testai.html` |
| `shared/gprocure-info-panel.js` | Informacinė skiltis „Kas tai ir kaip naudotis“ modulio viršuje (`GProcureInfoPanel.mount({ target, moduleId, getLang, content, onMore })`): trumpas sutraukiamas blokas ir „Plačiau“ langas. VIENAS failas visiems moduliams - nuo 2026-09-26 (Q4) jį jungia VISI modulių puslapiai (sargas `shared/testai.html`); išimtys sąmoningos: PP-teise (savas sąžiningumo skydelis), `PP-teise/admin.html`, `PP-cost-benefit/index.html` (dalių pasirinkimas). Kur modulis jau turi išsamią pagalbą (PP-protocol, PP-negotiation, PP-market-KPI), `onMore` veda į ją - antro lango su tuo pačiu turiniu nedaryk. Turinys - tik tai, ką modulis tikrai daro, ir ką jis siunčia į AI bei saugo; be straipsnių numerių ir įrašytų ribų (ribos - iš `GP_THRESHOLDS`). Dvikalbiame puslapyje kalbos perjungimas kviečia `GProcureInfoPanel.refresh()` tiesiogiai. Spausdinant nerodoma; visi tekstai >= 4,5:1 (testai tikrina). Iki 2026-09-23 buvo trys kopijos (`PP-esg/components/` ir dvi įterptos į puslapius), tad taisymai pasiekdavo tik vieną vietą: knygutės ikona buvo nematoma lietuviškai, „Learn more“ lūždavo, o telefone PP-carbon ir PP-esg tekstas susispausdavo į stulpelį. Kopijų nedaryk ir savų `.gpi-*` stilių moduliuose nerašyk (testai tikrina). Būsena - localStorage raktas `gprocure.infoPanel.<moduleId>`, jo nekeisk |
| `shared/busena.js` | Vienodos veiksmų būsenos VISIEMS moduliams (`GP_BUSENA`, nuo 2026-09-26, Q3): eiga, AI (laikmatis, „Atšaukti“, eiga procentais `h.eiga()`), gerai, klaida (priežastis žmogui ir „Bandyti dar kartą“), tuščia, nežinoma. `vykdyk(vieta, { veiksmas(signal, h), kartoti, klaidosPriesdelis, sekme })` grąžina `{ ok, reiksme }` / `{ atsaukta }` / `{ klaida }` - rezultatą modulis taiko tik gavęs `ok`; senas veiksmas neperrašo naujesnio. `juosta({ raktas, ... })` - puslapio lygio pranešimas po antrašte, tekstas gali būti funkcija (persiverčia pakeitus `<html lang>`). Kertinė taisyklė kaip PP-teise: nepavykęs įkėlimas ar dalinis rezultatas NIEKADA nerodomas kaip „duomenų nėra“ ar sėkmė |
| `shared/saugykla.js` | Saugus localStorage skaitymas ir rašymas (`GP_SAUGYKLA`, nuo 2026-09-26): `skaityk()` skiria yra / nera / sugadinta / neprieinama (su `tikrink`), sugadinta reikšmė nukopijuojama į `<raktas>.sugadinta-<data>` (ją išsaugo atsarginė kopija) ir NIEKADA netampa tuščia; `rasyk()` grąžina `{ ok, kodas, klaida }` - „Išsaugota“ tik pavykus; `pranesimas()` LT / EN (anglų priežastis pagal `kodas`). Jungia visi saugantys moduliai |
| `shared/pirkimo-kortele.js` | Bendra pirkimo kortelė (`GP_KORTELE`, tobulinimo planas A1, nuo 2026-09-26, bandomoji): vienas pirkimo įrašas - pavadinimas, numeris, CVP IS numeris, vykdytojas ir režimas, objektas, BVPŽ, numatoma vertė be PVM, būdas (`GP_METHODS` id), dalys (`null` - nenurodyta, `[]` - neskaidomas), sutarties trukmė mėn., pradžios ir planuojama paskelbimo data, iniciatorius, organizatorius, būsena, archyvuota. Saugykla - `gprocure.korteles` (`{ schema: 1, korteles: [] }`) per `GP_SAUGYKLA`: neperskaitoma NIEKADA nevirsta „kortelių nėra“ ir neperrašoma; įrašoma skaitant iš naujo ir keičiant tik vieną kortelę pagal id; nežinomi (naujesnės schemos) laukai paliekami. `tikrink()` - kliūtys žmogui (privalomas tik pavadinimas), `pastabos()` - nesutampantis su organizacija režimas, dalių suma. Juosta moduliui `mount({ modulis, laukai: [{ kortele, el | gauk/dek, i, is, lygu, numatyta, pastaba }], pries, onPasirinkta, poTaikymo })` - prieš `#infoPanelMount`: pildo tik TUŠČIUS (ar numatytuosius) laukus, skirtingus parodo su abiem reikšmėmis ir keičia tik paspaudus „Taikyti“; modulis gali atsisakyti (`pries`). Kortelės kuriamos ir keičiamos `pirkimu-korteles.html` naujame skirtuke (`atverkPuslapi({ id } | { laukai, modulis, onIssaugota })` - ir moduliams be juostos, pvz. PP-plan): modulio duomenys perduodami `postMessage` (ta pati kilmė, ne adresu ir ne saugykla), išsaugotą kortelę modulis pasirenka. Nuo 2026-09-26 (A2) - laukas `pasiulymuTerminas` („2026-10-02T15:00“, Vilniaus laikas) ir puslapio importas iš CVP IS skelbimo PDF (pdf.js iš cdnjs su SRI ir `shared/cpv-data.js` įkeliami tik prireikus; kiekvienas pasiūlymas su citata ir žymimuoju langeliu, jau įvesta kitokia reikšmė nepažymėta). Testams - `?saugykla=testine` (tik atmintyje) ir `naudokSaugykla()`. Bandomieji moduliai - PP-graphs ir PP-qual. Nuo 2026-09-26 (A1 2 etapas) kortelę skaito ir PP-salygos, PP-ts, PP-negotiation, PP-report, PP-protocol ir abi PP-cost-benefit dalys; juostai pridėta: `neimanoma` (kodėl reikšmė šiame modulyje neįrašoma - sakoma prie „Šiame modulyje neįrašoma“), `klaustiKitoPirkimo` (modulyje kitas pavadinimas - klausiama pačioje juostoje, „Ne“ - kortelė nepasirenkama), `nerodoma` (laukų vaizde dar nėra, pvz. neatverta forma - vietoj „sutampa“ sakoma, kur jie bus), API `pritaikyk()` (įrašo į ką tik atsiradusius laukus) ir `skirtumai(true)` (laukai pakeisti ne iš kortelės, pvz. įkeltas juodraštis - „užpildyta“ nebesakoma); nuoroda `?kortele=` pritaikoma po modulio `DOMContentLoaded` (PP-negotiation, PP-ts ir KNA būseną sukuria tik tada). Perkėlimas iš PP-protocol: `protokoloPerkelimas()` / `isProtokolo()` - `litgrid_procurements_v2` skaitomas per tą pačią saugyklą, kortelė tuo pačiu numeriu antrą kartą nekuriama (sutapęs pavadinimas - „panašus“, sprendžia žmogus), būsena - mažiausia, kurią įrodo parengti protokolai (1 - organizavimas, 2 - klausimai, kiti - pasiūlymai gauti), komisija ir DocLogix kortelės data neperkeliamos |
| `shared/skelbimas.js` | CVP IS skelbimo (eForms PDF tekstas per `GP_DOK`) atpažinimas (`GP_SKELBIMAS`, nuo 2026-09-26, planas A2): `pirkejas()` ir `rezimas()` (perkelta iš PP-tiekejams/cvpis.js, ten - nuorodos) ir `atpazink(tekstas, failoVardas)` - kortelės laukų PASIŪLYMAI su citata: vykdytojas, režimas, pavadinimas (ir per kelias eilutes), būdas (eForms pavadinimas -> bazinė procedūra; variantas tik pagal failo vardą: „Nacionalinis skelbimas“ - supaprastintas, „Skelbimas apie pirkimą“ - tarptautinis; be jo - tik pastaba), objektas, BVPŽ (kontrolinis skaitmuo - iš `GP_CPV_DATA`), vertė (tik jei skelbime yra), dalys (viena - neskaidomas), galiojimas mėn., pasiūlymų ar paraiškų terminas, išsiuntimo data, CVP IS numeris. Sandara - iš 4 tikrų skelbimų (LITGRID 9683631, Amber Grid 9742096, EPSO-G 9281765, Energy cells 9614756). pdf.js teksto sluoksnis IŠMETA minkštąjį brūkšnelį („VPP-268“ -> „VPP268“, „LOT-0001“ -> „LOT0001“) - atkurti neįmanoma, todėl pavadinimui su suklijuotu numeriu - įspėjimas. Neaišku - nesiūloma |
| `shared/cpv-data.js` | BVPŽ (CPV 2008) žodynas LT + EN (`GP_CPV_DATA`, 9454 kodai, ~790 KB). Iki 2026-09-26 - `PP-plan/`; jungia PP-plan BVPŽ paieška (`bvpz-kodai.html`) ir kortelių puslapis (įkeliamas tik prireikus - skelbimo BVPŽ kodui su kontroliniu skaitmeniu) |
| `shared/mano-pirkimai.js` | Portalo darbo stalas „Mano pirkimai“ (`GP_MANO_PIRKIMAI.mount({ target, sekcija, saknis, getLang, dabar })`, nuo 2026-09-26, planas U1): aktyvios kortelės šioje naršyklėje, surikiuotos pagal artimiausią terminą (pasiūlymų terminas, paskelbimas, pradžia) su darbo dienomis iki jo (`GP_WORKDAYS`, LR šventės), kitas žingsnis - TIK iš kortelės duomenų (trūkstami laukai kilmininku arba etapas pagal būseną; įrankiai nežino, kas padaryta), įrankiai su `?kortele=<id>` (PP-graphs, PP-qual) ir kortelės nuoroda. Užbaigti ir archyvuoti - tik skaičius; be kortelių blokas paslėptas; neperskaitoma saugykla - sakoma. LT / EN pagal `<html lang>` |
| `shared/organizacijos.js` | Pirkimo vykdytojų registras (`GP_ORG`): LITGRID AB, AB Amber Grid, UAB EPSO-G, UAB Energy cells su tikėtinu režimu (`rezimasTiketinas`; konkretaus pirkimo režimą lemia skelbimas), CVP IS sąrašų nuorodos ir LITGRID taisyklių šaltinis. Iki 2026-09-26 gyveno `PP-tiekejams/`; dabar jungia PP-tiekejams, pirkimo kortelę, PP-qual ir PP-graphs. Organizaciją ar jos režimą keisk TIK čia; PP-tiekejams `sw.js` jį turi sąraše `SAVI` |
| `shared/testu-apsauga.js` | Tikrų naudotojo duomenų apsauga testų puslapiams (`GP_TESTU_APSAUGA.pradek(filtras)` -> `atkurk()`, nuo 2026-09-26): testai gyvena viešu adresu ir dalijasi saugykla su tikru darbu, o PP-market-KPI, PP-cost-benefit ir PP-tiekejams testai iki tol modulio įrašus TRINDAVO. Įsimenama prieš įkeliant modulį, atkuriama pabaigoje ir uždarant puslapį (tiksliai: testų sukurti raktai šalinami) |
| `shared/modulio-antraste.css` | Modulio antraštė VISIEMS moduliams (nuo 2026-09-25, „bendras apvalkalas“; išimtis - `PP-teise/index.html` su sava tokio paties stiliaus antrašte ir sąžiningumo skydeliu): `.app-header`, `.brand-*`, `.header-right` su `.btn-header` (`--pagr` - pagrindinis veiksmas, `--ikona` - iki 1320 px tik ikona), `.header-zyma` (tuščia nerodoma), `.lang-toggle`, `.tabbar`, `.tab`. Ikona - ta pati kaip modulio kortelėje portale, grupės eilutė „G-Procure · <portalo kategorija>“ (organizacijai skirtuose - „· LITGRID AB“), pavadinimas - `<h1 class="brand-module">`; aprašymai ir įžangos - turinyje, todėl antraštė visur 79 px ir skirtukai limpa tiesiai po ja. Jungiama iškart po `epso-g.css` ir PRIEŠ modulio `<style>`; modulis tik papildo (savi lūžio taškai, išskirtiniai valdikliai). Grupės eilutė - `--color-green-15`, neaktyvi kalba - balta (70 % baltumo buvo 4,1-4,3:1). Iki 900 px antraštė slenka, skirtukai limpa prie viršaus (siaurame ekrane antraštė gali lūžti į dvi eilutes); modulio juostos, limpančios po antrašte (`top: 79px`), iki 900 px turi `top: 0`. Spausdinant antraštė slepiama - PP-negotiation, PP-market-KPI ir KNA ją perrašo šviesią su EPSO-G ženklu, nes ten ji yra ataskaitos pavadinimas. Savo `.brand-group` ir `.btn-header` moduliuose nerašyk (testai tikrina); modulis su savo `sw.js` įrašo šį failą į `SAVI` |
| `shared/neissaugotas-darbas.js` | Įspėjimas uždarant puslapį su neišsaugotu darbu (`GP_DARBAS`) moduliams, kurie nieko nesaugo: PP-qual, PP-salygos, PP-graphs. Pakeitimas - tikri naudotojo `input` / `change` / `drop` įvykiai (programiniai nesiskaito) ir modulio būsena, jei ji paduota (`GP_DARBAS.stebek(() => [...])`). `GP_DARBAS.atskaita()` - atsisiuntus dokumentą ar išvalius formą; `momentas()` + `atskaita(m)` - po generavimo pakeisti atsakymai lieka nauji (PP-salygos: atskaita tik atsisiuntus VISUS dokumentus arba ZIP). PP-graphs spausdinimas atskaitos nekeičia - PDF neredaguojamas. Nesiskaito įvykiai elementuose su `data-darbas-ne` (paieška, filtrai, pirkimo kortelės pasirinkimas; nuo 2026-09-26). Būsenos klaida niekada nereiškia „nėra ko prarasti“. Nieko nesaugo ir nesiunčia; savo `beforeunload` šiuose moduliuose nerašyk (testai tikrina) |
| `shared/backup.js` | Atsarginės duomenų kopijos branduolys (`GP_BACKUP`): saugyklos surinkimas, failo tikrinimas, perrašomų raktų skaičius, atkūrimas ir raktų vardai žmogui. Saugykla PADUODAMA iš išorės, todėl testai naudoja netikrą saugyklą ir tikrų duomenų neliečia. Sąsaja - `atsargine-kopija.html` šaknyje. Pridėjus modulį su nauju localStorage raktu, įrašyk jį į `ZENKLAI` sąrašą (be to kopija veiks, bet raktas bus rodomas kaip „kiti duomenys") |
| `shared/docx-stiliai.js` | Word dokumentų `styles.xml` VISIEMS moduliams (`GP_DOCX_STILIAI.xml({font, size, stiliai})`). Paduodamas per `externalStyles`. Jame yra `Normal` su `w:default="1"` - BE JO Pages ignoruoja tiesioginį pastraipų formatavimą (`w:jc`, `w:spacing`, `w:ind`), o docx.js tokio stiliaus per API išrašyti negali. Patikrinta 2026-09-22 aštuoniais bandomaisiais dokumentais ir tikrais modulių dokumentais Pages programoje |
| `shared/teises-nuorodos.js` | Teisės aktų nuorodos VISIEMS moduliams (`GP_TEISE`): PĮ, VPĮ, VPT Metodika, žaliųjų pirkimų tvarkos aprašas - kiekviena perskaityta e-tar (2026-09-23). `GP_TEISE.cit(raktas, "PI"|"VPI", kalba)` -> „PĮ 59 str. 1 d. (taikant VPĮ 47 str. 1 d.)“: PĮ subjektams VPĮ norma nurodoma per PĮ 59 str. 1 d. Sąvokai be prašomo režimo meta klaidą - taip PĮ ir VPĮ nesusimaišo. Statiniam tekstui - `<span data-teise="raktas">` ir `GP_TEISE.uzpildyk()`. Metodikos SKAIČIAI (0,7, 2 kartai vertės, 12 mėn., santykių intervalai) - `GP_TEISE.normos`, vertės kategorija - `GP_TEISE.vertesKategorija(vertė, ribos)` su ribomis iš `thresholds.js`. Jungia PP-qual, PP-ts, PP-negotiation, PP-salygos. Straipsnio numerį taisyk TIK čia; sargas `shared/testai.html` neleidžia šiuose moduliuose ir CLAUDE.md atsirasti numeriui, kurio registre nėra |
| `shared/teise-stebesena.js` | Pirkimų teisės stebėsenos branduolys (`GP_STEBESENA`): įrašo schema ir žodynai (būsenos, rūšys, šaltinių tipai, temos, moduliai su failų keliais - keičiant modulio failo vardą taisyk ČIA), registro tikrinimas (trūkstami laukai, nesaugūs adresai, dublikatai pagal identifikatorius, prieštaraujantys paaiškinimai apie tą patį keičiamą aktą), skiltys „pasikeitė / įsigalios / projektas / archyvas / neaiški“, aktualumas pagal pirkimo kontekstą (nežinomas visada pažymimas), paieška be diakritikų, peržiūrų žurnalas su PADUODAMA saugykla (kaip `backup.js`), įkėlimas (klaida niekada nevirsta „pokyčių nėra“) ir vienas piešėjas `mount()` portalui bei moduliams. Importuotas turinys - nepatikimi duomenys: viskas per `esc()`, nuorodos tik http(s) |
| `shared/testai.html` | Bendrų komponentų regresijos testai (naršyklėje, kaip modulių `testai.html`): `portal-link.js` (11), `backup.js` (9), `docx-stiliai.js` (8), `gprocure-info-panel.js` (9), `modulio-antraste.css` (4: jungimas visuose moduliuose, vienos eilutės aukštis 1280 px ir tilpimas 375 px, kontrastas, prilipimas), `neissaugotas-darbas.js` (8, su PP-graphs ir PP-salygos elgsena), smaragdo teksto sargas visuose puslapiuose (1), `teises-nuorodos.js` su sargu moduliuose (18), `busena.js` su `ai-proxy.js` atšaukimu (10), `saugykla.js`, puslapio juosta ir `testu-apsauga.js` (10), `pirkimo-kortele.js` ir `pirkimu-korteles.html` (9: schema, saugykla ir sugadinta saugykla, tikrinimas, pastabos ir archyvas, juosta, užpildymas ir skirtumai, atsisakymas, kortelių puslapis), `skelbimas.js`, skelbimo importas ir `mano-pirkimai.js` (5: su testo metu sugeneruotu PDF per tikrą pdf.js - reikia interneto), kortelė kituose moduliuose ir perkėlimas iš PP-protocol (5: laukai atsiranda vėliau, priežastys ir kitas pirkimas, būdų adapteriai, PP-protocol įrašai -> kortelės, perkėlimo langas) - iš viso 107; informacinės skilties grupė (9) tikrina ir jos buvimą visuose modulių puslapiuose (ir šaknies `pirkimu-korteles.html`). Skydelio išdėstymas matuojamas 1280 ir 375 px pločio rėmeliuose |
| `shared/img/epso-g-logo.svg` | EPSO-G prekės ženklas puslapių antraštėms ir poraštėms. Naudok per `<img src="[../]shared/img/epso-g-logo.svg" alt="EPSO-G">`, dydį nustatyk puslapio CSS. Iki 2026-09-05 tas pats SVG buvo nukopijuotas SEPTYNIOSE vietose. Spalva faile įrašyta tiesiogiai - išorinis SVG puslapio CSS kintamųjų nemato |
| `shared/img/logo-data.js` | LITGRID logotipas base64 (`GP_LOGO`) dokumentų generavimui. Šaltinis - `shared/img/litgrid-logo-rgb.png` |
| `shared/img/og-card.png` | Socialinių tinklų kortelė (1200x630, ~32 KB) portalo `og:image` ir `twitter:image` žymoms `index.html`. Tai ekrano nuotrauka laikino puslapio su `epso-g.css` žetonais (`--color-emerald` fonas, Nunito Sans): keičiant tekstą, perpiešk iš naujo, ne redaguok PNG. Adresas žymose absoliutus (`https://g-procure.com/...`) - santykinį dalijimosi robotai ignoruoja |

`shared/` kuriamas palaipsniui. Kai pirmą kartą iškeli bendrą logiką iš modulio -
sukurk atitinkamą `shared/` failą ir prijunk jį visuose moduliuose, kurie tą logiką naudoja.

---

## 5. Konvencijos

- **Brūkšniai:** NIEKADA nenaudok ilgo brūkšnio „—" (em dash). Naudok paprastą „-".
  Tai galioja ir tekstui, ir generuojamiems dokumentams, ir kodui.
- **Kalba:** pagrindinė - lietuvių (su pilnomis diakritikomis: ą č ę ė į š ų ū ž).
  Kur modulis jau dvikalbis - palaikyk LT + EN.
- **Pinigai:** numatytai EUR be PVM. Importuojant priimk JAV ir EU formatus
  (14,900.00 ir 14.900,00).
- **Datos:** skaičiuok darbo dienomis per `shared/workdays.js`, ne kalendorinėmis.
- **Word (.docx) stiliai:** kiekvienas `new Document({...})` PRIVALO gauti
  `externalStyles: GP_DOCX_STILIAI.xml({ font, size, stiliai })` ir NETURI naudoti `styles`
  parinkties - biblioteka jas ignoruoja kartu (laimi `externalStyles`). Savus pastraipų stilius
  (Heading1 ir pan.) paduok per `stiliai` sąrašą. Be šito Pages praranda lygiuotę ir tarpus, o
  Word ir sistemos peržiūra to nerodo, todėl defektas pastebimas tik naudotojo ekrane.
  Naudoja: `PP-qual`, `PP-report`, `PP-carbon`, `PP-cost-benefit`, `PP-protocol`, `PP-ts`.
- **Word (.docx) lentelės:** VISADA duok `columnWidths` realiais DXA, `width` DXA,
  `layout: FIXED` ir kiekvienai celei DXA plotį. Be `columnWidths` docx.js įrašo
  `gridCol w="100"`, ir Pages stulpelius suspaudžia iki vienos raidės (Word tai paslepia
  persiskaičiuodamas pats, todėl defektas pastebimas tik Pages). Naudingą plotį skaičiuok
  iš tų pačių konstantų, kurios įrašomos į `pgSz` / `pgMar`, o paskutinį stulpelį pakoreguok,
  kad suma sutaptų. Įdėtinei lentelei atimk celės vidines paraštes (2 × cell margin).
  Pavyzdžiai: `PP-qual` (699ba8c), `PP-cost-benefit`, `PP-report`, `PP-ts`, `PP-protocol`.
- **Kelias atgal:** KIEKVIENAS modulio puslapis prijungia `shared/portal-link.js` (viena eilutė po
  `<body>`). Be jo žmogus, atėjęs iš paieškos ar kolegos nuorodos, lieka viename įrankyje ir nemato,
  kad tai sistema. Savo „į portalą" mygtuko moduliui nereikia - būtų dvi tos pačios nuorodos.
- **Antraštė:** KIEKVIENAS modulio puslapis naudoja `shared/modulio-antraste.css` (žr. 4 sk.): pavadinimas,
  kalba, veiksmai ir skirtukai visur toje pačioje vietoje. Savos antraštės, monogramos ar ženklo nekurk,
  aprašymą ir įžangą dėk į turinį. Naujas veiksmas antraštėje neturi jos lūžinti 1280 px pločiu - testai tikrina.
- **Būsenos ir saugykla (Q3, 2026-09-26):** ilgas veiksmas, AI užklausa, klaida, tuščias ir nežinomas rezultatas -
  tik per `shared/busena.js`; AI veiksmas turi „Atšaukti“ (signalas į `GP_AI_PROXY.call`), klaida - priežastį ir
  „Bandyti dar kartą“. localStorage - tik per `shared/saugykla.js`. Nepavykęs įkėlimas, dalinis rezultatas ar
  neperskaitytas įrašas NIEKADA nerodomas kaip „duomenų nėra“, „0“ ar „sugeneruota“ - sakoma, ko trūksta ir kodėl.
  Prie mygtuko, kuris siunčia į AI, pasakyk, KAS siunčiama (`.cite-ai` PP-qual ir PP-ts).
- **Pirkimo kortelė (A1, 2026-09-26, bandomoji):** pirkimo duomenys (pavadinimas, vertė, būdas, vykdytojas,
  režimas, dalys, terminai) moduliui ateina iš `shared/pirkimo-kortele.js` per `GP_KORTELE.mount({ laukai })`.
  Kortelė pildo tik tuščius (ar numatytuosius) laukus, kitokius parodo ir keičia tik paspaudus „Taikyti“ - ranka
  įvesta reikšmė niekada neperrašoma tyliai. Modulis, kuris nieko nesaugo, kortelės nekeičia ir nesaugo: kortelė
  kuriama ir keičiama `pirkimu-korteles.html` (naujame skirtuke; duomenys - `postMessage`, ne adresu). Vykdytojai -
  `shared/organizacijos.js`, būdai - `GP_METHODS` id; modulio žodyną verčia jo `i` / `is`. Jungiant naują modulį -
  juosta prieš `GP_DARBAS`, testai su `?saugykla=testine`. Kortelės šaltiniai (A2): CVP IS skelbimo PDF (atpažinimas -
  tik pasiūlymai su citata, patvirtina žmogus) ir PP-plan eilutė; darbo stalas portale (U1) atveria įrankius su `?kortele=`.
  Nuo 2026-09-26 (A1 2 etapas) kortelę skaito aštuoni moduliai (žr. 3 sk.). Taisyklės jungiant: `i()` grąžina reikšmę,
  kurią gauna `dek()` (antrą kartą nevertinti - taip PP-negotiation būdas buvo įrašomas tuščias); ko modulis negali
  įrašyti - `neimanoma` su priežastimi; kai modulyje gali būti kitas pirkimas - `klaustiKitoPirkimo`; įkeltas žmogaus
  darbas (juodraštis, projektas) - `skirtumai(true)`, išvalytas ar naujas - `atsiek()`; kur modulis turi automatinį
  saugojimą, kortelės reikšmės įrašomos taip, kad jo neįjungtų, jei saugoma dar neatverta ankstesnė būsena (KNA).
- **Informacinė skiltis (Q4):** KIEKVIENAS modulio puslapis turi „Kas tai ir kaip naudotis“ per
  `shared/gprocure-info-panel.js` (žr. 4 sk.). Pridėjus puslapį - pridėk ir skiltį bei įrašyk jį į sargo sąrašą.
- **Testų puslapiai ir tikri duomenys:** `testai.html` gyvena viešu adresu ir dalijasi naršyklės saugykla su tikru
  darbu. Testas, kuris skaito ar rašo modulio saugyklą, PRIVALO naudoti `shared/testu-apsauga.js` (įsiminti prieš
  įkeliant modulį, atkurti po); tikrų įrašų netrinti. Datos testuose - fiksuotos arba skaičiuojamos nuo `DABAR`.
- **Architektūra:** be build žingsnio - `.html` atidaromas tiesiai naršyklėje.
  Paprastas modulis = vienas `.html` (pvz. `PP-qual`, `PP-graphs`). Sudėtingesni turi
  savo `.js` šalia (`PP-salygos/variklis.js`, `PP-carbon/epd-extract.js`), vendor
  bibliotekas `vendor/`, duomenis `zemelapiai/` ar `templates/`.
  Nepridėk build įrankių ar framework'ų be aiškaus poreikio ir sutarimo.

---

## 6. AI integracija

- AI iškvietimai eina per g-procure backend proxy. API raktas - serverio pusėje.
- NIEKADA nehardcodink API rakto į HTML.
- NIEKADA nesiųsk konfidencialių pirkimų duomenų į išorinį / vartotojišką AI.
- Numatytasis modelis naršyklės moduliams - `shared/ai-proxy.js` (`DEFAULT_MODEL`).
  Keisk TIK ten: moduliai modelio neperduoda, o `PP-ts` (turi vartotojo pasirinkiklį)
  ima jį kaip atsarginę reikšmę. Pakeitus patikrink ir `PP-ts` pasirinkiklio sąrašą.
- Užklausos kūno riba naršyklės moduliams - `shared/ai-proxy.js`: `MAX_BASE64` (9 MB)
  ir `MAX_PDF_BAITU` (3/4 nuo jos, nes base64 pripučia 4/3). Ji atspindi SERVERIO
  nustatymą, todėl viena be kito nekeičiama.
- Backend'o kūno riba (nuo 2026-07-17) - 10 MB. Backend'as gyvena NE repozitorijoje
  (Hetzner, `/var/www/g-procure/index.js`), tad keičiant ribą reikia TRIJŲ vietų:
  1. `index.js` - `express.json({ limit: '10mb' })`. Be argumento Express tyliai
     riboja iki 100 KB, ir būtent tai ilgai laužė `PP-carbon` EPD analizę.
  2. nginx - `/etc/nginx/conf.d/upload-limit.conf`, `client_max_body_size 10m`.
     BŪTINA kartu su 1 punktu: nginx numatytieji 1 MB kitaip tampa naujomis lubomis.
  3. `shared/ai-proxy.js` - `MAX_BASE64`, laikoma žemiau serverio ribos (kūne dar
     telpa promptas ir apvalkalas).
- **KLAIDŲ ŽINUTĖS ŽMOGUI - `shared/ai-proxy.js` (2026-09-08).** Viršijus kūno ribą nginx
  grąžina savo HTML puslapį („413 Request Entity Too Large ... nginx/1.28.3"), o Express -
  `PayloadTooLargeError`. Anksčiau visa tai keliaudavo tiesiai į naudotojo ekraną. Dabar
  `klaidosZinute()` verčia statusą į sakinį (413 sako tikrą failo ribą iš `MAX_PDF_BAITU`,
  429, 5xx), o HTML kūnas į ekraną nebededamas. Visi moduliai rodo `res.error`, tad taisyti
  reikia TIK čia. Kartojimo sprendimas (`isRetryable`) remiasi STATUSU, ne žinutės tekstu -
  kitaip pagražinus žinutę 529 „overloaded" nustotų kartotis.
- **DOTENV EILIŠKUMAS - patikrintas spąstas (2026-09-08).** `index.js` maršrutų moduliai
  (`routes/*.js`) `process.env` skaito **failo įkėlimo metu**, tad `require('dotenv').config()`
  PRIVALO stovėti PIRMAS, prieš bet kurį `require('./routes/...')`. Diegiant `/api/rinka`
  `require('./routes/rinka')` buvo 2 eilutėje, o `dotenv` - 5: raktas tuo momentu dar
  neegzistavo, konstanta liko tuščia, ir maršrutas grąžino „FRED_API_KEY nenustatytas", nors
  pm2 logai rodė „injected env (4)". Klaida atrodo kaip trūkstamas raktas, nors raktas yra.
  Pridedant BET KOKĮ naują maršrutą - pirmiausia patikrink šią eilę.
- SERVERIO pusė yra atskira ir `shared/` importuoti negali (kita vykdymo aplinka):
  `worker/epd-proxy.js` (Cloudflare Worker - viešas PP-carbon EPD proxy) ir
  `PP-esg/backend-pp-esg-routes.js` turi savo modelio konstantas. Keičiant modelį
  visai sistemai - nepamiršk ir jų.
- Tas pats galioja RIBOMS. `worker/epd-proxy.js` turi savo `MAX_PDF_CHARS`, visiškai
  nesusijusią su `shared/`: jis kreipiasi tiesiai į Anthropic, per nginx/Express neina.
  `PP-carbon/epd.html` eina į tą Worker'į, tad ir jo riba imama iš Worker'io, o NE iš
  `shared/` - net jei skaičius šiandien sutampa. Sujungus juos, backend'o pakeitimas
  tyliai pakeistų viešo įrankio ribą prieš nepakeistą Worker'į.

---

## 7. Duomenys ir privatumas

- Vartotojo duomenys saugomi TIK naršyklėje (localStorage) - jokios serverio duomenų bazės.
  Tai sąmoninga duomenų suverenumo nuostata (valstybės kritinė infrastruktūra).
- Dalis modulių nesaugo darbo duomenų (`PP-qual`, `PP-salygos`, `PP-graphs`) - rezultatas atsiduria
  tik atsisiųstame dokumente; nuo 2026-09-26 juose išsaugoma tik informacinės skilties būsena (atverta ar
  suskleista, `gprocure.infoPanel.<modulis>`). Tai irgi tinkama: nesukurk saugojimo be poreikio. Kad darbas nedingtų
  netyčia, uždarant su neatsisiųstais pakeitimais naršyklė paklausia (`shared/neissaugotas-darbas.js`) -
  tai ne saugojimas: niekas neįrašoma ir nesiunčiama.
- Pirkimo kortelės (`gprocure.korteles`, nuo 2026-09-26) saugomos tik naršyklėje ir patenka į atsarginę kopiją.
  Jas įrašo TIK kortelių puslapis `pirkimu-korteles.html`, žmogui paspaudus „Išsaugoti kortelę“ arba „Perkelti pažymėtus“
  (iš PP-protocol - PP-protocol įrašai nekeičiami); moduliai kortelę tik skaito, o nesaugantys (PP-qual, PP-graphs,
  PP-salygos, PP-ts) savo darbo ir toliau nesaugo. Kortelėje gali būti asmenų vardai (iniciatorius, organizatorius) -
  kaip ir PP-plan bei PP-protocol įrašuose. Skelbimo PDF kortelių puslapyje skaitomas naršyklėje ir niekur nesiunčiamas
  (iš CDN įkeliama tik pdf.js biblioteka); PP-plan įraše įsimenamas tik kortelės id.
- Nieko nesiųsk į serverį be aiškaus pagrindo. Šiandien vienintelis toks pagrindas - AI
  analizė: `PP-carbon`, `PP-qual`, `PP-salygos` ir `PP-ts` siunčia analizuojamą turinį per
  proxy (taip pat `PP-esg` sankcijų vertinimas, `PP-tiekejams` klausimai ir `PP-teise/admin.html` juodraštis).
  PP-qual ir PP-ts pastabos prie mygtukų (2026-09-26) sako tik „siunčiama per G-Procure serverį į Claude API“ -
  be „serveryje nesaugoma“, nes serveris tą dieną iš naujo netikrintas (žr. žemiau). Modulio sąsajoje apie tai pasakyk naudotojui aiškiai (žr. `PP-salygos` įkėlimo juostas:
  1 žingsnyje paraiška, 2 žingsnyje dokumentų tekstas atsakymų pasiūlymams - tik paspaudus mygtuką).
- Backend'as to turinio NESAUGO. Patikrinta prie šaltinio 2026-07-17
  (`/var/www/g-procure/index.js`, 91 eilutė): jokio `writeFile` / `appendFile` /
  `createWriteStream`, jokios duomenų bazės, o vienintelis `console.log` yra paleidimo
  pranešimas - užklausos kūnas nelogginamas. Tuo ir remiasi naudotojui rodomi tekstai
  `PP-SALYGOS.html` įkėlimo juostose („nei naršyklėje, nei serveryje nesaugomas“). Turinys VIS TIEK keliauja į Claude API - tos grandies nuo
  naudotojo neslėpk.
- DĖMESIO dėl ankstesnio punkto: backend'as gyvena NE šioje repozitorijoje (Hetzner), tad
  repo negali pastebėti, jei jis pasikeis - įrašas gali tyliai pasenti. Prieš STIPRINDAMAS
  bet kokį privatumo teiginį naudotojui, patikrink serveryje iš naujo, o ne remkis šiuo
  įrašu. Jei patikrinti negali - rašyk tik tai, kas tikrai žinoma (taip `PP-salygos` tekstas
  kurį laiką sakė tik „naršyklėje nesaugomas", kol serveris nebuvo patikrintas).
- NIEKADA nelaužk localStorage suderinamumo - esami vartotojų duomenys turi išlikti
  po atnaujinimų (jei keiti duomenų struktūrą, pridėk migraciją).
- Kadangi duomenys gyvena tik naršyklėje, išvalyta naršyklė ar naujas kompiuteris reiškia
  prarastą darbą. Tam yra `atsargine-kopija.html` (šaknyje, nuoroda portalo poraštėje):
  visi moduliai vienoje kilmėje dalijasi ta pačia localStorage, tad puslapis išsaugo VISKĄ į
  vieną JSON failą ir atkuria atgal. Logika - `shared/backup.js`.
- ŽINOMA RIZIKA (ne galutinis sprendimas): `PP-protocol` audito žurnalas saugomas
  localStorage, nors PSĮ 103 str. reikalauja 4 metų saugojimo. Tai pažymėta kaip
  būsima migracija į backend'ą - neplėsk priklausomybės nuo localStorage šiam žurnalui.

---

## 8. Darbo eiga

- Dirbk po vieną modulį. Kai sakoma „dirbam su pp-qual" - keisk tik to folder'io failus.
- Bendras pakeitimas (vertės riba, šventė, stilius, AI modelis) - daromas `shared/`, vieną kartą.
- Commit'ai: aiškūs, su modulio prefiksu. Pvz.: `pp-qual: pridėta proporcingumo validacija`.
  Vienas modulis - vienas commit'as, kai įmanoma.
- Prieš push patikrink, kad modulis veikia atskirai (atidarius `.html` naršyklėje).
- Po darbo - commit ir push į vieną `g-procure` repo. Jokio rankinio failų kėlimo.

---

## 9. Teisiniai šaltiniai (kontekstas moduliams)

Straipsnių numeriai gyvena `shared/teises-nuorodos.js` (`GP_TEISE`): kiekviena nuoroda ten
perskaityta e-tar aktualioje redakcijoje (tikrinta 2026-09-23), PĮ ir VPĮ atskirai. Modulis numerio
pats nerašo - kviečia `GP_TEISE.cit("kvalifikacija", "PI")`. Naują nuorodą dėk į registrą tik
perskaitęs tą straipsnio dalį e-tar (Lietuvos viešųjų duomenų jungtis, `get_teises_akto_istrauka`).
Jei dabartinės normos nežinai - pažymėk ir paklausk, neišgalvok.

KODĖL TAIP GRIEŽTAI. Iki 2026-09-23 šiame sąraše buvo klaidingi PĮ numeriai (kvalifikacijai,
principams, skaidymui į dalis, CPO ir vidaus kontrolei - straipsniai, kurie reguliuoja visai ką
kita) ir neegzistuojantis Metodikos punktas su koeficientais. Iš čia jie pateko į PP-qual, PP-ts,
PP-negotiation ir PP-salygos, o per juos - į AI užklausas ir Word dokumentus. Todėl žemiau - tik
santrauka žmogui; tiesos šaltinis yra registras, o `shared/testai.html` sargas neleidžia šiame faile
ir prijungtuose moduliuose atsirasti numeriui, kurio registre nėra.

PĮ (LITGRID, Amber Grid, Energy cells):
- **PĮ 29 str. 1 d.** - lygiateisiškumo, nediskriminavimo, abipusio pripažinimo, proporcingumo,
  skaidrumo principai (EPSO-G: **VPĮ 17 str. 1 d.**); **PĮ 29 str. 3 d.** - negalima dirbtinai
  mažinti konkurencijos ar vengti įstatymo tvarkos
- **PĮ 59 str. 1 d.** - pašalinimo pagrindai ir kvalifikacija nustatomi mutatis mutandis taikant
  VPĮ 46, 47, 50 ir 51 straipsnius. Todėl LITGRID kvalifikacijos proporcingumas rašomas
  **PĮ 59 str. 1 d. (taikant VPĮ 47 str. 1 d.)**, Metodikos taikymas - per **VPĮ 47 str. 7 d.**,
  apyvartos riba (iki 2 kartų vertės) - **VPĮ 47 str. 3 d. 1 p.**, reikalavimai kiekvienai daliai - **VPĮ 47 str. 4 d.**
- **PĮ 40 str.** - pirkimo objekto skaidymas į dalis; **PĮ 13 str.** - numatomos vertės skaičiavimas
- **PĮ 48 str. 4 d.** - pirkimo dokumentai tikslūs, aiškūs, be dviprasmybių
- **PĮ 50 str.** - techninė specifikacija: 3 d. - konkurencija ir nediskriminavimas; 4 d. 2 p. -
  standartas su „arba lygiavertis“; 5 d. - modelis, prekės ženklas ar kilmė tik išimtimi, su „arba lygiavertis“
- **PĮ 64 str.** - pasiūlymų vertinimas (EPSO-G: **VPĮ 55 str.**); **PĮ 66 str.** - neįprastai maža
  kaina (EPSO-G: **VPĮ 57 str.**)
- **PĮ 90 str. 2 d. 1 p.** ir **PĮ 48 str. 2 d. 34 p.** - sprendimo nepirkti per CPO katalogą
  motyvai pirkimo dokumentuose
- **PĮ 94 str. 8 d.** - atidėjimo terminas; **PĮ 97 str.** - sutarties keitimas (peržiūros sąlygos - 1 d. 1 p.)
- **PĮ 103 str. 3 d.** - pirkimų vidaus kontrolė; **PĮ 103 str. 6 d.** - dokumentų saugojimas (min. 4 metai)
- **PĮ 31 str. 1 d.** - pirkimo komisija ir jai nustatomos užduotys; mažos vertės pirkimuose komisijos galima
  nesudaryti (EPSO-G: **VPĮ 19 str. 1 d.**); **PĮ 31 str. 5 d.** - komisijos sprendimai protokole su motyvais
  (EPSO-G: **VPĮ 19 str. 5 d.**). Kas sprendžia, kai komisija nesudaroma, šios dalys nenurodo - moduliuose rašyk
  „kitas paskirtas asmuo“, ne išgalvotą pareigybę

Kiti šaltiniai:
- **VPT Tiekėjo kvalifikacijos reikalavimų nustatymo metodika** (2017-06-29 Nr. 1S-105; 2026-06-11
  Nr. 1S-82 redakcija, galioja nuo 2026-07-01): 2 p. - sąvokos (maža / vidutinė / didelė vertė pagal
  mažos vertės ir tarptautinio pirkimo ribas, ilgalaikė - ilgesnė kaip 12 mėn., kvazisubtiekėjas -
  SPECIALISTAS, kurį tiekėjas ketina įdarbinti, 2.4 p.); 4 p. - Metodika privalo vadovautis komisija,
  organizatoriai, iniciatoriai ir ekspertai; 6 p. - kitokie reikalavimai galimi laikantis 7 p. principų;
  7.1 p. - vienodi, tikslūs, aiškūs, objektyviai patikrinami; 7.2 p. - skaidant į dalis, reikalavimai kiekvienai daliai
  atskirai; 7.3 p. - pirkimo vykdytojas turi galėti
  MOTYVUOTAI PAGRĮSTI kiekvieną reikalavimą ir jo reikšmę, vertinama ir reikalavimų visuma (todėl PP-qual
  rimtai pastabai prašo pagrindimo); 7.4 p. - tikslas ne aukščiausia kvalifikacija, o visi pajėgūs įvykdyti;
  7.5 p. - sutarties vykdymo dalykai (pvz. objekto draudimas) - sutartyje; 7.7 p. - be nacionalinės
  priklausomybės; 10-11 p. - finansinis pajėgumas: tikslas - padengti išlaidas, kol apmokamos sąskaitos (ne patirtis);
  atsižvelgiama į trukmę ir vertę (11.1), apmokėjimą ir avansą (11.2 - dažnesnis ar su avansu - žemesnis
  reikalavimas), priklausomybę nuo sutarties (11.3 - ne skubą), sektorių (11.4); 8.3 p. - priemones (patalpas, įrangą) tik
  suteikiantys tretieji asmenys EBVPD neteikia; 8.6 p. - kiekvienas ūkio subjektas, išskyrus
  kvazisubtiekėjus, pildo ATSKIRĄ EBVPD; 8.8 p. - atitikties VPĮ 47 str. 9 d. deklaracija; 12 p. - pajamos
  iki 2 kartų vertės, ilgalaikei - pagal didžiausią metinę vertę (12.1 p.); 13 p. - finansiniai
  santykiai didelės vertės sutartims; 14 p. - draudimas kvalifikacijai tik kai privalomas pagal teisės
  aktus; 16 p. - patirtis paprastai iki 0,7 numatomos vertės; 16.1-16.3 p. - darbai 5 m., prekės ir
  paslaugos 3 m., savo jėgomis; 21 p. - kompetencijos, ne specialistų skaičius. Šių punktų skaičiai
  gyvena registre (`GP_TEISE.normos`). Koeficientų 0,3 ir 0,5 Metodikoje NĖRA - tai PP-qual
  rekomendacija, ir moduliuose ji taip ir vadinama
- **Žaliųjų pirkimų tvarkos aprašas** - aplinkos ministro 2011-06-28 įsakymas Nr. D1-508 (taiko ir
  VPĮ, ir PĮ subjektai). 4 p.: pirkimas žaliasis, kai tenkinamas BENT VIENAS būdas - 4.1 (produktų sąrašas ir
  minimalūs kriterijai), 4.2 (I tipo ekologinis ženklas), 4.3 (paslaugai ar darbui ne iš sąrašo - tiekėjo ISO 14001 /
  EMAS), 4.4 (pvz. 4.4.3 - nematerialios paslaugos, tarp jų programavimo ir IS priežiūros, žaliosios be papildomų
  reikalavimų). Todėl žaliojo pirkimo požymis savaime NĖRA kvalifikacijos reikalavimas; produkto aplinkosaugos
  savybės - techninės specifikacijos dalis (**PĮ 2 str. 27 d.**, EPSO-G: **VPĮ 2 str. 34 d.**). Metodikos 22 p.:
  aplinkos apsaugos vadybos priemonės kvalifikacijai - konkrečios priemonės, ne sistema ar standartas
- **VPT IT gairės** 2023-01-18 - specialistų reikalavimai
- **LAT** 3K-3-126/2010, 3K-3-222/2008 - proporcingumo praktika (2026-09-23 e-tar patikra bylų neapėmė)

---

## 10. Ko NIEKADA nedaryti

- NIEKADA nehardcodink VPT ribų, straipsnių numerių (`shared/teises-nuorodos.js`), pirkimo būdų,
  koeficientų ar užklausos kūno ribos į kiekvieną modulį - jie gyvena `shared/`, kad keistum vieną kartą.
- NIEKADA neapeik serverio ribos kliento gudrybėmis (suspaudimu, dokumento skaidymu į dalis).
  Toks apėjimas jau buvo `PP-salygos` ir kainavo AI tikslumą bei 3 kartus daugiau užklausų -
  pašalintas 2026-07-17. Riba per maža - kelk ją serveryje, ne slėpk modulyje.
- NIEKADA nenaudok ilgo brūkšnio „—".
- NIEKADA neteik teisinio tikslumo iš atminties - tikrink arba klausk.
- NIEKADA nelaužk localStorage suderinamumo.
- NIEKADA nesiųsk konfidencialių duomenų į išorinį AI.
- NIEKADA nemaišyk VPĮ (EPSO-G) ir PĮ (LITGRID / Amber Grid / Energy cells) taisyklių.

# Sutarties projekto vietos ir jų sprendimai - prekių, paslaugų ir projektavimo ir statybos rangos specialiosios sąlygos

2026-10-08, sutarčių planas S4 (`docs/salygos/sutartys-planas-2026-10.md` 3.4, 4.3-4.5). Įgyvendinta 2026-10-08
(`PP-salygos/sutarties-forma.js`). Jūsų sprendimai 2026-10-08: užtikrinimo procentai - iš SPS sumos ir numatomos vertės; 8.2 - sutarties
galiojimo terminas; 10.1-10.2 - klausiama kiekvieną kartą; paslaugų 13.1-13.2, kai netaikoma, - „Punktas netaikomas.“ Kitos „SIŪLOMA“
eilutės įgyvendintos kaip siūlomos reikšmės (formoje - „Siūloma (nepatvirtinta)“ su kilme; keičiate ar patvirtinate jūs). Valdiklių
taisyklės (išskleidžiamieji sąrašai) patvirtintos 2026-10-07 - jos čia pakartotos, kad lentelė būtų pilna.

Bendrosios sąlygos (BS) pildomų vietų neturi - generuojamos be pakeitimų (tik generavimo pasas ir lentelių sutvarkymas Pages programai).
LT/EN dokumente sprendžiama tik lietuviškai - anglų stulpelis seka tą patį pasirinkimą toje pačioje eilutėje (patikrinta: visi keturi
LT/EN failai generuojami be likusių lietuviškų ar angliškų nurodymų). Anglų tekstas (2026-10-08, jūsų sprendimas: vertėjas netikrins) suredaguotas pagal VPT
vertimų ir ES pirkimų terminiją, be geltono žymėjimo; LT/EN sutarties Word failuose - DI požymis (`DI_turinys`).

Žymės: **D** - iš jau įvestų duomenų (1 žingsnis, pirkimo kortelė, SPS 2 žingsnis); **S** - LITGRID standartas (siūloma su kilme
„LITGRID standartas“, patvirtinama vienu paspaudimu); **K** - klausimas 2 žingsnyje (skyrius „Sutarties projektas“); **SUD** - lieka
pildyti sudarant sutartį (pagal laimėjusį pasiūlymą; generatorius palieka vietą ir ją išvardija patikroje).

Kaip iki šiol formoje: siūloma reikšmė niekada neatrodo kaip jūsų - „Siūloma (nepatvirtinta)“ su kilme; „Taip / Ne“ - be numatytojo.

**Jūsų taisyklė (2026-10-11): kas pildoma generuojant sutarties projektą** (galioja visoms sutarčių šeimoms):

- **įrašoma automatiškai** - kas žinoma iš pirkimo: sutarties pavadinimas (= pirkimo pavadinimas), pirkimo pavadinimas ir numeris, pirkimo
  vykdytojo (LITGRID AB) rekvizitai, ir sąskaita bei bankas. 2 žingsnyje tai rodoma sąraše „Įrašoma automatiškai“ su reikšme ir kilme;
- **nepildoma** - kas paaiškėja tik sudarant sutartį: sutarties numeris, tiekėjo rekvizitai, Šalių atstovai, tiekėjo atstovas, nurodymas
  „(jei Tiekėjas yra fizinis asmuo ...)“ - vietos lieka kaip šablone (sąrašas „Pildoma sudarant sutartį“);
- **klausiama prieš generuojant** - kas žinoma rengiant pirkimą, bet ne iš jau įvestų duomenų: ES lėšos, 4.1 punkto pradžia ir terminas,
  bendras paslaugų teikimo terminas. Pirkimo numeris klausiamas tik tada, kai jo nėra pirkimo kortelėje.

## 1. Sutarties šalys, dalykas, terminai

| Vieta | Šablone | Taisyklė | Žymė |
|---|---|---|---|
| Sutarties pavadinimas | tuščias laukas | = pirkimo pavadinimas: „{pirkimo pavadinimas} pirkimas“ (pavadinimas kilmininku iš 1 žingsnio, pvz. „Galios transformatorių pirkimas“); LT/EN - „{EN pavadinimas} procurement“. Įrašoma automatiškai (jūsų sprendimas 2026-10-11; iki tol - „... pirkimo-pardavimo sutartis“) | D |
| Sutarties numeris, 1.1.9-1.1.10, 1.2.1-1.2.10 (Tiekėjo rekvizitai, atstovai) | tušti laukai | sudarant | SUD |
| 1.1.1-1.1.8 (Pirkėjo rekvizitai) | LITGRID AB rekvizitai jau šablone (kodas, adresas, PVM kodas, sąskaita, bankas, telefonas, el. paštas); „ĮMONĖS PAVADINIMAS“ | įrašoma automatiškai: „ĮMONĖS PAVADINIMAS“ -> LITGRID AB, kiti - kaip šablone | D |
| 1.2 nurodymas „(jei Tiekėjas yra fizinis asmuo ... grupės nario informaciją)“ | nurodymas pildančiam | lieka (jis skirtas pildančiam sudarant) | SUD |
| 2.1 Pirkėjo atstovas „(nurodyti padalinį / skyrių, pareigas, vardą, pavardę, tel., el. paštą)“ | nurodymas | K, neprivalomas: „Kas bus Pirkėjo atstovas sutarčiai vykdyti?“ - įrašius - vietoj nurodymo; neįrašius - nurodymas lieka | K, SIŪLOMA |
| 2.2 Tiekėjo atstovas | nurodymas | lieka | SUD |
| 3.2 Pirkimo pavadinimas ir numeris | tuščias laukas | įrašoma automatiškai: „{pavadinimas} pirkimas, pirkimo Nr. {numeris}“; numeris - iš pirkimo kortelės, o kai kortelė nepasirinkta ar be numerio - privalomas klausimas „Koks pirkimo numeris?“ (iki 2026-10-11 be kortelės numeris būdavo tyliai praleidžiamas) | D / K |
| 3.3 ES lėšos | valdiklis | K: „Ar pirkimas finansuojamas ES lėšomis?“ Taip - projekto Nr. ir pavadinimas | K |
| 4.1 pradžia | valdiklis (3 variantai) | pagal kainodarą (5.1): fiksuota kaina - nuo įsigaliojimo; fiksuotas ar kintamas įkainis - nuo užsakymo; kitos - K (3 šablono variantai) | D / K |
| 4.1 terminas | „[...]“ + vieneto valdiklis | K: skaičius ir vienetas; vieneto forma - pagal skaičių („1 mėnesį“, „3 mėnesius“, paslaugoms ir „10 mėnesių“, „dienas / dienų“); jei pasirinktas variantas „Techninėje specifikacijoje nustatytais terminais“ - neklausiama | K |
| 4.1 bendras paslaugų terminas (paslaugos) | „[...]“ + valdiklis „punktas netaikomas / mėnesių / mėnesiai“ | K, privalomas: „Ar nustatomas bendras paslaugų teikimo terminas?“ Taip - mėnesių skaičius; Ne - „punktas netaikomas“ (iki 2026-10-11 klausimas buvo neprivalomas ir neįrašius būdavo parenkama „netaikoma“) | K |
| 4.2 termino pratęsimas (paslaugos) | „Netaikoma“ / aplinkybių sąrašas | **SIŪLOMA S:** aplinkybių sąrašas (kaip prekių sutartyje, kur jis yra visada) | S, SIŪLOMA |
| 4.3 užsakymų tvarka (prekės) | „Netaikoma“ / užsakymai el. sistemoje | pagal kainodarą: fiksuota kaina - „Netaikoma“; įkainiai - užsakymų tvarka; kitos - K | D / K, SIŪLOMA |

## 2. Kaina ir atsiskaitymas

| Vieta | Šablone | Taisyklė | Žymė |
|---|---|---|---|
| 5.1 kainodara | valdiklis (5) | K: „Koks kainos apskaičiavimo būdas?“ (šablono 5 variantai) | K |
| 5.2 vertės apibrėžimas | valdiklis (7) | pagal kainodarą; fiksuotam ir kintamam įkainiui - ir K: „Ar Pirkėjas įsipareigoja nupirkti visą kiekį?“ (taip - pasiūlymo kaina už maksimalų kiekį; ne - maksimali lėšų suma, Pirkėjas neįsipareigoja išpirkti) | D + K |
| 5.2 sumos (vertė be PVM, PVM, kaina su PVM) | „[...]“ | sudarant (pagal laimėjusį pasiūlymą); numatoma vertė į skelbiamą projektą neįrašoma | SUD |
| 5.3.1.2 kainų peržiūra | valdiklis | trukmė > 6 mėn. - taikoma, kitaip - netaikoma (papunkčiai tada šalinami šablono nurodymu) | S (2026-10-07) |
| 5.3.1.2.1 „5“ (VPT mėlynai) | keičiama reikšmė | lieka 5, juodu tekstu | S, SIŪLOMA |
| 5.4 kiekio keitimas | valdiklis „netaikomas / taikomas“ + 5.4.1-5.4.2 | **SIŪLOMA K:** „Ar numatoma galimybė įsigyti nenumatytų prekių (paslaugų) iki 10 % pradinės sutarties vertės?“ (šablono 5.4.1 tekstas); ne - punktas netaikomas, papunkčiai šalinami | K, SIŪLOMA |
| 5.5.2 apmokėjimas | valdiklis (3) | pagal kainodarą: fiksuota kaina - visa kaina įvykdžius; įkainiai - už užsakymą; kitos - K | D / K |
| 5.6 avansas, 5.7 avanso užtikrinimas | valdiklis (prekės), „Netaikoma / arba“ (paslaugos) | „Punktas netaikomas.“ / „Netaikoma“ | S (2026-10-07) |

## 3. Kokybė, garantija, subtiekėjai

| Vieta | Šablone | Taisyklė | Žymė |
|---|---|---|---|
| 6.2 garantinė priežiūra (prekės) | valdiklis | „... per Techninėje specifikacijoje nurodytą terminą ... ne ilgiau kaip per 10 dienų ...“ | S (2026-10-07) |
| 6.1 garantinis terminas (paslaugos) | „Netaikoma“ / nuostata su nurodymais | **SIŪLOMA K:** „Ar paslaugoms taikomas garantinis terminas?“ Ne - „Netaikoma“ (ir 6.2 - „Netaikoma“); Taip - formuluotė (siūloma: šablono sakinys be nurodymų, žodžius „teisės aktuose nustatytas / Tiekėjo pasiūlytas / Techninėje specifikacijoje nustatytas“ ir terminą renkatės jūs) | K, SIŪLOMA |
| 6.2 trūkumų šalinimas (paslaugos) | „Netaikoma“ / terminas / skirtingi terminai | Taip (6.1) - K: terminas dienomis ar mėnesiais | K, SIŪLOMA |
| 6.3 kokybinių kriterijų tikrinimas | „Netaikoma“ / „(nurodyti tvarką)“ | SPS kriterijus kaina ar sąnaudos - „Netaikoma“; kainos ir kokybės santykis - K: tvarkos formuluotė | D / K, SIŪLOMA |
| 7.1 subtiekėjai | valdiklis | sudarant (iš laimėjusio pasiūlymo; valdiklis lieka) | SUD (2026-10-07) |

## 4. Užtikrinimas ir atsakomybė

| Vieta | Šablone | Taisyklė | Žymė |
|---|---|---|---|
| 8.1 užtikrinimo būdas, 8.3 pateikimas | valdikliai | SPS užtikrinimo dydis: yra - „netesybos; banko garantija ...“ ir 8.3 taikomas; nėra - „netesybos.“, 8.3 netaikomas (8.3.1-8.3.2 šalinami) | D (2026-10-07) |
| 8.3.1 dydis „{.....} procentų nuo Pradinės Sutarties vertės“ | pildoma vieta | siūloma: SPS užtikrinimo suma / numatoma vertė x 100 (2 skaičiai po kablelio); į sutartį patenka tik procentai (jūsų sprendimas 2026-10-08) | D |
| 8.2 užtikrinimo galiojimas | „Netaikoma“ / sutarties galiojimo terminas / prievolių įvykdymo terminas | užtikrinimo nėra - „Netaikoma“; yra - „ne trumpesnis nei Sutarties galiojimo terminas“ (jūsų sprendimas 2026-10-08) | D / S |
| 9.2.1, 9.2.2 „(arba nurodyti kitą skaičių)“ | nurodymas prie 0,02 % | šalinamas, lieka šablono 0,02 % | S, SIŪLOMA |
| 9.3 bauda nutraukus | 3 variantai | LITGRID variantas: 5 % Pradinės sutarties vertės, ne mažiau 3000 Eur (VPT variantų nurodymai šalinami kartu) | S (plano 5.6, 2026-10-07) |
| 9.7 kokybiniai kriterijai | valdiklis | kaina ar sąnaudos - „Punktas netaikomas.“; kokybės santykis - sudarant | D / SUD (2026-10-07) |
| 9.9 | valdiklis | „Netaikoma.“ | S (2026-10-07) |
| 9.10 | valdiklis | seka 14.4 | D (2026-10-07) |
| 12.2.4 vėlavimas „{......}“ (paslaugos) | pildoma vieta | K, neprivalomas: „Po kiek dienų vėlavimo galima nutraukti sutartį?“; neįrašius - vieta lieka (šablonas: taikoma, tik jei įrašyta) | K, SIŪLOMA |

## 5. Esminės sąlygos, galiojimas, kriterijai, kita

| Vieta | Šablone | Taisyklė | Žymė |
|---|---|---|---|
| 10.1, 10.2 esminės sąlygos | „Netaikoma“ / „(nurodyti ...)“ | K kiekvieną kartą (jūsų sprendimas 2026-10-08): „Ne“ - „Netaikoma“, „Taip“ - abi formuluotės (LT/EN - ir angliškai); skyriaus užrašas „(taikoma, jeigu užpildyta)“ (paslaugos) šalinamas | K |
| 11.1.1 įsigaliojimas | valdiklis | užtikrinimas - 2 variantas; ES lėšos - 3; abu - K; kitaip - 1. Prekėms - K: „Ar sutarčiai reikia valdybos ar akcininkų pritarimo?“ (Taip - 4 variantas) | D / K |
| 11.1.2 trukmė | valdiklis | kortelės (ar 2 žingsnio) trukmė 6 / 12 / 24 / 36 mėn. - tas variantas, kita - „iki [...]“ su K | D / K |
| 11.2 pratęsimas | „Netaikoma“ / VPT nuostata su nurodymais | **SIŪLOMA K:** „Ar sutartį galima pratęsti?“ Ne - „Netaikoma“; Taip - formuluotė (siūloma: šablono tekstas be nurodymų, jį taisote) | K, SIŪLOMA |
| 13 skyriaus užrašas „(taikoma, jeigu ... kriterijai nustatomi ...)“ | taikymo sąlyga | šalinamas | S, SIŪLOMA |
| 13.1 žalieji (teisinis pagrindas) | „Netaikoma“ / Tvarkos aprašas su „[...]“ (prekės); „Jei punktas taikomas:“ (paslaugos) | SPS žaliųjų atsakymas: nenustatyti - „Netaikoma“; nustatyti - K: Tvarkos aprašo papunktis | D / K (2026-10-07) |
| 13.2-13.4 LITGRID aplinkosauginiai kriterijai (prekės) | „Punktas netaikomas.“ / LITGRID tekstas | K kiekvienam (standarto dar nėra) | K (2026-10-07) |
| 13.5 (prekės), 13.2 (paslaugos) socialiniai kriterijai | „Punktas netaikomas.“ / „(nurodyti ...)“; paslaugose „Jei punktas taikomas:“ | K: „Ar taikomi socialiniai kriterijai?“ Ne - netaikoma; Taip - formuluotė | K, SIŪLOMA |
| Paslaugų 13.1-13.2, kai netaikoma | „Jei punktas taikomas:“ be „Netaikoma“ varianto | „Punktas netaikomas.“ (LT/EN - „The clause does not apply.“; jūsų sprendimas 2026-10-08) | D |
| 14.3 nacionalinis saugumas | valdiklis | SPS 1 žingsnio atsakymas | D (2026-10-07) |
| 14.4 tinklo objektai | valdiklis | K (kartu su sutarties parinkimo klausimais) | K (2026-10-07) |
| 15.2 pirkimo dokumentų adresas (paslaugos) | teksto valdiklis („Click or tap here...“) | K: CVP IS adresas (neprivalomas; neįrašius - valdiklis lieka) | K, SIŪLOMA |
| 15.4, 15.5 papildomi priedai (prekės) | tušti | lieka tušti | SUD, SIŪLOMA |
| 16 parašai | nurodymai | lieka | SUD |

Iš viso klausimų 2 žingsnyje: prekėms - 8-12 (priklauso nuo kainodaros ir atsakymų), paslaugoms - 9-13; dalis - neprivalomi.
Bendri su SPS (užtikrinimas, kriterijus, žalieji, nacionalinis saugumas, kalba) - neklausiami antrą kartą.

## Įgyvendinimas (2026-10-08)

- 2 žingsnis: skyrius „Sutarties projektas“ po SPS klausimų - 25 klausimai prekėms, 26 paslaugoms (dalis rodomi tik pagal kitus atsakymus),
  grupuoti kaip lentelėse; siūlomi - nepažymėti, su kilme; „Patvirtinti“ ir „Patvirtinti visas siūlomas“. Klausimai atsiranda tik
  patvirtinus sutartį 1 žingsnyje.
- 3 žingsnis: sutarties BS ir SS - kartu su pirkimo sąlygomis (lentelė ir ZIP); neatsakius privalomų klausimų - eilutė be failo su
  priežastimi; nepatvirtinta sutartis į paketą neįtraukiama (patikroje pasakoma). Patikroje - kas paliekama sudarant, kas sutvarkoma Word.
- Dar neįgyvendinta: SPS dalies „Esminės sutarties sąlygos (dalis reikalinga, jei nepridedamas Sutarties projektas)“ automatinis
  pašalinimas, kai sutartis generuojama (plano 4.4); Pages patikra (S5); nuorodų sargas ir PĮ 95 str. katalogas (plano 4.5.3-4.5.4).

## Generatoriaus patikra (padaryta, `PP-salygos/sutarciu-generatorius.js`)

Visi 8 šablonai generuojami dviem sprendimų rinkiniais be klaidų; kiekviena nepaliesta šablono pastraipa lieka ta pačia tvarka; nelieka
„Pasirinkite elementą“, „arba“, „Jei punktas netaikomas ...“, nurodymų ir raudono teksto; be sprendimo vieta lieka kaip šablone ir
išvardijama; pakeistas šablonas negeneruojamas; lentelių tvarkymas, pakeitęs tekstą, stabdo; LT/EN anglų stulpelis seka lietuvišką toje
pačioje eilutėje. 7 testai, 12 kodo mutacijų - visos pagaunamos.

---

# Projektavimo ir statybos rangos specialiosios sąlygos (3 etapas, S4, 2026-10-10)

Šablonas `PSR_LT_SS` (LITGRID 2026-10-05, tik LT). Jame nėra išskleidžiamųjų sąrašų - rengėjui skirti „//“ nurodymai, „arba“ ir
„Turi būti pasirinkta:“ (žemėlapio blokai, S1). Kiekvienam nurodymui ar pasirinkimui - vienas klausimas 2 žingsnyje, SS punktų tvarka
(`PP-salygos/sutarties-forma.js`, `KLAUSIMAI_PSR`). Bendrosios sąlygos (`PSR_LT_BS`) generuojamos be pakeitimų (tik „ĮMONĖS PAVADINIMAS“
-> LITGRID AB, pasas, lentelės). Klausimų tekstai - juodraštis jūsų peržiūrai; formuluotės ir taisyklės - pagal jūsų sprendimus 2026-10-10
(žr. pabaigą).

Žymės - kaip aukščiau: **D** - iš jau įvestų duomenų, **K** - klausimas, **SUD** - pildoma sudarant, **W** - sutvarkoma Word programoje
(generatorius vietą palieka ir ją išvardija 3 žingsnio patikroje).

## 1. Pagrindinės sąlygos (SS 1-4)

| Vieta | Šablone | Taisyklė | Žymė |
|---|---|---|---|
| Preambulė: „[pirkimo pavadinimas] pirkimą Nr. [numeris]“ | pildomos vietos | pavadinimas (kilmininku) iš 1 žingsnio; numeris - iš pirkimo kortelės, be jo vieta lieka | D |
| Preambulė: Užsakovo pasirašantis asmuo, Rangovo duomenys, registracijos valstybė (teksto valdiklis) | pildomos vietos | sudarant | SUD |
| 1 Objektas | „//nurodomas statomas, rekonstruojamas, arba remontuojamas statinys.“ | K (privalomas, formuluotė) - įrašoma vietoje nurodymo ir etapų priedo antraštėje vietoje „[OBJEKTAS]“ | K |
| 2 Techninė užduotis / Projektas | „// nurodomas priedas ...“ | K (privalomas); siūloma: „Sutarties specialiųjų sąlygų priedas Nr. 1.2 „Techninė užduotis / projektavimo užduotis“.“ (numeris - iš SS priedų sąrašo, po pašalintų priedų) | K, SIŪLOMA |
| 3 Darbų atlikimo terminas „[dienos/mėnesiai] nuo Sutarties sudarymo dienos.“ | pildoma vieta | K (privalomas): skaičius ir vienetas, forma pagal skaičių („18 mėnesių“, „1 mėnuo“, „90 dienų“) | K |
| 3 pratęsimas „gali būti pratęstas [terminas] dėl ____“ | šablono sakinys su dviem pildomomis vietomis | K (privalomas): „Ar Darbų atlikimo terminas gali būti pratęstas?“ Taip - terminas ir aplinkybės (abu privalomi); Ne - sakinys pašalinamas (BS 2.2.2: pratęsimo galimybė nurodoma specialiosiose sąlygose) | K (2026-10-10) |
| 4 Darbų etapai | „//Jei Darbai atliekami etapais ...“ + „priede Nr. []“ | K: „Ar Darbai atliekami etapais?“ Taip - lieka su priedo numeriu (1.1); Ne - antraštė lieka, tekstas - **„Punktas netaikomas.“** (1-19 punktų numeriai visose sutartyse tie patys), etapų priedas (paskutinis dokumento skyrius) ir jo eilutė priedų sąraše šalinami; Word perskaičiuoja priedų numerius, o SS nuorodos į priedus („priede Nr. ...“) skaičiuojamos po pašalinimo | K (2026-10-10) |

## 2. Darbai (SS 5-9)

| Vieta | Šablone | Taisyklė | Žymė |
|---|---|---|---|
| 5 Pagrindiniai įrenginiai | „// nurodomas Pagrindinių įrenginių sąrašas ...“ | K (privalomas, formuluotė) | K |
| 6 Užsakovo įrenginiai | du šablono sakiniai su „[įrenginiai ir medžiagos ...]“, „[vieta, adresas]“ | K (privalomas): „Ar Užsakovas Darbams pateikia Įrenginius ir Medžiagas?“ Taip - abu laukai privalomi; Ne - vietoje abiejų sakinių **„Punktas netaikomas.“** (BS 4.9.8 taikomas, „kai Sutartyje nurodyta“) | K (2026-10-10) |
| 7 Fizinė sauga | „// punkto reikalavimus parengia Fizinės saugos skyrius ...“ | K: Ne - „Papildomi fizinės saugos reikalavimai Darbams netaikomi.“ (šablono nurodymo formuluotė); Taip - reikalavimai (formuluotė) | K |
| 8 Demontuojami įrenginiai „[adresas]“ | šablono sakinys su pildoma vieta | K (privalomas): Taip - adresas; Ne - vietoje sakinio **„Punktas netaikomas.“** | K (2026-10-10) |
| 9 Dalinis apmokėjimas | „// Už Rangovo teikiamus ... 70 % ...“ | K: Taip - sąrašas arba priedas (formuluotė); Ne - **„Punktas netaikomas.“** (BS 5.9.5 c taikomas tik specialiosiose sąlygose nurodytiems Įrenginiams) | K (2026-10-10) |

## 3. Darbų organizavimas, kaina ir apmokėjimas (SS 10-14)

| Vieta | Šablone | Taisyklė | Žymė |
|---|---|---|---|
| 10 Užsakovo atstovas ir atsakingas už paskelbimą | „[Pareigos, vardas, pavardė]“, „[Telefonas, el. paštas]“ | K (neprivalomi); Rangovo atstovas - sudarant | K / SUD |
| 11 Sutarties kaina, 13 sąskaita | pildomos vietos | sudarant (pagal laimėjusį pasiūlymą) | SUD |
| 12 Apmokėjimas | 3 variantai su „//“ rekomendacijomis | K (privalomas): pagal Darbų žiniaraštį / pagal etapus (tik kai darbai etapais; „priede Nr. []“ - 1.1) / įvykdžius įsipareigojimus. Siūloma pagal šablono rekomendacijas: terminas iki 4 mėn. - vienu mokėjimu; pavadinime rekonstravimas, statyba, atramos - pagal žiniaraštį; remontas ir etapai - pagal etapus | K, SIŪLOMA |
| 14 ES fondai | „// Jei Darbus numatoma finansuoti ...“ | K: šablono nurodymo formuluotės („Darbus ketinama finansuoti ...“ / „Darbai ... nefinansuojami.“) | K |

## 4. Atsakomybė, baigiamos nuostatos (SS 15-19)

| Vieta | Šablone | Taisyklė | Žymė |
|---|---|---|---|
| 15 Netesybos | 0,04 % / „arba“ pakopiniai / etapais | K (privalomas); etapais - tik kai darbai etapais (siūloma tada), „priede Nr. [...]“ - 1.1 | K, SIŪLOMA |
| 16 Bankai ir draudimo bendrovės „prieduose Nr. [...]“ | pildoma vieta | „1.4 ir 1.5“ - iš SS priedų sąrašo (po pašalintų priedų - „1.3 ir 1.4“) | D |
| 17 BIM | „// nurodoma ar turi būti taikomas ... priede Nr. [...]“ | K: Taip - „Rangovas turi pareigą taikyti statinio informacinį modeliavimą (BIM). Užsakovo informacijos reikalavimai pateikiami priede Nr. N.“ (BS 2.6.1 žodžiai, N - jūsų); Ne - „Statinio informacinis modeliavimas (BIM) netaikomas.“ Paaiškinime: atsakymas turi sutapti su Technine užduotimi, priedą įrašyti į priedų sąrašą (šablone jo nėra) | K (2026-10-10) |
| 18 Investicinis projektas | „// nurodomas ... pavadinimas ir numeris“ | K: Taip - „{pavadinimas}, Nr. {numeris}.“; Ne - **„Punktas netaikomas.“** (BS 11.9.2 - „jei toks numatytas“) | K (2026-10-10) |
| 19 Šalių kontaktai | LITGRID rekvizitai šablone; Rangovo - pildomos vietos | „ĮMONĖS PAVADINIMAS“ -> LITGRID AB; Rangovo - sudarant | D / SUD |

## 5. Papildomos sąlygos (SS 20-29)

| Vieta | Šablone | Taisyklė | Žymė |
|---|---|---|---|
| 20 Grafiko terminas (BS 2.3.1 pakeitimas) | „// punktas įrašomas, jei ... ne per 30 dienų“ | K: Taip - punktas su „per N dienas“ (forma pagal skaičių); Ne - punktas ir tuščia pastraipa po jo šalinami | K |
| 21 Derinimo terminai (4 „Turi būti pasirinkta:“) | lentelė | K: 330 kV TP / kitos įtampos TP / kiti atvejai -> kiekviename langelyje vienas variantas (skliaustai „(pasirenkama ... atveju)“ skiria pagal projekto rūšį); „(pasirenkama ...)“ ir kablelis po jo šalinami; siūloma pagal pavadinimą (330 kV ir pastotė ar skirstykla). Paaiškinime - kas TP projekte galioja kitoms dalims: brėžiniams 15 ir 10 d. d. (BS 4.1.2), Pagrindiniams įrenginiams 10 ir 5 d. d. (BS 4.10.2) | K, SIŪLOMA (2026-10-10) |
| 22 Ekspertizės terminas (BS 3.3.10 pakeitimas) | „// punktas įrašomas, jei ... ne per 20 darbo dienų“ | K: Taip - darbo dienų skaičius (šablone po jo „darbo dienų“ - kitam skaičiui nei 10-19, 20, 30 ... įspėjimas taisyti Word); Ne - punktas šalinamas | K |
| 23 Atjungimo terminai (BS 4.5.1 papildymas) | „// punktas papildomas, jei ...“ + 2 terminai + „[...];“ | K: Taip - šablono punktas, „[...]“ - jūsų kiti terminai arba eilutė šalinama; Ne - punktas šalinamas | K |
| 24 Užtikrinimas | 3 variantai su „//“ (vidaus taisyklių riba - be skaičiaus) | K (privalomas); siūloma „netaikomas“, kai SPS užtikrinimo nereikalauja; kai reikalauja - pastaba su SPS suma ir procentu, variantą (iki ar virš ribos) renkatės jūs; nesutapus su SPS - „Patikrinkite (SPS ir sutartis)“; 2 ir 3 variantai šablone be punkto numerio - numeris perkeliamas | K, SIŪLOMA |
| 25 BS 9.9 netaikomas | „//įrašoma, kai ... nedidelės vertės remonto darbai“ | K: Taip - punktas įrašomas; Ne - šalinamas | K |
| 26 Esminės sąlygos | „// įrašomos Sutarties sąlygos ...“ + „Esminėmis yra laikomos šios Sutarties sąlygos:“ | K: Taip - užrašas ir jūsų sąlygos (kiekviena eilutė - nauja pastraipa po užrašo); Ne - punktas šalinamas | K |
| 27 Sprogmenų paieška | „// pagal poreikį įrašomos kitos nuostatos“ + šablono punktas | K: Taip / Ne | K |
| 28-29 Koordinatorius | du beveik vienodi punktai be „arba“ | K: Ne / tik 28 p. / 28 ir 29 p. kartu - 29 p. vienas neįrašomas, nes sąvoka „Koordinatorius“ apibrėžta tik 28 p.; kitos nuostatos - Word programoje | K (2026-10-10) |
| 1.1 priedas „Projektavimo ir statybos darbų etapai“ | lentelė, „(rengiant sutartį pasirenkama ...)“, „//Pildymo sąlygos:“ | darbai etapais - priedas lieka: „[OBJEKTAS]“ - 1 punkto atsakymas, lentelė ir nurodymai - W (generatorius lentelės nepildo); ne etapais - priedas šalinamas | D / W |
| Priedų sąrašas, parašai | šablono tekstas | lieka (priedų sąrašą ir „Kiti priedai“ sutvarkote Word programoje, jei reikia) | SUD |

Iš viso: 26 klausimai (2 neprivalomi - Užsakovo atstovai; papildomi laukai rodomi pagal atsakymą), siūloma reikšmė - 5 klausimams (Techninė užduotis,
apmokėjimas, netesybos, derinimo terminai, užtikrinimas). Bendri su SPS: užtikrinimas (tik siūlymas ir derinimas).

## Įgyvendinimas (2026-10-10)

- Žemėlapis (`sutarciu-sablonai.py`): `priedai` (SS priedų sąrašas su Word numeriais), `skyriai` (etapų priedas - paskutinis skyrius),
  `neprivalomos` (SS 3, 6 ir 8 sakiniai be „//“), 23 punkto dvi dalys (šablono terminai ir „[...];“), `numeracija: "word"`.
- Generatorius (`sutarciu-generatorius.js`): `b:` neprivalomi „//“ punktai (taikoma, dalys, papildymas - naujos pastraipos; netaikoma su
  tekstu - punktas su antrašte lieka, jo vietoje „Punktas netaikomas.“), `o:` šablono sakiniai (pašalinami arba pakeičiami tekstu; pildomos
  vietos juose nebesprendžiamos), `nb:` nurodymų blokas, `k:` priedo skyrius (skyriaus lūžio savybės tampa dokumento pabaigos, visiškai pašalinta lentelė šalinama visa, priedų sąrašo
  eilutė - kartu), punkto numerio perkėlimas pasirinktam variantui be numerio, „(pasirenkama ...)“ su kableliu; patikra: nelieka „//“,
  „Turi būti pasirinkta:“, „(pasirenkama“ ne paliktose vietose.
- Patikra pakete ir „Tikrinti parengtus dokumentus“: nuorodų patikra - tekstai su emuliuotais Word numeriais (`GP_SUTARCIU_NUORODOS.tekstai`,
  GPNum), rangos priedų sąrašas atpažįstamas („priede Nr. 1.1“); privalomi sutarties elementai - ir „Sutarties kaina yra fiksuota“,
  „Subrangovai“; palyginimas su forma - neprivalomi punktai, nurodymų blokai ir priedo skyrius - pasirenkamos dalys, esminės sąlygos -
  užpildyta vieta. Išmatuota: abu atsakymų rinkiniai ir BS - 0 nukrypimų su pasu ir be jo, nuorodos ir 13 iš 13 elementų rasta.
- Pages (S5, 2026-10-10): etapų priedas - atskirame gulsčiame faile „Sutarties SS priedas 1.1“ (`generuok()` -> `priedas`), SS 21 derinimo
  terminų lentelė - pagrindinės lentelės eilutėmis (`isvyniok`), įrašyta reikšmė - to paties šrifto kaip jos sakinys; šablono paruošimas -
  kairysis stulpelis 1814 DXA, punktų numerių šriftas, sujungta langelių pora, SS 3 pratęsimo sakinys ir SS 12 sakinio pabaiga - įprastu
  šriftu (jūsų sprendimas 2026-10-10; `sutarciu-sablonai.py` `STULPELIAI`, `FORMATAS`, `IPRASTAS_SRIFTAS`).

## Jūsų sprendimai (2026-10-10: „Taip, įgyvendinkite visus penkis punktus taip, kaip jūs siūlote.“)

- **„Punktas netaikomas.“** (ne „Netaikoma.“, ne punkto šalinimas) - SS 4, 6, 8, 9 ir 18, kai punktas netaikomas: ta pati formuluotė kaip
  paslaugų SS 13.1-13.2 (2026-10-08); 1-19 punktai lieka visi, todėl jų numeriai visose sutartyse tie patys. SS 20-29 - kaip šablone:
  įrašomi tik taikomi (forma tai pasako prie grupės „Papildomos sąlygos“).
- **BIM (SS 17)** - formuluotės tinka; paaiškinime - suderinimas su Technine užduotimi ir priedų sąrašu.
- **Derinimo terminai (SS 21)** - vienas variantas; antra eilutė savo nuožiūra nepridedama (Pagrindiniams įrenginiams ji pakeistų kitų
  dalių terminą iš BS 10 ir 5 d. d. į 15 ir 10 d. d. - klausimas laiške LITGRID).
- **Koordinatorius (SS 28-29)** - Ne / tik 28 / 28 ir 29 kartu.
- **SS 3, 6 ir 8** - sprendžia generatorius („Taip / Ne“ privalomi): skelbiamame projekte nelieka „[terminas]“, „____“, „[vieta, adresas]“.

Lieka jūsų peržiūrai: klausimų tekstai ir paaiškinimai (`KLAUSIMAI_PSR`).

---

# Projektavimo paslaugų sutartis (4 etapas): vietų inventorius (S1, 2026-10-11)

Šablonai `PPS_LT_SS`, `PPS_LT_BS`, `PPS_LT_SS3`; žemėlapiai - `PP-salygos/zemelapiai/sutartys/`. Klausimai ir generavimas - S4; čia - kas
šablone pažymėta ir kas tai pildys. **Taisyklė (jūsų 2026-10-11):** sutarties projektas rengiamas prieš pirkimą, laimėtojas nežinomas -
tiekėjo rekvizitai, kaina ir kitos tik sudarant sutartį paaiškėjančios vietos lieka tuščios.

| SS vieta | Šablone | Kas pildo |
|---|---|---|
| Preambulė | Užsakovo atstovas ir atstovavimo pagrindas; Projektuotojo pavadinimas, valstybė, kodas, adresas, atstovas; pirkimo pavadinimas ir numeris | pirkimo pavadinimas - generatorius (1 žingsnis); kita - sudarant sutartį |
| 1.2 | „Ši Sutartis sudaryta įgyvendinant investicinį projektą [...]“ | klausimas (neprivaloma dalis) |
| 2.1 | „[nurodomas objekto pavadinimas] projektavimo paslaugos“ | klausimas |
| 3.1 | „per [nurodomas projektavimo paslaugų suteikimo terminas]“ | klausimas |
| 3.1 „arba“ | variantas iš rangos sutarties (Darbai, priedas „Projektavimo ir statybos darbų etapai“) | nesiūloma, generatorius pašalina (jūsų sprendimas g) |
| 3.3, 3.6 | „negali viršyti [...] mėnesių“, „Ilgiau kaip [...] mėnesiams“ | klausimai |
| 3.8 | projekto vykdymo priežiūros trukmė mėnesiais, pratęsimų skaičius ir trukmė | klausimai |
| 4.1 | „XXXX Eur be PVM / XXXX Eur su PVM“ (trys eilutės) | sudarant sutartį (laimėtojo kaina) |
| 4.2 | [pasirinkti vieną]: ES fondų lėšomis finansuojama / nefinansuojama | klausimas |
| 5.1 | Šalių atstovų lentelė | sudarant sutartį (Užsakovo atstovas - klausimas S4, jei žinomas iš anksto) |
| 6.1 | [Pasirinkti vieną]: užtikrinimas pagal BS 7.5.1 ir 7.5.2 / nereikalaujama / tik pagal 7.5.1 | klausimas; siūloma pagal SPS užtikrinimo atsakymą |
| 7.1 | Kontaktiniai duomenys: Užsakovo adresas, telefonas, el. paštas, PVM kodas - įrašyti; sąskaita ir bankas - tušti (jūsų sprendimas h); Projektuotojo - tušti | sudarant sutartį |
| 8.1 | nacionalinio saugumo patikra „bus atliekama / nebus atliekama [pasirinkti vieną]“ | klausimas; siūloma pagal SPS 1 žingsnio nacionalinio saugumo atsakymą |
| 8.2-8.3 | statinių projektavimo saugos ir sveikatos koordinatorius | klausimas (neprivalomos dalys; sąvoka „Koordinatorius“ apibrėžta 8.2 p.) |
| 8.4 | „[Galima įrašyti kitas papildomas sąlygas ...]“ | klausimas (tekstas arba punktas šalinamas) |
| 9.1 | priedų sąrašas 1-15; 12 priedas „Pareigų sąrašas [pridedama, jei bus atliekama ... patikra]“, 15 priedas „Kiti priedai [...]“ | 12 - pagal 8.1 atsakymą; 15 - klausimas |
| Parašai | „[pareigos, vardas, pavardė]“ | sudarant sutartį |

3 priedas - dvi etapų lentelės (1 lentelė: 10 / 20 / 50 / 20 proc., 2 lentelė: 20 / 20 / 40 / 20 proc.); šablono autorių pastaba - kiekvienam
projektui pasirenkama viena: projektuojant pastotes rekomenduojama 1 lentelė, oro linijas - 2. S4 - klausimas, kuri lentelė taikoma; antroji šalinama. BS pildomų vietų neturi (tik „ĮMONĖS PAVADINIMAS“).

## Jūsų sprendimai (2026-10-11: „Taip, pradėkime S4, abu klausimai - kaip rekomenduojate.“)

- **„Punktas netaikomas.“** netaikomame specialiųjų sąlygų punkte (1.2, 8.2, 8.3, 8.4) - punktas lieka, numeriai visose sutartyse tie patys
  (kaip rangos SS 1-19 ir paslaugų SS 13.1-13.2).
- **12 priedo eilutė** „Pareigų sąrašas“, kai patikra neatliekama, lieka su žodžiu „netaikoma“ („12 priedas. Pareigų sąrašas - netaikoma;“) -
  13-15 priedų numeriai nesikeičia. Tas pats 15 priedo eilutei, kai kitų priedų nėra („15 priedas. Kiti priedai - netaikoma.“).

## Klausimai 2 žingsnyje (S4, 2026-10-11; `KLAUSIMAI_PPS`, 13 - visi privalomi, be numatytųjų)

| Nr. | SS vieta | Klausimas | Atsakymas -> sutartyje | Siūloma |
|---|---|---|---|---|
| 1 | 1.2 | Ar Sutartis sudaroma įgyvendinant Užsakovo investicinį projektą? | Taip - projekto pavadinimas ir numeris sakinyje; Ne - „Punktas netaikomas.“ | - |
| 2 | 2.1 | Kokio objekto projektavimo paslaugos perkamos? | įrašoma kilmininku į sakinį „... kurias sudaro: <objektas> projektavimo paslaugos ...“ | - |
| 3 | 3.1 | Per kiek laiko nuo Sutarties įsigaliojimo dienos suteikiamos projektavimo paslaugos? | „per 12 mėnesių“, „per 90 dienų“ (forma pagal skaičių); šablono „arba“ variantas pašalinamas | - |
| 4 | 3.3 | Kiek mėnesių iš viso gali trukti visi terminų pratęsimai? | skaičius sakinyje „negali viršyti ... mėnesių“ | - |
| 5 | 3.6 | Ilgiau kaip keliems mėnesiams terminas pratęsiamas tik laikantis Pirkimų įstatymo? | skaičius sakinyje „Ilgiau kaip ... mėnesiams“ | 3.3 atsakymas (nepatvirtinta) |
| 6 | 3.8 | Kiek mėnesių truks Objekto statybos darbai (projekto vykdymo priežiūra)? | trys skaičiai: mėnesiai, pratęsimų skaičius, vieno pratęsimo trukmė | - |
| 7 | 4.2 | Ar Paslaugas ketinama finansuoti ES fondų lėšomis? | lieka vienas iš dviejų šablono sakinių | - |
| 8 | 3 priedas | Pagal kurią 3 priedo lentelę mokama projektavimo paslaugų kaina? | lieka 1 lentelė (10 / 20 / 50 / 20 proc.) arba 2 lentelė (20 / 20 / 40 / 20 proc.) | pagal pirkimo pavadinimą: pastotė - 1, oro linija - 2 (šablono rekomendacija) |
| 9 | 6.1 | Ar reikalaujamas Sutarties įvykdymo užtikrinimas? | lieka vienas iš trijų šablono sakinių (pagal BS 7.5.1 ir 7.5.2 / nereikalaujama / tik 7.5.1) | „Ne“, kai SPS užtikrinimo nereikalauja; kitaip - pastaba su SPS suma, variantas nesiūlomas |
| 10 | 8.1, 12 priedas | Ar bus atliekama BS 9.1 punkte nurodyta patikra? | „bus atliekama“ ir 12 priedas „Pareigų sąrašas“ / „nebus atliekama“ ir 12 priedo eilutėje „netaikoma“ | pagal 1 žingsnio nacionalinio saugumo atsakymą |
| 11 | 8.2-8.3 | Ar koordinatorius skiriamas iš Projektuotojo deleguotų asmenų? | Ne - abu „Punktas netaikomas.“ / tik 8.2 / 8.2 ir 8.3 | - |
| 12 | 8.4 | Ar įrašomos kitos papildomos sąlygos? | Taip - jūsų tekstas; Ne - „Punktas netaikomas.“ | - |
| 13 | 15 priedas | Ar pridedami kiti priedai? | „15 priedas. Kiti priedai: <išvardyti>.“ / „... - netaikoma.“ | - |

Neklausiama (pildoma sudarant sutartį, lieka kaip šablone ir geltonai pažymėta): Projektuotojo duomenys, registracijos valstybė ir atstovaujantis
asmuo, Užsakovo atstovaujantis asmuo, Sutarties data ir numeris, 4.1 punkto kainos, Šalių atstovai (5.1), Projektuotojo kontaktai, sąskaita
ir bankas (7.1), pasirašantys asmenys. Įrašoma be klausimo: pirkimo pavadinimas (1 žingsnis) ir pirkimo numeris (kortelė, o be jos -
klausimas „Koks pirkimo numeris?“) preambulėje, LITGRID AB vietoje „ĮMONĖS PAVADINIMAS“, Užsakovo sąskaita ir bankas 7.1 punkte (jūsų taisyklė
2026-10-11: pirkimo vykdytojo rekvizitai žinomi; LITGRID formoje šios dvi eilutės tuščios - įrašoma iš organizacijų registro, kuris sutampa
su prekių, paslaugų ir rangos sutarčių formomis).

Žodžio forma šablono sakiniuose fiksuota („... mėnesių“, „... mėnesiams“, „... mėnesius“, „... kartus“): kai įrašytam skaičiui ji netinka
(pvz. 3.8 punkte 12 - „12 mėnesius“), forma rodo perspėjimą pataisyti Word programoje. SPS ir sutarties nesutapimas (užtikrinimas, nacionalinis
saugumas) - „Patikrinkite (SPS ir sutartis)“.

## Įgyvendinimas (S4, 2026-10-11)

- Generatorius (`sutarciu-generatorius.js`): `vd:<id>` - pasirinkimas pastraipos viduje (lieka tekstas prieš, pasirinktas variantas ir tekstas
  po; žyma „[pasirinkti vieną]“ ir kiti variantai šalinami; pastraipa turi tiksliai susidėti iš žemėlapio dalių - kitaip klaida);
  žemėlapio `nesiulomi` šalinami visada ir išvardijami ataskaitoje su priežastimi; `glaustai` - įrašas be tarpo prieš vietą
  („Kiti priedai: ...“); žemėlapio `zymejimas: "pildoma"` - geltona lieka tik vietose, pildomose sudarant sutartį, nuimama išspręstose
  vietose, `zinomos` pastraipose (Užsakovo adresas, antraštės) ir tuščiose pastraipose; likusi žyma „[pasirinkti vieną]“ ne paliktoje
  vietoje - klaida.
- 3 priedas - trečias sutarties dokumentas pakete („Sutarties SS 3 priedas“, iškart po specialiųjų sąlygų): lieka pasirinkta etapų lentelė,
  kita pašalinama (`GP_SUTARTIES_FORMA.priedoSprendimai`).
- Patikra pakete: nuorodos (13-14 nuorodų, visos į esamus punktus), privalomi sutarties elementai - 13 iš 13 (`shared/sutarties-elementai.js`
  papildytas: šalis „Projektuotojas“, „Šios Sutarties vykdymui Šalys paskiria ...: Užsakovo atstovas“); 3 žingsnis sako, koks šablono
  variantas pašalintas ir kodėl, ir kur paliktas geltonas žymėjimas.
- „Tikrinti parengtus dokumentus“: sugeneruotos specialiosios sąlygos, bendrosios sąlygos ir 3 priedas - 0 nukrypimų su pasu ir be jo.
- Formatavimas Word ir Pages programoms (tekstas nekeičiamas): ruošiant šabloną pašalinamas Word teksto šešėlis (LITGRID formoje 7.1 punkto
  Užsakovo kontaktų eilutės parašytos su šešėliu - atrodė išplaukusios; 36 vietos) ir geltonas žymėjimas nuo tarpų pastraipos krašte
  („Telefonas “); generuojant po pastraipos su likusiu geltonu žymėjimu (ne lentelėje) tarpas perkeliamas
  į tuščią tikslaus aukščio pastraipą - Pages pažymėto teksto foną nudažo ir per tarpą po pastraipos, todėl po preambulės ir kainų
  eilutėmis buvo geltoni stačiakampiai (išdėstymas Word ir Pages programose nesikeičia).
- Jūsų prašymu (2026-10-11, „sutvarkykite pastebėtas smulkmenas“) ruošiant šabloną: 7.1 punkto Užsakovo kontaktų eilutės - be įtraukos,
  kaip Projektuotojo stulpelis (LITGRID formoje penkios eilutės įtrauktos stiliumi, trys - dešimčia tarpų); 3.8 punkte „t. y.“ su
  jungiamuoju tarpu (santrumpa lūždavo per dvi eilutes); 3 priedo 1 punktas be įtraukos, kaip 2 punktas. Žodžiai nekeisti.
- Pages (PDF eksportu, abu atsakymų rinkiniai): bendrosios sąlygos 23 psl., specialiosios sąlygos 3 psl., 3 priedas 1 psl., visi A4, tekstas
  neprarandamas, punktų numeriai kaip Word.

Lieka jūsų peržiūrai: klausimų tekstai ir paaiškinimai (`KLAUSIMAI_PPS`).

---

# Darbų pirkimo-pardavimo („mažoji“) sutartis - vietų inventorius (5 etapas, S1, 2026-10-11)

Šablonai `DARBAI_LT_BS` ir `DARBAI_LT_SS` paruošti (S1), sutartis generuojama nuo 2026-10-12 (S4 - žr. žemiau). Lentelėje - kiekviena
specialiųjų sąlygų vieta ir kaip ji pildoma pagal taisyklę „kas pildoma generuojant“ (žinoma iš pirkimo - automatiškai, paaiškėja tik
sudarant sutartį - lieka tuščia, kita - klausiama prieš generuojant). Lentelė surašyta S1 metu; „16 p.“ - sutarčių plano 8 skyriaus 16
punkto klausimai, į kuriuos atsakėte 2026-10-12 (b-i - pirmas variantas).

| SS vieta | Šablone | Siūloma |
|---|---|---|
| antraštė | „[PERKAMI DARBAI]“ | automatiškai - pirkimo pavadinimas |
| antraštė | „[data], [vieta] Nr. __________“ | lieka (sudarant sutartį) |
| preambulė, Užsakovas | „ĮMONĖS PAVADINIMAS“, kodas, adresas; „[pareigos, vardas, pavardė]“, „[atstovavimo pagrindas]“ | pavadinimas - automatiškai (LITGRID AB); atstovas - lieka |
| preambulė, Rangovas | „[Rangovo pavadinimas]“, „[kodas]“, „[adresas]“, atstovas; pažymėta „Lietuvos Respublikos įstatymus“, „... juridinių asmenų registre“ | lieka (sudarant sutartį) |
| preambulė, pirkimas | „laimėjo Užsakovo skelbtą [pirkimo pavadinimas, būdas, paskelbimo data ir numeris (jei apie pirkimą skelbiama)]“ | automatiškai - pavadinimas ir numeris (16 p. c klausimas) |
| 1.1 | „Sutarties [...] priede nurodytus darbus“ | automatiškai - priedų sąrašo eilutės „Techninė specifikacija“ numeris |
| 1.2 | sąrašas: „Atliktų darbų aktą“ / „paskutinį Atliktų darbų aktą“ | klausimas (siūloma pagal darbų vykdymo atvejį) |
| 1.3 | garantiniai terminai; „užtvarams ... dviejų metų“ | 16 p. b klausimas |
| 2 skyrius (2.1-2.6) | nurodymas „[skyrius pasirenkamas, kai perkami Darbai vykdomi pagal atskirus užsakymus]“ | klausimas „Kaip vykdomi darbai?“ - vienas atsakymas valdo 2 skyrių, 3.1 pradžią, 3.2-3.4, 4.3 ir 4.4 |
| 2.1 | pažymėta „elektroniniu paštu“ | lieka kaip šablone, žymėjimas nuimamas |
| 2.2 | „[užsakomus Darbus /Darbų kiekius /atlikimo terminus/...]“ | klausimas (tik užsakymams) |
| 2.3 | „[derinami kiekvieno užsakymo pateikimo metu / nurodyti Sutarties priede Nr.[ ] / ...]“ | klausimas (tik užsakymams) |
| 3.1 | „[Rangovas įsipareigoja Darbus atlikti per] / [Pagal šią Sutartį užsakymai Darbams bus teikiami] [terminas]“ | formuluotė - pagal atvejį; terminas - klausimas (siūloma iš kortelės trukmės) |
| 3.1 | „Šis terminas gali būti pratęstas [pratęsimo terminas] dėl [aplinkybės ...]“ | „Taip / Ne“ (16 p. g klausimas) |
| 3.2-3.4 | nurodymas „[... kai perkami vienkartinio pobūdžio Darbai, vykdomi pagal Grafiką]“ | pagal atvejį (16 p. d ir e klausimai) |
| 4.1 | sąrašas: „fiksuotas įkainis.“ / „fiksuota kaina.“ / „kintamas įkainis.“ / „yra:“ | klausimas (siūloma pagal atvejį; „yra:“ - 16 p. h) |
| 4.2 | „[suma ir valiuta]“ × 3 | lieka (sudarant sutartį) |
| 4.3, 4.4 | fiksuota suma / maksimali suma; 4.4 „įkainiai yra nurodyti Sutarties [...] priede“ | pagal atvejį; priedo numeris - automatiškai („Rangovo pasiūlymas“) |
| 5.1 | atsakingų asmenų lentelė | lieka (sudarant sutartį) |
| 6.3 | sąrašas: „netaikoma“ / „... užtikrinami [suma] Eur dydžio banko garantija arba draudimo bendrovės laidavimo raštu ...“ | iš SPS atsakymo apie sutarties įvykdymo užtikrinimą; nesutapus - „Patikrinkite (SPS ir sutartis)“ |
| priedai | 1) bendrosios sąlygos, 2) Techninė specifikacija, 3) Rangovo pasiūlymas, 4) Trišalės sutarties projektas, 5) „[...]“ | 4) - klausimas; 5) - neprivalomas klausimas „Kiti priedai“ |
| rekvizitai, Užsakovas | etiketės be reikšmių | automatiškai iš organizacijų registro (kaip kitose sutartyse) |
| rekvizitai, Rangovas; parašai | etiketės, „[vardas, pavardė]“, „[Pareigos]“ | lieka (sudarant sutartį) |

Bendrosiose sąlygose pildomos vietos - tik tvirtinimo eilutė (16 p. a klausimas; jūsų sprendimas 2026-10-12 - palikti tuščią, kaip
formoje) ir įmonės pavadinimas (automatiškai - ir puslapio antraštėje).

## Jūsų sprendimai (2026-10-12: „Taip, visi punktai - kaip rekomenduojate, pradėkime S4.“)

- b) SS 1.3 punkte nebėra „, o įrengtiems užtvarams ir juos komplektuojančioms dalims dviejų metų garantinį terminą“;
- c) preambulė - „laimėjo Užsakovo vykdytą [pirkimo pavadinimas] pirkimą (pirkimo Nr. [numeris])“, pildoma automatiškai;
- d) trečias atvejis „vienkartiniai darbai be Grafiko“: 3.2 ir 3.3 punktai netaikomi, 3.4 (delspinigiai) ir 4.3 (fiksuota kaina) lieka;
- e) netaikomos dalys - numeriai nesikeičia: „Punktas netaikomas.“; 2 skyriuje lieka antraštė ir „2.1. Skyrius netaikomas.“ (2.2-2.6
  punktų nebelieka); priedų sąraše - „Trišalės sutarties projektas - netaikoma;“, „Kiti priedai - netaikoma.“;
- f) BS 1.8.2 punktas - „Rangovas įsipareigoja per visą Sutarties vykdymo laikotarpį turėti įdiegtą ...“;
- g) 3.1 punkto pratęsimo sakinys - privalomas „Taip / Ne“;
- h) 4.1 punkto sąrašo variantas „yra:“ nesiūlomas;
- i) bendrosios sąlygos lieka dviem stulpeliais.
- a) (BS tvirtinimo eilutė „2025 m. ___________d. įsakymu Nr. ___“) - rekomendacijos nebuvo, todėl perklausta; jūsų atsakymas tą pačią
  dieną: „Palikite tuščią.“ Eilutė lieka kaip formoje, generatorius jos nepildo, 3 žingsnio patikra ją rodo kaip paliktą vietą.

## Klausimai 2 žingsnyje (S4, 2026-10-12; `KLAUSIMAI_DM`, 11 - visi privalomi, be numatytųjų)

| Nr. | SS vieta | Klausimas | Atsakymas ir kas įrašoma | Siūloma reikšmė |
|---|---|---|---|---|
| 1 | preambulė | Koks pirkimo numeris? | tekstas; rodomas tik kai kortelė nepasirinkta ar be numerio | - |
| 2 | 2 sk., 3.2-3.4, 4.3, 4.4 | Kaip vykdomi darbai? | pagal atskirus užsakymus (lieka 2 skyrius ir 4.4) / pagal Grafiką (lieka 3.2-3.4 ir 4.3) / vienkartiniai be Grafiko (lieka 3.4 ir 4.3) | - |
| 3 | 1.2 | Kokį dokumentą pasirašius darbai laikomi atliktais? | „Atliktų darbų aktą“ / „paskutinį Atliktų darbų aktą“ (šablono sąrašas) | užsakymams - „paskutinį“, be Grafiko - „aktą“ |
| 4 | 2.2 | Ką Šalys suderina teikiant užsakymus? | formuluotė galininku (tik užsakymams) | šablone išvardyti dalykai |
| 5 | 2.3 | Kaip nustatomi atskirų užsakymų įvykdymo terminai? | derinami kiekvieno užsakymo pateikimo metu / nurodyti Sutarties priede (numeris) / kitaip (formuluotė); tik užsakymams | - |
| 6 | 3.1 | Per kiek laiko atliekami darbai arba kiek laiko teikiami užsakymai? | skaičius, mėnesiai ar dienos; sakinio pradžia ir žodžio forma - pagal 2 klausimą | kortelės sutarties trukmė mėnesiais |
| 7 | 3.1 | Ar šis terminas gali būti pratęstas? | „Taip“ - pratęsimo terminas ir aplinkybės; „Ne“ - sakinys pašalinamas | - |
| 8 | 4.1 | Koks Sutarties kainos apskaičiavimo būdas? | fiksuotas įkainis / fiksuota kaina / kintamas įkainis | vienkartiniams darbams - fiksuota kaina |
| 9 | 6.3 | Ar reikalaujamas Sutarties įvykdymo užtikrinimas? | „Taip“ - suma eurais; „Ne“ - „netaikoma“ | iš SPS (ir suma); nesutapus - „Patikrinkite (SPS ir sutartis)“ |
| 10 | priedų 4 eilutė | Ar pridedamas trišalės sutarties projektas? | „Taip“ - eilutė lieka; „Ne“ - „... - netaikoma;“ | pagal SPS tiesioginio atsiskaitymo atsakymą |
| 11 | priedų 5 eilutė | Ar pridedami kiti priedai? | „Taip“ - priedo pavadinimas; „Ne“ - „Kiti priedai - netaikoma.“ | - |

Ar užtikrinimas privalomas - pagal vidaus taisykles: nuo 2026-10-12 prie klausimo rodomas priminimas pagal ribą, kurią įvedate patys (ji
saugoma tik jūsų naršyklėje; kol neįvesta - bendras priminimas „patikrinkite pagal vidaus taisykles“). SPS sąlyga apie tiesioginį
atsiskaitymą šiai sutarčiai nėra atsakoma pati - bendrosiose sąlygose tokios tvarkos nėra, ji nustatoma trišalėje sutartyje.

## Įgyvendinimas (S4, 2026-10-12)

- Forma (`sutarties-forma.js`): `KLAUSIMAI_DM`, `sprendimaiDM`, `derinkDM`; sąrašai „Įrašoma automatiškai“ (antraštė, pirkimas, Užsakovo
  rekvizitai, priedų numeriai) ir „Pildoma sudarant sutartį“.
- Generatorius (`sutarciu-generatorius.js`): dalis be numerių keitimo - `{ taikoma: false, vietoje: { k: tekstas }, lieka: [k] }`;
  `irasykTeksta` - tekstas pastraipoje, kurios ženklo savybėse didžiosios raidės (kitaip „PUNKTAS NETAIKOMAS.“); „[suma]“ išskleidžiamo
  sąrašo variante; „ĮMONĖS PAVADINIMAS“ puslapio antraštėse; likęs nurodymas „[... pasirenkama ...]“ ne paliktoje vietoje - klaida.
- Patikra pakete: nuorodos - visos į esamus punktus ir priedus; privalomi sutarties elementai - 12 iš 13 (nerastas nutraukimo atvejis, kai
  Vyriausybė nusprendžia, kad sutartis neatitinka nacionalinio saugumo interesų - šios sutarties sąlygose atskiro punkto nėra; rodoma kaip
  informacija, klausimas - laiške LITGRID).
- „Tikrinti parengtus dokumentus“: trys atvejai ir bendrosios sąlygos - 0 nukrypimų su pasu ir be jo (`shared/palyginimas.js`: žyma
  netaikomos pasirenkamos dalies vietoje - pasirinkimas; žemėlapio `grieztos_vietos`; registro `pozymiai_visi` trumpai formai).
- Formatavimas (ruošiant šabloną, tekstas tas pats): rekvizitų ir atsakingų asmenų lentelių eilutės be kabančios įtraukos (24), didžiųjų
  raidžių požymis nuimtas nuo atkarpų be mažųjų raidžių (8) - kitaip Užsakovo el. paštas buvo rodomas didžiosiomis raidėmis.
- Pages (PDF eksportu): specialiosios sąlygos trimis atvejais - po 3 psl., bendrosios - 9 psl., A4, tekstas neprarandamas.

Lieka jūsų peržiūrai: klausimų tekstai ir paaiškinimai (`KLAUSIMAI_DM`).


# Statybos rangos specialiosios sąlygos (6 etapas, S4, 2026-10-12)

Šablonai `SR_LT_BS`, `SR_LT_SS` (LITGRID 2026-10-05, tik LT; po jūsų sprendimų a-l - sutarčių plano 8 sk. 18 p.). Forma - tos pačios kilmės
kaip projektavimo ir statybos rangos (toliau - rangos), todėl klausimai, taisyklės ir žymės - kaip aukščiau aprašytos rangos specialiosios
sąlygos (`sutarties-forma.js`: bendras `rangosKlausimai()`, skirtumai - `RANGOS`). Žemiau - tik skirtumai.

| SS punktas | Rangos SS | Statybos rangos SS |
|---|---|---|
| 2 Techninė užduotis / Projektas | siūloma „... priedas Nr. 1.2 „Techninė užduotis / projektavimo užduotis“.“ | siūloma „... priedas Nr. 1.2 „Techninė užduotis / Projektas“.“ (priedų sąrašo eilutė - jūsų sprendimas j); nurodyme - ir „Prijungimo sąlygos“ |
| 4 Darbų etapai | priedas „Projektavimo ir statybos darbų etapai“ | priedas „Statybos darbų etapai“ |
| 6, 8, 9, 14, 18 | BS 4.9.8, 4.6.2, 5.9.5, 11.11, 11.9.2 | BS 3.9.8, 3.6.2, 4.9.5, 10.11, 10.9.2 |
| 14 Europos Sąjungos fondai, 17 BIM | vienas „//“ nurodymas | nurodymas dviem pastraipomis su „arba“ - generatorius šalina abi (žemėlapio `kartu`) |
| 16 Bankai ir draudimo bendrovės | priedai Nr. 1.4 ir 1.5 (be etapų priedo - 1.3 ir 1.4) | priedai Nr. 1.3 ir 1.4 (be etapų priedo - 1.2 ir 1.3): priedų sąraše nėra „Apmokėjimas už Projektą“ |
| 21 Derinimo terminai | kitoms dalims - BS 4.1.2 ir 4.10.2 | kitoms dalims - BS 3.1.2 ir 3.10.2 |
| Ekspertizės terminas | 22 punktas (neprivalomas) | šio punkto formoje nėra - neklausiama |
| Atjungimų terminai | 23 punktas, BS 4.5.1 | 22 punktas, BS 3.5.1 |
| Sutarties įvykdymo užtikrinimas | 24 punktas, BS 9.7 | 23 punktas, BS 8.7 |
| Garantinių įsipareigojimų užtikrinimas netaikomas | 25 punktas, BS 9.9 | 24 punktas, BS 8.9; po jo formoje - pavienis „arba“ (šalinamas) |
| Esminės sąlygos | 26 punktas | 25 punktas |
| Sprogmenų paieška | 27 punktas, BS 4.1.12-4.1.14 | 26 punktas, BS 3.1.12-3.1.14 |
| Koordinatorius | 28 arba 28 ir 29 punktai, BS 5.2.5 | 27 arba 27 ir 28 punktai, BS 4.2.5 |

Klausimų iš viso - 25 (rangos - 26). 1-19 punktai lieka visi (netaikomame - „Punktas netaikomas.“), 20-28 įrašomi tik taikomi - sugeneruotoje
sutartyje jų numeriai gali būti mažesni nei šablone. Pildoma sudarant sutartį, „Įrašoma automatiškai“ ir etapų priedas (atskiras gulsčias
failas) - kaip rangos sutartyje.

Lieka jūsų peržiūrai: klausimų tekstai ir paaiškinimai (bendri su rangos sutartimi - `rangosKlausimai()`).


# Eksploatavimo darbų sutarties specialiosios sąlygos (7 etapas, S4, 2026-10-13)

Šablonai: bendrosios sąlygos `EKS_LT_BS` ir trys specialiosios sąlygos pagal darbų rūšį - oro linijų `EKSOL_LT_SS`, transformatorių
pastočių `EKSTP_LT_SS`, trasų valymo `EKSTV_LT_SS` (tik LT). Specialiosios sąlygos - 19 eilučių lentelė; pildomos vietos - laužtiniuose
skliaustuose ir pažymėtos pilkai. Darbų rūšį nustato sutarties parinkimas 1 žingsnyje (pagal pirkimo pavadinimą arba klausimą).

## Jūsų sprendimai (2026-10-13: „A. 3.“, „B. Pritariu.“, „C. Pritariu.“, „E. Pritariu.“, „F. Pritariu.“, „D - pritariu siūlymui.“)

- A (3 variantas) - aplanko bendrosios sąlygos priderintos prie LITGRID paskelbto teksto: be sąvokos „Sąlygos“ (sąvokos 1.1.20-1.1.25),
  nuorodos „Sutarties bendrųjų sąlygų ...“, sąvoka „Sutartis“, 2.6.4, 5.3.13, 7.3.1 ir 8.6.3 punktai;
- B - aštuonios pastraipos su ženkleliu yra punktai (2.2.1, 3.10.1, 4.2.7, 4.2.8, 8.3.3, 8.5.3, 8.7.2, 8.7.9), 10.11.3 p. bauda - 8.3.7 p.;
- C - bendrųjų sąlygų 3.11.3 ir 3.11.4 p. nuoroda į 3.11.2 p.; pastočių ir trasų valymo SS 1 eilutės antraštėje - sąvoka 1.1.12; oro linijų
  SS draudimo bendrovių sąrašas - 18 priede; trasų valymo SS 7 eilutėje nebėra pastabos apie koregavimą;
- E - pastočių SS 9 eilutėje „ne mažiau kaip [įrašoma] darbuotojų“ (klausimas); trasų valymo SS 16 eilutėje užtikrinimo galiojimo
  terminas - tas pats kaip 2 eilutėje; bendrųjų sąlygų 10.9.2 p. „Rangovas ir teises bei pareigas perėmęs trečiasis asmuo“ (ir abiejose
  rangos bendrosiose sąlygose); 5.3.13 p. sakinys; 8.6.7 p. įstatymo pavadinimas; 5.1.2.12 p. ir tvirtinimo eilutė - nekeista;
- F - generavimas tais pačiais principais kaip kitose šeimose (žr. žemiau);
- D - Užsakovo telefonas „+370 707 02171“ ir el. paštas „info@litgrid.eu“ (17 eilutė; kaip organizacijų registre), interneto adresas
  priedų sąraše - „http://www.litgrid.eu/...“ (formoje buvo žyma „Įmonės pavadinimas“ vietoje „litgrid“);
- 5 eilutė „Pirkimas“ - lieka sutarties sudarymui („pritariu“ 2026-10-13).

## Kas įrašoma automatiškai, kas klausiama, kas lieka sutarties sudarymui

| SS vieta | Forma | Kas daroma |
|---|---|---|
| įžanga | „laimėjo Užsakovo skelbtą [pirkimo pavadinimas] pirkimą (Nr. ____)“ | automatiškai: pirkimo pavadinimas (1 žingsnis) ir numeris (kortelė arba klausimas) |
| įžanga, 6, 7, 13, 14, 17 eil., parašai | Sutarties data ir numeris, Užsakovo atstovas, Rangovo duomenys, kaina, Šalių atstovai, Rangovo sąskaita ir kontaktai | lieka (sudarant sutartį) |
| 1 eil. | įkainių priedas, priemokos, mokesčių priedai, minimalus Avarinių darbų mokestis | klausimai (oro linijos, pastotės); pastočių įkainių priedas - automatiškai iš priedų sąrašo („Darbų įkainiai ir aprašymai“); trasų valymo formoje vietų nėra |
| 2 eil. | terminas mėnesiais | klausimas (siūloma iš kortelės trukmės) |
| 3 eil. | objektų sąrašas; trasų valymo - regionas ir kiti regionai | klausimai |
| 4 eil. (pastotės) | du „Pagrindinių darbų“ variantai su „arba“ ir nurodymas tiekėjui | lieka - variantą pasirenka tiekėjas, teikdamas pasiūlymą |
| 5 eil. | „[Pirkimo pavadinimas, būdas, paskelbimo data ir numeris]“ | lieka (sudarant sutartį): paskelbimo data ir numeris paaiškėja tik paskelbus pirkimą; trasų valymo formoje taip ir parašyta |
| 9 eil. | Brigadų skaičius (pastotės - trys skaičiai ir darbuotojų skaičius) | klausimai |
| 10 eil. | Užsakovo išduodamų dokumentų sąrašas | „Taip / Ne“; „Ne“ - „Nėra“ |
| 11 eil. | avarinio reagavimo terminai | klausimai |
| 12 eil. | Užsakovo sandėliai | „Taip / Ne“; „Ne“ - „Netaikoma“ |
| 15 eil. | papildomi garantiniai terminai | „Taip / Ne“; „Ne“ - „Nėra“ |
| 16 eil. | užtikrinimas: priedų numeriai, dydis (oro linijos - skaičiais ir žodžiais), trasų valymo - galiojimo terminas | „Taip / Ne“ (siūloma iš SPS); bankų ir draudimo bendrovių sąrašų priedai - automatiškai iš priedų sąrašo; trasų valymo terminas - iš 2 eilutės; „Ne“ - „Netaikoma“ ir priedų sąraše „Sutarties įvykdymo užtikrinimas – netaikoma.“ |
| 17 eil., priedų sąrašas | Užsakovo telefonas, el. paštas, interneto adresas | šablone ištaisyta jūsų sprendimu (D) - kaip organizacijų registre; generuojant nekeičiama |
| 18 eil. (priedai) | regionas, darbų planų metai, įrenginių sąrašas; užtikrinimo dokumento rūšis | klausimai; dokumento rūšis (banko garantija ar laidavimo raštas) - lieka (sudarant sutartį) |
| 19 eil. | preliminarių Darbų kiekių metai; už viešinimą atsakingas asmuo | klausimas; asmuo - lieka (sudarant sutartį) |
| visur | „ĮMONĖS PAVADINIMAS“ | automatiškai - LITGRID AB |

Žodžiai „Nėra“ ir „Netaikoma“ - tie patys, kuriuos LITGRID įrašė trasų valymo darbų sutarties formos 10, 12 ir 15 eilutėse; eilučių ir
priedų numeriai nesikeičia.

## Klausimai 2 žingsnyje (`KLAUSIMAI_EKS`; visi privalomi, be numatytųjų)

Oro linijos - 15, transformatorių pastotės - 21, trasų valymas - 6 (be pirkimo kortelės numerio - dar klausimas „Koks pirkimo numeris?“).

| SS vieta | Klausimas | Kam | Siūloma reikšmė |
|---|---|---|---|
| įžanga | Koks pirkimo numeris? | visoms (tik be kortelės numerio) | - |
| priedai, 3 eil. | Kurio regiono objektuose bus atliekami darbai (regiono pavadinimas)? | visoms | - |
| 3 eil. | Kokiuose objektuose Rangovas turi atlikti eksploatavimo darbus? | oro linijos, pastotės | - |
| 3 eil. | Kurių kitų regionų linijose Rangovas privalo atlikti darbus Užsakovui pareikalavus? | trasų valymas | - |
| 2 eil. | Kiek mėnesių nuo Sutarties įsigaliojimo dienos Rangovas vykdo darbus? | visoms | kortelės sutarties trukmė |
| 1 eil. | Kuriame specialiųjų sąlygų priede nurodyti Rangovo įkainiai? | oro linijos | formos priedų sąrašo eilutė „Darbų įkainiai ir aprašymai“ |
| 1 eil. | Kiek didesnė kaina mokama už Neplaninius darbus? | oro linijos, pastotės | - |
| 1 eil. | Kiek didesnė kaina mokama už Avarinius darbus? | pastotės | - |
| 1 eil. | Kuriame priede nurodytas minimalus mėnesinis eksploatavimo mokestis? | oro linijos, pastotės | - |
| 1 eil. | Kuriame priede nurodytas reagavimo į Avarinius įvykius mokestis? | pastotės | - |
| 1 eil. | Koks minimalus Avarinių darbų mokestis, Eur be PVM? | oro linijos, pastotės | - |
| 9 eil. | Kiek Brigadų vienu metu turi galėti dirbti skirtinguose Objektuose? | oro linijos, trasų valymas | - |
| 9 eil. | Kiek Brigadų, eksploatuojančių pirminius įrenginius / RAA įrenginius / vykdančių statybinius darbus (trys klausimai)? | pastotės | - |
| 9 eil. | Iš kiek darbuotojų, turinčių operatyvines remonto teises, turi būti sudarytos RAA ir Pirminių įrenginių Brigados? | pastotės | - |
| 11 eil. | Per kiek valandų Rangovas turi sureaguoti į avariją 1 ir 2 prioriteto objektuose darbo laiku / ne darbo laiku (du klausimai)? | oro linijos, pastotės | - |
| 11 eil. | Per kiek valandų nuo Užsakovo pranešimo Rangovas privalo nuvykti į avarijos vietą? | trasų valymas | - |
| 10 eil. | Ar Užsakovas išduoda Sutarčiai įvykdyti reikalingus leidimus, suderinimus, pažymas, licencijas ar kitus dokumentus? | oro linijos, pastotės | - |
| 12 eil. | Ar Užsakovo įranga ir Medžiagos išduodamos, o demontuota įranga priimama Užsakovo sandėliuose? | oro linijos, pastotės | - |
| 15 eil. | Ar nustatomi garantiniai terminai, kurie skiriasi nuo bendrųjų sąlygų 8.2.2 ir 8.2.3 punktuose nurodytų? | oro linijos, pastotės | - |
| 16 eil. | Ar reikalaujamas Sutarties įvykdymo užtikrinimas? (su dydžiu eurais) | visoms | iš SPS (ir dydis); nesutapus - „Patikrinkite (SPS ir sutartis)“ |
| priedai | Kurių metų darbų planai pridedami? | pastotės | - |
| priedai | Kieno įrenginių sąrašas pridedamas? | pastotės | „<regionas> regiono“ - iš regiono atsakymo |
| 19 eil. | Kurių metų Darbų kiekiai nurodyti kaip preliminarūs? | oro linijos, pastotės | - |

Skaičių klausimuose priimamas tik sveikas skaičius, sumose - suma eurais; kitaip klausimas lieka neatsakytas ir pasakoma kodėl. Atsakymai su
„Nr.“, „priede“, „regiono“, „metais“ ar tašku gale sakinyje nepasikartoja. Formos žodžiai po skaičiaus („Brigados“, „valandos“) nekeičiami.
Prie užtikrinimo klausimo rodomas vidaus taisyklių ribos priminimas (ribą įvedate patys; ji saugoma tik jūsų naršyklėje).

## Įgyvendinimas (S4, 2026-10-13)

- Parinkimas (`sutartys.js`): šeimos specialiosios sąlygos aprašytos pagal darbų rūšį, kodus grąžina `GP_SUTARTYS.kodai(šeima, variantas,
  kalba)`; 1 žingsnio blokas ir 2 žingsnio klausimai gauna ir variantą.
- Forma (`sutarties-forma.js`): `KLAUSIMAI_EKS`, `sprendimaiEKS`, `derinkEKS`; suma žodžiais - `zodziaisLT` („125 000 Eur (vienas šimtas
  dvidešimt penki tūkstančiai eurų)“); sąrašai „Įrašoma automatiškai“ ir „Pildoma sudarant sutartį“ - pagal darbų rūšį.
- Šablonų žemėlapiai (`sutarciu-sablonai.py`): `neprivalomos` - eilutės, taikomos ne visada (10, 12, 15, 16; trasų valymo - 16);
  `zinomos` - pastraipos, kuriose pilkas žymėjimas buvo tik pastraipos ženkle (nuimamas, kad žymėjimas liktų tik sudarant pildomose vietose).
- SPS sąlyga apie tiesioginį atsiskaitymą su subtiekėjais atsakoma pati - tvarką nustato bendrųjų sąlygų 5.2.6-5.2.7 punktai.
- Patikra pakete: nuorodos (51-55) - visos į esamus punktus ir priedus; privalomi sutarties elementai - 13 iš 13.
- „Tikrinti parengtus dokumentus“: trijų darbų rūšių specialiosios sąlygos („Taip“ ir „Ne“ atsakymai) ir bendrosios sąlygos - 0 nukrypimų
  su generavimo pasu ir be jo; „Nėra“ ir „Netaikoma“ pripažįstami tik eilutėse, kurios taikomos ne visada (`shared/palyginimas.js`);
  pastraipa su pildoma vieta lyginama pagal formą (žemėlapio `grieztos_vietos`): pakeistas nekintamas tekstas šalia užpildytos vietos
  („ne mažiau kaip“ -> „ne daugiau kaip“) - nukrypimas.
- Pages (PDF eksportu): bendrosios sąlygos - 43 psl., specialiosios - 8 (oro linijos), 7 (pastotės) ir 6 (trasų valymas) psl., A4, tekstas
  neprarandamas, punktų numeriai kaip Word (bendrosiose sąlygose - 524 numeruotos pastraipos); aukštos lentelės eilutės suskaidytos.

Lieka jūsų peržiūrai: klausimų tekstai ir paaiškinimai (`KLAUSIMAI_EKS`).

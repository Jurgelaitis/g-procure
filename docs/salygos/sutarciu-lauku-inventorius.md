# Sutarties projekto vietos ir jų sprendimai - prekių ir paslaugų specialiosios sąlygos

2026-10-08, sutarčių planas S4 (`docs/salygos/sutartys-planas-2026-10.md` 3.4, 4.3-4.5). Įgyvendinta 2026-10-08
(`PP-salygos/sutarties-forma.js`). Jūsų sprendimai 2026-10-08: užtikrinimo procentai - iš SPS sumos ir numatomos vertės; 8.2 - sutarties
galiojimo terminas; 10.1-10.2 - klausiama kiekvieną kartą; paslaugų 13.1-13.2, kai netaikoma, - „Punktas netaikomas.“ Kitos „SIŪLOMA“
eilutės įgyvendintos kaip siūlomos reikšmės (formoje - „Siūloma (nepatvirtinta)“ su kilme; keičiate ar patvirtinate jūs). Valdiklių
taisyklės (išskleidžiamieji sąrašai) patvirtintos 2026-10-07 - jos čia pakartotos, kad lentelė būtų pilna.

Bendrosios sąlygos (BS) pildomų vietų neturi - generuojamos be pakeitimų (tik generavimo pasas ir lentelių sutvarkymas Pages programai).
LT/EN dokumente sprendžiama tik lietuviškai - anglų stulpelis seka tą patį pasirinkimą toje pačioje eilutėje (patikrinta: visi keturi
LT/EN failai generuojami be likusių lietuviškų ar angliškų nurodymų).

Žymės: **D** - iš jau įvestų duomenų (1 žingsnis, pirkimo kortelė, SPS 2 žingsnis); **S** - LITGRID standartas (siūloma su kilme
„LITGRID standartas“, patvirtinama vienu paspaudimu); **K** - klausimas 2 žingsnyje (skyrius „Sutarties projektas“); **SUD** - lieka
pildyti sudarant sutartį (pagal laimėjusį pasiūlymą; generatorius palieka vietą ir ją išvardija patikroje).

Kaip iki šiol formoje: siūloma reikšmė niekada neatrodo kaip jūsų - „Siūloma (nepatvirtinta)“ su kilme; „Taip / Ne“ - be numatytojo.

## 1. Sutarties šalys, dalykas, terminai

| Vieta | Šablone | Taisyklė | Žymė |
|---|---|---|---|
| Sutarties pavadinimas | tuščias laukas | „{pirkimo pavadinimas} pirkimo-pardavimo sutartis“ (pavadinimas kilmininku iš 1 žingsnio, pvz. „Galios transformatorių pirkimo-pardavimo sutartis“); LT/EN - „Contract for the purchase of {EN pavadinimas}“ | D, SIŪLOMA |
| Sutarties numeris, 1.1.9-1.1.10, 1.2.1-1.2.10 (Tiekėjo rekvizitai, atstovai) | tušti laukai | sudarant | SUD |
| 1.1.1-1.1.8 (Pirkėjo rekvizitai) | LITGRID AB rekvizitai jau šablone; „ĮMONĖS PAVADINIMAS“ | „ĮMONĖS PAVADINIMAS“ -> LITGRID AB, kiti - kaip šablone | D |
| 1.2 nurodymas „(jei Tiekėjas yra fizinis asmuo ... grupės nario informaciją)“ | nurodymas pildančiam | lieka (jis skirtas pildančiam sudarant) | SUD |
| 2.1 Pirkėjo atstovas „(nurodyti padalinį / skyrių, pareigas, vardą, pavardę, tel., el. paštą)“ | nurodymas | K, neprivalomas: „Kas bus Pirkėjo atstovas sutarčiai vykdyti?“ - įrašius - vietoj nurodymo; neįrašius - nurodymas lieka | K, SIŪLOMA |
| 2.2 Tiekėjo atstovas | nurodymas | lieka | SUD |
| 3.2 Pirkimo pavadinimas ir numeris | tuščias laukas | „{pavadinimas} pirkimas“ ir, jei pirkimo kortelėje yra numeris, „, pirkimo Nr. {numeris}“ | D, SIŪLOMA |
| 3.3 ES lėšos | valdiklis | K: „Ar pirkimas finansuojamas ES lėšomis?“ Taip - projekto Nr. ir pavadinimas | K |
| 4.1 pradžia | valdiklis (3 variantai) | pagal kainodarą (5.1): fiksuota kaina - nuo įsigaliojimo; fiksuotas ar kintamas įkainis - nuo užsakymo; kitos - K (3 šablono variantai) | D / K |
| 4.1 terminas | „[...]“ + vieneto valdiklis | K: skaičius ir vienetas; vieneto forma - pagal skaičių („1 mėnesį“, „3 mėnesius“, paslaugoms ir „10 mėnesių“, „dienas / dienų“); jei pasirinktas variantas „Techninėje specifikacijoje nustatytais terminais“ - neklausiama | K |
| 4.1 bendras paslaugų terminas (paslaugos) | „[...]“ + valdiklis „punktas netaikomas / mėnesių / mėnesiai“ | K: „Bendras paslaugų teikimo terminas“ (mėn.) arba „netaikoma“ | K |
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

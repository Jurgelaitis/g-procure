# Pirkimo sąlygų generatoriaus formos laukų inventorius

## 0. C etapas - kas įgyvendinta (2026-10-04)

Naudotojas 2026-10-04 pritarė šešiems punktams (klasifikacija, priedų numerių siūlymas, „X“ vietos registre, numatytųjų
reikšmių tvarka, 22 klausimų tekstai, registras modulyje ir paaiškinimas `shared/`). Toliau esantys 1-9 skyriai aprašo
būseną PRIEŠ pakeitimus (tyrimas, commit 59cf088).

| Kas | Kaip dabar |
|---|---|
| Laukų registras | `PP-salygos/laukai.js` (`GP_LAUKAI`): vietos („___“, „[...]“, „X“), sakinio tipai su patvirtintais klausimais ir užuominomis, įvestis pagal tipą, klasė (a / b / c), priedų sąrašo atpažinimas, pildymo planas. Forma ir generavimas naudoja tą patį planą. |
| Nukirpimas | Formoje ir 3 žingsnio sąrašuose tekstai rodomi visi; ilgi (kontekstas, automatikos sąrašas, patikra) sutraukiami tik žodžio riboje su „Rodyti viską“. AI užklausoje ribos - irgi žodžio riboje. |
| Neprivalomos nuorodos (b) | „(SPS ___ priedas)“, „(SPS X priedas)“, „(Annex ___ to SPC)“, „(SPS priedą Nr. X)“: be numerio pašalinamos visa su tarpu prieš jas; rodoma peržiūroje (perbraukta), santraukoje ir baigtumo patikroje („Pašalintos neprivalomos nuorodos“). |
| Priedų numeriai | Siūlomi iš to paties dokumento SPS priedų sąrašo, tik iš liekančių eilučių (pvz. TSD SPS EBVPD - 3 priedas; iki tol - „2“). Būsena „Siūloma (nepatvirtinta)“ su kilme („SPS priedų sąraše: „3 priedas – EBVPD forma.““). |
| Skyriaus numeris | „Esminės sutarties sąlygos išdėstytos SPS __ dalyje“ - galutinis skyriaus „ESMINĖS SUTARTIES SĄLYGOS“ numeris, įrašomas generuojant (po GPNum). |
| „X“ vietos | Rengėjo dokumentuose klausiamos kaip laukai: priedo numeris (su siūlymu), suma Eur, sutarties projekto punktas, lentelės punktų numeriai. Dvikalbiuose angliška tos pačios eilutės vieta užpildoma iš lietuviškos. |
| Numatytosios reikšmės | „Taip / Ne“ sąlygos, raudonos nuostatos, lentelės ir „Netaikyti“ - be numatytojo, privalomos (neatsakius generuoti neleidžiama). Neatsakytos sąlygos laukai rodomi su pastaba „Šio lauko reikės, jei ... atsakysite „Taip““. Reikšmės su pagrindu (1 žingsnis, šablonas, priedų sąrašas, AI vertimas) - „Siūloma (nepatvirtinta)“. |
| Būsenos | Siūloma (nepatvirtinta), Patvirtinta, Neužpildyta (privaloma), Neprivaloma. „Patvirtinta“ - tik žmogaus veiksmu (įvedė, pasirinko, „Patvirtinti“, priėmė AI pasiūlymą). Patvirtinti po vieną arba „Patvirtinti šio skyriaus siūlomas (N)“; abu įrašomi į žurnalą ir rodomi baigtumo patikroje. |
| Sąsaja | Grupuojama pagal dokumentą ir skyrių; viršuje - „Užpildyta X iš Y“, juosta, „Kitas neužpildytas“, turinys; apačioje - „Prieš generuojant“ (privalomi sprendimai, neužpildyti laukai, siūlomos, pašalinamos nuorodos) su šuoliais. Kiekvienas laukas: klausimas, užuomina, „?“ (`shared/paaiskinimas.js`), pavadinimas su `label for`, „Pvz.:“ tik pavyzdys, peržiūra „Taip atrodys dokumente“. Techninė šablono žyma („LT_SPS“) - tik paaiškinime. |
| Rastos klaidos | AKV interneto adreso pabraukimai - nebe laukas ir nebe patikros radinys; DPS LT tiekėjo formos vietos neklausiamos; „[nurodymas]____“ - viena vieta (ND derybų sąlygos nebeįrašomos du kartus); DPS „nuo X [data] ... iki X [data]“ - dvi atskiros datos (iki tol visi raudoni runai keičiami vienu tekstu). |

### Klausimų tekstai (naudotojo sprendimai 2026-10-04)

| Vieta | Klausimas | Būsena |
|---|---|---|
| Alternatyvos „Jei Pirkimo objektas į dalis neskaidomas / skaidomas į dalis“ | Ar pirkimo objektas skaidomas į dalis? | patvirtinta, įgyvendinta |
| Alternatyvos „Jei numatoma / nenumatoma kviesti stebėtojus“ | Ar į komisijos posėdžius kviečiami stebėtojai? | patvirtinta, įgyvendinta |
| Alternatyvos dėl pašalinimo pagrindų ir kvalifikacijos | Du klausimai (naudotojo pasiūlymas): „Ar tikrinate tik pašalinimo pagrindus ar ir kvalifikaciją?“ („Tik pašalinimo pagrindus“ / „Pašalinimo pagrindus ir kvalifikaciją“) ir „Tik galimo laimėtojo ar visų tiekėjų tikriname?“ („Tik galimo laimėtojo“ / „Visų tiekėjų“) | įgyvendinta: variantas parenkamas pagal abu atsakymus; šablone nesantis derinys (AK, AKV, SSD, TSD - „visų tiekėjų, tik pašalinimo pagrindai“) nepasirenkamas ir pažymėtas; vienintelis - parenkamas ir pasakoma; ND ir MVP LT antro klausimo nėra (pasakoma kodėl); visi šablono variantai - „?“ paaiškinime |
| Alternatyvos „Jei žalieji reikalavimai nurodyti TS / pirkimo sąlygose“ | Kur nustatomi žalieji reikalavimai? | patvirtinta, įgyvendinta |
| Alternatyvos dėl pasiūlymo galiojimo užtikrinimo | Ar taikomas pasiūlymo galiojimo užtikrinimas? | įgyvendinta (A variantas): „Taip / Ne“, „Ne“ - variantas pagal vertinimo kriterijų (8.1 p.; DPS - pagal kainos klausimą, „Ne“ - renkasi žmogus) |
| CPO pagrindimo formuluotė | Kodėl pirkimas vykdomas ne per CPO LT katalogą? | patvirtinta, įgyvendinta |
| „X Eur“ (sutarties įvykdymo užtikrinimas) | Koks sutarties įvykdymo užtikrinimo dydis (Eur)? | patvirtinta, įgyvendinta (tame pačiame sakinyje „Sutarties projekto X punkte/priede“ - antras laukas su savo pavadinimu) |
| DPS konkretaus pirkimo kriterijai „[arba pateikiama informacija ...]“ | Ar vertinama tik pagal kainą? | įgyvendinta: „Taip“ - nurodymas pašalinamas; „Ne“ - 2.5 p. nuoroda į N priedą, priedų sąrašo eilutė ir priedo failas (pavadinimas ir raudona pastaba), tekstai - naudotojo patvirtinti |
| SPS 8.1 p. vertinimo kriterijus (naujas, A variantas) | Pagal kokį kriterijų vertinami pasiūlymai? | įgyvendinta: šablono sąrašo variantai, lieka tik pasirinktas; kainos atveju metodikos sakinys ir priedo eilutė pašalinami; metodikos eilutės sąlyga skliaustuose - pašalinama |

Rasta ir ištaisyta kartu: MVP LT/EN variantas „... o kvalifikacija nėra tikrinama“ nebuvo atpažįstamas - dokumente likdavo 2
(kvalifikacijos) lentelė; „X“ vieta raudoname sąlygos tekste (pvz. AK SPS 11.3 „... X Eur“) formoje niekada nepasirodydavo.

### Laukia patvirtinimo (Code pasiūlymas, nepatvirtinta)

Nėra (2026-10-04 vakare naudotojas pritarė 5 klausimo A variantui ir 8 klausimo „Ne“ tekstams; DPS LT/EN šablono klaidos „Annex 7“ ir „ANEXXES“ taisomos `sablonu-taisymai.py`). Angliški priedo failo tekstai („Annex N to the specific procurement conditions“, „Add the economic advantage evaluation criteria and procedure.“) - patvirtintų lietuviškų vertimai.

### Brūkšniai (C6)

Mano sąsajos eilutėse ilgojo brūkšnio nėra. Šablonų tekste - „–“ 1771 vieta (LITGRID tekstas, nekeičiamas). Ilgasis brūkšnys (U+2014) buvo tik
angliškame sakinyje „... no supporting documents are required[U+2014]submission of the ESPD is sufficient.“ 6 šablonuose - naudotojo sprendimu
(2026-10-04: ilgojo brūkšnio nenaudoti nei LT, nei EN) `sablonu-taisymai.py` jį keičia į „ - “ visuose šablonuose (ir būsimuose); testas tikrina
visus šablonus ir žemėlapius.


Sudaryta 2026-10-03 iš tikro modulio (`PP-salygos/PP-SALYGOS.html`, commit 59cf088): 2 žingsnis atvertas visiems 24 pirkimo būdo ir kalbos deriniams (11 būdų x LT ir LT/EN, plius centralizuotas atviras konkursas x 2), su visomis sąlygų šakomis. Tai tyrimo dokumentas - modulio kodas nekeistas.

Pastaba dėl brūkšnių: lentelėse cituojamas LITGRID šablonų tekstas, todėl jame yra šablono „–“.

## 1. Santrauka

| Rodiklis | Skaičius |
|---|---|
| Unikalūs laukai 2 žingsnio dalyje „Įrašomos reikšmės“ | 150 |
| - pildomos vietos (tekstas su „___“ ar „[...]“) | 67 |
| - „Patikrinkite siūlomas reikšmes“ | 6 |
| - formuluotės (pasirinkimas arba savas tekstas) | 30 |
| - raudonos pastabos su „Palikti / Ištrinti / Spręsiu Word'e“ | 47 |
| Laukai, kurių tekstas formoje nukerpamas | 73 iš 150 |
| - iš jų nukerpami žodžio viduryje | 48 |
| Teksto įvesties laukai visuose 24 deriniuose | 522 |
| - be jokio pavadinimo (nei `label`, nei `aria-label`) | 398 |
| - su užuomina „reikšmė N“ arba „EN reikšmė N“ | 386 |
| Alternatyvų grupės (privaloma pasirinkti vieną) | 18 |
| Pavieniai „Taip - įtraukti / Ne - ištrinti“ pasirinkimai (visi su numatytuoju „Taip“) | 11 |
| SPS priedų sąrašo eilutės | 56 |
| Tuščios vietos laukuose: (a) privaloma nuoroda / (b) neprivaloma nuoroda skliaustuose / (c) kita reikšmė / ne laukas | 16 / 56 / 47 / 10 |

## 2. Tuščių vietų klasifikacija (PASIŪLYMAS, ne sprendimas)

Klasės: **(a)** privaloma nuoroda, be kurios sakinys netenka prasmės; **(b)** neprivaloma nuoroda skliaustuose, kurią galima pašalinti, kai reikšmės nėra; **(c)** kita pildoma reikšmė (skaičius, data, tekstas) - ne nuoroda; **-** ne rengėjo laukas (klaida).

Lentelėje - sakinių tipai; kiek šablonų variantų ir kuriuose šablonuose - 3 skyriuje. Pildoma vieta pažymėta ⟦...⟧.

| Nr. | Sakinio tipas | Pildoma vieta su kontekstu | Klasė (pasiūlymas) | Šablono variantų | Palikus tuščią dabar |
|---|---|---|---|---|---|
| 1 | dps-priedu-nuorodos, 1 vieta | iai (apimtys) yra pateikti šiuose prieduose: ⟦[pateikiamos nuorodos į kon...⟧. | **(a)** | 2 (2 šabl.) | lieka „___“; patikra rodo „tuščia“ |
| 2 | esminiu-salygu-dalis, 1 vieta | as. Esminės sutarties sąlygos išdėstytos SPS ⟦__⟧ dalyje. Perkantysis subjektas atsk | **(a)** | 5 (11 šabl.) | lieka „___“; patikra rodo „tuščia“ |
| 3 | esminiu-salygu-dalis, 2 vieta | Sutarties projektą su jame išdėstytomis SPS ⟦_⟧ dalyje numatytomis esminėmis Sutar | **(a)** | 5 (11 šabl.) | lieka „___“; patikra rodo „tuščia“ |
| 4 | metodikos-priedas, 1 vieta | vertinimo metodika pateikiama SPS priede Nr.⟦__⟧. | **(a)** | 4 (10 šabl.) | lieka „___“; patikra rodo „tuščia“ |
| 5 | formos-ir-ebvpd-priedai, 1 vieta | as. Tiekėjai privalo pateikti Pasiūlymą (SPS ⟦___⟧ priedas) ir Europos bendrąjį viešų | **(b)** | 28 (11 šabl.) | lieka „(SPS ___ priedas)“; patikra rodo „tuščia“ |
| 6 | formos-ir-ebvpd-priedai, 2 vieta | šųjų pirkimų dokumentą (toliau – EBVPD) (SPS ⟦___⟧ priedas). Pašalinimo pagrindų nebu | **(b)** | 28 (11 šabl.) | lieka „(SPS ___ priedas)“; patikra rodo „tuščia“ |
| 7 | apziura-en, 1 vieta | act the Contracting Entity via CPP IS before ⟦___⟧ p.m. ___ _________ 2025 (inclusive | **(c)** | 2 (4 šabl.) | lieka „___“ arba „[nurodymas]“; patikra rodo „tuščia“ |
| 8 | apziura-en, 2 vieta | ontracting Entity via CPP IS before ___ p.m. ⟦___⟧ _________ 2025 (inclusive) in Lith | **(c)** | 2 (4 šabl.) | lieka „___“ arba „[nurodymas]“; patikra rodo „tuščia“ |
| 9 | apziura-en, 3 vieta | acting Entity via CPP IS before ___ p.m. ___ ⟦_________⟧ 2025 (inclusive) in Lithuanian tim | **(c)** | 2 (4 šabl.) | lieka „___“ arba „[nurodymas]“; patikra rodo „tuščia“ |
| 10 | apziura-en, 4 vieta | f the object is planned to be carried out on ⟦___⟧ _______ 2025. The Contracting Enti | **(c)** | 2 (4 šabl.) | lieka „___“ arba „[nurodymas]“; patikra rodo „tuščia“ |
| 11 | apziura-en, 5 vieta | e object is planned to be carried out on ___ ⟦_______⟧ 2025. The Contracting Entity will | **(c)** | 2 (4 šabl.) | lieka „___“ arba „[nurodymas]“; patikra rodo „tuščia“ |
| 12 | dalies-pavadinimas, 1 vieta | I Pirkimo objekto dalis – ⟦________________________⟧; | **(c)** | 2 (11 šabl.) | lieka „___“ arba „[nurodymas]“; patikra rodo „tuščia“ |
| 13 | daliu-skaicius, 1 vieta | Pirkimo objektas skaidomas į ⟦__⟧ Pirkimo objekto dalis: | **(c)** | 2 (11 šabl.) | lieka „___“ arba „[nurodymas]“; patikra rodo „tuščia“ |
| 14 | derybu-dalykas, 1 vieta | galutiniais. Perkantysis subjektas derasi dėl⟦_______________________⟧. | **(c)** | 1 (1 šabl.) | lieka „___“ arba „[nurodymas]“; patikra rodo „tuščia“ |
| 15 | derybu-salygos, 1 vieta | erkantysis subjektas derėsis dėl šių sąlygų: ⟦[jei deramasi tik dėl kaino...⟧ | **(c)** | 2 (5 šabl.) | lieka „___“ arba „[nurodymas]“; patikra rodo „tuščia“ |
| 16 | dps-apziura, 1 vieta | norintys apžiūrėti objektą, turi iki 2023 m. ⟦__________⟧ d. __.00 val. (imtinai) Lietuvos l | **(c)** | 2 (2 šabl.) | lieka „___“ arba „[nurodymas]“; patikra rodo „tuščia“ |
| 17 | dps-apziura, 2 vieta | rėti objektą, turi iki 2023 m. __________ d. ⟦__⟧.00 val. (imtinai) Lietuvos laiku C | **(c)** | 2 (2 šabl.) | lieka „___“ arba „[nurodymas]“; patikra rodo „tuščia“ |
| 18 | dps-apziura, 3 vieta | . Objekto apžiūrą planuojama vykdyti 2023 m. ⟦__________⟧ d. Perkantysis subjektas objekto a | **(c)** | 2 (2 šabl.) | lieka „___“ arba „[nurodymas]“; patikra rodo „tuščia“ |
| 19 | dps-galiojimas, 1 vieta | tūs pasiūlymai turi galioti ne trumpiau kaip ⟦[nurodomas kalendorinių die...⟧ kalendorinių dienų. Jei konkrečiam | **(c)** | 2 (2 šabl.) | lieka „___“ arba „[nurodymas]“; patikra rodo „tuščia“ |
| 20 | dps-kiti-dokumentai, 1 vieta | kiti dokumentai ⟦[kartu su konkrečiu pasiūly...⟧. | **(c)** | 1 (2 šabl.) | lieka „___“ arba „[nurodymas]“; patikra rodo „tuščia“ |
| 21 | dps-konkretaus-pavadinimas, 1 vieta | KONKRETAUS PIRKIMO „⟦___________________________...⟧“,(pavadinimas), ATLIEKAMO DINAMINĖ | **(c)** | 4 (2 šabl.) | lieka „___“ arba „[nurodymas]“; patikra rodo „tuščia“ |
| 22 | dps-kriterijai, 1 vieta | sią pasiūlymą išrenka pagal kainos kriterijų ⟦[arba pateikiama informacij...⟧. Su Tiekėju, kurio pasiūlymas vado | **(c)** | 2 (2 šabl.) | lieka „___“ arba „[nurodymas]“; patikra rodo „tuščia“ |
| 23 | formuluotė: Sprendimo neatlikti pirkimo naudojantis , 1 vieta | centralizuotų pirkimų katalogu pagrindimas: ⟦______________⟧ | **(c)** | 1 (11 šabl.) | lieka „___“ arba „[nurodymas]“; patikra rodo „tuščia“ |
| 24 | formuluotė: Vykdomas [Pasirinkite]., 1 vieta | Vykdomas ⟦[Pasirinkite]⟧. | **(c)** | 1 (1 šabl.) | lieka „___“ arba „[nurodymas]“; patikra rodo „tuščia“ |
| 25 | formuluotė: Vykdomas [Pasirinkite]. Įgaliojusiosios , 1 vieta | Vykdomas ⟦[Pasirinkite]⟧. Įgaliojusiosios organizacijos Pir | **(c)** | 1 (1 šabl.) | lieka „___“ arba „[nurodymas]“; patikra rodo „tuščia“ |
| 26 | formuluotė: [suformuluoti atitikimo taisyklę], 1 vieta | ⟦[suformuluoti atitikimo tai...⟧ | **(c)** | 1 (10 šabl.) | lieka „___“ arba „[nurodymas]“; patikra rodo „tuščia“ |
| 27 | laimetoju-skaicius, 1 vieta | Laimėjusiais pasiūlymais bus pripažinti ⟦__⟧ pasiūlymai. | **(c)** | 2 (7 šabl.) | lieka „___“ arba „[nurodymas]“; patikra rodo „tuščia“ |
| 28 | laimetoju-skaicius, 2 vieta | Laimėjusiais pasiūlymais bus pripažinti __ (⟦_____⟧) Galutiniai pasiūlymai. | **(c)** | 1 (4 šabl.) | lieka „___“ arba „[nurodymas]“; patikra rodo „tuščia“ |
| 29 | min-reikalavimai, 1 vieta | malūs reikalavimai Pirkimo objektui yra šie: ⟦[jei deramasi tik dėl kaino...⟧ | **(c)** | 2 (5 šabl.) | lieka „___“ arba „[nurodymas]“; patikra rodo „tuščia“ |
| 30 | pateikiami-dokumentai, 1 vieta | PATEIKIAMA: ⟦___________________________...⟧. | **(c)** | 2 (3 šabl.) | lieka „___“ arba „[nurodymas]“; patikra rodo „tuščia“ |
| 31 | stebetojai, 1 vieta | savivaldybių institucijų ar įstaigų atstovai ⟦______________⟧. | **(c)** | 2 (9 šabl.) | lieka „___“ arba „[nurodymas]“; patikra rodo „tuščia“ |
| 32 | teise-verstis-veikla, 1 vieta | Tiekėjas turi teisę⟦___________________________...⟧, t. y. verstis veikla, reikalinga | **(c)** | 2 (3 šabl.) | lieka „___“ arba „[nurodymas]“; patikra rodo „tuščia“ |
| 33 | tiekejo-forma, 1 vieta | ⟦____________⟧ Nr.______ | **ne laukas** | 3 (1 šabl.) | žr. 3 skyrių |
| 34 | tiekejo-forma, 2 vieta | ____________ Nr.⟦______⟧ | **ne laukas** | 3 (1 šabl.) | žr. 3 skyrių |
| 35 | tiekejo-forma, 3 vieta | 202_-__-⟦__⟧ | **ne laukas** | 2 (1 šabl.) | žr. 3 skyrių |
| 36 | url-klaida, 1 vieta | e, adresu http://draudejai.sodra.lt/draudeju⟦_⟧viesi_duomenys/. | **ne laukas** | 1 (1 šabl.) | žr. 3 skyrių |
| 37 | url-klaida, 2 vieta | resu http://draudejai.sodra.lt/draudeju_viesi⟦_⟧duomenys/. | **ne laukas** | 1 (1 šabl.) | žr. 3 skyrių |

Susijusios vietos be „___“ (šablone - raidė „X“ vietoj numerio; dabar klausiama kaip raudona pastaba „Palikti / Ištrinti / Spręsiu Word'e“):

- Užpildytą pasiūlymų dėl derėtinų sąlygų formą (SPS priedą Nr. X). (MVP_LTEN_SPS, MVP_LT_SPS, ND_LTEN_SPS, ND_LT_SPS)
- Užpildytą pasiūlymų deryboms formą (SPS priedą Nr. X) (SSD_LTEN_SPS)
- Tiekėjo, kiekvieno Tiekėjų grupės nario, kiekvieno Ūkio subjekto, kurio pajėgumais remiamasi ir kiekvieno Subtiekėjo užpildytus SPS x priedą „Sandorio šalies ir (ar) subtiekėjo duomenų forma“. (ND_LTEN_SPS, ND_LT_SPS)
- 3.8. Tiekėjas, kurio bus prašoma pateikti kvalifikaciją pagrindžiančius dokumentus, su kvalifikacijos dokumentais turi pateikti SPS X priedą „Įrangos sąrašas“, nurodant ketinamos naudoti įrangos pavadinimą, gamintoją ir kilmės šalį. Tiekėjas gali nurodyti tos (AKV_LT_SPS)

## 3. Pildomos vietos ir siūlomos reikšmės (67 + 6)

Stulpelis „Siūlomas klausimas“ - **Code pasiūlymas, nepatvirtinta** (naudotojui nerodoma, kol nepatvirtinta). Lauko ID dabar nėra: laukas atpažįstamas pagal normalizuotą viso sakinio tekstą (`tusciaRaktas()`, PP-SALYGOS.html:492).

### esminiu-salygu-dalis (5 šablono variantai)

- Įvesties tipas (pasiūlymas): skaičius (SPS dalies numeris), viena reikšmė dviem vietoms
- Siūlomas klausimas (Code pasiūlymas, nepatvirtinta): „Kurioje SPS dalyje išdėstytos esminės sutarties sąlygos?“
- Siūloma užuomina (Code pasiūlymas, nepatvirtinta): Įrašykite SPS dalies numerį. Tas pats numeris įrašomas abiejose sakinio vietose.
- Dabar formoje: klausimo vietoje - pats šablono sakinys; laukai `<input type="text">` su užuomina „reikšmė 1“, „reikšmė 2“... (be pavadinimo); privalomumo nėra.

| ID | Šablonai | Vieta | Pilnas sakinys | Vietų | Dabartinis rodymas | Siūloma reikšmė (kilmė) |
|---|---|---|---|---|---|---|
| V-01 | MVP_LT_SPS | BENDROSIOS NUOSTATOS (pastr. MVP_LT_SPS:16) | Šio Pirkimo metu nėra parengtas Sutarties projektas. Esminės sutarties sąlygos išdėstytos SPS __ dalyje. Perkantysis subjektas atskiru pranešimu, po pranešimo Tiekėjams apie sudarytą Pasiūlymų eilę išsiuntimo, kreipsis CVP IS priemonėmis/El. paštu į Pirkimą Laimėjusį Tiekėją prašydamas pateikti Sutarties projektą su jame išdėstytomis SPS _ dalyje numatytomis esminėmis Sutarties sąlygomis. | 2 | kerpamas ties 180 simb. (žodžio viduryje): „... Tiekėjams apie sudary“ | nėra |
| V-02 | MVP_LTEN_SPS | GENERAL PROVISIONS (pastr. MVP_LTEN_SPS:31) | Jei Pirkimo metu nėra rengiamas Sutarties projektas: Šio Pirkimo metu nėra parengtas Sutarties projektas. Esminės sutarties sąlygos išdėstytos SPS __ dalyje. Perkantysis subjektas atskiru pranešimu, po pranešimo Tiekėjams apie sudarytą Pasiūlymų eilę išsiuntimo, kreipsis CVP IS priemonėmis/El. paštu į Pirkimą Laimėjusį Tiekėją prašydamas pateikti Sutarties projektą su jame išdėstytomis SPS _ dalyje numatytomis esminėmis Sutarties sąlygomis. | 2 | kerpamas ties 180 simb.: „...Perkantysis subjektas “ | nėra |
| V-03 | AK_LT_SPS | BENDROSIOS NUOSTATOS (pastr. AK_LT_SPS:37) | Šio Pirkimo metu nėra parengtas Sutarties projektas. Esminės sutarties sąlygos išdėstytos SPS __ dalyje. Perkantysis subjektas atskiru pranešimu, po pranešimo Tiekėjams apie Pirkimo rezultatus išsiuntimo, kreipsis CVP IS priemonėmis/el. paštu į Pirkimą Laimėjusį Tiekėją prašydamas pateikti Sutarties projektą su jame išdėstytomis SPS _ dalyje numatytomis esminėmis Sutarties sąlygomis. | 2 | kerpamas ties 180 simb. (žodžio viduryje): „... Tiekėjams apie Pirkim“ | nėra |
| V-04 | AK_LTEN_SPS, ND_LTEN_SPS, ND_LT_SPS, SSD_LTEN_SPS, SSD_LT_SPS, TSD_LTEN_SPS, TSD_LT_SPS | GENERAL PROVISIONS; BENDROSIOS NUOSTATOS (pastr. AK_LTEN_SPS:66, ND_LTEN_SPS:51, ND_LT_SPS:17...) | Šio Pirkimo metu nėra parengtas Sutarties projektas. Esminės Sutarties sąlygos išdėstytos SPS __ dalyje. Perkantysis subjektas atskiru pranešimu, po pranešimo Tiekėjams apie sudarytą Pasiūlymų eilę išsiuntimo, kreipsis CVP IS priemonėmis į Pirkimą Laimėjusį Tiekėją prašydamas pateikti Sutarties projektą su jame išdėstytomis SPS _ dalyje nurodytomis esminėmis Sutarties sąlygomis. | 2 | kerpamas ties 180 simb. (žodžio viduryje): „... Tiekėjams apie sudary“ | nėra |
| V-05 | AKV_LT_SPS | BENDROSIOS NUOSTATOS (pastr. AKV_LT_SPS:30) | Šio Pirkimo metu nėra parengtas Sutarties projektas. Esminės sutarties sąlygos išdėstytos SPS __ dalyje. Pirkimo vykdytojas atskiru pranešimu, po pranešimo Tiekėjams apie Pirkimo rezultatus išsiuntimo, kreipsis CVP IS priemonėmis/el. paštu į Pirkimą Laimėjusį Tiekėją prašydamas pateikti Sutarties projektą su jame išdėstytomis SPS _ dalyje numatytomis esminėmis Sutarties sąlygomis. | 2 | kerpamas ties 180 simb. (žodžio viduryje): „...ekėjams apie Pirkimo r“ | nėra |

### daliu-skaicius (2 šablono variantai)

- Įvesties tipas (pasiūlymas): skaičius
- Siūlomas klausimas (Code pasiūlymas, nepatvirtinta): „Į kiek dalių skaidomas pirkimo objektas?“
- Siūloma užuomina (Code pasiūlymas, nepatvirtinta): Šablone yra 2 dalių eilutės; daugiau dalių sukuriama automatiškai.
- Dabar formoje: klausimo vietoje - pats šablono sakinys; laukai `<input type="text">` su užuomina „reikšmė 1“, „reikšmė 2“... (be pavadinimo); privalomumo nėra.

| ID | Šablonai | Vieta | Pilnas sakinys | Vietų | Dabartinis rodymas | Siūloma reikšmė (kilmė) |
|---|---|---|---|---|---|---|
| V-06 | AKV_LT_SPS, AK_LTEN_SPS, AK_LT_SPS, MVP_LT_SPS, ND_LTEN_SPS, ND_LT_SPS, SSD_LTEN_SPS, SSD_LT_SPS, TSD_LTEN_SPS, TSD_LT_SPS | PIRKIMO OBJEKTAS; OBJECT OF PROCUREMENT (pastr. AKV_LT_SPS:45, AK_LTEN_SPS:99, AK_LT_SPS:52...) | Pirkimo objektas skaidomas į __ Pirkimo objekto dalis: | 1 | rodomas visas | nėra |
| V-07 | MVP_LTEN_SPS | OBJECT OF PROCUREMENT (pastr. MVP_LTEN_SPS:55) | Jei Pirkimo objektas skaidomas į dalis: Pirkimo objektas skaidomas į __ Pirkimo objekto dalis: | 1 | rodomas visas | nėra |

### dalies-pavadinimas (2 šablono variantai)

- Įvesties tipas (pasiūlymas): laisvas tekstas
- Siūlomas klausimas (Code pasiūlymas, nepatvirtinta): „Pirkimo objekto dalies pavadinimas“
- Dabar formoje: klausimo vietoje - pats šablono sakinys; laukai `<input type="text">` su užuomina „reikšmė 1“, „reikšmė 2“... (be pavadinimo); privalomumo nėra.

| ID | Šablonai | Vieta | Pilnas sakinys | Vietų | Dabartinis rodymas | Siūloma reikšmė (kilmė) |
|---|---|---|---|---|---|---|
| V-08 | AKV_LT_SPS, AK_LTEN_SPS, AK_LT_SPS, MVP_LTEN_SPS, MVP_LT_SPS, ND_LTEN_SPS, ND_LT_SPS, SSD_LTEN_SPS, SSD_LT_SPS, TSD_LTEN_SPS, TSD_LT_SPS | PIRKIMO OBJEKTAS; OBJECT OF PROCUREMENT (pastr. AKV_LT_SPS:46, AK_LTEN_SPS:102, AK_LT_SPS:53...) | I Pirkimo objekto dalis – ________________________; | 1 | rodomas visas | nėra |
| V-09 | AKV_LT_SPS, AK_LTEN_SPS, AK_LT_SPS, MVP_LTEN_SPS, MVP_LT_SPS, ND_LTEN_SPS, ND_LT_SPS, SSD_LTEN_SPS, SSD_LT_SPS, TSD_LTEN_SPS, TSD_LT_SPS | PIRKIMO OBJEKTAS; OBJECT OF PROCUREMENT (pastr. AKV_LT_SPS:47, AK_LTEN_SPS:105, AK_LT_SPS:54...) | II Pirkimo objekto dalis –________________________. | 1 | rodomas visas | nėra |

### min-reikalavimai (2 šablono variantai)

- Įvesties tipas (pasiūlymas): pasirinkimas arba laisvas tekstas
- Siūlomas klausimas (Code pasiūlymas, nepatvirtinta): „Kokie minimalūs reikalavimai pirkimo objektui?“
- Siūloma užuomina (Code pasiūlymas, nepatvirtinta): Šablono nurodymas: jei deramasi tik dėl kainos, rašoma „Techninėje specifikacijoje ir Sutarties projekte nustatyti reikalavimai“.
- Dabar formoje: klausimo vietoje - pats šablono sakinys; laukai `<input type="text">` su užuomina „reikšmė 1“, „reikšmė 2“... (be pavadinimo); privalomumo nėra.

| ID | Šablonai | Vieta | Pilnas sakinys | Vietų | Dabartinis rodymas | Siūloma reikšmė (kilmė) |
|---|---|---|---|---|---|---|
| V-10 | MVP_LTEN_SPS, MVP_LT_SPS | OBJECT OF PROCUREMENT; PIRKIMO OBJEKTAS (pastr. MVP_LTEN_SPS:74, MVP_LT_SPS:34) | Perkančiojo subjekto nustatyti minimalūs reikalavimai Pirkimo objektui yra šie: [jei deramasi tik dėl kainos, rašome: Techninėje specifikacijoje ir  Sutarties projekte nustatyti reikalavimai] | 1 | kerpamas ties 180 simb. (žodžio viduryje): „... projekte nustatyti re“ | nėra |
| V-11 | MVP_LTEN_SPS, ND_LTEN_SPS, SSD_LTEN_SPS, TSD_LTEN_SPS | OBJECT OF PROCUREMENT (pastr. MVP_LTEN_SPS:75, ND_LTEN_SPS:106, SSD_LTEN_SPS:124...) | The minimum requirements set by the Contracting entity for the Procurement object  are the following: ___________________________________ | 1 | rodomas visas | nėra |

### derybu-salygos (2 šablono variantai)

- Įvesties tipas (pasiūlymas): pasirinkimas arba laisvas tekstas
- Siūlomas klausimas (Code pasiūlymas, nepatvirtinta): „Dėl kokių sąlygų bus deramasi?“
- Siūloma užuomina (Code pasiūlymas, nepatvirtinta): Seka 1 žingsnio atsakymą „Dėl ko bus deramasi?“.
- Dabar formoje: klausimo vietoje - pats šablono sakinys; laukai `<input type="text">` su užuomina „reikšmė 1“, „reikšmė 2“... (be pavadinimo); privalomumo nėra.

| ID | Šablonai | Vieta | Pilnas sakinys | Vietų | Dabartinis rodymas | Siūloma reikšmė (kilmė) |
|---|---|---|---|---|---|---|
| V-12 | MVP_LTEN_SPS, MVP_LT_SPS | OBJECT OF PROCUREMENT; PIRKIMO OBJEKTAS (pastr. MVP_LTEN_SPS:77, MVP_LT_SPS:35) | Perkantysis subjektas derėsis dėl šių sąlygų: [jei deramasi tik dėl kainos, kitų Pasiūlymo sąlygų, rašome: Pasiūlymo kainos, kitų Pasiūlymo sąlygų] | 1 | rodomas visas | nėra |
| V-13 | MVP_LTEN_SPS, ND_LTEN_SPS, SSD_LTEN_SPS, TSD_LTEN_SPS | OBJECT OF PROCUREMENT (pastr. MVP_LTEN_SPS:78, ND_LTEN_SPS:109, SSD_LTEN_SPS:127...) | The Contracting Entity will negotiate the following conditions: _________________________________________________________ | 1 | rodomas visas | nėra |

### formos-ir-ebvpd-priedai (28 šablono variantai)

- Įvesties tipas (pasiūlymas): skaičius (SPS priedo numeris) x 2
- Siūlomas klausimas (Code pasiūlymas, nepatvirtinta): „1) Kuris SPS priedas yra pasiūlymo (paraiškos) forma? 2) Kuris SPS priedas yra EBVPD forma?“
- Siūloma užuomina (Code pasiūlymas, nepatvirtinta): Numeriai iš SPS priedų sąrašo. Palikus tuščią - žr. neprivalomų nuorodų klasifikaciją.
- Dabar formoje: klausimo vietoje - pats šablono sakinys; laukai `<input type="text">` su užuomina „reikšmė 1“, „reikšmė 2“... (be pavadinimo); privalomumo nėra.

| ID | Šablonai | Vieta | Pilnas sakinys | Vietų | Dabartinis rodymas | Siūloma reikšmė (kilmė) |
|---|---|---|---|---|---|---|
| V-14 | MVP_LT_SPS | TIEKĖJŲ PAŠALINIMO PAGRINDŲ NEBUVIMO IR KVALIFIKACIJOS REIKALAVIMAI (pastr. MVP_LT_SPS:48) | 3.1. Tiekėjų kvalifikacija nėra tikrinama šiame Pirkime. Tiekėjų pašalinimo pagrindų nebuvimas yra tikrinamas. Tiekėjai privalo pateikti Pasiūlymą (SPS ___ priedas) ir Europos bendrąjį viešųjų pirkimų dokumentą (toliau – EBVPD) (SPS ___ priedas). Pašalinimo pagrindų nebuvimą pagrindžiančius dokumentus ir kitus dokumentus, nurodytus šio punkto 1 lentelėje,  bus prašoma pateikti tik iš Tiekėjo, kuris pagal sudarytą pasiūlymų eilę, pateikė ekonomiškai naudingiausią pasiūlymą. | 2 | kerpamas ties 180 simb. (žodžio viduryje): „...iedas) ir Europos bend“ | nėra |
| V-15 | MVP_LTEN_SPS, MVP_LT_SPS | GROUNDS FOR EXCLUSION AND QUALIFICATION REQUIREMENTS; TIEKĖJŲ PAŠALINIMO PAGRINDŲ NEBUVIMO IR KVALIFIKACIJOS REIKALAVIMAI (pastr. MVP_LTEN_SPS:111, MVP_LT_SPS:50) | Tiekėjų pašalinimo pagrindų nebuvimas ir kvalifikacija yra tikrinami šiame Pirkime. Tiekėjai privalo pateikti Pasiūlymą (SPS ___ priedas) ir Europos bendrąjį viešųjų pirkimų dokumentą  (toliau – EBVPD) (SPS ___ priedas). Pašalinimo pagrindų nebuvimą, kvalifikacijos atitiktį pagrindžiančius dokumentus ir kitus pateikiamus dokumentus, nurodytus šio papunkčio 1 ir 2 lentelėse , bus prašoma pateikti tik iš Tiekėjo, kuris pagal sudarytą pasiūlymų eilę, pateikė ekonomiškai naudingiausią pasiūlymą. | 2 | kerpamas ties 180 simb. (žodžio viduryje): „...viešųjų pirkimų dokume“ | nėra |
| V-16 | MVP_LTEN_SPS | GROUNDS FOR EXCLUSION AND QUALIFICATION REQUIREMENTS (pastr. MVP_LTEN_SPS:106) | Tiekėjų kvalifikacija nėra tikrinama šiame Pirkime. Tiekėjų pašalinimo pagrindų nebuvimas yra tikrinamas. Tiekėjai privalo pateikti Pasiūlymą (SPS ___ priedas) ir Europos bendrąjį viešųjų pirkimų dokumentą (toliau – EBVPD) (SPS ___ priedas). Pašalinimo pagrindų nebuvimą pagrindžiančius dokumentus ir kitus dokumentus, nurodytus šio punkto 1 lentelėje,  bus prašoma pateikti tik iš Tiekėjo, kuris pagal sudarytą pasiūlymų eilę, pateikė ekonomiškai naudingiausią pasiūlymą. | 2 | kerpamas ties 180 simb.: „...) ir Europos bendrąjį “ | nėra |
| V-17 | MVP_LTEN_SPS | GROUNDS FOR EXCLUSION AND QUALIFICATION REQUIREMENTS (pastr. MVP_LTEN_SPS:116) | Tiekėjų pašalinimo pagrindų nebuvimas ir kvalifikacija yra tikrinami šiame Pirkime. Tiekėjai privalo pateikti Pasiūlymą (SPS ___ priedas) ir Europos bendrąjį viešųjų pirkimų dokumentą  (toliau – EBVPD) (SPS ___ priedas). Pašalinimo pagrindų nebuvimą, kvalifikacijos atitiktį pagrindžiančius dokumentus ir kitus pateikiamus dokumentus, nurodytus šio papunkčio 1 ir 2 lentelėse visi Tiekėjai turi pateikti katu su Pasiūlymu | 2 | kerpamas ties 180 simb. (žodžio viduryje): „...viešųjų pirkimų dokume“ | nėra |
| V-18 | MVP_LTEN_SPS | GROUNDS FOR EXCLUSION AND QUALIFICATION REQUIREMENTS (pastr. MVP_LTEN_SPS:121) | Tiekėjų kvalifikacija nėra tikrinama šiame Pirkime. Tiekėjų pašalinimo pagrindų nebuvimas yra tikrinamas. Tiekėjai privalo pateikti Pasiūlymą (SPS ___ priedas) ir Europos bendrąjį viešųjų pirkimų dokumentą (toliau – EBVPD) (SPS ___ priedas). Pašalinimo pagrindų nebuvimą pagrindžiančius dokumentus ir kiti dokumentai, nurodyti šio punkto 1 lentelėje,  turi būti pateikti su Pirminiu pasiūlymu/Pasiūlymu. | 2 | kerpamas ties 180 simb.: „...) ir Europos bendrąjį “ | nėra |
| V-19 | AK_LT_SPS | TIEKĖJŲ PAŠALINIMO PAGRINDAI IR KVALIFIKACIJOS REIKALAVIMAI (pastr. AK_LT_SPS:70) | Tiekėjų kvalifikacija nėra tikrinama šiame Pirkime. Tiekėjų pašalinimo pagrindų nebuvimas yra tikrinamas. Tiekėjai privalo pateikti Pasiūlymą (SPS ___ priedas), Europos bendrąjį viešųjų pirkimų dokumentą (toliau – EBVPD) (SPS ___ priedas) ir kitus dokumentus, nurodytus SPS  7.2. punkte. Pašalinimo pagrindų nebuvimą pagrindžiančius dokumentus ir kitus prašomus dokumentus, nurodytus šio punkto 1 lentelėje, bus prašoma pateikti tik iš Tiekėjo, kuris pagal sudarytą pasiūlymų eilę, pateikė ekonomiškai naudingiausią pasiūlymą. | 2 | kerpamas ties 180 simb. (žodžio viduryje): „...), Europos bendrąjį vi“ | nėra |
| V-20 | AK_LT_SPS | TIEKĖJŲ PAŠALINIMO PAGRINDAI IR KVALIFIKACIJOS REIKALAVIMAI (pastr. AK_LT_SPS:72) | 3.1. Tiekėjų pašalinimo pagrindų nebuvimas ir kvalifikacija yra tikrinami šiame Pirkime. Tiekėjai privalo pateikti Pasiūlymą (SPS ___ priedas) ir Europos bendrąjį viešųjų pirkimų dokumentą (toliau – EBVPD) (SPS ___ priedas) ir kitus dokumentus, nurodytus SPS  7.2. punkte. Kvalifikacijos atitiktį, pašalinimo pagrindų nebuvimą pagrindžiančius dokumentus ir kitus prašomus dokumentus, nurodytus šio punkto 1, ir 2 lentelėse, bus prašoma pateikti tik iš Tiekėjo, kuris pagal sudarytą pasiūlymų eilę, pateikė ekonomiškai naudingiausią pasiūlymą. | 2 | kerpamas ties 180 simb. (žodžio viduryje): „...rąjį viešųjų pirkimų d“ | nėra |
| V-21 | AKV_LT_SPS, AK_LT_SPS | TIEKĖJŲ PAŠALINIMO PAGRINDAI IR KVALIFIKACIJOS REIKALAVIMAI (pastr. AKV_LT_SPS:68, AK_LT_SPS:74) | 3.1. Tiekėjų pašalinimo pagrindų nebuvimas ir kvalifikacija yra tikrinami šiame Pirkime. Tiekėjai privalo pateikti Pasiūlymą (SPS ___ priedas) ir Europos bendrąjį viešųjų pirkimų dokumentą (toliau – EBVPD) (SPS ___ priedas) ir kitus dokumentus, nurodytus SPS  7.2. punkte. Kvalifikacijos atitiktį, pažalinimo pagrindų nebuvimą pagrindžiančius dokumentus ir kitus prašomus dokumentus, nurodytus šio punkto 1 ir 2  lentelėse, prašoma pateikti visų Tiekėjų su Pasiūlymu. | 2 | kerpamas ties 180 simb. (žodžio viduryje): „...rąjį viešųjų pirkimų d“ | nėra |
| V-22 | AK_LTEN_SPS | GROUNDS FOR EXCLUSION AND QUALIFICATION  REQUIREMENTS (pastr. AK_LTEN_SPS:145) | Tiekėjų kvalifikacija nėra tikrinama šiame Pirkime. Tiekėjų pašalinimo pagrindų nebuvimas yra tikrinamas. Tiekėjai privalo pateikti Pasiūlymą (SPS ___ priedas) ir Europos bendrąjį viešųjų pirkimų dokumentą (toliau – EBVPD) (SPS ____ priedas). Pašalinimo pagrindų nebuvimą pagrindžiančius dokumentus, nurodytus šio punkto 1 lentelėje, bus prašoma pateikti tik iš Tiekėjo, kuris pagal sudarytą pasiūlymų eilę, pateikė ekonomiškai naudingiausią pasiūlymą. | 2 | kerpamas ties 180 simb.: „...) ir Europos bendrąjį “ | nėra |
| V-23 | AK_LTEN_SPS | GROUNDS FOR EXCLUSION AND QUALIFICATION  REQUIREMENTS (pastr. AK_LTEN_SPS:149) | Tiekėjų pašalinimo pagrindų nebuvimas ir kvalifikacija yra tikrinami šiame Pirkime. Tiekėjai privalo pateikti Pasiūlymą (SPS ___ priedas) ir Europos bendrąjį viešųjų pirkimų dokumentą (toliau – EBVPD) (SPS ___ priedas). Pašalinimo pagrindų nebuvimą, kvalifikacijos atitiktį pagrindžiančius dokumentus, nurodytus šio punkto 1 ir 2 ir lentelėse, bus prašoma pateikti tik iš Tiekėjo, kuris pagal sudarytą pasiūlymų eilę, pateikė ekonomiškai naudingiausią pasiūlymą. | 2 | kerpamas ties 180 simb. (žodžio viduryje): „...viešųjų pirkimų dokume“ | nėra |
| V-24 | AK_LTEN_SPS | GROUNDS FOR EXCLUSION AND QUALIFICATION  REQUIREMENTS (pastr. AK_LTEN_SPS:153) | Tiekėjų pašalinimo pagrindų nebuvimas ir kvalifikacija yra tikrinami šiame Pirkime. Tiekėjai privalo pateikti Pasiūlymą (SPS ___ priedas) ir Europos bendrąjį viešųjų pirkimų dokumentą (toliau – EBVPD) (SPS ___ priedas). Pašalinimo pagrindų nebuvimą ir kvalifikacijos atitiktį pagrindžiančius dokumentus, nurodytus šio punkto 1 ir 2 lentelėse, prašoma pateikti visų Tiekėjų su Pasiūlymu. | 2 | kerpamas ties 180 simb. (žodžio viduryje): „...viešųjų pirkimų dokume“ | nėra |
| V-25 | SSD_LT_SPS | TIEKĖJŲ PAŠALINIMO PAGRINDŲ NEBUVIMO IR KVALIFIKACIJOS REIKALAVIMAI (pastr. SSD_LT_SPS:69) | Tiekėjų kvalifikacija nėra tikrinama šiame Pirkime. Tiekėjų pašalinimo pagrindų nebuvimas yra tikrinamas. Tiekėjai privalo pateikti Pirminį pasiūlymą su priedais (SPS ___ priedas), Europos bendrąjį viešųjų pirkimų dokumentą (toliau – EBVPD) (SPS ____ priedas) ir kitus dokumentus, nurodytus SPS  7.2. punkte. Pašalinimo pagrindų nebuvimą pagrindžiančius dokumentus ir kitus dokumentus, nurodytus šio punkto 1 lentelėje, bus prašoma pateikti tik iš Tiekėjo, kuris pagal sudarytą pasiūlymų eilę, pateikė ekonomiškai naudingiausią pasiūlymą. | 2 | kerpamas ties 180 simb.: „...ais (SPS ___ priedas),“ | nėra |
| V-26 | SSD_LT_SPS | TIEKĖJŲ PAŠALINIMO PAGRINDŲ NEBUVIMO IR KVALIFIKACIJOS REIKALAVIMAI (pastr. SSD_LT_SPS:71) | 3.1.  Tiekėjų pašalinimo pagrindų nebuvimas ir kvalifikacija yra tikrinami šiame Pirkime. Tiekėjai privalo pateikti Pirminį pasiūlymą su priedais (SPS ___ priedas), Europos bendrąjį viešųjų pirkimų dokumentą (toliau – EBVPD) (SPS ___ priedas) ir kitus dokumentus, nurodytus SPS  7.2. punkte. Pašalinimo pagrindų nebuvimą, kvalifikacijos atitiktį pagrindžiančius dokumentus ir kitus dokumentus, nurodytus šio punkto 1 ir 2 lentelėse, bus prašoma pateikti tik iš Tiekėjo, kuris pagal sudarytą pasiūlymų eilę, pateikė ekonomiškai naudingiausią pasiūlymą. | 2 | kerpamas ties 180 simb. (žodžio viduryje): „...edas), Europos bendrąj“ | nėra |
| V-27 | SSD_LT_SPS | TIEKĖJŲ PAŠALINIMO PAGRINDŲ NEBUVIMO IR KVALIFIKACIJOS REIKALAVIMAI (pastr. SSD_LT_SPS:73) | 3.1. Tiekėjų pašalinimo pagrindų nebuvimas ir kvalifikacija yra tikrinami šiame Pirkime. Tiekėjai privalo pateikti Pirminį pasiūlymą su priedais (SPS ___ priedas), Europos bendrąjį viešųjų pirkimų dokumentą ir kitus dokumentus, nurodytus SPS  7.2. punkte. (toliau – EBVPD) (SPS ___ priedas). Pašalinimo pagrindų nebuvimą, kvalifikacijos atitiktį pagrindžiančius dokumentus ir kitus dokumentus, nurodytus šio punkto 1 ir 2 lentelėse, prašoma pateikti visų Tiekėjų su Pirminiu pasiūlymu. | 2 | kerpamas ties 180 simb.: „...das), Europos bendrąjį“ | nėra |
| V-28 | SSD_LTEN_SPS | GROUNDS FOR EXCLUSION AND QUALIFICATION REQUIREMENTS (pastr. SSD_LTEN_SPS:157) | Tiekėjų kvalifikacija nėra tikrinama šiame Pirkime. Tiekėjų pašalinimo pagrindų nebuvimas yra tikrinamas. Tiekėjai privalo pateikti Pirminį pasiūlymą su priedais (SPS ___ priedas) ir Europos bendrąjį viešųjų pirkimų dokumentą (toliau – EBVPD) (SPS ____ priedas). Pašalinimo pagrindų nebuvimą pagrindžiančius dokumentus ir kitus dokumentus, nurodytus šio punkto 1 lentelėje, bus prašoma pateikti tik iš Tiekėjo, kuris pagal sudarytą pasiūlymų eilę, pateikė ekonomiškai naudingiausią pasiūlymą. | 2 | kerpamas ties 180 simb.: „...ais (SPS ___ priedas) “ | nėra |
| V-29 | SSD_LTEN_SPS | GROUNDS FOR EXCLUSION AND QUALIFICATION REQUIREMENTS (pastr. SSD_LTEN_SPS:161) | Tiekėjų pašalinimo pagrindų nebuvimas ir kvalifikacija yra tikrinami šiame Pirkime. Tiekėjai privalo pateikti Pirminį pasiūlymą su priedais (SPS ___ priedas) ir Europos bendrąjį viešųjų pirkimų dokumentą (toliau – EBVPD) (SPS ___ priedas). Pašalinimo pagrindų nebuvimą, kvalifikacijos atitiktį pagrindžiančius dokumentus ir kitus dokumentus, nurodytus šio punkto 1 ir 2 lentelėse, bus prašoma pateikti tik iš Tiekėjo, kuris pagal sudarytą pasiūlymų eilę, pateikė ekonomiškai naudingiausią pasiūlymą. | 2 | kerpamas ties 180 simb. (žodžio viduryje): „...ir Europos bendrąjį vi“ | nėra |
| V-30 | ND_LTEN_SPS, SSD_LTEN_SPS | GROUNDS FOR EXCLUSION AND QUALIFICATION REQUIREMENTS (pastr. ND_LTEN_SPS:139, SSD_LTEN_SPS:165) | Tiekėjų pašalinimo pagrindų nebuvimas ir kvalifikacija yra tikrinami šiame Pirkime. Tiekėjai privalo pateikti Pirminį pasiūlymą su priedais (SPS ___ priedas) ir Europos bendrąjį viešųjų pirkimų dokumentą (toliau – EBVPD) (SPS ___ priedas). Pašalinimo pagrindų nebuvimą, kvalifikacijos atitiktį pagrindžiančius dokumentus ir kitus dokumentus, nurodytus šio punkto 1 ir  2  lentelėse, prašoma pateikti visų Tiekėjų su Pirminiu pasiūlymu. | 2 | kerpamas ties 180 simb. (žodžio viduryje): „...ir Europos bendrąjį vi“ | nėra |
| V-31 | ND_LT_SPS | TIEKĖJŲ PAŠALINIMO PAGRINDŲ NEBUVIMO IR KVALIFIKACIJOS REIKALAVIMAI (pastr. ND_LT_SPS:52) | 3.1. Tiekėjų pašalinimo pagrindų nebuvimas ir kvalifikacija yra tikrinami šiame Pirkime. Tiekėjai privalo pateikti Pirminį pasiūlymą su priedais (SPS ___ priedas) ir Europos bendrąjį viešųjų pirkimų dokumentą (toliau – EBVPD) (SPS ___ priedas) ir kitus dokumentus, nurodytus SPS  5.2 punkte. Pašalinimo pagrindų nebuvimą, kvalifikacijos atitiktį pagrindžiančius dokumentus ir kitus dokumentus, nurodytus šio punkto 1 ir 2 lentelėse, prašoma pateikti visų Tiekėjų su Pirminiu pasiūlymu. | 2 | kerpamas ties 180 simb. (žodžio viduryje): „...das) ir Europos bendrą“ | nėra |
| V-32 | ND_LT_SPS | TIEKĖJŲ PAŠALINIMO PAGRINDŲ NEBUVIMO IR KVALIFIKACIJOS REIKALAVIMAI (pastr. ND_LT_SPS:55) | 3.1. Tiekėjų kvalifikacija nėra tikrinama šiame Pirkime. Tiekėjų pašalinimo pagrindų nebuvimas yra tikrinamas. Tiekėjai privalo pateikti Pirminį pasiūlymą su priedais (SPS ___ priedas) ir Europos bendrąjį viešųjų pirkimų dokumentą (toliau – EBVPD) (SPS ___ priedas). Pašalinimo pagrindų nebuvimą pagrindžiančius dokumentus nurodytus šio punkto 1 lentelėje, prašoma pateikti visų Tiekėjų su Pirminiu pasiūlymu. | 2 | kerpamas ties 180 simb. (žodžio viduryje): „...priedais (SPS ___ prie“ | nėra |
| V-33 | ND_LTEN_SPS | GROUNDS FOR EXCLUSION AND QUALIFICATION REQUIREMENTS (pastr. ND_LTEN_SPS:143) | Tiekėjų kvalifikacija nėra tikrinama šiame Pirkime. Tiekėjų pašalinimo pagrindų nebuvimas yra tikrinamas. Tiekėjai privalo pateikti Pirminį pasiūlymą su priedais (SPS ___ priedas) ir Europos bendrąjį viešųjų pirkimų dokumentą (toliau – EBVPD) (SPS ___ priedas). Pašalinimo pagrindų nebuvimą pagrindžiančius dokumentus nurodytus šio punkto 1 lentelėje, prašoma pateikti visų Tiekėjų su Pirminiu pasiūlymu. | 2 | kerpamas ties 180 simb.: „...ais (SPS ___ priedas) “ | nėra |
| V-34 | AKV_LT_SPS | TIEKĖJŲ PAŠALINIMO PAGRINDAI IR KVALIFIKACIJOS REIKALAVIMAI (pastr. AKV_LT_SPS:64) | 3.1. Tiekėjų kvalifikacija nėra tikrinama šiame Pirkime. Tiekėjų pašalinimo pagrindų nebuvimas yra tikrinamas. Tiekėjai privalo pateikti Pasiūlymą (SPS ___ priedas), Europos bendrąjį viešųjų pirkimų dokumentą (toliau – EBVPD) (SPS ___ priedas) ir kitus dokumentus, nurodytus SPS  7.2. punkte. Pašalinimo pagrindų nebuvimą pagrindžiančius dokumentus ir kitus prašomus dokumentus, nurodytus šio punkto 1  lentelėje, bus prašoma pateikti tik iš Tiekėjo, kuris pagal sudarytą pasiūlymų eilę, pateikė ekonomiškai naudingiausią pasiūlymą. | 2 | kerpamas ties 180 simb. (žodžio viduryje): „...iedas), Europos bendrą“ | nėra |
| V-35 | AKV_LT_SPS | TIEKĖJŲ PAŠALINIMO PAGRINDAI IR KVALIFIKACIJOS REIKALAVIMAI (pastr. AKV_LT_SPS:66) | 3.1. Tiekėjų pašalinimo pagrindų nebuvimas ir kvalifikacija yra tikrinami šiame Pirkime. Tiekėjai privalo pateikti Pasiūlymą (SPS ___ priedas) ir Europos bendrąjį viešųjų pirkimų dokumentą (toliau – EBVPD) (SPS ___ priedas) ir kitus dokumentus, nurodytus SPS  7.2. punkte. Kvalifikacijos atitiktį, pašalinimo pagrindų nebuvimą pagrindžiančius dokumentus ir kitus prašomus dokumentus, nurodytus šio punkto 1 ir 2   entelėse, bus prašoma pateikti tik iš Tiekėjo, kuris pagal sudarytą pasiūlymų eilę, pateikė ekonomiškai naudingiausią pasiūlymą. | 2 | kerpamas ties 180 simb. (žodžio viduryje): „...rąjį viešųjų pirkimų d“ | nėra |
| V-36 | TSD_LT_SPS | TIEKĖJŲ PAŠALINIMO PAGRINDŲ NEBUVIMO IR KVALIFIKACIJOS REIKALAVIMAI (pastr. TSD_LT_SPS:71) | Tiekėjų kvalifikacija nėra tikrinama šiame Pirkime. Tiekėjų pašalinimo pagrindų nebuvimas yra tikrinamas. Tiekėjai privalo pateikti Paraišką su priedais (SPS ___ priedas) ir Europos bendrąjį viešųjų pirkimų dokumentą (toliau – EBVPD) (SPS ____ priedas) ir kitus dokumentus, nurodytus SPS  7.2. punkte. Pašalinimo pagrindų nebuvimą pagrindžiančius dokumentus ir kitus dokumentus, nurodytus šio punkto 1 lentelėje, bus prašoma pateikti tik iš Tiekėjo, kuris pagal sudarytą pasiūlymų eilę, pateikė ekonomiškai naudingiausią pasiūlymą. | 2 | kerpamas ties 200 simb. (žodžio viduryje): „...pos bendrąjį viešųjų p“ | „1“, „2“ - įrašyta kode (`priedoNrSiulymai()`, PP-SALYGOS.html:1039), rodoma kaip įvesta reikšmė |
| V-37 | TSD_LT_SPS | TIEKĖJŲ PAŠALINIMO PAGRINDŲ NEBUVIMO IR KVALIFIKACIJOS REIKALAVIMAI (pastr. TSD_LT_SPS:73) | 3.1.  Tiekėjų pašalinimo pagrindų nebuvimas ir kvalifikacija yra tikrinami šiame Pirkime. Tiekėjai privalo pateikti Paraišką su priedais (SPS ___ priedas), Europos bendrąjį viešųjų pirkimų dokumentą (toliau – EBVPD) (SPS ___ priedas) ir kitus dokumentus, nurodytus SPS  7.2. punkte. Pašalinimo pagrindų nebuvimą, kvalifikacijos atitiktį pagrindžiančius dokumentus ir kitus dokumentus, nurodytus šio punkto 1 ir 2 lentelėse, bus prašoma pateikti tik iš Tiekėjo, kuris pagal sudarytą pasiūlymų eilę, pateikė ekonomiškai naudingiausią pasiūlymą. | 2 | kerpamas ties 200 simb.: „...jų pirkimų dokumentą (“ | „1“, „2“ - įrašyta kode (`priedoNrSiulymai()`, PP-SALYGOS.html:1039), rodoma kaip įvesta reikšmė |
| V-38 | TSD_LT_SPS | TIEKĖJŲ PAŠALINIMO PAGRINDŲ NEBUVIMO IR KVALIFIKACIJOS REIKALAVIMAI (pastr. TSD_LT_SPS:75) | 3.1. Tiekėjų pašalinimo pagrindų nebuvimas ir kvalifikacija yra tikrinami šiame Pirkime. Tiekėjai privalo pateikti Paraišką su priedais (SPS ___ priedas) ir Europos bendrąjį viešųjų pirkimų dokumentą (toliau – EBVPD) (SPS ___ priedas) ir kitus dokumentus, nurodytus SPS  7.2. punkte. Pašalinimo pagrindų nebuvimą, kvalifikacijos atitiktį pagrindžiančius dokumentus ir kitus dokumentus, nurodytus šio punkto 1 ir 2 lentelėse, prašoma pateikti visų Tiekėjų su Paraiška. | 2 | kerpamas ties 200 simb.: „...ųjų pirkimų dokumentą “ | „1“, „2“ - įrašyta kode (`priedoNrSiulymai()`, PP-SALYGOS.html:1039), rodoma kaip įvesta reikšmė |
| V-39 | TSD_LTEN_SPS | GROUNDS FOR EXCLUSION AND QUALIFICATION REQUIREMENTS (pastr. TSD_LTEN_SPS:162) | Tiekėjų kvalifikacija nėra tikrinama šiame Pirkime. Tiekėjų pašalinimo pagrindų nebuvimas yra tikrinamas. Tiekėjai privalo pateikti Paraišką su priedais (SPS ___ priedas) ir Europos bendrąjį viešųjų pirkimų dokumentą (toliau – EBVPD) (SPS ____ priedas). Pašalinimo pagrindų nebuvimą pagrindžiančius dokumentus ir kitus dokumentus, nurodytus šio punkto 1 lentelėje, bus prašoma pateikti tik iš Tiekėjo, kuris pagal sudarytą pasiūlymų eilę, pateikė ekonomiškai naudingiausią pasiūlymą. | 2 | kerpamas ties 200 simb. (žodžio viduryje): „...pos bendrąjį viešųjų p“ | „1“, „2“ - įrašyta kode (`priedoNrSiulymai()`, PP-SALYGOS.html:1039), rodoma kaip įvesta reikšmė |
| V-40 | TSD_LTEN_SPS | GROUNDS FOR EXCLUSION AND QUALIFICATION REQUIREMENTS (pastr. TSD_LTEN_SPS:166) | Tiekėjų pašalinimo pagrindų nebuvimas ir kvalifikacija yra tikrinami šiame Pirkime. Tiekėjai privalo pateikti Paraišką su priedais (SPS ___ priedas) ir Europos bendrąjį viešųjų pirkimų dokumentą (toliau – EBVPD) (SPS ___ priedas). Pašalinimo pagrindų nebuvimą, kvalifikacijos atitiktį pagrindžiančius dokumentus ir kitus dokumentus, nurodytus šio punkto 1 ir 2 lentelėse, bus prašoma pateikti tik iš Tiekėjo, kuris pagal sudarytą pasiūlymų eilę, pateikė ekonomiškai naudingiausią pasiūlymą. | 2 | kerpamas ties 200 simb. (žodžio viduryje): „...irkimų dokumentą (toli“ | „1“, „2“ - įrašyta kode (`priedoNrSiulymai()`, PP-SALYGOS.html:1039), rodoma kaip įvesta reikšmė |
| V-41 | TSD_LTEN_SPS | GROUNDS FOR EXCLUSION AND QUALIFICATION REQUIREMENTS (pastr. TSD_LTEN_SPS:170) | Tiekėjų pašalinimo pagrindų nebuvimas ir kvalifikacija yra tikrinami šiame Pirkime. Tiekėjai privalo pateikti Paraišką su priedais (SPS ___ priedas) ir Europos bendrąjį viešųjų pirkimų dokumentą (toliau – EBVPD) (SPS ___ priedas). Pašalinimo pagrindų nebuvimą, kvalifikacijos atitiktį pagrindžiančius dokumentus ir kitus dokumentus, nurodytus šio punkto 1 ir  2  lentelėse, prašoma pateikti visų Tiekėjų su Paraiška. | 2 | kerpamas ties 200 simb. (žodžio viduryje): „...irkimų dokumentą (toli“ | „1“, „2“ - įrašyta kode (`priedoNrSiulymai()`, PP-SALYGOS.html:1039), rodoma kaip įvesta reikšmė |

### teise-verstis-veikla (2 šablono variantai)

- Įvesties tipas (pasiūlymas): laisvas tekstas
- Siūlomas klausimas (Code pasiūlymas, nepatvirtinta): „Kokią teisę verstis veikla turi turėti tiekėjas?“
- Siūloma užuomina (Code pasiūlymas, nepatvirtinta): Tekstas įrašomas į sakinį „Tiekėjas turi teisę ...“ (kvalifikacijos reikalavimų lentelė).
- Dabar formoje: klausimo vietoje - pats šablono sakinys; laukai `<input type="text">` su užuomina „reikšmė 1“, „reikšmė 2“... (be pavadinimo); privalomumo nėra.

| ID | Šablonai | Vieta | Pilnas sakinys | Vietų | Dabartinis rodymas | Siūloma reikšmė (kilmė) |
|---|---|---|---|---|---|---|
| V-42 | MVP_LT_SPS | TIEKĖJŲ PAŠALINIMO PAGRINDŲ NEBUVIMO IR KVALIFIKACIJOS REIKALAVIMAI (pastr. MVP_LT_SPS:72) | Tiekėjas turi teisę_______________________________, t. y. verstis veikla, reikalinga Sutarčiai vykdyti. | 1 | rodomas visas | nėra |
| V-43 | AKV_LT_SPS, AK_LT_SPS | TIEKĖJŲ PAŠALINIMO PAGRINDAI IR KVALIFIKACIJOS REIKALAVIMAI (pastr. AKV_LT_SPS:292, AK_LT_SPS:258) | Tiekėjas turi teisę_________________, | 1 | rodomas visas | nėra |

### pateikiami-dokumentai (2 šablono variantai)

- Įvesties tipas (pasiūlymas): laisvas tekstas
- Siūlomas klausimas (Code pasiūlymas, nepatvirtinta): „Kokius dokumentus tiekėjas turi pateikti šiam reikalavimui pagrįsti?“
- Siūloma užuomina (Code pasiūlymas, nepatvirtinta): Tekstas įrašomas po „PATEIKIAMA:“ (kvalifikacijos reikalavimų lentelė).
- Dabar formoje: klausimo vietoje - pats šablono sakinys; laukai `<input type="text">` su užuomina „reikšmė 1“, „reikšmė 2“... (be pavadinimo); privalomumo nėra.

| ID | Šablonai | Vieta | Pilnas sakinys | Vietų | Dabartinis rodymas | Siūloma reikšmė (kilmė) |
|---|---|---|---|---|---|---|
| V-44 | MVP_LT_SPS | TIEKĖJŲ PAŠALINIMO PAGRINDŲ NEBUVIMO IR KVALIFIKACIJOS REIKALAVIMAI (pastr. MVP_LT_SPS:74) | PATEIKIAMA: ___________________________________. | 1 | rodomas visas | nėra |
| V-45 | AKV_LT_SPS, AK_LT_SPS | TIEKĖJŲ PAŠALINIMO PAGRINDAI IR KVALIFIKACIJOS REIKALAVIMAI (pastr. AKV_LT_SPS:294, AK_LT_SPS:260) | PATEIKIAMOS šių dokumentų kopijos: ___________________________________. | 1 | rodomas visas | nėra |

### metodikos-priedas (4 šablono variantai)

- Įvesties tipas (pasiūlymas): skaičius (SPS priedo numeris)
- Siūlomas klausimas (Code pasiūlymas, nepatvirtinta): „Kuriame SPS priede pateikta ekonominio naudingumo vertinimo metodika?“
- Siūloma užuomina (Code pasiūlymas, nepatvirtinta): Įrašykite priedo numerį iš SPS priedų sąrašo.
- Dabar formoje: klausimo vietoje - pats šablono sakinys; laukai `<input type="text">` su užuomina „reikšmė 1“, „reikšmė 2“... (be pavadinimo); privalomumo nėra.

| ID | Šablonai | Vieta | Pilnas sakinys | Vietų | Dabartinis rodymas | Siūloma reikšmė (kilmė) |
|---|---|---|---|---|---|---|
| V-46 | MVP_LT_SPS | PASIŪLYMŲ NAGRINĖJIMAS IR VERTINIMAS (pastr. MVP_LT_SPS:301) | Pirkimo dokumentuose nustatytus reikalavimus atitinkantys Pasiūlymai bus vertinami pagal jų ekonomiškai naudingiausio Pasiūlymų vertinimo kriterijų – kainos ir kokybės santykį / sąnaudų ir kokybės santykį / sąnaudas / kainą. Pasiūlymų vertinimo kriterijai ir ekonominio naudingumo vertinimo metodika pateikiama SPS priede Nr.__. | 1 | kerpamas ties 180 simb. (žodžio viduryje): „...r kokybės santykį / są“ | nėra |
| V-47 | AK_LTEN_SPS, MVP_LTEN_SPS | EXAMINATION AND EVALUATION OF TENDERS (pastr. AK_LTEN_SPS:1056, MVP_LTEN_SPS:625) | Pirkimo dokumentuose nustatytus reikalavimus atitinkantys Pasiūlymai bus vertinami pagal ekonomiškai naudingiausio Pasiūlymų vertinimo kriterijų – kainos ir kokybės santykį / sąnaudų ir kokybės santykį / sąnaudas / kainą. Pasiūlymų vertinimo kriterijai ir ekonominio naudingumo vertinimo metodika pateikiama SPS priede Nr.__. | 1 | kerpamas ties 180 simb. (žodžio viduryje): „...okybės santykį / sąnau“ | nėra |
| V-48 | AK_LT_SPS | PASIŪLYMŲ NAGRINĖJIMAS IR VERTINIMAS (pastr. AK_LT_SPS:541) | 8.1. Pirkimo dokumentuose nustatytus reikalavimus atitinkantys Pasiūlymai bus vertinami pagal ekonomiškai naudingiausio Pasiūlymų vertinimo kriterijų – kainos ir kokybės santykį / sąnaudų ir kokybės santykį / sąnaudas / kainą. Pasiūlymų vertinimo kriterijai ir ekonominio naudingumo vertinimo metodika pateikiama SPS ___priede. | 1 | kerpamas ties 180 simb.: „... ir kokybės santykį / “ | nėra |
| V-49 | ND_LTEN_SPS, ND_LT_SPS, SSD_LTEN_SPS, SSD_LT_SPS, TSD_LTEN_SPS, TSD_LT_SPS | EVALUATION CRITERIA OF TENDERS; PASIŪLYMŲ VERTINIMO KRITERIJUS (pastr. ND_LTEN_SPS:934, ND_LT_SPS:456, SSD_LTEN_SPS:1069...) | Pirkimo dokumentuose nustatytus reikalavimus atitinkantys Galutiniai Pasiūlymai bus vertinami pagal ekonomiškai naudingiausio Pasiūlymų vertinimo kriterijų – kainos ir kokybės santykį / sąnaudų ir kokybės santykį / sąnaudas / kainą. Pasiūlymų vertinimo kriterijai ir ekonominio naudingumo vertinimo metodika pateikiama SPS priede Nr.__. | 1 | kerpamas ties 180 simb. (žodžio viduryje): „...kainos ir kokybės sant“ | nėra |

### laimetoju-skaicius (2 šablono variantai)

- Įvesties tipas (pasiūlymas): skaičius (kur šablone yra skliaustai - ir skaičius žodžiais)
- Siūlomas klausimas (Code pasiūlymas, nepatvirtinta): „Kiek pasiūlymų bus pripažinta laimėjusiais?“
- Siūloma užuomina (Code pasiūlymas, nepatvirtinta): Taikoma, kai siekiama sudaryti preliminariąją sutartį.
- Dabar formoje: klausimo vietoje - pats šablono sakinys; laukai `<input type="text">` su užuomina „reikšmė 1“, „reikšmė 2“... (be pavadinimo); privalomumo nėra.

| ID | Šablonai | Vieta | Pilnas sakinys | Vietų | Dabartinis rodymas | Siūloma reikšmė (kilmė) |
|---|---|---|---|---|---|---|
| V-50 | AKV_LT_SPS, AK_LTEN_SPS, AK_LT_SPS | BENDROSIOS NUOSTATOS; GENERAL PROVISIONS (pastr. AKV_LT_SPS:28, AK_LTEN_SPS:62, AK_LT_SPS:35) | Laimėjusiais pasiūlymais bus pripažinti __ pasiūlymai. | 1 | rodomas visas | nėra |
| V-51 | SSD_LTEN_SPS, SSD_LT_SPS, TSD_LTEN_SPS, TSD_LT_SPS | GENERAL PROVISIONS; BENDROSIOS NUOSTATOS (pastr. SSD_LTEN_SPS:65, SSD_LT_SPS:32, TSD_LTEN_SPS:70...) | Laimėjusiais pasiūlymais bus pripažinti __ (_____) Galutiniai pasiūlymai. | 2 | rodomas visas | nėra |

### stebetojai (2 šablono variantai)

- Įvesties tipas (pasiūlymas): laisvas tekstas
- Siūlomas klausimas (Code pasiūlymas, nepatvirtinta): „Kokių institucijų ar įstaigų atstovai kviečiami dalyvauti stebėtojo teisėmis?“
- Dabar formoje: klausimo vietoje - pats šablono sakinys; laukai `<input type="text">` su užuomina „reikšmė 1“, „reikšmė 2“... (be pavadinimo); privalomumo nėra.

| ID | Šablonai | Vieta | Pilnas sakinys | Vietų | Dabartinis rodymas | Siūloma reikšmė (kilmė) |
|---|---|---|---|---|---|---|
| V-52 | AKV_LT_SPS, AK_LT_SPS | BENDROSIOS NUOSTATOS (pastr. AKV_LT_SPS:32, AK_LT_SPS:39) | Pirkimo metu bus kviečiami Komisijos posėdžiuose stebėtojo teisėmis dalyvauti šie valstybės ir savivaldybių institucijų ar įstaigų atstovai ______________. | 1 | rodomas visas | nėra |
| V-53 | AK_LTEN_SPS, ND_LTEN_SPS, ND_LT_SPS, SSD_LTEN_SPS, SSD_LT_SPS, TSD_LTEN_SPS, TSD_LT_SPS | GENERAL PROVISIONS; BENDROSIOS NUOSTATOS (pastr. AK_LTEN_SPS:70, ND_LTEN_SPS:58, ND_LT_SPS:20...) | Vykdomo Pirkimo metu bus kviečiami Komisijos posėdžiuose stebėtojo teisėmis dalyvauti šie valstybės ir savivaldybių institucijų ar įstaigų atstovai ______________. | 1 | rodomas visas | nėra (EN laukas prie LT klausimo) |

### apziura-en (2 šablono variantai)

- Įvesties tipas (pasiūlymas): data ir laikas (5 vietos: valanda, diena, mėnuo; diena, mėnuo)
- Siūlomas klausimas (Code pasiūlymas, nepatvirtinta): „Objekto apžiūra (angliškas tekstas): iki kada kreiptis ir kada planuojama apžiūra?“
- Siūloma užuomina (Code pasiūlymas, nepatvirtinta): Lietuviškame sakinyje tos pačios datos yra pavyzdinės (raudonos) - siūloma abi kalbas pildyti iš vieno datos lauko.
- Dabar formoje: klausimo vietoje - pats šablono sakinys; laukai `<input type="text">` su užuomina „reikšmė 1“, „reikšmė 2“... (be pavadinimo); privalomumo nėra.

| ID | Šablonai | Vieta | Pilnas sakinys | Vietų | Dabartinis rodymas | Siūloma reikšmė (kilmė) |
|---|---|---|---|---|---|---|
| V-54 | AK_LTEN_SPS | OBJECT OF PROCUREMENT (pastr. AK_LTEN_SPS:133) | The object of the Procurement will be inspected, Suppliers wishing to inspect the construction site have to contact the Contracting Entity via CPP IS before ___ p.m. ___ _________ 2025 (inclusive) in Lithuanian time, specifying the positions, names and surnames of the persons intending to participate in the inspection and the preliminary inspection time (the Contracting Entity has the right to change the inspection time). In response to such request from each Supplier, the Contracting Entity will indicate the inspection time to each Supplier. The inspection of the object is planned to be carried out on ___ _______ 2025. The Contracting Entity will not answer any Suppliers’ questions during the inspection of the object, it will be possible to submit questions after the inspection of the object via CPP IS. | 5 | kerpamas ties 180 simb.: „...__ p.m. ___ _________ “ | nėra |
| V-55 | ND_LTEN_SPS, SSD_LTEN_SPS, TSD_LTEN_SPS | OBJECT OF PROCUREMENT (pastr. ND_LTEN_SPS:127, SSD_LTEN_SPS:145, TSD_LTEN_SPS:150) | The object of the Procurement will be inspected, Suppliers wishing to inspect the construction site have to contact the Contracting Entity via CPP IS before ___ p.m. ___ _________ 2021 (inclusive) in Lithuanian time, specifying the positions, names and surnames of the persons intending to participate in the inspection and the preliminary inspection time (the Contracting Entity has the right to change the inspection time). In response to such request from each Supplier, the Contracting Entity will indicate the inspection time to each Supplier. The inspection of the object is planned to be carried out on ___ _______ 2021. The Contracting Entity will not answer any Suppliers’ questions during the inspection of the object, it will be possible to submit questions after the inspection of the object via CPP IS. | 5 | kerpamas ties 180 simb.: „...__ p.m. ___ _________ “ | nėra |

### derybu-dalykas (1 šablono variantai)

- Įvesties tipas (pasiūlymas): laisvas tekstas
- Siūlomas klausimas (Code pasiūlymas, nepatvirtinta): „Dėl ko perkantysis subjektas derasi?“
- Dabar formoje: klausimo vietoje - pats šablono sakinys; laukai `<input type="text">` su užuomina „reikšmė 1“, „reikšmė 2“... (be pavadinimo); privalomumo nėra.

| ID | Šablonai | Vieta | Pilnas sakinys | Vietų | Dabartinis rodymas | Siūloma reikšmė (kilmė) |
|---|---|---|---|---|---|---|
| V-56 | ND_LT_SPS | BENDROSIOS NUOSTATOS (pastr. ND_LT_SPS:11) | Vadovaujantis Pirkimų įstatymo 80 str. 2 dalimi, Perkantysis subjektas gali įvertinti Pirminį pasiūlymą, derėtis ir neprašyti pateikti Galutinio pasiūlymo, o Derybų protokole užfiksuoti Pasiūlymo duomenis, kurie laikomi galutiniais. Perkantysis subjektas derasi dėl_______________________. | 1 | kerpamas ties 180 simb. (žodžio viduryje): „...Derybų protokole užfik“ | nėra |

### tiekejo-forma (3 šablono variantai)

- Įvesties tipas (pasiūlymas): ne laukas
- Siūloma užuomina (Code pasiūlymas, nepatvirtinta): Tiekėjo pildoma vieta priedo formoje (data, numeris) - rengėjo neklausti.
- Dabar formoje: klausimo vietoje - pats šablono sakinys; laukai `<input type="text">` su užuomina „reikšmė 1“, „reikšmė 2“... (be pavadinimo); privalomumo nėra.

| ID | Šablonai | Vieta | Pilnas sakinys | Vietų | Dabartinis rodymas | Siūloma reikšmė (kilmė) |
|---|---|---|---|---|---|---|
| V-57 | DPSK_LT_SALYGOS | PARAIŠKA (pastr. DPSK_LT_SALYGOS:470) | ____________ Nr.______ | 2 | rodomas visas | nėra |
| V-58 | DPSK_LT_SALYGOS | SUTIKIMAS BŪTI SUBTIEKĖJU/ŪKIO SUBJEKTU, KURIO PAJĖGUMAIS REMIAMASI (pastr. DPSK_LT_SALYGOS:724) | 202_-__-__ | 3 | rodomas visas | nėra |
| V-59 | DPSK_LT_SALYGOS | SUTIKIMAS BŪTI ĮDARBINTU (pastr. DPSK_LT_SALYGOS:739) | 202_-__-__ | 3 | rodomas visas | nėra |

### dps-konkretaus-pavadinimas (4 šablono variantai)

- Įvesties tipas (pasiūlymas): laisvas tekstas
- Siūlomas klausimas (Code pasiūlymas, nepatvirtinta): „Konkretaus pirkimo pavadinimas“
- Siūloma užuomina (Code pasiūlymas, nepatvirtinta): Gali būti imamas iš 1 žingsnio pirkimo pavadinimo.
- Dabar formoje: klausimo vietoje - pats šablono sakinys; laukai `<input type="text">` su užuomina „reikšmė 1“, „reikšmė 2“... (be pavadinimo); privalomumo nėra.

| ID | Šablonai | Vieta | Pilnas sakinys | Vietų | Dabartinis rodymas | Siūloma reikšmė (kilmė) |
|---|---|---|---|---|---|---|
| V-60 | DPSP_LT_SALYGOS | ĮMONĖS PAVADINIMAS (pastr. DPSP_LT_SALYGOS:10) | KONKRETAUS PIRKIMO „_______________________________________________________________________________“,(pavadinimas), ATLIEKAMO DINAMINĖS PIRKIMO SISTEMOS „110 KV TRANSFORMATORIŲ PASTOTĖS 110 KV SKIRSTYKLOS REKONSTRAVIMO DARBAI“ PAGRINDU, SĄLYGOS | 1 | kerpamas ties 180 simb. (žodžio viduryje): „...KV TRANSFORMATORIŲ PAS“ | nėra |
| V-61 | DPSP_LT_SALYGOS | 1.BENDROSIOS NUOSTATOS (pastr. DPSP_LT_SALYGOS:38) | 1.1 ĮMONĖS PAVADINIMAS (toliau – Perkantysis subjektas) atlieka konkretaus pirkimo „______________________“ (toliau – konkretus pirkimas) procedūras, anksčiau sukurtos dinaminės pirkimų sistemos (toliau – DPS) „110 KV TRANSFORMATORIŲ PASTOTĖS 110 KV SKIRSTYKLOS REKONSTRAVIMO DARBAI“ pagrindu. Skelbimas apie pirkimą, kuriuo sukurta DPS, skelbtas CVP IS 2022-09-23, pirkimo numeris 624995 (nuoroda į skelbimą apie pirkimą: CVP IS (viesiejipirkimai.lt)), (toliau – DPS sukūrimo sąlygos). | 1 | kerpamas ties 180 simb. (žodžio viduryje): „... sukurtos dinaminės pi“ | nėra |
| V-62 | DPSP_LTEN_SALYGOS | ĮMONĖS PAVADINIMAS (pastr. DPSP_LTEN_SALYGOS:3) | KONKRETAUS PIRKIMO „___________________________________________________“,(pavadinimas) | 1 | rodomas visas | nėra |
| V-63 | DPSP_LTEN_SALYGOS | GENERAL PROVISIONS (pastr. DPSP_LTEN_SALYGOS:20) | ĮMONĖS PAVADINIMAS (toliau – Perkantysis subjektas) atlieka konkretaus pirkimo „______________________“ (toliau – konkretus pirkimas) procedūras, anksčiau sukurtos dinaminės pirkimų sistemos (toliau – DPS) „110 KV TRANSFORMATORIŲ PASTOTĖS 110 KV SKIRSTYKLOS REKONSTRAVIMO DARBAI“ pagrindu. Skelbimas apie pirkimą, kuriuo sukurta DPS, skelbtas CVP IS 2022-09-23, pirkimo numeris 624995 (nuoroda į skelbimą apie pirkimą: CVP IS (viesiejipirkimai.lt)), (toliau – DPS sukūrimo sąlygos). | 1 | kerpamas ties 180 simb. (žodžio viduryje): „...urtos dinaminės pirkim“ | nėra (EN laukas prie LT klausimo) |

### dps-galiojimas (2 šablono variantai)

- Įvesties tipas (pasiūlymas): skaičius (kalendorinių dienų)
- Siūlomas klausimas (Code pasiūlymas, nepatvirtinta): „Kiek kalendorinių dienų turi galioti konkretūs pasiūlymai?“
- Dabar formoje: klausimo vietoje - pats šablono sakinys; laukai `<input type="text">` su užuomina „reikšmė 1“, „reikšmė 2“... (be pavadinimo); privalomumo nėra.

| ID | Šablonai | Vieta | Pilnas sakinys | Vietų | Dabartinis rodymas | Siūloma reikšmė (kilmė) |
|---|---|---|---|---|---|---|
| V-64 | DPSP_LT_SALYGOS | 2.PAGRINDINĖ KVIETIMO INFORMACIJA (pastr. DPSP_LT_SALYGOS:49) | 2.2. Konkretūs pasiūlymai turi galioti ne trumpiau kaip [nurodomas kalendorinių dienų arba mėnesių skaičius] kalendorinių dienų. Jei konkrečiame pasiūlyme nenurodytas jo galiojimo terminas, laikoma, kad jis galioja tiek, kiek nustatyta šiame punkte. | 1 | kerpamas ties 180 simb.: „...urodytas jo galiojimo “ | nėra |
| V-65 | DPSP_LTEN_SALYGOS | MAIN INVITATION INFORMATION (pastr. DPSP_LTEN_SALYGOS:51) | Konkretūs pasiūlymai turi galioti ne trumpiau kaip [nurodomas kalendorinių dienų arba mėnesių skaičius] kalendorinių dienų. Jei konkrečiame pasiūlyme nenurodytas jo galiojimo terminas, laikoma, kad jis galioja tiek, kiek nustatyta šiame punkte. | 1 | kerpamas ties 180 simb. (žodžio viduryje): „...tas jo galiojimo termi“ | nėra |

### dps-priedu-nuorodos (2 šablono variantai)

- Įvesties tipas (pasiūlymas): laisvas tekstas (nuorodos į priedus)
- Siūlomas klausimas (Code pasiūlymas, nepatvirtinta): „Kuriuose konkretaus pirkimo sąlygų prieduose aprašytas pirkimo objektas?“
- Dabar formoje: klausimo vietoje - pats šablono sakinys; laukai `<input type="text">` su užuomina „reikšmė 1“, „reikšmė 2“... (be pavadinimo); privalomumo nėra.

| ID | Šablonai | Vieta | Pilnas sakinys | Vietų | Dabartinis rodymas | Siūloma reikšmė (kilmė) |
|---|---|---|---|---|---|---|
| V-66 | DPSP_LT_SALYGOS | 2.PAGRINDINĖ KVIETIMO INFORMACIJA (pastr. DPSP_LT_SALYGOS:50) | 2.3. Šiuo konkrečiu pirkimu siekiamas įsigyti pirkimo objektas, jo savybės, kiekiai (apimtys) yra pateikti šiuose prieduose: [pateikiamos nuorodos į konkretaus pirkimo sąlygų priedus]. | 1 | kerpamas ties 180 simb. (žodžio viduryje): „...s pirkimo sąlygų pried“ | nėra |
| V-67 | DPSP_LTEN_SALYGOS | MAIN INVITATION INFORMATION (pastr. DPSP_LTEN_SALYGOS:54) | Šiuo konkrečiu pirkimu siekiamas įsigyti pirkimo objektas, jo savybės, kiekiai (apimtys) yra pateikti šiuose prieduose: [pateikiamos nuorodos į konkretaus pirkimo sąlygų priedus]. | 1 | rodomas visas | nėra (EN laukas prie LT klausimo) |

### dps-kriterijai (2 šablono variantai)

- Įvesties tipas (pasiūlymas): laisvas tekstas (neprivaloma alternatyva)
- Siūlomas klausimas (Code pasiūlymas, nepatvirtinta): „Ar pasiūlymai vertinami ne tik pagal kainą? Jei taip - įrašykite vertinimo kriterijus ir tvarką.“
- Siūloma užuomina (Code pasiūlymas, nepatvirtinta): Šablone numatytasis tekstas - „pagal kainos kriterijų“; laužtiniuose skliaustuose - alternatyva.
- Dabar formoje: klausimo vietoje - pats šablono sakinys; laukai `<input type="text">` su užuomina „reikšmė 1“, „reikšmė 2“... (be pavadinimo); privalomumo nėra.

| ID | Šablonai | Vieta | Pilnas sakinys | Vietų | Dabartinis rodymas | Siūloma reikšmė (kilmė) |
|---|---|---|---|---|---|---|
| V-68 | DPSP_LT_SALYGOS | 2.PAGRINDINĖ KVIETIMO INFORMACIJA (pastr. DPSP_LT_SALYGOS:52) | 2.5. Perkantysis subjektas ekonomiškai naudingiausią pasiūlymą išrenka pagal kainos kriterijų [arba pateikiama informacija apie pasiūlymų vertinimo kriterijus ir tvarką]. Su Tiekėju, kurio pasiūlymas vadovaujantis šio konkretaus pirkimo sąlygomis bus pripažintas laimėjusiu, bus raštu sudaroma sutartis, kurios sąlygos pateikiamos šio konkretaus pirkimo sąlygų prieduose. | 1 | kerpamas ties 180 simb. (žodžio viduryje): „... ir tvarką]. Su Tiekėj“ | nėra |
| V-69 | DPSP_LTEN_SALYGOS | MAIN INVITATION INFORMATION (pastr. DPSP_LTEN_SALYGOS:60) | Perkantysis subjektas ekonomiškai naudingiausią pasiūlymą išrenka pagal kainos kriterijų [arba pateikiama informacija apie pasiūlymų vertinimo kriterijus ir tvarką]. Su Tiekėju, kurio pasiūlymas vadovaujantis šio konkretaus pirkimo sąlygomis bus pripažintas laimėjusiu, bus raštu sudaroma sutartis, kurios sąlygos pateikiamos šio konkretaus pirkimo sąlygų prieduose. | 1 | kerpamas ties 180 simb. (žodžio viduryje): „...varką]. Su Tiekėju, ku“ | nėra (EN laukas prie LT klausimo) |

### dps-apziura (2 šablono variantai)

- Įvesties tipas (pasiūlymas): data ir laikas (3 vietos: diena, valanda; diena)
- Siūlomas klausimas (Code pasiūlymas, nepatvirtinta): „Objekto apžiūra: iki kada kreiptis ir kada planuojama apžiūra?“
- Dabar formoje: klausimo vietoje - pats šablono sakinys; laukai `<input type="text">` su užuomina „reikšmė 1“, „reikšmė 2“... (be pavadinimo); privalomumo nėra.

| ID | Šablonai | Vieta | Pilnas sakinys | Vietų | Dabartinis rodymas | Siūloma reikšmė (kilmė) |
|---|---|---|---|---|---|---|
| V-70 | DPSP_LT_SALYGOS | 2.PAGRINDINĖ KVIETIMO INFORMACIJA (pastr. DPSP_LT_SALYGOS:54) | 2.6. Perkantysis subjektas suteiks galimybę apžiūrėti pirkimo objektą. Tiekėjai, norintys apžiūrėti objektą, turi iki 2023 m. __________ d. __.00 val. (imtinai) Lietuvos laiku CVP IS susirašinėjimo priemonėmis kreiptis į Perkantįjį subjektą , nurodydami apžiūroje ketinančių dalyvauti asmenų pareigas, vardus ir pavardes bei pageidaujamą preliminarų apžiūros laiką (Perkantysis subjektas turi teisę keisti apžiūros laiką). Perkantysis subjektas, atsakydamas į kiekvieno Tiekėjo tokį prašymą, nurodys kiekvienam Tiekėjui apžiūros laiką. Objekto apžiūrą planuojama vykdyti 2023 m. __________ d. Perkantysis subjektas objekto apžiūros metu neatsakinės į jokius Tiekėjų klausimus dėl pirkimo objekto ar pirkimo dokumentų nuostatų. Kilusius klausimus Tiekėjas turi užduoti pirkimo sąlygų 3 skyriuje „Konkretaus pirkimo sąlygų paaiškinimas ir patikslinimas“ nustatyta tvarka ir terminais. | 3 | kerpamas ties 180 simb.: „...i) Lietuvos laiku CVP “ | nėra |
| V-71 | DPSP_LTEN_SALYGOS | MAIN INVITATION INFORMATION (pastr. DPSP_LTEN_SALYGOS:64) | Perkantysis subjektas suteiks galimybę apžiūrėti pirkimo objektą. Tiekėjai, norintys apžiūrėti objektą, turi iki 2023 m. __________ d. __.00 val. (imtinai) Lietuvos laiku CVP IS susirašinėjimo priemonėmis kreiptis į Perkantįjį subjektą , nurodydami apžiūroje ketinančių dalyvauti asmenų pareigas, vardus ir pavardes bei pageidaujamą preliminarų apžiūros laiką (Perkantysis subjektas turi teisę keisti apžiūros laiką). Perkantysis subjektas, atsakydamas į kiekvieno Tiekėjo tokį prašymą, nurodys kiekvienam Tiekėjui apžiūros laiką. Objekto apžiūrą planuojama vykdyti 2023 m. __________ d. Perkantysis subjektas objekto apžiūros metu neatsakinės į jokius Tiekėjų klausimus dėl pirkimo objekto ar pirkimo dokumentų nuostatų. Kilusius klausimus Tiekėjas turi užduoti pirkimo sąlygų 3 skyriuje „Konkretaus pirkimo sąlygų paaiškinimas ir patikslinimas“ nustatyta tvarka ir terminais. | 3 | kerpamas ties 180 simb. (žodžio viduryje): „...etuvos laiku CVP IS su“ | nėra (EN laukas prie LT klausimo) |

### dps-kiti-dokumentai (1 šablono variantai)

- Įvesties tipas (pasiūlymas): laisvas tekstas
- Siūlomas klausimas (Code pasiūlymas, nepatvirtinta): „Kokie kiti dokumentai teikiami su konkrečiu pasiūlymu?“
- Dabar formoje: klausimo vietoje - pats šablono sakinys; laukai `<input type="text">` su užuomina „reikšmė 1“, „reikšmė 2“... (be pavadinimo); privalomumo nėra.

| ID | Šablonai | Vieta | Pilnas sakinys | Vietų | Dabartinis rodymas | Siūloma reikšmė (kilmė) |
|---|---|---|---|---|---|---|
| V-72 | DPSP_LTEN_SALYGOS, DPSP_LT_SALYGOS | MAIN INVITATION INFORMATION; 2.PAGRINDINĖ KVIETIMO INFORMACIJA (pastr. DPSP_LTEN_SALYGOS:89, DPSP_LT_SALYGOS:62) | kiti dokumentai [kartu su konkrečiu pasiūlymu turi būti pateikti atitiktį techninei specifikacijai įrodantys dokumentai, taip pat nurodoma informacija apie tai, kokius papildomus dokumentus, patvirtinančius atitiktį nustatytiems reikalavimams dėl pašalinimo pagrindų ir kvalifikacijos turi pateikti tiekėjai (jei reikia), ir kita informacija]. | 1 | kerpamas ties 180 simb. (žodžio viduryje): „...i, kokius papildomus d“ | nėra |

### url-klaida (1 šablono variantai)

- Įvesties tipas (pasiūlymas): ne laukas
- Siūloma užuomina (Code pasiūlymas, nepatvirtinta): Tai ne pildoma vieta: pabraukimo ženklai yra interneto adreso dalis (draudeju_viesi_duomenys). Lauko neturi būti.
- Dabar formoje: klausimo vietoje - pats šablono sakinys; laukai `<input type="text">` su užuomina „reikšmė 1“, „reikšmė 2“... (be pavadinimo); privalomumo nėra.

| ID | Šablonai | Vieta | Pilnas sakinys | Vietų | Dabartinis rodymas | Siūloma reikšmė (kilmė) |
|---|---|---|---|---|---|---|
| V-73 | AKV_LT_SPS | TIEKĖJŲ PAŠALINIMO PAGRINDAI IR KVALIFIKACIJOS REIKALAVIMAI (pastr. AKV_LT_SPS:137) | 2.1) Jeigu tiekėjas yra juridinis asmuo, registruotas Lietuvos Respublikoje, iš jo nereikalaujama pateikti jokių šį reikalavimą įrodančių dokumentų. Pirkimo vykdytojas savarankiškai patikrina duomenis nacionalinėje duomenų bazėje,  adresu http://draudejai.sodra.lt/draudeju_viesi_duomenys/. | 2 | kerpamas ties 180 simb. (žodžio viduryje): „...ykdytojas savarankiška“ | nėra |

## 4. Formuluotės (30)

Dabar: pasirinkimo mygtukai (šablono variantai) ir laukas „Kita formuluotė“ su užuomina „jūsų tekstas (tuščia = spręsiu Word'e)“. Numatytosios reikšmės parenkamos iš 1 žingsnio ar kode ir rodomos kaip jau pasirinktos.

| ID | Šablonai | Vieta | Pilnas sakinys | Variantai | Numatyta dabar (kilmė) | Palikus tuščią |
|---|---|---|---|---|---|---|
| F-01 | AKV_LT_SPS, AK_LTEN_SPS, AK_LT_SPS, MVP_LTEN_SPS, MVP_LT_SPS, ND_LTEN_SPS, ND_LT_SPS, SSD_LTEN_SPS, SSD_LT_SPS, TSD_LTEN_SPS, TSD_LT_SPS | BENDROSIOS NUOSTATOS; GENERAL PROVISIONS (pastr. AKV_LT_SPS:25, AK_LTEN_SPS:52, AK_LT_SPS:31...) | Sprendimo neatlikti pirkimo naudojantis centralizuotų pirkimų katalogu pagrindimas: ______________ | „Atitinkamos prekės (paslaugos, darbai) CPO LT kataloge nesiūlomos.“ | nėra | lieka „___“ arba „[nurodymas]“; patikra rodo |
| F-02 | AKV_LT_SPS, AK_LTEN_SPS, AK_LT_SPS, DPSK_LTEN_KVALIFIKACIJA, MVP_LTEN_SPS, MVP_LT_SPS, SSD_LTEN_SPS, SSD_LT_SPS, TSD_LTEN_SPS, TSD_LT_SPS | REIKALAVIMAI ŽALIESIEMS PIRKIMAMS; REIKALAVIMAI ŽALIESIEMS PIRKIMAMS / REQUIREMENTS FOR ENVIRONMENTAL PROCUREMENTS (pastr. AKV_LT_SPS:376, AK_LTEN_SPS:670, AK_LT_SPS:349...) | [suformuluoti atitikimo taisyklę] | „a) Jei Pasiūlymą pateikia Tiekėjų grupė – reikalavimą turi atitikti bent vienas Tiekėjų gr“; „Žaliuosius reikalavimus pagal SPS 3 lentelės reikalavimą turi atitikti Tiekėjas arba bent“; „Reikalavimą turi atitikti Tiekėjas. Jei pasiūlymą teikia ūkio subjektų grupė - kiekvienas“; „Reikalavimą turi atitikti Tiekėjas ir visi Sutarčiai vykdyti pasitelkiami ūkio subjektai (“ | nėra | lieka „___“ arba „[nurodymas]“; patikra rodo |
| F-03 | MVP_LTEN_SPS, MVP_LT_SPS, ND_LTEN_SPS, ND_LT_SPS, SSD_LTEN_SPS, SSD_LT_SPS | GENERAL PROVISIONS; BENDROSIOS NUOSTATOS (pastr. MVP_LTEN_SPS:16, MVP_LT_SPS:8, ND_LTEN_SPS:16...) | Pirkimas vykdomas Pasirinkti. Bet kokia informacija, Pirkimo sąlygų paaiškinimai, pranešimai ar kitas Perkančiojo subjekto ir Tiekėjų susirašinėjimas vykdomas tik šiomis priemonėmis. | „CVP IS priemonėmis“; „elektroniniu paštu“ | „CVP IS priemonėmis“ - įrašyta kode | raudonas šablono nurodymas lieka raudonas; patikra rodo |
| F-04 | AKV_LT_SPS, AK_LTEN_SPS, AK_LT_SPS, MVP_LTEN_SPS, MVP_LT_SPS, ND_LTEN_SPS, ND_LT_SPS, SSD_LTEN_SPS, SSD_LT_SPS, TSD_LTEN_SPS, TSD_LT_SPS | GROUNDS FOR EXCLUSION AND QUALIFICATION REQUIREMENTS; TIEKĖJŲ PAŠALINIMO PAGRINDŲ NEBUVIMO IR KVALIFIKACIJOS REIKALAVIMAI (pastr. AKV_LT_SPS:311, AK_LTEN_SPS:506, AK_LT_SPS:277...) | Pirkimo procedūros metu kvalifikacija dėl teisės .. [įrašyti] netikrinama, tačiau Tiekėjas  įsipareigoja, kad pirkimo sutartį vykdys tik tokią teisę turintys asmenys. Atitinkami reikalavimai nurodyti Techninėje specifikacijoje. | - | „Netaikyti“ - punktas išbraukiamas - įrašyta kode (`TEKSTO_SPEC`, PP-SALYGOS.html:993) | raudonas šablono nurodymas lieka raudonas; patikra rodo; „Netaikyti“ - punktas trinamas |
| F-05 | MVP_LTEN_SPS | GENERAL PROVISIONS (pastr. MVP_LTEN_SPS:17) | The procurement is carried out Choose. [by means of CPP IS / by e-mail]. Any information, explanations of the Procurement Conditions, notices or other correspondence between the Contracting Entity and the Suppliers shall be carried out only by these means. | „by means of CPP IS“; „by e-mail“ | „by means of CPP IS“ - įrašyta kode | raudonas šablono nurodymas lieka raudonas; patikra rodo |
| F-06 | AK_LTEN_SPS, MVP_LTEN_SPS, ND_LTEN_SPS, SSD_LTEN_SPS, TSD_LTEN_SPS | GROUNDS FOR EXCLUSION AND QUALIFICATION REQUIREMENTS; GROUNDS FOR EXCLUSION AND QUALIFICATION  REQUIREMENTS (pastr. AK_LTEN_SPS:507, MVP_LTEN_SPS:198, ND_LTEN_SPS:488...) | During the procurement procedure, qualification regarding the right to … [įrašyti] is not verified; however, the Supplier undertakes to ensure that the procurement contract will be performed only by persons holding such right. The relevant requirements are specified in the Technical Specification. | - | „Netaikyti“ - punktas išbraukiamas - įrašyta kode (`TEKSTO_SPEC`, PP-SALYGOS.html:993) | raudonas šablono nurodymas lieka raudonas; patikra rodo; „Netaikyti“ - punktas trinamas |
| F-07 | AK_LT_SPS | BENDROSIOS NUOSTATOS (pastr. AK_LT_SPS:29) | Vykdomas [Pasirinkite]. | „Tarptautinis pirkimas.“; „Supaprastintas pirkimas, kurio vertė viršija mažos vertės pirkimų ribą.“ | „Supaprastintas pirkimas, kurio vertė viršija mažos vertės pirkimų ribą.“ - pagal 1 žingsnį | lieka „___“ arba „[nurodymas]“; patikra rodo |
| F-08 | AK_LTEN_SPS | GENERAL PROVISIONS (pastr. AK_LTEN_SPS:46) | Vykdomas [Pasirinkite]. | „Tarptautinis pirkimas.“; „Supaprastintas pirkimas, kurio vertė viršija mažos vertės pirkimų ribą.“ | „Supaprastintas pirkimas, kurio vertė viršija mažos vertės pirkimų ribą.“ - pagal 1 žingsnį | raudonas šablono nurodymas lieka raudonas; patikra rodo |
| F-09 | ND_LTEN_SPS, ND_LT_SPS, SSD_LTEN_SPS, SSD_LT_SPS, TSD_LTEN_SPS, TSD_LT_SPS | OBJECT OF PROCUREMENT; PIRKIMO OBJEKTAS (pastr. ND_LTEN_SPS:105, ND_LT_SPS:39, SSD_LTEN_SPS:123...) | Perkančiojo subjekto nustatyti minimalūs reikalavimai Pirkimo objektui yra šie: [jei deramasi tik dėl kainos, rašome: Techninėje specifikacijoje ir  Sutarties projekte nustatyti reikalavimai] | „Techninėje specifikacijoje ir Sutarties projekte nustatyti reikalavimai“ | „Techninėje specifikacijoje ir Sutarties projekte nustatyti reikalavimai“ - pagal 1 žingsnį | raudonas šablono nurodymas lieka raudonas; patikra rodo |
| F-10 | ND_LTEN_SPS, ND_LT_SPS, SSD_LTEN_SPS, SSD_LT_SPS, TSD_LTEN_SPS | OBJECT OF PROCUREMENT; PIRKIMO OBJEKTAS (pastr. ND_LTEN_SPS:108, ND_LT_SPS:40, SSD_LTEN_SPS:126...) | Perkantysis subjektas derėsis dėl šių sąlygų: [jei deramasi tik dėl kainos, kitų Pasiūlymo sąlygų, rašome: Pasiūlymo kainos, kitų Pasiūlymo sąlygų] | „Pasiūlymo kainos“; „Pasiūlymo kainos, kitų pasiūlymo sąlygų“ | „Pasiūlymo kainos“ - pagal 1 žingsnį | raudonas šablono nurodymas lieka raudonas; patikra rodo |
| F-11 | ND_LTEN_SPS | GENERAL PROVISIONS (pastr. ND_LTEN_SPS:13) | Vykdomas Pasirinkti. | „Tarptautinis pirkimas.“; „Supaprastintas pirkimas, kurio vertė viršija mažos vertės pirkimų ribą.“ | „Supaprastintas pirkimas, kurio vertė viršija mažos vertės pirkimų ribą.“ - pagal 1 žingsnį | raudonas šablono nurodymas lieka raudonas; patikra rodo |
| F-12 | ND_LTEN_SPS | GENERAL PROVISIONS (pastr. ND_LTEN_SPS:14) | Pasirinkti is being carried out. | „International Procurement“; „Simplified Procurement with a value above the low value procurement threshold“ | „Simplified Procurement with a value above the low value procurement threshold“ - pagal 1 žingsnį | raudonas šablono nurodymas lieka raudonas; patikra rodo |
| F-13 | TSD_LT_SPS | PIRKIMO OBJEKTAS (pastr. TSD_LT_SPS:59) | Perkantysis subjektas derėsis dėl šių sąlygų: [jei deramasi tik dėl kainos ir kitų pasiūlymo sąlygų, rašome: Pasiūlymo kainos, kitų pasiūlymo sąlygų] | „Pasiūlymo kainos“; „Pasiūlymo kainos, kitų pasiūlymo sąlygų“ | „Pasiūlymo kainos“ - pagal 1 žingsnį | raudonas šablono nurodymas lieka raudonas; patikra rodo |
| F-14 | DPSK_LT_SALYGOS | 2.BENDROSIOS NUOSTATOS (pastr. DPSK_LT_SALYGOS:107) | 2.15. DPS sukūrimui taikomi aplinkos apsaugos kriterijai nustatyti [įrašomas dokumento pavadinimas arba nurodomas šių pirkimo sąlygų priedas, kuriame (kuriuose) yra nustatyti pirkime taikomi aplinkos apsaugos kriterijai]. Jei pirkimo vykdytojas konkretaus pirkimo metu nustatys kitus privalomus ir (ar) papildomus aplinkos apsaugos kriterijus vadovaujantis Tvarkos aprašo nuostatomis, šiuos kriterijus jis nurodys konkretaus pirkimo sąlygose. | - | nėra | raudonas šablono nurodymas lieka raudonas; patikra rodo |
| F-15 | DPSK_LT_SALYGOS | 2.BENDROSIOS NUOSTATOS (pastr. DPSK_LT_SALYGOS:111) | 2.15. DPS sukūrimui netaikomi aplinkos apsaugos kriterijai, kadangi šiam Pirkimui taikoma išimtis, kada gali būti nevykdomas žaliasis pirkimas: [įrašykite]. | - | nėra | raudonas šablono nurodymas lieka raudonas; patikra rodo |
| F-16 | DPSK_LT_SALYGOS | 3.PIRKIMO OBJEKTAS, JO APIMTIS (pastr. DPSK_LT_SALYGOS:113) | 3.1. Perkantysis subjektas numato įsigyti [įrašykite žinomą informaciją apie ketinamą įsigyti pirkimo objektą: perkamų prekių, paslaugų ar darbų pobūdis, trumpas apibūdinimas, kategorijų skaičius ir aprašymas.] | - | nėra | raudonas šablono nurodymas lieka raudonas; patikra rodo |
| F-17 | DPSK_LT_SALYGOS | 3.PIRKIMO OBJEKTAS, JO APIMTIS (pastr. DPSK_LT_SALYGOS:119) | 3.3. DPS skirstomas į [įrašykite kategorijų skaičių] kategorijas (-ą), kurių dalykas, numatytas šių pirkimo sąlygų 3.1 punkte. | - | nėra | raudonas šablono nurodymas lieka raudonas; patikra rodo |
| F-18 | DPSK_LT_SALYGOS | 3.PIRKIMO OBJEKTAS, JO APIMTIS (pastr. DPSK_LT_SALYGOS:122) | 3.4. DPS galioja nuo X [nurodyti datą, nuo kurios galioja DPS] (arba nuo DPS sukūrimo datos, jei DPS sukurta vėliau nei ši data) iki X [nurodyti datą, iki kurios galioja DPS]. | - | nėra | raudonas šablono nurodymas lieka raudonas; patikra rodo |
| F-19 | DPSK_LT_SALYGOS | 3.PIRKIMO OBJEKTAS, JO APIMTIS (pastr. DPSK_LT_SALYGOS:127) | 3.5. DPS maksimali numatoma apimtis: [nurodyti apimtį verte be PVM]. | - | nėra | raudonas šablono nurodymas lieka raudonas; patikra rodo |
| F-20 | DPSK_LT_SALYGOS | 3.PIRKIMO OBJEKTAS, JO APIMTIS (pastr. DPSK_LT_SALYGOS:129) | 3.5. DPS kategorijos [nurodyti konkrečią (-ias) DPS kategoriją (-as)] maksimali numatoma apimtis [nurodyti apimtį verte be PVM]. | - | nėra | raudonas šablono nurodymas lieka raudonas; patikra rodo |
| F-21 | DPSK_LTEN_SALYGOS | GENERAL PROVISIONS (pastr. DPSK_LTEN_SALYGOS:190) | DPS sukūrimui taikomi aplinkos apsaugos kriterijai nustatyti [įrašomas dokumento pavadinimas arba nurodomas šių pirkimo sąlygų priedas, kuriame (kuriuose) yra nustatyti pirkime taikomi aplinkos apsaugos kriterijai]. Jei pirkimo vykdytojas konkretaus pirkimo metu nustatys kitus privalomus ir (ar) papildomus aplinkos apsaugos kriterijus vadovaujantis Lietuvos Respublikos aplinkos ministro 2011 m. birželio 28 d. įsakymu Nr. D1-508 „Dėl Aplinkos apsaugos kriterijų taikymo, vykdant žaliuosius pirkimus, tvarkos aprašo patvirtinimo“ nuostatomis, šiuos kriterijus jis nurodys konkretaus pirkimo sąlygose. | - | nėra | raudonas šablono nurodymas lieka raudonas; patikra rodo |
| F-22 | DPSK_LTEN_SALYGOS | GENERAL PROVISIONS (pastr. DPSK_LTEN_SALYGOS:198) | DPS sukūrimui netaikomi aplinkos apsaugos kriterijai, kadangi šiam Pirkimui taikoma išimtis, kada gali būti nevykdomas žaliasis pirkimas: [įrašykite]. | - | nėra | raudonas šablono nurodymas lieka raudonas; patikra rodo |
| F-23 | DPSK_LTEN_SALYGOS | OBJECT OF PROCUREMENT AND ITS SCOPE (pastr. DPSK_LTEN_SALYGOS:205) | Perkantysis subjektas numato įsigyti [įrašykite žinomą informaciją apie ketinamą įsigyti pirkimo objektą: perkamų prekių, paslaugų ar darbų pobūdis, trumpas apibūdinimas, kategorijų skaičius ir aprašymas.] | - | nėra | raudonas šablono nurodymas lieka raudonas; patikra rodo |
| F-24 | DPSK_LTEN_SALYGOS | OBJECT OF PROCUREMENT AND ITS SCOPE (pastr. DPSK_LTEN_SALYGOS:216) | DPS skirstomas į [įrašykite kategorijų skaičių] kategorijas (-ą), kurių dalykas, numatytas šių pirkimo sąlygų 3.1 punkte. | - | nėra | raudonas šablono nurodymas lieka raudonas; patikra rodo |
| F-25 | DPSK_LTEN_SALYGOS | OBJECT OF PROCUREMENT AND ITS SCOPE (pastr. DPSK_LTEN_SALYGOS:220) | DPS galioja nuo X [nurodyti datą, nuo kurios galioja DPS] (arba nuo DPS sukūrimo datos, jei DPS sukurta vėliau nei ši data) iki X [nurodyti datą, iki kurios galioja DPS]. | - | nėra | raudonas šablono nurodymas lieka raudonas; patikra rodo |
| F-26 | DPSK_LTEN_SALYGOS | OBJECT OF PROCUREMENT AND ITS SCOPE (pastr. DPSK_LTEN_SALYGOS:228) | DPS maksimali numatoma apimtis: [nurodyti apimtį verte be PVM]. | - | nėra | raudonas šablono nurodymas lieka raudonas; patikra rodo |
| F-27 | DPSK_LTEN_SALYGOS | OBJECT OF PROCUREMENT AND ITS SCOPE (pastr. DPSK_LTEN_SALYGOS:232) | DPS kategorijos [nurodyti konkrečią (-ias) DPS kategoriją (-as)] maksimali numatoma apimtis [nurodyti apimtį verte be PVM]. | - | nėra | raudonas šablono nurodymas lieka raudonas; patikra rodo |
| F-28 | DPSK_LTEN_SALYGOS | OBJECT OF PROCUREMENT AND ITS SCOPE (pastr. DPSK_LTEN_SALYGOS:233) | Maximum estimated value for DPS categories [insert specific category name(s)]: [insert value excluding VAT]. | - | nėra | raudonas šablono nurodymas lieka raudonas; patikra rodo |
| F-29 | AKV_LT_SPS | BENDROSIOS NUOSTATOS (pastr. AKV_LT_SPS:22) | Vykdomas [Pasirinkite]. Įgaliojusiosios organizacijos Pirkimo vykdymui: (nurodyti UAB „EPSO-G“ įmonių grupės įmones, kurios įgaliojo vykdyti šį Pirkimą, taip pat - ar Pirkimo vykdytojas perka sau). | „Tarptautinis pirkimas.“; „Supaprastintas pirkimas, kurio vertė viršija mažos vertės pirkimų ribą.“ | „Supaprastintas pirkimas, kurio vertė viršija mažos vertės pirkimų ribą.“ - pagal 1 žingsnį | lieka „___“ arba „[nurodymas]“; patikra rodo |
| F-30 | AKV_LT_SPS | PIRKIMO OBJEKTAS (pastr. AKV_LT_SPS:43) | Pirkimo objektas į Pirkimo objekto dalis neskaidomas vadovaujantis VPĮ 28 straipsnio 2 dalimi, nes (įrašyti priežastis, kodėl neskaidoma – tik tarptautinio pirkimo atveju). | - | nėra | raudonas šablono nurodymas lieka raudonas; patikra rodo |

## 5. Raudonos pastabos su „Palikti / Ištrinti / Spręsiu Word'e“ (47)

Numatyta visoms - „Palikti (juodai)“ (`dflt('N_' + r, 'palikti')`, PP-SALYGOS.html:1856). Po klausimu rodoma „Dokumente toliau: ...“ - iki 2 tolesnių pastraipų, kiekviena kerpama ties 140 simbolių.

| ID | Šablonai | Vieta | Pilnas tekstas | Dabartinis rodymas |
|---|---|---|---|---|
| P-01 | MVP_LTEN_SPS, MVP_LT_SPS | OBJECT OF PROCUREMENT; PIRKIMO OBJEKTAS (pastr. MVP_LTEN_SPS:95, MVP_LT_SPS:43) | Perkantysis subjektas nenumato rengti susitikimų su Tiekėjais dėl Pirkimo dokumentų paaiškinimų. | rodomas visas |
| P-02 | MVP_LTEN_SPS, MVP_LT_SPS, ND_LTEN_SPS, ND_LT_SPS | REQUIREMENTS FOR SUBMISSION OF TENDERS; REIKALAVIMAI PASIŪLYMŲ PATEIKIMUI (pastr. MVP_LTEN_SPS:592, MVP_LT_SPS:289, ND_LTEN_SPS:898...) | Užpildytą pasiūlymų dėl derėtinų sąlygų formą (SPS priedą Nr. X). | rodomas visas |
| P-03 | MVP_LT_SPS | REIKALAVIMAI PASIŪLYMŲ PATEIKIMUI (pastr. MVP_LT_SPS:291) | 5.3. Kvietimai teikti Galutinius pasiūlymus Tiekėjams bus atsiųsti po Derybų atskiru pranešimu priemonėmis, kuriomis vykdomas Pirkimas. | rodomas visas |
| P-04 | MVP_LT_SPS | REIKALAVIMAI PASIŪLYMŲ PATEIKIMUI (pastr. MVP_LT_SPS:292) | 5.4. Galutiniame pasiūlyme Tiekėjas turi pateikti: | rodomas visas |
| P-05 | MVP_LT_SPS | REIKALAVIMAI PASIŪLYMŲ PATEIKIMUI (pastr. MVP_LT_SPS:293) | 5.4.1. Užpildytą ir saugiu elektroniniu ar fiziniu parašu pasirašytą Pasiūlymo formą; | rodomas visas |
| P-06 | MVP_LT_SPS | REIKALAVIMAI PASIŪLYMŲ PATEIKIMUI (pastr. MVP_LT_SPS:294) | 5.4.2.Jei Pasiūlymą elektroniniu ar fiziniu parašu pasirašo Tiekėjo vadovo įgaliotas asmuo, prie Pasiūlymo turi būti pridėtas galiojantis rašytinis įgaliojimas arba kitas dokumentas, suteikiantis teisę pasirašyti Pasiūlymą; | kerpamas ties 160 simb.: „...rašytinis įgaliojimas “ |
| P-07 | MVP_LT_SPS | REIKALAVIMAI PASIŪLYMŲ PATEIKIMUI (pastr. MVP_LT_SPS:295) | 5.4.3.Trūkstama informacija, dokumentai, ar patikslinimai, nustatyti Perkančiojo subjekto išnagrinėtame Pirminiame pasiūlyme. | rodomas visas |
| P-08 | MVP_LT_SPS | REIKALAVIMAI PASIŪLYMŲ PATEIKIMUI (pastr. MVP_LT_SPS:296) | 5.4.4. Derybų protokole nurodyti dokumentai. | rodomas visas |
| P-09 | AK_LTEN_SPS, MVP_LTEN_SPS, ND_LTEN_SPS, SSD_LTEN_SPS, TSD_LTEN_SPS | OBJECT OF PROCUREMENT (pastr. AK_LTEN_SPS:111, MVP_LTEN_SPS:67, ND_LTEN_SPS:99...) | Perkantysis subjektas neriboja maksimalaus Pirkimo objekto dalių skaičiaus, dėl kurių laimėtoju gali būti nustatomas tas pats Tiekėjas. | rodomas visas |
| P-10 | AK_LTEN_SPS, MVP_LTEN_SPS, ND_LTEN_SPS, SSD_LTEN_SPS, TSD_LTEN_SPS | OBJECT OF PROCUREMENT (pastr. AK_LTEN_SPS:114, MVP_LTEN_SPS:70, ND_LTEN_SPS:102...) | Perkantysis subjektas sudarys atskirą Sutartį kiekvienai Pirkimo objekto daliai, nepaisant to, kad pagal Pirkimo sąlygas laimėtoju gali būti nustatomas tas pats Tiekėjas. | kerpamas ties 160 simb.: „...ti nustatomas tas pats“ |
| P-11 | MVP_LTEN_SPS | REQUIREMENTS FOR SUBMISSION OF TENDERS (pastr. MVP_LTEN_SPS:598) | Kvietimai teikti Galutinius pasiūlymus Tiekėjams bus atsiųsti po Derybų atskiru pranešimu priemonėmis, kuriomis vykdomas Pirkimas. | rodomas visas |
| P-12 | MVP_LTEN_SPS, SSD_LTEN_SPS, TSD_LTEN_SPS | REQUIREMENTS FOR SUBMISSION OF TENDERS (pastr. MVP_LTEN_SPS:601, SSD_LTEN_SPS:1042, TSD_LTEN_SPS:1101) | Galutiniame pasiūlyme Tiekėjas turi pateikti: | rodomas visas |
| P-13 | MVP_LTEN_SPS | REQUIREMENTS FOR SUBMISSION OF TENDERS (pastr. MVP_LTEN_SPS:604) | Užpildytą ir saugiu elektroniniu ar fiziniu parašu pasirašytą Galutinio Pasiūlymo formą; | rodomas visas |
| P-14 | MVP_LTEN_SPS | REQUIREMENTS FOR SUBMISSION OF TENDERS (pastr. MVP_LTEN_SPS:613) | Derybų protokole nurodyti dokumentai. | rodomas visas |
| P-15 | AK_LT_SPS | PIRKIMO OBJEKTAS (pastr. AK_LT_SPS:65) | Perkantysis subjektas nenumato rengti susitikimų su Tiekėjais dėl Pirkimo sąlygų paaiškinimų. | rodomas visas |
| P-16 | SSD_LT_SPS | REIKALAVIMAI PASIŪLYMŲ PATEIKIMUI (pastr. SSD_LT_SPS:505) | 7.4. Galutiniame pasiūlyme Tiekėjas turi pateikti: | rodomas visas |
| P-17 | SSD_LT_SPS | REIKALAVIMAI PASIŪLYMŲ PATEIKIMUI (pastr. SSD_LT_SPS:509) | 7.4.4. Derybų protokole nurodytus dokumentus. | rodomas visas |
| P-18 | SSD_LT_SPS | REIKALAVIMAI PASIŪLYMŲ PATEIKIMUI (pastr. SSD_LT_SPS:510) | 7.4.5. Pasiūlymo galiojimo užtikrinimą (originalą). | rodomas visas |
| P-19 | SSD_LTEN_SPS | REQUIREMENTS FOR SUBMISSION OF TENDERS (pastr. SSD_LTEN_SPS:1033) | Užpildytą pasiūlymų deryboms formą (SPS priedą Nr. X) | rodomas visas |
| P-20 | ND_LTEN_SPS, SSD_LTEN_SPS, TSD_LTEN_SPS | REQUIREMENTS FOR SUBMISSION OF TENDERS (pastr. ND_LTEN_SPS:922, SSD_LTEN_SPS:1054, TSD_LTEN_SPS:1113) | Derybų protokole nurodytus dokumentus. | rodomas visas |
| P-21 | SSD_LTEN_SPS | REQUIREMENTS FOR SUBMISSION OF TENDERS (pastr. SSD_LTEN_SPS:1057) | Pasiūlymo galiojimo užtikrinimą (originalą). | rodomas visas |
| P-22 | ND_LT_SPS | BENDROSIOS NUOSTATOS (pastr. ND_LT_SPS:9) | Žemiau esančios 1.5. Ir 1.6. sąlygos atitinkamai taikomos, kai pirkimas atliekamas pagal PĮ 80 str. 2 d. | rodomas visas |
| P-23 | ND_LT_SPS | BENDROSIOS NUOSTATOS (pastr. ND_LT_SPS:13) | Pasirinkt vieną iš punktų, kai Pirkimas neatliekamas pagal PĮ 80 str. 2 d. (o jeigu atliekamas pagal PĮ 80 str. 2 d. ištrinti abu): | rodomas visas |
| P-24 | ND_LTEN_SPS, ND_LT_SPS | REQUIREMENTS FOR SUBMISSION OF TENDERS; REIKALAVIMAI PASIŪLYMŲ PATEIKIMUI (pastr. ND_LTEN_SPS:901, ND_LT_SPS:442) | Tiekėjo, kiekvieno Tiekėjų grupės nario, kiekvieno Ūkio subjekto, kurio pajėgumais remiamasi ir kiekvieno Subtiekėjo užpildytus SPS x priedą „Sandorio šalies ir (ar) subtiekėjo duomenų forma“. | kerpamas ties 160 simb.: „...dą „Sandorio šalies ir“ |
| P-25 | ND_LT_SPS | REIKALAVIMAI PASIŪLYMŲ PATEIKIMUI (pastr. ND_LT_SPS:446) | 5.4. Galutiniame pasiūlyme, jeigu bus jo prašoma pateikti, Tiekėjas turi pateikti: | rodomas visas |
| P-26 | ND_LT_SPS | REIKALAVIMAI PASIŪLYMŲ PATEIKIMUI (pastr. ND_LT_SPS:450) | 5.4.4. Derybų protokole nurodytus dokumentus. | rodomas visas |
| P-27 | ND_LTEN_SPS | GENERAL PROVISIONS (pastr. ND_LTEN_SPS:22) | Žemiau pateiktos 1.5. ir 1.6. sąlygos taikomos, kai pirkimas atliekamas pagal PĮ 80 str. 2 d., kitu atveju trinti. | rodomas visas |
| P-28 | ND_LTEN_SPS | GENERAL PROVISIONS (pastr. ND_LTEN_SPS:38, ND_LTEN_SPS:40) | Pasirinkt vieną iš punktų, kai Pirkimas neatliekamas pagal PĮ 80 str. 2 d. (jeigu vykdomas pagal PĮ 80 str. 2 d. abu ištrinti): | rodomas visas |
| P-29 | ND_LTEN_SPS | REQUIREMENTS FOR SUBMISSION OF TENDERS (pastr. ND_LTEN_SPS:910) | Galutiniame pasiūlyme, jeigu bus jo prašoma pateikti,  Tiekėjas turi pateikti: | rodomas visas |
| P-30 | TSD_LT_SPS | REIKALAVIMAI PASIŪLYMŲ PATEIKIMUI (pastr. TSD_LT_SPS:546) | 9.4. Galutiniame pasiūlyme Tiekėjas turi pateikti: | rodomas visas |
| P-31 | TSD_LT_SPS | REIKALAVIMAI PASIŪLYMŲ PATEIKIMUI (pastr. TSD_LT_SPS:550) | 9.4.4. Derybų protokole nurodytus dokumentus. | rodomas visas |
| P-32 | TSD_LTEN_SPS | ANNEXES (pastr. TSD_LTEN_SPS:1275) | Annex 8 – Confidential information (only the potential successful Tenderer will be asked to submit). | rodomas visas |
| P-33 | DPSK_LT_SALYGOS | 5.PARAIŠKŲ TEIKIMAS (pastr. DPSK_LT_SALYGOS:155) | 5.5.7. deklaracija (-os) dėl atitikties nacionalinio saugumo reikalavimams, kaip numatyta šių sąlygų 8 skyriuje. | rodomas visas |
| P-34 | DPSK_LT_SALYGOS | 8. TIEKĖJŲ PAŠALINIMO PAGRINDAI (pastr. DPSK_LT_SALYGOS:192) | 8.2.Pirkimo vykdytojas tiekėją pašalina iš pirkimo procedūros, jeigu paaiškėja, kad dėl savo veiksmų ar neveikimo prieš tokią pirkimo procedūrą ar jos metu tiekėjas atitinka bent vieną iš šių sąlygų 1 priede „Tiekėjų pašalinimo pagrindai“ nustatytų tiekėjo pašalinimo pagrindų. | kerpamas ties 160 simb. (žodžio viduryje): „...edūrą ar jos metu tiek“ |
| P-35 | DPSK_LT_SALYGOS | 8. TIEKĖJŲ PAŠALINIMO PAGRINDAI (pastr. DPSK_LT_SALYGOS:193) | 8.3.Pirkimo vykdytojas pašalina tiekėją iš pirkimo procedūros pagal VPĮ 46 straipsnio 4 ir 6 dalyse nurodytus ir šių sąlygų 1 priede „Tiekėjų pašalinimo pagrindai“ ir tuo atveju, kai jis turi įtikinamų duomenų, kad tiekėjas yra įsteigtas arba dalyvauja pirkime vietoj kito asmens, siekiant išvengti VPĮ 46 straipsnio 4 ir 6 dalyse nurodytų pašalinimo pagrindų taikymo. | kerpamas ties 160 simb. (žodžio viduryje): „...ėjų pašalinimo pagrind“ |
| P-36 | DPSK_LT_SALYGOS | 8. TIEKĖJŲ PAŠALINIMO PAGRINDAI (pastr. DPSK_LT_SALYGOS:194) | 8.4.Pirkimo vykdytojas taip pat patikrina, ar dėl ūkio subjektų, kurių pajėgumais ketina remtis tiekėjas, nėra šių sąlygų 1 priede „Tiekėjų pašalinimo pagrindai“  nustatytų pašalinimo pagrindų. Jeigu dėl ūkio subjekto yra bent vienas pašalinimo pagrindas,  pirkimo vykdytojas reikalaus per jo nustatytą terminą pakeisti jį kitu ūkio subjektu, dėl kurio nėra pašalinimo pagrindų.  Šio punkto nuostatos taikomos ir subtiekėjams, jeigu šių sąlygų 1 priede „Tiekėjų pašalinimo pagrindai“ nustatyta, kad pašalinimo pagrindai taikomi ir jiems. | kerpamas ties 160 simb.: „...ų pašalinimo pagrindai“ |
| P-37 | DPSK_LT_SALYGOS | 8. TIEKĖJŲ PAŠALINIMO PAGRINDAI (pastr. DPSK_LT_SALYGOS:195) | 8.5.Nepaisant 8.2. ir 8.3. punktų nuostatų, tiekėjas iš pirkimo nepašalinamas VPĮ 46 straipsnio 3 ir 10  dalyse nustatytais atvejais (atsižvelgiant į VPĮ 46 straipsnio 11 ir 12 dalių nuostatas), taip pat jeigu pagal VPĮ 46 straipsnio 8 dalį vertindamas tiekėjo patikimumą pirkimo vykdytojas priėmė sprendimą, kad tiekėjo pašalinimas iš pirkimo procedūros būtų neproporcingas vertinamam tiekėjo elgesiui pirkimo vykdytojas priėmė sprendimą, kad esant nustatytam pašalinimo pagrindui pagal VPĮ 46 straipsnio 4 dalies 7 punkto c papunktį būtų reikšmingai apribota konkurencija. Priimant sprendimus dėl tiekėjo pašalinimo iš pirkimo procedūros 8.3 punkte nurodytais pašalinimo pagrindais gali būti atsižvelgiama į pagal VPĮ 52 ir 91 straipsnius arba PĮ 63 ir 99 straipsnius skelbiamą informaciją. | kerpamas ties 160 simb. (žodžio viduryje): „...žvelgiant į VPĮ 46 str“ |
| P-38 | DPSK_LT_SALYGOS | SPECIALISTŲ SĄRAŠO FORMA (pastr. DPSK_LT_SALYGOS:693) | Pvz.: Ypatingo statinio projekto vadovas* | rodomas visas |
| P-39 | DPSK_LT_SALYGOS | SPECIALISTŲ SĄRAŠO FORMA (pastr. DPSK_LT_SALYGOS:697) | Pvz.: SPSC | rodomas visas |
| P-40 | DPSK_LTEN_SALYGOS | SUBMISSION OF APPLICATIONS (pastr. DPSK_LTEN_SALYGOS:307) | deklaracija (-os) dėl atitikties nacionalinio saugumo reikalavimams, kaip numatyta šių sąlygų 8 skyriuje. | rodomas visas |
| P-41 | DPSK_LTEN_SALYGOS | GROUNDS FOR EXCLUSION OF SUPPLIERS (pastr. DPSK_LTEN_SALYGOS:418) | Pirkimo vykdytojas tiekėją pašalina iš pirkimo procedūros, jeigu paaiškėja, kad dėl savo veiksmų ar neveikimo prieš tokią pirkimo procedūrą ar jos metu tiekėjas atitinka bent vieną iš šių sąlygų 1 priede „Tiekėjų pašalinimo pagrindai“ nustatytų tiekėjo pašalinimo pagrindų. | kerpamas ties 160 simb.: „...ą ar jos metu tiekėjas“ |
| P-42 | DPSK_LTEN_SALYGOS | GROUNDS FOR EXCLUSION OF SUPPLIERS (pastr. DPSK_LTEN_SALYGOS:421) | Pirkimo vykdytojas pašalina tiekėją iš pirkimo procedūros pagal VPĮ 46 straipsnio 4 ir 6 dalyse nurodytus ir šių sąlygų 1 priede „Tiekėjų pašalinimo pagrindai“ ir tuo atveju, kai jis turi įtikinamų duomenų, kad tiekėjas yra įsteigtas arba dalyvauja pirkime vietoj kito asmens, siekiant išvengti VPĮ 46 straipsnio 4 ir 6 dalyse nurodytų pašalinimo pagrindų taikymo. | kerpamas ties 160 simb.: „...pašalinimo pagrindai“ “ |
| P-43 | DPSK_LTEN_SALYGOS | GROUNDS FOR EXCLUSION OF SUPPLIERS (pastr. DPSK_LTEN_SALYGOS:424) | Pirkimo vykdytojas taip pat patikrina, ar dėl ūkio subjektų, kurių pajėgumais ketina remtis tiekėjas, nėra šių sąlygų 1 priede „Tiekėjų pašalinimo pagrindai“  nustatytų pašalinimo pagrindų. Jeigu dėl ūkio subjekto yra bent vienas pašalinimo pagrindas,  pirkimo vykdytojas reikalaus per jo nustatytą terminą pakeisti jį kitu ūkio subjektu, dėl kurio nėra pašalinimo pagrindų.  Šio punkto nuostatos taikomos ir subtiekėjams, jeigu šių sąlygų 1 priede „Tiekėjų pašalinimo pagrindai“ nustatyta, kad pašalinimo pagrindai taikomi ir jiems. | kerpamas ties 160 simb. (žodžio viduryje): „...šalinimo pagrindai“  n“ |
| P-44 | DPSK_LTEN_SALYGOS | GROUNDS FOR EXCLUSION OF SUPPLIERS (pastr. DPSK_LTEN_SALYGOS:427) | Nepaisant 8.2. ir 8.3. punktų nuostatų, tiekėjas iš pirkimo nepašalinamas VPĮ 46 straipsnio 3 ir 10  dalyse nustatytais atvejais (atsižvelgiant į VPĮ 46 straipsnio 11 ir 12 dalių nuostatas), taip pat jeigu pagal VPĮ 46 straipsnio 8 dalį vertindamas tiekėjo patikimumą pirkimo vykdytojas priėmė sprendimą, kad tiekėjo pašalinimas iš pirkimo procedūros būtų neproporcingas vertinamam tiekėjo elgesiui pirkimo vykdytojas priėmė sprendimą, kad esant nustatytam pašalinimo pagrindui pagal VPĮ 46 straipsnio 4 dalies 7 punkto c papunktį būtų reikšmingai apribota konkurencija. Priimant sprendimus dėl tiekėjo pašalinimo iš pirkimo procedūros 8.3 punkte nurodytais pašalinimo pagrindais gali būti atsižvelgiama į pagal VPĮ 52 ir 91 straipsnius arba PĮ 63 ir 99 straipsnius skelbiamą informaciją. | kerpamas ties 160 simb. (žodžio viduryje): „...giant į VPĮ 46 straips“ |
| P-45 | DPSP_LTEN_SALYGOS | ANEXXES (pastr. DPSP_LTEN_SALYGOS:833) | Annex 3 – Confidential information (only the potential successful Tenderer/winning Tenderer will be asked to submit); | rodomas visas |
| P-46 | AKV_LT_SPS | TIEKĖJŲ PAŠALINIMO PAGRINDAI IR KVALIFIKACIJOS REIKALAVIMAI (pastr. AKV_LT_SPS:336) | 3.7. Tiekėjas, kurio bus prašoma pateikti kvalifikaciją pagrindžiančius dokumentus, su kvalifikacijos dokumentais turi pateikti įrodymus (išrašus iš darbo sutarčių ar pan., kuriuose matytųsi vardas, pavardė, sutarties data), jog SPS 2 lentelės 2, 3, 4 ir 6 punktų reikalavimams pagrįsti siūlomi specialistai yra Tiekėjo/Tiekėjų grupės nario arba Ūkio subjekto, kurio pajėgumais remiamasi grindžiant atitiktį Kvalifikacijos reikalavimams, darbuotojai (jeigu Tiekėjas SPS 4 priede nebus nurodęs, kad SPS 1 lentelės 1 ir/ar 2 punktui pagrįsti pasitelkia Kvazisubtiekėjus). | kerpamas ties 160 simb. (žodžio viduryje): „...išrašus iš darbo sutar“ |
| P-47 | AKV_LT_SPS | TIEKĖJŲ PAŠALINIMO PAGRINDAI IR KVALIFIKACIJOS REIKALAVIMAI (pastr. AKV_LT_SPS:337) | 3.8. Tiekėjas, kurio bus prašoma pateikti kvalifikaciją pagrindžiančius dokumentus, su kvalifikacijos dokumentais turi pateikti SPS X priedą „Įrangos sąrašas“, nurodant ketinamos naudoti įrangos pavadinimą, gamintoją ir kilmės šalį. Tiekėjas gali nurodyti tos pačios įrangos alternatyvas (pvz.: jei dar nežino tiksliai, kurią įrangą naudos sutarties vykdymo metu), kai kituose pirkimo dokumentuose, teikiant pasiūlymą, neprašoma konkrečiai įvardinti siūlomą įrangą. Tokiu atveju tiekėjas „Įrangos pavadinimas“ laukelyje nurodo įrangos pavadinimą ir „(Alternatyva)“. | kerpamas ties 160 simb.: „...dą „Įrangos sąrašas“, “ |

## 6. Kitos 2 žingsnio dalys

### Alternatyvos (18 grupės; numatytojo atsakymo nėra, neatsakius generuoti neleidžiama)

- Jei nevykdomos Derybos **/** Jei vykdomos Derybos (MVP_LTEN_SPS, MVP_LT_SPS)
- Jei Pirkimo objektas į dalis neskaidomas **/** Jei Pirkimo objektas skaidomas į dalis (AKV_LT_PASIULYMAS, AKV_LT_SPS, AK_LTEN_PASIULYMAS, AK_LTEN_SPS, LTEN_PARAISKA, LTEN_PASIULYMAS, LTEN_SPS, LT_PARAISKA, LT_PASIULYMAS, LT_SPS, MVP_LTEN_PASIULYMAS, MVP_LTEN_SPS, MVP_LT_PASIULYMAS, MVP_LT_SPS, ND_LTEN_SPS, ND_LT_SPS, SSD_LTEN_SPS, SSD_LT_SPS)
- Jei tikrinami tik galimo Laimėjusio Tiekėjo pašalinimo pagrindai, bet netikrinama kvalifikacija **/** Jei tikrinami tik galimo Laimėjusio Tiekėjo kvalifikacija ir pašalinimo pagrindai (MVP_LT_SPS)
- Jei žalieji reikalavimai nurodyti Techninėje specifikacijoje ir (ar) Sutarties projekte **/** Jei žalieji reikalavimai nurodomi pirkimo sąlygose (AKV_LT_SPS, AK_LTEN_SPS, AK_LT_SPS, DPSK_LTEN_KVALIFIKACIJA, LTEN_SPS, LT_SPS, MVP_LTEN_SPS, MVP_LT_SPS, ND_LTEN_SPS, ND_LT_SPS, SSD_LTEN_SPS, SSD_LT_SPS)
- Jei netaikomas Pasiūlymo galiojimo užtikrinimas ir perkame pagal kainą ar sąnaudas **/** Jei netaikomas Pasiūlymo galiojimo užtikrinimas ir perkame pagal kainos ir kokybės santykį **/** Jei taikomas Pasiūlymo galiojimo užtikrinimas (AK_LTEN_SPS, DPSP_LTEN_SALYGOS, DPSP_LT_SALYGOS, LTEN_SPS, LT_SPS, MVP_LTEN_SPS, MVP_LT_SPS, ND_LTEN_SPS, ND_LT_SPS, SSD_LTEN_SPS, SSD_LT_SPS)
- Jei tikrinami tik galimo Laimėjusio Tiekėjo pašalinimo pagrindai, bet netikrinama kvalifikacija **/** Jei tikrinami tik galimo Laimėjusio Tiekėjo kvalifikacija ir pašalinimo pagrindai **/** Jei tikrinama visų Tiekėjų kvalifikacija, ir pašalinimo pagrindai **/** Jei tikrinami visų Tiekėjų pašalinimo pagrindai, o kvalifikacija nėra tikrinama (MVP_LTEN_SPS)
- Jei numatoma kviesti stebėtojus **/** Jei nenumatoma kviesti stebėtojų (AKV_LT_SPS, AK_LTEN_SPS, AK_LT_SPS, LTEN_SPS, LT_SPS, ND_LTEN_SPS, ND_LT_SPS, SSD_LTEN_SPS, SSD_LT_SPS)
- Jei Pirkimo objektas į dalis neskaidomas **/** Jei Pirkimo objektas skaidomas į dalis (taikomi 2.4.-.2.7. punktai) (AK_LT_PASIULYMAS, AK_LT_SPS)
- Jei tikrinami tik galimo Laimėjusio Tiekėjo pašalinimo pagrindai, bet netikrinama kvalifikacija **/** Jei tikrinami tik galimo Laimėjusio Tiekėjo kvalifikacija ir pašalinimo pagrindai **/** Jei tikrinami visų Tiekėjų kvalifikacija ir pašalinimo pagrindai (AKV_LT_SPS, AK_LT_SPS)
- Jei netaikomas Pasiūlymo galiojimo užtikrinimas ir perkame pagal kainą ar sąnaudas **/** Jei netaikomas Pasiūlymo galiojimo užtikrinimas ir perkame pagal kainos ar sąnaudas ir kokybės santykį **/** Jei taikomas Pasiūlymo galiojimo užtikrinimas (AKV_LT_SPS, AK_LT_SPS)
- Jei tikrinami tik galimo laimėtojo pašalinimo pagrindai, bet netikrinama kvalifikacija **/** Jei tik galimo laimėtojo kvalifikacija ir pašalinimo pagrindų nebuvimas yra tikrinami **/** Jei tikrinami visų Tiekėjų kvalifikacija ir pašalinimo pagrindai (AK_LTEN_SPS, LTEN_SPS, LT_SPS, SSD_LTEN_SPS, SSD_LT_SPS)
- Jei tikrinami visų Tiekėjų kvalifikacija ir pašalinimo pagrindai **/** Jei tikrinami visų pašalinimo pagrindai, kvalifikacija netikrinama (ND_LTEN_SPS, ND_LT_SPS)
- Jeigu DPS sukūrimui taikomi aplinkos apsaugos kriterijai **/** Jeigu DPS sukūrimui netaikomi aplinkos apsaugos kriterijai **/** Jeigu DPS sukūrimui netaikomi aplinkos apsaugos kriterijai, kadangi taikoma išimtis, kada gali būti nevykdomas žaliasis pirkimas (DPSK_LTEN_SALYGOS, DPSK_LT_SALYGOS)
- Jeigu DPS neskirstoma į kategorijas **/** Jeigu DPS skirstoma į kategorijas (DPSK_LTEN_SALYGOS, DPSK_LT_SALYGOS)
- Jei DPS galiojimas apibrėžiamas laikotarpiu, nurodant pradžios ir pabaigos datas **/** Jei DPS galiojimas apibrėžiamas trukme mėnesiais (metais) (DPSK_LTEN_SALYGOS, DPSK_LT_SALYGOS)
- Jei DPS neskirstomas į kategorijas **/** Jei DPS skirstomas į kategorijas (DPSK_LTEN_PARAISKA, DPSK_LTEN_SALYGOS, DPSK_LT_SALYGOS)
- Kai DPS suskirstyta į kategorijas **/** Kai DPS nėra suskirstyta į kategorijas (DPSK_LTEN_SALYGOS, DPSK_LT_SALYGOS)
- Jeigu numatoma pirkimo objekto apžiūra **/** Jeigu nenumatoma pirkimo objekto apžiūra (DPSP_LTEN_SALYGOS, DPSP_LT_SALYGOS)

### Pavieniai pasirinkimai (11; klausimas = šablono sąlygos tekstas + „?“, numatyta „Taip - įtraukti“: `ATS[raktas] ??= true`, PP-SALYGOS.html:1385 ir 1896)

- Jei Pirkimo metu nėra rengiamas Sutarties projektas? (AKV_LT_SPS, AK_LTEN_SPS, AK_LT_SPS, LTEN_SPS, LT_SPS, MVP_LT_SPS, ND_LTEN_SPS, ND_LT_SPS, SSD_LTEN_SPS, SSD_LT_SPS)
- Kai taikomas tiesioginis atsiskaitymas su Subtiekėjais ir Ūkio subjektais, kurių pajėgumais remiamasi? (AKV_LT_SPS, AK_LTEN_SPS, AK_LT_SPS, LTEN_SPS, LT_SPS, MVP_LTEN_SPS, MVP_LT_SPS, ND_LTEN_SPS, ND_LT_SPS, SSD_LTEN_SPS, SSD_LT_SPS)
- Jei planuojama objekto apžiūra? (AKV_LT_SPS, AK_LTEN_SPS, AK_LT_SPS, LTEN_SPS, LT_SPS, MVP_LTEN_SPS, MVP_LT_SPS, ND_LTEN_SPS, ND_LT_SPS, SSD_LTEN_SPS, SSD_LT_SPS)
- Jeigu keliami pašalinimo pagrindai ir prašoma EBVPD? (MVP_LT_SPS)
- Jei pirkimas laikomas žaliuoju savaime? (AKV_LT_SPS, AK_LTEN_SPS, AK_LT_SPS, DPSK_LTEN_KVALIFIKACIJA, LTEN_SPS, LT_SPS, MVP_LTEN_SPS, MVP_LT_SPS, ND_LTEN_SPS, ND_LT_SPS, SSD_LTEN_SPS, SSD_LT_SPS)
- Jeigu taikomas Sutarties įvykdymo užtikrinimas? (MVP_LT_SPS)
- .Jei Pasiūlymą elektroniniu ar fiziniu parašu pasirašo Tiekėjo vadovo įgaliotas asmuo, prie Pasiūlymo turi būti pridėtas galiojantis rašytinis įgaliojimas arba kitas dokumentas, suteikiantis teisę pasirašyti Pasiūlymą;? (MVP_LTEN_SPS)
- Jeigu taikomas sutarties įvykdymo užtikrinimas? (AK_LTEN_SPS, LTEN_SPS, LT_SPS, MVP_LTEN_SPS, ND_LTEN_SPS, ND_LT_SPS, SSD_LTEN_SPS, SSD_LT_SPS)
- Jei Pirkimas vykdomas siekiant sudaryti Preliminariąją sutartį? (AKV_LT_SPS, AK_LTEN_SPS, AK_LT_SPS, LTEN_SPS, LT_SPS, SSD_LTEN_SPS, SSD_LT_SPS)
- Kai taikomas sutarties užtikrinimas? (AKV_LT_SPS, AK_LT_SPS)
- Jei Pirkimo objektas skaidomas į dalis? (DPSP_LTEN_PASIULYMAS)

### SPS priedų sąrašo eilutės (56; žymimieji langeliai, numatyta pagal 1 žingsnį arba „palikti“)

Sąrašas neišskleidžiamas - eilutės yra šablono priedų sąrašo tekstas (pvz. „7 priedas – Konfidenciali informacija ...“).


## 7. „X“ vietoj numerio ar sumos - vietos, kurių forma neklausia (123)

Šablonuose dalis nuorodų ir reikšmių pažymėta ne „___“, o raide „X“ (pvz. „pagal SPS X priedo formą“, „X Eur“). Forma jų neklausia: dokumente lieka „X“, o 3 žingsnio patikra jas rodo skiltyje „Papildomai patikrinkite“ (tekstas ten kerpamas ties 110 simbolių, `variklis.js:1885`). Sąrašas - iš 24 sugeneruotų bandomųjų paketų.

| Šablonas | Vieta su „X“ | Tekstas (kaip rodo patikra) |
|---|---|---|
| DPSP_LT_SALYGOS | X | 13.3. Atsižvelgiant į tai, kad, numatoma, kad Perkantysis subjektas informuos Koordinavimo komisiją apie ketin |
| DPSP_LTEN_SALYGOS | X | Atsižvelgiant į tai, kad Pirkime numatoma, kad Perkantysis subjektas informuos Koordinavimo komisiją apie keti |
| DPSP_LTEN_SALYGOS | X | Since it is foreseen in the Procurement that the Contracting Entity will inform the Coordination Commission ab |
| DPSK_LT_SALYGOS | X [nurodyti datą, nuo kuri | 3.4. DPS galioja nuo X [nurodyti datą, nuo kurios galioja DPS] (arba nuo DPS sukūrimo datos, jei DPS sukurta v |
| DPSK_LTEN_SALYGOS | X [nurodyti datą, nuo kuri | DPS galioja nuo X [nurodyti datą, nuo kurios galioja DPS] (arba nuo DPS sukūrimo datos, jei DPS sukurta vėliau |
| MVP_LT_SPS | X | 2.7. Jeigu Perkantysis subjektas gaus klausimų dėl Pirkimo dokumentų, į kuriuos atsakant reikės pateikti konfi |
| MVP_LT_SPS | X | 3.7. Tiekėjas, kurio bus prašoma pateikti kvalifikaciją pagrindžiančius dokumentus, su kvalifikacijos dokument |
| MVP_LT_SPS | X | 5.2.5.Informaciją apie Ūkio subjektus, kurių pajėgumais remiamasi, Subtiekėjus ir Kvazisubtiekėjus pagal SPS X |
| MVP_LT_SPS | X | 5.2.6.Užpildytas ir pasirašytas deklaracijas, patvirtinančias sutikimą būti Subtiekėju, Ūkio subjektu, kurio p |
| MVP_LT_SPS | X pri | 5.2.7.Tinkamai užpildytą ir pasirašytą Nacionalinio saugumo reikalavimų atitikties deklaraciją pagal SPS X pri |
| MVP_LT_SPS | priedą Nr. X | 5.2.8.Užpildytą pasiūlymų dėl derėtinų sąlygų formą (SPS priedą Nr. X). |
| MVP_LT_SPS | X Eur | 9.3. Sutarčiai taikomas Sutarties įvykdymo užtikrinimas, kurio dydis – X Eur. Laimėjęs Tiekėjas pateikia Sutar |
| MVP_LTEN_SPS | X | Jeigu Perkantysis subjektas gaus klausimų dėl Pirkimo dokumentų, į kuriuos atsakant reikės pateikti konfidenci |
| MVP_LTEN_SPS | X | In case the Contracting Entity receives questions pertaining to Procurement documents, responding to which sha |
| MVP_LTEN_SPS | X | Tiekėjas, kurio bus prašoma pateikti kvalifikaciją pagrindžiančius dokumentus, su kvalifikacijos dokumentais t |
| MVP_LTEN_SPS | X | When asked to provide supporting documents the Supplier must provide evidence (extracts from employment contra |
| MVP_LTEN_SPS | SPS X priedas | Su Pasiūlymu teikiama Nacionalinio saugumo reikalavimų atitikties deklaracija (SPS X priedas). |
| MVP_LTEN_SPS | Annex X | The Declaration of Compliance with National Security Requirements (Annex X to the SPC) has to be submitted wit |
| MVP_LTEN_SPS | SPS X pried | Informaciją apie ūkio subjektus, kurių pajėgumais remiamasi, Subtiekėjus ir Kvazisubtiekėjus pagal SPS X pried |
| MVP_LTEN_SPS | X | Information on the economic entities whose capacity is relied upon, the Sub-suppliers and Quasi-Sub-suppliers |
| MVP_LTEN_SPS | SPS X priedo | Tinkamai užpildytą ir pasirašytą Nacionalinio saugumo reikalavimų atitikties deklaraciją pagal SPS X priedo fo |
| MVP_LTEN_SPS | priedą Nr. X | Užpildytą pasiūlymų dėl derėtinų sąlygų formą (SPS priedą Nr. X) |
| MVP_LTEN_SPS | Annex X | A duly completed form of Supplier‘s suggestions for negotiated clauses (Annex X to the SPC) |
| MVP_LTEN_SPS | X | Tiekėjas, kuris pateikė ekonomiškai naudingiausią pasiūlymą ir yra nustatytas galimu laimėtoju/laimėtoju, Perk |
| MVP_LTEN_SPS | X | The Supplier who has submitted the most economically advantageous Tender and is identified as the potential wi |
| MVP_LTEN_SPS | X Eur | Sutarčiai taikomas Sutarties įvykdymo užtikrinimas, kurio dydis – X Eur. Laimėjęs Tiekėjas pateikia Sutarties |
| MVP_LTEN_SPS | X Eur | The Contract is subject to the Contract performance security in the amount of X Eur. The winning Supplier shal |
| AK_LT_SPS | X | 2.7.Jeigu Perkantysis subjektas gaus klausimų dėl Pirkimo dokumentų, į kuriuos atsakant reikės pateikti konfid |
| AK_LT_SPS | X | 3.7. Tiekėjas, kurio bus prašoma pateikti kvalifikaciją pagrindžiančius dokumentus, su kvalifikacijos dokument |
| AK_LT_SPS | SPS X priedas | Su Pasiūlymu teikiama Nacionalinio saugumo reikalavimų atitikties deklaracija (SPS X priedas). |
| AK_LT_SPS | X | 7.2.5.Informaciją apie Ūkio subjektus, kurių pajėgumais remiamasi, Subtiekėjus ir Kvazisubtiekėjus pagal SPS X |
| AK_LT_SPS | X | 7.2.6.Užpildytas ir pasirašytas deklaracijas, patvirtinančias sutikimą būti Tiekėjo Subtiekėju, Ūkio subjektu, |
| AK_LT_SPS | X pri | 7.2.7.Tinkamai užpildytą ir pasirašytą Nacionalinio saugumo reikalavimų atitikties deklaraciją pagal SPS X pri |
| AK_LT_SPS | X Eur | 11.3. Sutarčiai taikomas Sutarties įvykdymo užtikrinimas, kurios dydis – X Eur. Laimėjęs Tiekėjas pateikia Sut |
| AKV_LT_SPS | X | 2.7.Jeigu Pirkimo vykdytojas gaus klausimų dėl Pirkimo dokumentų, į kuriuos atsakant reikės pateikti konfidenc |
| AKV_LT_SPS | SPS X priedas | 2) Informaciją apie Tiekėjo  valdymo ar priežiūros organus (SPS X priedas). Tiekėjas, teikdamas aktualius doku |
| AKV_LT_SPS | X | 3.8. Tiekėjas, kurio bus prašoma pateikti kvalifikaciją pagrindžiančius dokumentus, su kvalifikacijos dokument |
| AKV_LT_SPS | SPS X priedas | Su Pasiūlymu teikiama Nacionalinio saugumo reikalavimų atitikties deklaracija (SPS X priedas). |
| AKV_LT_SPS | X | 7.2.5.Informaciją apie Ūkio subjektus, kurių pajėgumais remiamasi, Subtiekėjus ir Kvazisubtiekėjus pagal SPS X |
| AKV_LT_SPS | X | 7.2.6.Užpildytas ir pasirašytas deklaracijas, patvirtinančias sutikimą būti Tiekėjo Subtiekėju, Ūkio subjektu, |
| AKV_LT_SPS | X pri | 7.2.7.Tinkamai užpildytą ir pasirašytą Nacionalinio saugumo reikalavimų atitikties deklaraciją pagal SPS X pri |
| AKV_LT_SPS | X | 8.1. Pirkimo dokumentuose nustatytus reikalavimus atitinkantys Pasiūlymai bus vertinami pagal ekonomiškai naud |
| AKV_LT_SPS | X Eur | 11.3. Sutarčiai taikomas Sutarties įvykdymo užtikrinimas, kurio dydis – X Eur. Laimėjęs Tiekėjas pateikia Suta |
| AK_LTEN_SPS | X | Jeigu Perkantysis subjektas gaus klausimų dėl Pirkimo dokumentų, į kuriuos atsakant reikės pateikti konfidenci |
| AK_LTEN_SPS | X | If the Contracting Entity receives questions regarding the Procurement documents, the answer to which will req |
| AK_LTEN_SPS | X | Tiekėjas/Tiekėjų grupės narys ir kiekvienas Ūkio subjektas, kurio pajėgumais remiamasi grindžiant atitiktį Kva |
| AK_LTEN_SPS | X | The Supplier/member of a Supplier group and each economic entity whose capacity is relied upon in order to com |
| AK_LTEN_SPS | X | Tiekėjas, kurio bus prašoma pateikti kvalifikaciją pagrindžiančius dokumentus, su kvalifikacijos dokumentais t |
| AK_LTEN_SPS | X | When asked to provide supporting documents the Supplier must provide evidence (extracts from employment contra |
| AK_LTEN_SPS | SPS X priedas | Su Pasiūlymu teikiama Nacionalinio saugumo reikalavimų atitikties deklaracija (SPS X priedas). |
| AK_LTEN_SPS | Annex X | The Declaration of Compliance with National Security Requirements (Annex X to the SPC) has to be submitted wit |
| AK_LTEN_SPS | SPS X pried | Informaciją apie ūkio subjektus, kurių pajėgumais remiamasi, Subtiekėjus ir Kvazisubtiekėjus pagal SPS X pried |
| AK_LTEN_SPS | X | Information on the economic entities whose capacity is relied upon, the Sub-suppliers and Quasi-Sub-suppliers |
| AK_LTEN_SPS | SPS X priedo | Tinkamai užpildytą ir pasirašytą Nacionalinio saugumo reikalavimų atitikties deklaraciją pagal SPS X priedo fo |
| AK_LTEN_SPS | X | Tiekėjas, kuris pateikė ekonomiškai naudingiausią pasiūlymą ir yra nustatytas galimu laimėtoju/laimėtoju, Perk |
| AK_LTEN_SPS | X | The Supplier who has submitted the most economically advantageous Tender and is identified as the potential wi |
| AK_LTEN_SPS | X Eur | Sutarčiai taikomas Sutarties įvykdymo užtikrinimas, kurio dydis – X Eur. Laimėjęs Tiekėjas pateikia Sutarties |
| AK_LTEN_SPS | X Eur | The Contract is subject to the Contract performance security in the amount of X Eur. The winning Supplier shal |
| ND_LT_SPS | X | 2.9.Jeigu Perkantysis subjektas gaus klausimų dėl Pirkimo dokumentų, į kuriuos atsakant reikės pateikti konfid |
| ND_LT_SPS | X | 3.7. Tiekėjas, kurio bus prašoma pateikti kvalifikaciją pagrindžiančius dokumentus, su kvalifikacijos dokument |
| ND_LT_SPS | X | 5.2.4.Informaciją apie Ūkio subjektus, kurių pajėgumais remiamasi, Subtiekėjus ir Kvazisubtiekėjus pagal SPS X |
| ND_LT_SPS | X pri | 5.2.7.Tinkamai užpildytą ir pasirašytą Nacionalinio saugumo reikalavimų atitikties deklaraciją pagal SPS X pri |
| ND_LT_SPS | priedą Nr. X | 5.2.8.Užpildytą pasiūlymų dėl derėtinų sąlygų formą (SPS priedą Nr. X). |
| ND_LT_SPS | X | 5.2.9.Tiekėjo, kiekvieno Tiekėjų grupės nario, kiekvieno Ūkio subjekto, kurio pajėgumais remiamasi ir kiekvien |
| ND_LT_SPS | X Eur | 9.3. Sutarčiai taikomas Sutarties įvykdymo užtikrinimas, kurio dydis – X Eur. Laimėjęs Tiekėjas pateikia Sutar |
| ND_LTEN_SPS | X | Jeigu Perkantysis subjektas gaus klausimų dėl Pirkimo dokumentų, į kuriuos atsakant reikės pateikti konfidenci |
| ND_LTEN_SPS | X | If the Contracting Entity receives questions regarding the Procurement documents, the answer to which will req |
| ND_LTEN_SPS | X | Tiekėjas, kurio bus prašoma pateikti kvalifikaciją pagrindžiančius dokumentus, su kvalifikacijos dokumentais t |
| ND_LTEN_SPS | X | When asked to provide supporting documents the Supplier must provide evidence (extracts from employment contra |
| ND_LTEN_SPS | SPS X priedas | Su Pirminiu pasiūlymu teikiama Nacionalinio saugumo reikalavimų atitikties deklaracija (SPS X priedas)  ir kit |
| ND_LTEN_SPS | Annex X | The Declaration of Compliance with National Security Requirements (Annex X to the SPC) and other documents (on |
| ND_LTEN_SPS | SPS X pried | Informaciją apie Ūkio subjektus, kurių pajėgumais remiamasi, Subtiekėjus ir Kvazisubtiekėjus pagal SPS X pried |
| ND_LTEN_SPS | X | Information on the economic entities whose capacity is relied upon, the Sub-suppliers and Quasi-Sub-suppliers |
| ND_LTEN_SPS | SPS X priedo | Tinkamai užpildytą ir pasirašytą Nacionalinio saugumo reikalavimų atitikties deklaraciją pagal SPS X priedo fo |
| ND_LTEN_SPS | X | A duly completed and signed Declaration of Compliance with the National Security Requirements in accordance wi |
| ND_LTEN_SPS | priedą Nr. X | Užpildytą pasiūlymų dėl derėtinų sąlygų formą (SPS priedą Nr. X) |
| ND_LTEN_SPS | Annex X | A duly completed form of Supplier‘s suggestions for negotiated clauses (Annex X to the SPC) |
| ND_LTEN_SPS | X | Tiekėjo, kiekvieno Tiekėjų grupės nario, kiekvieno Ūkio subjekto, kurio pajėgumais remiamasi ir kiekvieno Subt |
| ND_LTEN_SPS | Annex X | Completed Annex X to the SPC “Counterparty and/or Sub-Supplier Data form” by the Supplier, each member of the |
| ND_LTEN_SPS | X | Tiekėjas, kuris pateikė ekonomiškai naudingiausią pasiūlymą ir yra nustatytas galimu laimėtoju/laimėtoju, Perk |
| ND_LTEN_SPS | X | The Supplier who has submitted the most economically advantageous Tender and is identified as the potential wi |
| ND_LTEN_SPS | X Eur | Sutarčiai taikomas Sutarties įvykdymo užtikrinimas, kurio dydis – X Eur. Laimėjęs Tiekėjas pateikia Sutarties |
| ND_LTEN_SPS | X Eur | The Contract is subject to the Contract performance security in the amount of X Eur. The winning Supplier shal |
| SSD_LT_SPS | X | 2.9.Jeigu Perkantysis subjektas gaus klausimų dėl Pirkimo dokumentų, į kuriuos atsakant reikės pateikti konfid |
| SSD_LT_SPS | X | 3.7. Tiekėjas, kurio bus prašoma pateikti kvalifikaciją pagrindžiančius dokumentus, su kvalifikacijos dokument |
| SSD_LT_SPS | SPS X priedas | Su Pirminiu pasiūlymu teikiama Nacionalinio saugumo reikalavimų atitikties deklaracija (SPS X priedas). |
| SSD_LT_SPS | X | 7.2.4.Informaciją apie Ūkio subjektus, kurių pajėgumais remiamasi, Subtiekėjus ir Kvazisubtiekėjus pagal SPS X |
| SSD_LT_SPS | X pri | 7.2.7.Tinkamai užpildytą ir pasirašytą Nacionalinio saugumo reikalavimų atitikties deklaraciją pagal SPS X pri |
| SSD_LT_SPS | X Eur | 11.3. Sutarčiai taikomas Sutarties įvykdymo užtikrinimas, kurio dydis – X Eur. Laimėjęs Tiekėjas pateikia Suta |
| SSD_LTEN_SPS | X | Jeigu Perkantysis subjektas gaus klausimų dėl Pirkimo dokumentų, į kuriuos atsakant reikės pateikti konfidenci |
| SSD_LTEN_SPS | X | If the Contracting Entity receives questions regarding the Procurement documents, the answer to which will req |
| SSD_LTEN_SPS | X | Tiekėjas, kurio bus prašoma pateikti kvalifikaciją pagrindžiančius dokumentus, su kvalifikacijos dokumentais t |
| SSD_LTEN_SPS | X | When asked to provide supporting documents the Supplier must provide evidence (extracts from employment contra |
| SSD_LTEN_SPS | SPS X priedas | Su Pirminiu pasiūlymu teikiama Nacionalinio saugumo reikalavimų atitikties deklaracija (SPS X priedas). |
| SSD_LTEN_SPS | Annex X | The Declaration of Compliance with National Security Requirements (Annex X to the SPC) has to be submitted wit |
| SSD_LTEN_SPS | SPS X pried | Informaciją apie Ūkio subjektus, kurių pajėgumais remiamasi, Subtiekėjus ir Kvazisubtiekėjus pagal SPS X pried |
| SSD_LTEN_SPS | X | Information on the economic entities whose capacity is relied upon, the Sub-suppliers and Quasi-Sub-suppliers |
| SSD_LTEN_SPS | SPS X priedo | Tinkamai užpildytą ir pasirašytą Nacionalinio saugumo reikalavimų atitikties deklaraciją pagal SPS X priedo fo |
| SSD_LTEN_SPS | priedą Nr. X | Užpildytą pasiūlymų deryboms formą (SPS priedą Nr. X) |
| SSD_LTEN_SPS | Annex X | A duly completed form of Supplier‘s suggestions for negotiated clauses (Annex X to the SPC) |
| SSD_LTEN_SPS | X | Tiekėjas, kuris pateikė ekonomiškai naudingiausią pasiūlymą ir yra nustatytas galimu laimėtoju/laimėtoju, Perk |
| SSD_LTEN_SPS | X | The Supplier who has submitted the most economically advantageous Tender and is identified as the potential wi |
| SSD_LTEN_SPS | X Eur | Sutarčiai taikomas Sutarties įvykdymo užtikrinimas, kurio dydis – X Eur. Laimėjęs Tiekėjas pateikia Sutarties |
| SSD_LTEN_SPS | X Eur | The Contract is subject to the Contract performance security in the amount of X Eur. The winning Supplier shal |
| TSD_LT_SPS | X | 2.9.Jeigu Perkantysis subjektas gaus klausimų dėl Pirkimo dokumentų, į kuriuos atsakant reikės pateikti konfid |
| TSD_LT_SPS | X | 3.7. Tiekėjas, kurio bus prašoma pateikti kvalifikaciją pagrindžiančius dokumentus, su kvalifikacijos dokument |
| TSD_LT_SPS | SPS X priedas | Su Pirminiu pasiūlymu teikiama Nacionalinio saugumo reikalavimų atitikties deklaracija (SPS X priedas). |
| TSD_LT_SPS | X | 7.2.5.Informaciją apie ūkio subjektus, kurių pajėgumais remiamasi, Subtiekėjus ir Kvazisubtiekėjus pagal SPS X |
| TSD_LT_SPS | X pri | 9.2.3.Tinkamai užpildytą ir pasirašytą Nacionalinio saugumo reikalavimų atitikties deklaraciją pagal SPS X pri |
| TSD_LT_SPS | X Eur | 13.3. Sutarčiai taikomas Sutarties įvykdymo užtikrinimas, kurios dydis – X Eur. Laimėjęs Tiekėjas pateikia Sut |
| TSD_LTEN_SPS | X | Jeigu Perkantysis subjektas gaus klausimų dėl Pirkimo dokumentų, į kuriuos atsakant reikės pateikti konfidenci |
| TSD_LTEN_SPS | X | If the Contracting Entity receives questions regarding the Procurement documents, the answer to which will req |
| TSD_LTEN_SPS | X | Tiekėjas, kurio bus prašoma pateikti kvalifikaciją pagrindžiančius dokumentus, su kvalifikacijos dokumentais t |
| TSD_LTEN_SPS | X | When asked to provide supporting documents the Supplier must provide evidence (extracts from employment contra |
| TSD_LTEN_SPS | SPS X priedas | Su Pasiūlymu teikiama Nacionalinio saugumo reikalavimų atitikties deklaracija (SPS X priedas). |
| TSD_LTEN_SPS | Annex X | The Declaration of Compliance with National Security Requirements (Annex X to the SPC) has to be submitted wit |
| TSD_LTEN_SPS | SPS X pried | Informaciją apie ūkio subjektus, kurių pajėgumais remiamasi, Subtiekėjus ir Kvazisubtiekėjus pagal SPS X pried |
| TSD_LTEN_SPS | X | Information on the economic entities whose capacity is relied upon, the Sub-suppliers and Quasi-Sub-suppliers |
| TSD_LTEN_SPS | SPS X priedo | Tinkamai užpildytą ir pasirašytą Nacionalinio saugumo reikalavimų atitikties deklaraciją pagal SPS X priedo fo |
| TSD_LTEN_SPS | X | Tiekėjas, kuris pateikė ekonomiškai naudingiausią pasiūlymą ir yra nustatytas galimu laimėtoju/laimėtoju, Perk |
| TSD_LTEN_SPS | X | The Supplier who has submitted the most economically advantageous Tender and is identified as the potential wi |
| TSD_LTEN_SPS | X Eur | Sutarčiai taikomas Sutarties įvykdymo užtikrinimas, kurio dydis – X Eur. Laimėjęs Tiekėjas pateikia Sutarties |
| TSD_LTEN_SPS | X Eur | The Contract is subject to the Contract performance security in the amount of X Eur. The winning Supplier shal |

## 8. Kur kode kerpamas tekstas

| Vieta | Kas kerpama | Riba |
|---|---|---|
| `PP-SALYGOS.html:2080` | formuluotės klausimo tekstas | 200 simbolių, be daugtaškio |
| `PP-SALYGOS.html:2131` | „Patikrinkite siūlomas reikšmes“ sakinys | 200, be daugtaškio |
| `PP-SALYGOS.html:2176` | raudonos pastabos tekstas | 160, be daugtaškio |
| `PP-SALYGOS.html:2175` | „Dokumente toliau: ...“ kontekstas | 140 + „...“ |
| `PP-SALYGOS.html:2189` | „Pildomos vietos“ sakinys | 180, be daugtaškio |
| `PP-SALYGOS.html:2049` | SPS priedų sąrašo eilutė prie priedo | 100, be daugtaškio |
| `PP-SALYGOS.html:2113` | automatiškai parinktas angliškas variantas | 90 + „...“ |
| `PP-SALYGOS.html:1422-1923` (26 vietos) | „Išspręsta automatiškai“ sąrašo eilutės | 55-70, be daugtaškio |
| `PP-SALYGOS.html:2773`, `variklis.js:1832` | numeracijos pataisymų sąrašas (3 žingsnis) | 70 ir 90 |
| `variklis.js:1866, 1869, 1885, 1890` | baigtumo patikros sąrašai (3 žingsnis) | 110 |
| `PP-SALYGOS.html:3239, 3243` | klausimo tekstas, siunčiamas AI | 700 |
| `PP-SALYGOS.html:3225`, `ai-patarejas.js:126` | šablono autorių pastaba AI užklausoje | 300 |
| `ai-patarejas.js:235` | AI pagrindimas, rodomas prie pasiūlymo | 240 |

CSS kirpimo (`line-clamp`, `text-overflow`) ir `maxlength` modulyje nėra. Sugeneruotuose dokumentuose tekstas nekerpamas: 24 paketuose patikrinta 300 pakeistų ilgų pastraipų, nė viena nesibaigia žodžio viduryje.

## 9. Brūkšniai „–“ (U+2013) ir ilgasis brūkšnys (U+2014)

- Modulio sąsajos eilutėse (naudotojui rodomas mano tekstas): 0.
- `PP-SALYGOS.html`: 9 vietos su „–“ - 4 reguliariosiose išraiškose, kurios atpažįsta šablono tekstą (eil. 858, 860, 865, 1111), ir 5 kodo komentaruose (eil. 859, 1106-1107, 1519, 2386). U+2014 nėra. `variklis.js`, `ai-patarejas.js`, `paraiska-extract.js`, `kartografas.html` - 0.
- Šablonų tekste (64 dokumentai): „–“ - 1771 vieta (13 dokumentų be jų; daugiausia dvikalbėse BPS ir SPS, po 80-95), U+2014 - 5 vietos: po vieną `AK_LTEN_SPS`, `ND_LTEN_SPS`, `SSD_LTEN_SPS`, `TSD_LTEN_SPS`, `DPSK_LTEN_PASALINIMAS` (angliškas sakinys „no supporting documents are required[U+2014]submission of the ESPD is sufficient“). Dar viena U+2014 vieta - sename bandomajame faile `templates/TPS_forma.docx`, kurio modulis nenaudoja.
- Formoje rodomas šablono sakinys su „–“ yra šablono tekstas, ne sąsajos eilutė.


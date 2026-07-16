# EPSO-G HTML stiliaus gairės

Šis dokumentas skirtas naudoti kaip stiliaus gairių ir prompt'o dalis kuriant HTML/CSS vartotojo sąsajas, kurios vėliau galėtų būti prijungtos prie didesnio įmonių grupės projekto.

Gairės parengtos pagal `Brandbook_2026.pdf` vizualinio identiteto principus ir adaptuotos šviesiam, švariam, korporatyviniam HTML dizainui.

## Trumpa prompt versija

```text
Dizaino kryptis: EPSO-G brandbook'u paremta šviesi korporatyvinė UI sistema su Apple įkvėptu minimalizmu. Naudoti Nunito Sans, pagrindinę Smaragdas spalvą #00A072, tekstui Grafitas #2E3641, šviesius žalsvus/pilkšvus fonus, subtilius rėmelius, daug baltos erdvės, lakoniškas linijines piktogramas ir disciplinuotą enterprise tipo komponentų dizainą.
```

## Pilna prompt versija

```text
Sukurk HTML/CSS vartotojo sąsają pagal EPSO-G įmonių grupės vizualinio identiteto kryptį.

Bendra dizaino kryptis:
- Stilius turi būti švarus, modernus, šviesus, korporatyvinis ir premium.
- Vizualinė estetika gali būti įkvėpta Apple šviesaus minimalizmo: daug baltos erdvės, aiški hierarchija, subtilūs paviršiai, tvarkinga tipografija.
- Tačiau spalvinė sistema turi remtis EPSO-G brandbook'u, o ne Apple mėlyna spalva.
- Sąsaja turi atrodyti patikima, rami, technologiška, tvari ir tinkama energetikos įmonių grupei.

Spalvos:
- Pagrindinė brand spalva: Smaragdas #00A072.
- Pagrindinis tekstas: Grafitas #2E3641.
- Baltas paviršius: #FFFFFF.
- Šviesūs fonai: naudoti labai švelnius brand pustonius, pvz. Grafitas-5 #EFF1F1, Žalia-5 #EFF9F1, Melsva-5 #E8F7F9.
- Subtilūs rėmeliai: Grafitas-15 #E1E2E4 arba Grafitas-30 #C7CDD3.
- Antrinis tekstas: Grafitas-50 #737483.
- Pagrindiniams veiksmams naudoti Smaragdas #00A072.
- Hover/focus būsenoms galima naudoti Smaragdas-120 #128A76 arba Smaragdas-50 #16C492.
- Papildomos spalvos naudojamos tik akcentams, diagramoms, statusams ar mažiems UI elementams:
  - Mėlyna #00667D
  - Melsva #00A5C4
  - Laimo #85BC28
  - Žalia #459D54
  - Citrina #BAF54D
- Funkcinės spalvos:
  - Klaida #DB354A
  - Įspėjimas #FAB03B
- 5-15 procentų pustoniai naudotini fonams.
- 15-50 procentų pustoniai naudotini lentelėms, grafikams, piktogramoms, skirtukams ir pagalbiniams UI elementams.
- Vengti didelių ryškių spalvinių plotų. Smaragdas turi būti pagrindinis, bet naudojamas disciplinuotai.

Tipografija:
- Pagrindinis šriftas: "Nunito Sans", Arial, sans-serif.
- Jei nėra galimybės naudoti Nunito Sans, naudoti Arial.
- Antraštės turi būti aiškios, tvarkingos, dažniausiai Bold.
- Pagrindinio teksto spalva: Grafitas #2E3641.
- Antraštėms ir aktyviems elementams galima naudoti Smaragdas #00A072.
- Teksto hierarchija turi būti rami ir korporatyvinė, be perdėtai didelių marketinginių antraščių.
- Rekomenduojamas web dydžių principas:
  - H1: 32-40 px, Bold, Grafitas
  - H2: 24-28 px, Bold, Smaragdas arba Grafitas
  - H3: 18-20 px, Bold, Smaragdas
  - Body: 15-16 px, Regular, Grafitas
  - Small/table text: 13-14 px

Išdėstymas:
- Naudoti aiškią grid arba flex struktūrą.
- Turinys turi būti tvarkingai sulygiuotas, su ribotu maksimaliu pločiu, pvz. 1120-1280 px.
- Naudoti daug baltos erdvės.
- Tarpai turi būti nuoseklūs pagal 8 px sistemą: 8, 16, 24, 32, 48, 64 px.
- UI turi būti responsive ir gerai atrodyti desktop, tablet ir mobile ekranuose.
- Dizainas turi būti labiau darbo sistemos / enterprise įrankio, o ne reklaminio landing page pobūdžio.

Komponentai:
- Kortelės: baltas fonas, subtilus rėmelis #E1E2E4, labai lengvas šešėlis arba be šešėlio.
- Kortelių kampai: 8-12 px.
- Mygtukai:
  - Primary: Smaragdas #00A072, baltas tekstas.
  - Primary hover: Smaragdas-120 #128A76.
  - Secondary: baltas arba labai šviesus fonas, Grafitas tekstas, subtilus rėmelis.
  - Tertiary/link: Smaragdas tekstas, be sunkaus dekoravimo.
- Formos:
  - Input fonas baltas.
  - Rėmelis subtilus pilkas.
  - Focus būsena su Smaragdas #00A072.
  - Label aiškus, Grafitas spalvos.
- Lentelės:
  - Header fonui naudoti Žalia-15 #D7EEDB arba labai švelnų žalsvą pustonį.
  - Header tekstas Bold, Grafitas.
  - Linijos subtilios; akcentinė viršutinė linija gali būti Smaragdas.
  - Lentelės turi būti kompaktiškos, aiškios ir tinkamos finansinei / korporatyvinei informacijai.
- Piktogramos:
  - Linijinės, vienos spalvos, lakoniškos.
  - Dominuoja apvalinti, ne aštrūs kampai.
  - Viename ekrane naudoti vienodo linijų storio piktogramas.
  - Piktogramoms naudoti Smaragdas, Grafitas arba papildomas brand spalvas.

Grafiniai elementai:
- Jei naudojamas dekoratyvus linijinis motyvas, jis turi priminti energetikos infrastruktūros / miesto linijinę grafiką.
- Linijiniams grafiniams elementams naudoti Smaragdas #00A072 ant šviesaus fono.
- Ant tamsaus gradientinio fono svarbiausi elementai turi būti balti, o papildomi elementai Smaragdas-50 #16C492.
- Dekoratyvinius elementus naudoti subtiliai, kad jie neužgožtų turinio.

Gradientai:
- Kasdienėje HTML sąsajoje pagrindas turi būti šviesus.
- Tamsų žaliai-melsvą gradientą naudoti tik svarbiems hero, header, cover arba specialiems korporatyviniams blokams.
- Ant tamsaus gradiento naudoti baltą tekstą ir Smaragdas-50 akcentus.
- Papildomą Smaragdas-Laimo gradientą naudoti tik vidinės komunikacijos arba dekoratyviniams akcentams, ne kaip pagrindinį UI foną.

Interakcijos:
- Hover, active ir focus būsenos turi būti subtilios, aiškios ir profesionalios.
- Animacijos trumpos: 150-250 ms.
- Vengti agresyvių animacijų, per stiprių šešėlių, stiklinių efektų ar perteklinių dekoracijų.

Prieinamumas:
- Užtikrinti pakankamą kontrastą.
- Visi interaktyvūs elementai turi turėti aiškią focus būseną.
- Formos turi turėti label elementus.
- Mygtukai ir nuorodos turi būti aiškiai atpažįstami.

Techniniai reikalavimai:
- HTML turi būti semantiškas.
- CSS turi būti struktūruotas, su aiškiais kintamaisiais spalvoms, tarpams, radius ir šriftams.
- Vengti inline CSS.
- Stilius turi būti lengvai perkeliamas į didesnį projektą.
```

## Rekomenduojami CSS kintamieji

```css
:root {
  --color-emerald: #00A072;
  --color-emerald-50: #16C492;
  --color-emerald-120: #128A76;

  --color-graphite: #2E3641;
  --color-graphite-50: #737483;
  --color-graphite-30: #C7CDD3;
  --color-graphite-15: #E1E2E4;
  --color-graphite-5: #EFF1F1;

  --color-blue: #00667D;
  --color-cyan: #00A5C4;
  --color-lime: #85BC28;
  --color-green: #459D54;
  --color-lemon: #BAF54D;

  --color-green-15: #D7EEDB;
  --color-green-5: #EFF9F1;
  --color-cyan-5: #E8F7F9;

  --color-white: #FFFFFF;
  --color-black: #000000;
  --color-error: #DB354A;
  --color-warning: #FAB03B;

  --font-base: "Nunito Sans", Arial, sans-serif;

  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;

  --space-1: 8px;
  --space-2: 16px;
  --space-3: 24px;
  --space-4: 32px;
  --space-5: 48px;
  --space-6: 64px;

  --container-max: 1200px;

  --shadow-subtle: 0 8px 24px rgba(46, 54, 65, 0.08);
  --transition-fast: 180ms ease;
}
```

## Praktinė UI kryptis

HTML sąsaja turėtų atrodyti kaip tvarkingas įmonių grupės darbo įrankis: aiškus viršutinis meniu, šviesus fonas, balti turinio blokai, aiškūs formų laukai, kompaktiškos lentelės ir santūrūs smaragdo akcentai.

Rekomenduojama vengti:

- per ryškių gradientų pagrindiniame UI;
- tamsių fonų visoje aplikacijoje;
- didelių dekoratyvinių šešėlių;
- atsitiktinių spalvų, kurios nėra brandbook'o paletėje;
- agresyvių animacijų;
- landing page tipo kompozicijos, jei kuriamas vidinis darbo įrankis.

Rekomenduojama naudoti:

- šviesius fonus ir baltus paviršius;
- Smaragdas spalvą pagrindiniams veiksmams;
- Grafitas spalvą pagrindiniam tekstui;
- žalius ir melsvus pustonius fonams, lentelėms ir grafikams;
- linijines piktogramas;
- aiškią 8 px tarpų sistemą;
- semantišką HTML struktūrą.

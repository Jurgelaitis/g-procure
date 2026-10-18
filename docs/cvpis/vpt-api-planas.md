# VPT CVP IS API - išnaudojimo planas (2026-10-18)

Naudotojo nurodymas 2026-10-18: VPT API galimybes išnaudoti maksimaliai; į VPT nesikreipiame - ką galime rasti ir padaryti
patys (vieši duomenys, OpenAPI), darome patys.

## Ką duoda API

Viešas OpenAPI (`https://viesiejipirkimai.lt/epps-integration/v3/api-docs`, be rakto): du maršrutai, užklausoje - tik `pageSize`
ir `pageNum`.

- `cft-details-export` - visi CVP IS pirkimai (~80 400), 38 laukai (`AbstractCftDetailsDTO`). Serveris (`serveris/`) laiko VISUS
  laukus. Užpildymas (tikras 5 000 įrašų puslapis, 2026-10-18): pavadinimas, vykdytojas, paskelbimas, būdas, būsena, objektas,
  aprašymas - visada; BVPŽ 99 %, terminas 99,9 %, vertinimo kriterijus ir direktyva 83 %, vokų atplėšimas ir paaiškinimų pabaiga 83 %,
  trukmė ir galiojimas 71 %, vykdytojo kodas 76 % (LITGRID - dažnai be kodo, todėl atpažįstama pagal pavadinimą), numatoma vertė 46 %,
  sprendimo data 11 %, sutarties data 5 %, ES lėšos 9 % „taip“. Būsenos: Evaluation, Bid submission, Awarded, Concluded, Proposal
  Submission Closed, Awaiting bid opening, Cancelled ir kt.; 17 % - rinkos konsultacijos.
- `cft-details-participants-info-export` - ta pati schema OpenAPI apraše. Zondas serveryje 2026-10-18: mūsų raktui - HTTP 401
  `UNAUTHORIZED_API_KEY` („Please include a valid apiKey“), tas pats raktas `cft-details-export` - 200. Šiam raktui dalyvių duomenys
  nesuteikti; į VPT dėl to nesikreipiame (naudotojo taisyklė) - dalyvių ir laimėtojų duomenų ieškoma kituose viešuose šaltiniuose
  (pvz. TED skelbimai apie sutarties sudarymą tarptautiniams pirkimams).

## Serveris (2026-10-18b; diegiama kartu su atminties patikra)

- `/api/cvpis/pirkimas/<nr>` - kaip iki tol.
- `/api/cvpis/paieska` - filtrai `q`, `vykdytojas`, `ca`, `cpv` (pradžia, iki 5), `tipas`, `budas`, `busena` (ir `aktyvus`),
  `nuo` / `iki`, `rikiuoti` (naujausi / terminas), `psl` (po 20); atsakyme ir BVPŽ, objektas, vertė, tarptautinė vertė, vykdytojo kodas.
- `/api/cvpis/statistika` - tie patys filtrai: kiekiai pagal būdą, būseną, objektą, vertinimo kriterijų, direktyvą, kalbą;
  tarptautiniai, ES lėšos, dalimis, e. aukcionai, nutraukti, rinkos konsultacijos, aktyvūs; pasiūlymų teikimo laikotarpis pagal būdą
  ir tarptautinę vertę, nuo termino iki sprendimo ir iki sutarties, numatoma vertė, sutarties trukmė - kvantiliai (tik nuo 5 reikšmių);
  paskelbimai pagal mėnesį (36), dažniausi vykdytojai (10). Kešuojama iki naujo sąrašo.
- Išmatuota naršyklėje su 80 000 įrašų (tikri duomenys x16): paieška 9-30 ms, statistika 10-52 ms, indeksas 0,2 s.

## Kur naudojama (eilė)

1. **Mano pirkimai** - termino, paskelbimo datos ir būsenos patikra (padaryta 2026-10-18).
2. **Pirkimų kortelės** - pildymas pagal CVP IS numerį (padaryta); savo organizacijos pirkimai CVP IS, kurių dar nėra kortelėse -
   kortelė vienu paspaudimu (padaryta 2026-10-18b).
3. **PP-tiekejams** - pirkimų paieška pagal žodžius, BVPŽ, vykdytoją, objektą, tik aktyvūs; pasirinkus - CVP IS duomenų blokas (padaryta 2026-10-18b;
   veikia įdiegus serverio 2026-10-18b versiją).
4. **Rinkos duomenys pagal BVPŽ** - bendras komponentas: kiek panašių pirkimų, kokie būdai ir vertinimo kriterijai, faktiniai
   pasiūlymų teikimo laikotarpiai, sprendimo trukmė, vertės, nutraukimų dalis, kitų vykdytojų rinkos konsultacijos. Naudotojai:
   pirkimų grafikai (realūs terminai), TS asistentas ir rinkos konsultacija, kvalifikacija (vertės), kortelių forma.
5. **PP-plan** - plano eilutės ir paskelbti organizacijos pirkimai (BVPŽ ir pavadinimas): kas jau paskelbta, kada, kokia būsena.
6. **PP-salygos tikrinimas** - paketas prieš CVP IS duomenis (terminas, būdas, vertė, kalba), kai skelbimo PDF nėra.
7. **Dalyvių ir laimėtojų duomenys** - VPT dalyvių maršrutas mūsų raktui neprieinamas (401); galimas šaltinis - TED (tarptautiniai
   pirkimai): konkurencija, laimėtojai, sutarties vertės - PP-esg, derybos, rinkos apžvalga.

Principai: duomenys - tik vieši; naudotojo darbo duomenys į serverį - tik tai, kas būtina užklausai (numeris, filtrai), ir tik
paspaudus; neįkeltas sąrašas ar ryšio klaida - niekada „nėra“; kiekvienas naujas srautas - privatumo politikoje.

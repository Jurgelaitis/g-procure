# G-Procure naudojimosi statistika (PostHog) - įvykių sąrašas

Patvirtinta naudotojo 2026-10-16 („Įvykių sąrašas tinka. Siūlau išjungti vietos nustatymą pagal IP. Taip, prašau įtraukti
PP-tiekejams.“). Įgyvendinta `shared/analitika.js` (žodynas - `IVYKIAI`, šis sąrašas ir kodas turi sutapti: `shared/testai.html`
sargas tikrina abiem kryptimis - kode nėra veiksmo, kurio nėra žodyne, o žodyne nėra veiksmo, kurio kodas nesiunčia).

Naudotojo sprendimai (2026-10-16): griežtas variantas; statistika veikia TIK lankytojui sutikus; vieta pagal IP - išjungta;
PP-tiekejams įtrauktas su tuo pačiu sutikimu; duomenų apsaugos pareigūno peržiūra - vėliau; PostHog paskyra - ES regione
(PostHog ES debesis, duomenys Vokietijoje).

---

## 1. Principai

1. **Tik su sutikimu.** Slapukų lange nauja kategorija „Naudojimosi statistika“, numatyta - išjungta. Be sutikimo PostHog biblioteka
   net neįkeliama. Atšaukus sutikimą - siuntimas iškart sustabdomas.
2. **Nieko naršyklėje.** PostHog režimas be slapukų (`cookieless_mode: "always"`, saugykla - tik atmintyje): jokių slapukų,
   localStorage ar sessionStorage įrašų. Lankytojo kodą PostHog serveris skaičiuoja iš IP, naršyklės aprašo, svetainės ir
   kasdien keičiamos druskos, o druską ištrina - kitą dieną tas pats žmogus atrodo kaip naujas.
3. **Be asmens profilių.** `person_profiles: "never"` - PostHog nekuria žmonių profilių, `identify` nenaudojamas.
4. **Be IP ir vietos.** PostHog projekte IP adresai nesaugomi, vietos nustatymas pagal IP (šalis, miestas) išjungtas.
5. **Be automatinio rinkimo.** Išjungta: automatinis paspaudimų rinkimas, sesijų įrašymas, šiluminiai žemėlapiai,
   apklausos, klaidų automatinis rinkimas, „mirę paspaudimai“, puslapio peržiūros PostHog būdu.
6. **Tik šio sąrašo įvykiai ir tik žodyno reikšmės.** Vienas bendras failas `shared/analitika.js`: įvykis, kurio nėra
   sąraše, ar savybė su reikšme ne iš žodyno - neišsiunčiama. Laisvo teksto savybių nėra.
7. **Be išorinio kodo.** PostHog biblioteka - svetainėje (`shared/vendor/`, versija be išorinių priedų), į PostHog serverius
   kreipiamasi tik duomenims išsiųsti (`https://eu.i.posthog.com`, įrašoma į CSP).
8. **Testai.** Kiekvienas įvykis tikrinamas: be sutikimo - nieko; su sutikimu - tik sąrašo savybės, jokio teksto iš laukų,
   jokio adreso parametro.

## 2. Ko niekada nesiunčiame

- Įvestų laukų tekstas, pirkimų pavadinimai ir numeriai, CVP IS numeriai, kortelės ir juodraščio identifikatoriai.
- Numatoma vertė, sumos, kainos (ir intervalais).
- Tiekėjų, asmenų pavadinimai, vardai, el. paštai, telefonai.
- Failų vardai ir turinys, DI užklausų ir atsakymų turinys, klaidų pranešimų tekstas.
- Adreso parametrai (`?kortele=`, `?juodrastis=`, `#irasas=` ir kt.) ir visas ankstesnio puslapio adresas.
- IP adresas, šalis ir miestas, naršyklės ir operacinės sistemos versija, ekrano raiška.

## 3. Bendros savybės (prie kiekvieno įvykio)

| Savybė | Reikšmės | Kam |
|---|---|---|
| `modulis` | PP-plan, PP-market-KPI, PP-ts, PP-qual, PP-salygos, PP-cost-benefit, PP-graphs, PP-protocol, PP-negotiation, PP-report, PP-esg, PP-carbon, PP-tiekejams, PP-teise, portalas, korteles, kita | kuris įrankis |
| `puslapis` | puslapio kelias be parametrų (pvz. `/PP-salygos/PP-SALYGOS.html`) | kuris puslapis |
| `kalba` | lt, en | ar naudojama EN |
| `irenginys` | telefonas (< 768 px), plansete (768-1179 px), kompiuteris (>= 1180 px) | ar verta tobulinti telefoną |

## 4. Įvykiai

### A. Visuose puslapiuose (įgyvendinama bendruose failuose)

| # | Įvykis | Kada | Savybės (be bendrų) | Ką atsakys |
|---|---|---|---|---|
| 1 | `puslapis_atvertas` | atvėrus puslapį | `atverta_is`: portalas / kitas_modulis / isorinis / tiesiogiai; `su_kortele`: taip / ne | kurie įrankiai naudojami, iš kur ateinama, ar naudojamos kortelės |
| 2 | `di_uzklausa` | baigus DI užklausą (`shared/ai-proxy.js`) | `rezultatas`: pavyko / klaida / atsaukta; `klaidos_rusis`: tinklas / per_didelis_failas / per_daug_uzklausu / atmesta / serverio / kita; `trukme`: iki_10s / 10_30s / 30_60s / virs_60s; `bandymai`: 1-4 | ar DI patikimas, kiek laukiama |
| 3 | `veiksmo_rezultatas` | baigus ilgą veiksmą (`shared/busena.js`), kai modulis jam davė pavadinimą | `veiksmas`: žodynas (žr. D); `rezultatas`: pavyko / klaida / atsaukta; `trukme` | kur veiksmai nepavyksta |
| 4 | `biblioteka_neisikele` | neįsikėlus bibliotekai (`shared/bibliotekos.js`) | `biblioteka`: pdfjs / jszip / mammoth / sheetjs / docx / filesaver / chartjs / jspdf | ar veikia bibliotekų atmintis, ar kas blokuoja |
| 5 | `failas_atsisiustas` | atsisiuntus dokumentą | `dokumentas`: žodynas (žr. D); `formatas`: docx / xlsx / pdf / zip / json / csv | kurie dokumentai realiai naudojami |

### B. Pirkimo kortelė, portalas, atsarginė kopija

| # | Įvykis | Kada | Savybės | Ką atsakys |
|---|---|---|---|---|
| 6 | `kortele_issaugota` | išsaugojus pirkimo kortelę | `saltinis`: korteliu_puslapis / modulis / cvp_is_skelbimas / pp_protocol_perkelimas / pp_plan; `nauja`: taip / ne | ar kortelė naudojama, iš kur kuriama |
| 7 | `mano_pirkimai_paspausta` | paspaudus įrankį bloke „Mano pirkimai“ | `irankis`: modulio pavadinimas; `etapas`: planuojama / rengiama / paskelbta / vertinama / kita | ar „Mano pirkimai“ veda į reikiamus įrankius |
| 8 | `atsargine_kopija` | išsaugojus ar atkūrus kopiją | `veiksmas`: issaugota / atkurta; `rezultatas`: pavyko / klaida | ar naudojamasi kopija |

### C. PP-salygos (pirkimo sąlygos ir sutartys)

| # | Įvykis | Kada | Savybės | Ką atsakys |
|---|---|---|---|---|
| 9 | `salygos_zingsnis` | atvėrus žingsnį | `zingsnis`: 1 / 2 / sutartis / 4; `budas`: pirkimo būdo kodas (T-AK, S-AK, ...); `dokumentu_kalba`: lt / lt_en; `istatymas`: PI / VPI | kur sustojama, kurie būdai populiariausi |
| 10 | `salygos_generavimas` | baigus generavimą | `rezultatas`: pavyko / klaida; `apimtis`: salygos / salygos_ir_sutartis; `sutartis`: šeimos kodas / nerengiama / atideta; `budas`; `trukme` | ar generavimas patikimas, kurios sutartys rengiamos |
| 11 | `salygos_juodrastis` | veiksmas su juodraščiu | `veiksmas`: issaugoti_veliau / testi / atsisiusti / ikelti / istrinti | ar naudojamasi pauze ir tęsimu |
| 12 | `dokumentu_tikrinimas` | baigus „Tikrinti parengtus dokumentus“ | `rezultatas`: pavyko / klaida; `dokumentai`: 1-99; `kliutys`, `nukrypimai`, `patikrinkite`: 0-99 (skaičiai, be turinio) | ar patikra naudojama ir randa ką taisyti |

### D. Kiti moduliai - vienas įvykis su veiksmų žodynu

| # | Įvykis | Kada | Savybės | Ką atsakys |
|---|---|---|---|---|
| 13 | `modulio_veiksmas` | atlikus pagrindinį modulio veiksmą | `veiksmas` (žr. žemiau) ir, kur nurodyta, viena papildoma savybė | kuris modulio funkcionalumas naudojamas |

| Modulis | `veiksmas` | Papildoma savybė |
|---|---|---|
| PP-ts | ts_sugeneruota, ts_patikrinta, konsultacijos_kvietimas, konsultacijos_suvestine, susitikimo_santrauka | `objektas`: prekes / paslaugos / darbai |
| PP-qual | reikalavimai_sugeneruoti, reikalavimai_patikrinti | `objektas` |
| PP-protocol | protokolas_sukurtas, pranesimai_sukurti, uzklausa_nukopijuota | `protokolas`: šablono kodas (D3, D6, N6...) |
| PP-negotiation | pasiulymai_ikelti, matrica_perziureta, rekomendacijos_perziuretos, uzklausa_nukopijuota | `failai`: 1-99 (tik importui) |
| PP-plan | planas_ikeltas, centralizavimas_perziuretas, kortele_is_plano | - |
| PP-report | pazyma_sukurta | `priedas`: 1 / 2 |
| PP-graphs | grafikas_sukurtas (spausdinant ar įrašant PDF) | `budas` |
| PP-market-KPI | apzvalga_sudaryta, veiksmai_irasyti_i_kortele, salyga_nukopijuota | `profilis`: profilio kodas |
| PP-cost-benefit | vertinimas_suskaiciuotas, kna_issaugota | `dalis`: skaiciuokle / kna |
| PP-carbon | skaiciavimas_atliktas, epd_ikeltas | - |
| PP-esg | sankciju_vertinimas, tiekejas_pridetas | - |
| PP-tiekejams | paketas_ikeltas, klausimas_paklaustas, kontrolinis_sarasas | `failai`: 1-99 (tik paketui) |
| PP-teise | irasas_atvertas | `rusis`: dokumento rūšies kodas iš registro |

`dokumentas` (įvykis 5): sps, bps, formos, sutartis, paketas_zip, ts, kvalifikacija, protokolas, pranesimas, pazyma,
grafikas, derybu_analize, planas, rinkos_apzvalga, vertinimo_priedas, kna, anglies_ataskaita, esg_ataskaita, juodrastis,
tikrinimo_ataskaita, konsultacija, kopija, kita.

`budas` - tik `GP_METHODS` kodas (`GP_ANALITIKA.budas()`; kai klasifikatorius puslapyje įkeltas - ir jame esantis),
`sutartis` (įvykis 10) - tik PP-salygos `GP_SUTARTYS.SEIMOS` šeima arba „nerengiama“ / „atideta“ (testas sutikrina).

## 5. PostHog paskyros nustatymai

Atliko Claude (naudotojo leidimas 2026-10-16), patikrinta ekrane po perkrovimo (2026-10-16):
- projektas - g-procure.com (Nr. 307738, ES debesis), laiko juosta Europe/Vilnius, savaitė - nuo pirmadienio;
- skaičiavimas be slapukų (Web analytics > Cookieless tracking) - įjungtas (be jo PostHog įvykių be slapukų nepriima);
- IP adresai - atmetami (Privacy > Discard client IP data); GeoIP transformacija (vieta pagal IP) - sustabdyta;
- automatinis paspaudimų rinkimas, „dead clicks“, „web vitals“, sesijų įrašymas (ir konsolės bei tinklo užklausų įrašai),
  šiluminiai žemėlapiai, klaidų rinkimas, apklausos - išjungta projekte (dviguba apsauga: ir bibliotekos nustatymuose);
- duomenų saugojimo terminas - nemokamo plano 1 metai (nustatymo nėra; posthog.com/pricing, žiūrėta 2026-10-16).

Patikrinti faktai politikoms (posthog.com/dpa, /subprocessors, /docs/privacy/gdpr-compliance, /tutorials/cookieless-tracking,
žiūrėta 2026-10-16): duomenų tvarkytojas - PostHog, Inc. (JAV); ES debesis - Amazon Web Services Vokietijoje (Frankfurte);
DPA 10.2 p. - tvarkymas galimas ir už EEE (pagal sub-tvarkytojų sąrašą), 10.3 p. - PostHog nurodo dalyvaujanti ES ir JAV
duomenų privatumo sistemoje, 1.1.16.2 p. - ES standartinės sutarčių sąlygos (2021/914, tik 2 modulis), 7.1 p. - pranešimas
apie pažeidimą be nepagrįsto delsimo; dienos kodas - hash(projektas, dienos druska, IP, naršyklės tipas, svetainė), druska
ištrinama apdorojus dienos įvykius.

Atliko naudotojas (sutartys ir jo paskyros saugumas - ne Claude), 2026-10-16:
- duomenų tvarkymo sutartis (DPA) su PostHog pasirašyta (Organization > Legal documents; šalis - G-Procure teikėjas, kaip privatumo politikoje);
- dviejų veiksnių autentifikacija (2FA) jo PostHog paskyroje įjungta;
- `https://www.qskigali.org/` Web analytics domenų sąraše paliktas (jo kitas projektas); šio projekto rakto qskigali svetainėje nenaudoti -
  jai skirtas atskiras PostHog projektas (kitaip jos įvykiai susimaišytų su G-Procure statistika, kurią aprašo G-Procure privatumo politika);
- kitų narių į projektą nekviesti, kol nepasitarta su duomenų apsaugos pareigūnu.

## 6. Kas atnaujinta kartu (2026-10-16)

- Slapukų langas: kategorija „Naudojimosi statistika“ (jungiklis, numatyta - išjungta), sutikimo versija `2026-10-16-2` -
  kiekvienas lankytojas paklausiamas vieną kartą iš naujo.
- `privatumas.html` (LT / EN): santrauka, vaidmenys (G-Procure teikėjas - valdytojas, PostHog - tvarkytojas), duomenų lentelės
  eilutė (11 eilučių), 4 skyriaus poskyris „Naudojimosi statistika“, gavėjai, perdavimas už ES, terminai, teisės, istorija;
  `slapukai.html` (LT / EN): kategorija, trečiosios šalies paslauga, sprendimo būsena; `ai-valdymas.html` - DI užklausų
  statistika (tik rezultatas, trukmė, bandymai, klaidos rūšis). „Įrankis nieko nesiunčia“ (derybos, DI valdymas) - „į DI nieko
  nesiunčia“.
- Pridedant įvykį ar veiksmą: pirma - šis sąrašas ir `IVYKIAI`, tada kodas; nauja savybė - tik uždaras sąrašas, skaičius su
  ribomis arba griežta formos išraiška; laisvo teksto nebūna. Pasikeitus renkamų duomenų rūšiai - atnaujink politikas ir
  sutikimo `VERSIJA`.

## 7. Klausimai naudotojui

Atsakyta 2026-10-16: sąrašas tinka; vieta pagal IP - išjungti; PP-tiekejams - įtraukti. Likę jo darbai - 5 skyriaus pabaigoje.

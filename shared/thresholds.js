/* ==================== VPT VERTĖS RIBOS ====================
 * Galioja nuo 2026-01-01. VPT jas atnaujina (paprastai kas 2 metus) -
 * tada atnaujink TIK šį failą (vienas tiesos šaltinis visiems moduliams).
 *
 * VPI - perkančioji organizacija (VPĮ, klasikinė direktyva 2014/24/ES)
 * PI  - perkantysis subjektas (PĮ sektorinis, direktyva 2014/25/ES)
 *
 * Visos vertės - EUR be PVM.
 * Naudojimas: window.GP_THRESHOLDS.VPI.intl_goods ir t. t.
 */
window.GP_THRESHOLDS = {
  VPI: { intl_goods: 216000, intl_goods_cva: 140000, intl_special: 750000, intl_works: 5404000, mv_goods: 70000, mv_works: 174000 },
  PI:  { intl_goods: 432000, intl_special: 1000000, intl_works: 5404000, mv_goods: 70000, mv_works: 174000 },
  // Dalių išimtis (abu įstatymai, GP_TEISE "dalys_supaprastintai"; perskaityta e-tar 2026-09-26): tarptautinės vertės
  // pirkimo dalims, kurių kiekviena mažesnė už šias sumas, galima supaprastinta tvarka, jei jų bendra vertė
  // ne didesnė kaip dalisProc procentų visų dalių vertės. Skaičiai įrašyti pačiame įstatyme (ne VPT peržiūrimi).
  DALYS: { prekes_paslaugos: 80000, darbai: 1000000, dalisProc: 20 },
  // Pirkimo sutarties turinio reikalavimų išimtis (PĮ 95 str. 4 d. / VPĮ 87 str. 5 d., GP_TEISE "sut_isimtis"; perskaityta e-tar
  // 2026-10-09): reikalavimai gali būti netaikomi raštu sudaromai sutarčiai, kurios numatoma vertė mažesnė už šią sumą. Įrašyta įstatyme.
  SUTARTIS: { reikalavimaiNuo: 15000 },
  // EPSO-G politikos slenkstis kastu-naudos analizei (pp-cost-benefit).
  // PASTABA: politikos (ne istatymo) riba, diskusines stadijos - tikslinti patvirtinus.
  CBA: { privaloma: 20000000, rekomenduojama: 10000000 }
};

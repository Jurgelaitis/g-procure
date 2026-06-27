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
  PI:  { intl_goods: 432000, intl_special: 1000000, intl_works: 5404000, mv_goods: 70000, mv_works: 174000 }
};

/* ============================================================================
 * G-Procure  shared/neissaugotas-darbas.js   (v1.0)
 * ----------------------------------------------------------------------------
 * Įspėjimas prieš uždarant puslapį su neišsaugotu darbu (window.GP_DARBAS).
 *
 * KODĖL. PP-qual, PP-salygos ir PP-graphs sąmoningai nieko nesaugo naršyklėje -
 * rezultatas atsiduria tik atsisiųstame dokumente. Iki 2026-09-25 uždarius
 * kortelę, perkrovus puslapį ar paspaudus nuorodą visas įvestas darbas dingdavo
 * be jokio klausimo. Dabar naršyklė paklausia, ar tikrai išeiti, jei po
 * paskutinio atsisiuntimo kas nors pasikeitė. Nieko nesaugoma ir niekur
 * nesiunčiama - privatumo nuostata nekeičiama.
 *
 * KAS LAIKOMA PAKEITIMU:
 *  - tikri naudotojo įvykiai input, change ir drop (isTrusted): rašymas,
 *    pasirinkimai, įkelti failai. Programiniai įvykiai (dispatchEvent) darbo
 *    nekuria, todėl modulio pradinis užpildymas ir testai įspėjimo nesukelia;
 *  - modulio būsena, jei modulis ją paduoda: GP_DARBAS.stebek(() => [...]).
 *    Taip pagaunami ir mygtukais atlikti pakeitimai (patvirtinimas, AI
 *    rezultatas, pridėtas etapas), kurių input / change įvykiai nerodo.
 *
 * NAUDOJIMAS modulyje:
 *   <script src="../shared/neissaugotas-darbas.js"></script>
 *   GP_DARBAS.stebek(() => [busena]);  // po inicializacijos; be argumento - tik įvykiai
 *   GP_DARBAS.atskaita();              // atsisiuntus dokumentą arba išvalius formą
 *   const m = GP_DARBAS.momentas();    // sugeneravus; atsisiuntus - GP_DARBAS.atskaita(m),
 *                                      // kad po generavimo įvesti pakeitimai liktų nauji
 *   GP_DARBAS.pakeista();              // true - uždarant bus klausiama
 *
 * Klaida skaičiuojant būseną NIEKADA nereiškia „nėra ką prarasti“ - tada
 * klausiama. Klausimo tekstą rodo pati naršyklė, puslapis jo pakeisti negali.
 * ==========================================================================*/
(function (global) {
  "use strict";

  var doc = global.document;
  if (!doc) return;

  var busena = null;     // modulio būsenos funkcija (neprivaloma)
  var ivykiai = 0;       // tikrų naudotojo įvykių skaičius
  var atskaita = null;   // parašas, nuo kurio skaičiuojami pakeitimai (null - nežinomas)
  var ijungta = false;   // modulis pasakė, ką stebėti

  ["input", "change", "drop"].forEach(function (tipas) {
    doc.addEventListener(tipas, function (e) { if (e.isTrusted) ivykiai++; }, true);
  });

  /* Parašas = įvykių skaičius + modulio būsena. Būsenos klaida išmetama toliau. */
  function parasas() {
    var b = busena ? busena() : "";
    return ivykiai + "|" + (typeof b === "string" ? b : JSON.stringify(b));
  }

  function pakeista() {
    if (!ijungta) return false;
    try { return atskaita === null || parasas() !== atskaita; }
    catch (e) { return true; }
  }

  function nustatykAtskaita(momentas) {
    if (momentas !== undefined) { atskaita = momentas; return; }
    try { atskaita = parasas(); } catch (e) { atskaita = null; }
  }

  global.GP_DARBAS = {
    stebek: function (f) {
      busena = typeof f === "function" ? f : null;
      ijungta = true;
      nustatykAtskaita();
    },
    atskaita: nustatykAtskaita,
    momentas: function () { try { return parasas(); } catch (e) { return null; } },
    pakeista: pakeista
  };

  global.addEventListener("beforeunload", function (e) {
    if (!pakeista()) return;
    e.preventDefault();
    e.returnValue = true;   // senesnėms naršyklėms (Chrome iki 119 versijos)
  });
})(typeof window !== "undefined" ? window : this);

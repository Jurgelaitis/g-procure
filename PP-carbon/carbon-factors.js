/* ============================================================================
 * G-Procure  pp-carbon/carbon-factors.js   (v0.1 - MVP pamatas)
 * Tarsos faktoriu biblioteka projektu SESD (siltnamio efekta sukelianciu duju)
 * skaiciavimui: GHG protokolas, EN 15804 (A1-A3 moduliai); prielaidos - pagal Litgrid 2025 m. projektu SESD
 * skaiciavimu praktika (ne oficiali patvirtinta metodika; naudotojo patikslinimas 2026-10-14).
 * Faktoriai = kg CO2e uz vieneta, nebent nurodyta kitaip.
 * 2026-10-17: pavadinimai, pastabos ir vienetai - su lietuviškomis raidėmis (iki tol „Gelzbetonines atramos“); id nekeisti -
 * pagal juos saugomi skaičiuoklės kiekiai, o ŠESD istorija senus pavadinimus lygina be diakritikų (index.html istorijosPavadinimas).
 *
 * SVARBU - duomenu kokybe:
 *  - supplierProvided:true  => faktorius is gamintojo EPD (metodikoje "[UZKLAUSTI]");
 *                              kol nera EPD, naudojamas worst-case arba paliekamas tuscias.
 *  - review:"..."           => faktorius dar nesusistovejes, tikrinti su metodikos savininku.
 *  - Konservatyvumo taisykle (is metodikos): jei tikslumas mazas, rinktis prielaida,
 *    duodancia DIDESNI SESD.
 *
 * Naudojimas:  <script src="carbon-factors.js"></script>  ->  window.GP_CARBON_FACTORS
 * ========================================================================== */
(function (root) {
  "use strict";

  var FACTORS = {
    meta: {
      version: "0.1",
      methodology: "Litgrid projektų ŠESD vertinimo praktika (2025 m.; ne oficiali patvirtinta metodika)",
      standard: "GHG Protocol; EN 15804 (A1-A3)",
      unitDefault: "kg CO2e / vienetas",
      note: "MVP pamatas. Faktorių šaltinius ir vienetus patvirtinti su Aplinkos sk."
    },

    // --- 1. PROJEKTAVIMO / PLANAVIMO ETAPAS ---
    planning: [
      { id:"transport_diesel", label:"Transportas - dyzelinas", value:2.513, unit:"kg CO2e/l", basis:"Kuro degimas", note:"LG ir rangovų kelionės" },
      { id:"transport_petrol", label:"Transportas - benzinas", value:2.084, unit:"kg CO2e/l", basis:"Kuro degimas" },
      { id:"transport_ev",     label:"Transportas - elektra", value:0.56791, unit:"kg CO2e/kWh", basis:"LT tinklo intensyvumas", note:"Tik ne LG elektromobiliai" },
      { id:"computers",        label:"Kompiuterių elektra", value:0.015, unit:"kg CO2e/(val x žmogus)", basis:"LT tinklo intensyvumas" }
    ],

    // --- 2.1 ELEKTROS PERDAVIMO LINIJOS IRANGA ---
    lineEquipment: [
      { id:"pole_concrete", label:"Gelžbetoninės atramos", value:314, unit:"kg CO2e/vnt", basis:"A1-A3" },
      { id:"pole_steel",    label:"Metalinės atramos / konstrukcijos", value:1.85, unit:"kg CO2e/kg", basis:"Plienas A1-A3" },
      { id:"acsr",          label:"Oro linijų trosai (ACSR)", value:6.76, unit:"kg CO2e/kg", basis:"Al + plienas", review:"Vienetas km/kg/m svyruoja tarp lapų - patvirtinti" },
      // ZTSK - zaibosaugos trosai su sviesolaidiniu kabeliu. Faktoriai nesusistoveje.
      { id:"ztsk_12f", label:"ZTSK 12F", value:297.35, unit:"kg CO2e/km", basis:"Žaibosaugos trosas", review:"Y lape 297.35/km, X lape 6.3/m - vienetai nesutampa" },
      { id:"ztsk_24f", label:"ZTSK 24F", value:356.27, unit:"kg CO2e/km", review:"Metodikoje pažymėta: ištrinti ir pakoreguoti" },
      { id:"ztsk_48f", label:"ZTSK 48F", value:463.41, unit:"kg CO2e/km", review:"Patvirtinti" },
      { id:"ztsk_72f", label:"ZTSK 72F", value:581.78, unit:"kg CO2e/km", review:"Patvirtinti" },
      { id:"ztsk_96f", label:"ZTSK 96F", value:825.67, unit:"kg CO2e/km", review:"Patvirtinti" },
      { id:"fo_12f", label:"Požeminis šviesolaidinis 12F", value:589.42, unit:"kg CO2e/km" },
      { id:"fo_24f", label:"Požeminis šviesolaidinis 24F", value:655.96, unit:"kg CO2e/km" },
      { id:"fo_48f", label:"Požeminis šviesolaidinis 48F", value:832.79, unit:"kg CO2e/km" },
      { id:"fo_96f", label:"Požeminis šviesolaidinis 96F", value:1180.71, unit:"kg CO2e/km" },
      { id:"cable_power", label:"Požeminis energijos kabelis", value:980, unit:"kg CO2e/km" },
      { id:"insulators_line", label:"Izoliatoriai (keramika/polimerai)", value:1.0, unit:"kg CO2e/kg", note:"Max faktorius (diapazonas 0.3-1.0)", review:"Konservatyvi viršutinė riba" }
    ],

    // --- 2.2 PASTOCIU PAGRINDINE IRANGA ---
    substationEquipment: [
      { id:"transformer_cu", label:"Galios transformatoriai (varis)", value:3.524, unit:"kg CO2e/kg Cu", basis:"Jei žinoma Cu masė" },
      { id:"transformer_steel", label:"Galios transformatoriai (plienas)", value:1.85, unit:"kg CO2e/kg plieno", basis:"Jei žinoma plieno masė" },
      { id:"breaker", label:"Jungtuvai (110-400 kV dujiniai)", value:null, unit:"kg CO2e/vnt", supplierProvided:true, note:"Reikalauti EPD iš gamintojo" },
      { id:"disconnector", label:"Skyrikliai (110-400 kV)", value:null, unit:"kg CO2e/vnt", supplierProvided:true, note:"Reikalauti EPD" },
      { id:"meas_transformer", label:"Matavimo transformatoriai", value:null, unit:"kg CO2e/vnt", supplierProvided:true, note:"Reikalauti EPD" },
      { id:"busbar_al", label:"Vamzdiniai šynolaidžiai", value:8.24, unit:"kg CO2e/kg Al", basis:"Aliuminio komponentai" },
      { id:"battery", label:"Akumuliatorių baterijos", value:null, unit:"kg CO2e/vnt", supplierProvided:true, note:"Reikalauti EPD; galimos žalesnės alternatyvos" },
      { id:"shunt_reactor", label:"Šuntinis reaktorius", value:3.524, unit:"kg CO2e/kg Cu", basis:"Vario apvijos" },
      { id:"cells_10kv", label:"10 kV narveliai (metaliniame gaubte)", value:null, unit:"kg CO2e/vnt", supplierProvided:true, note:"Reikalauti EPD" },
      { id:"gis_110", label:"GIS įrenginiai (110 kV SF6)", value:null, unit:"kg CO2e/vnt", supplierProvided:true, note:"Reikalauti EPD; SF6-free alternatyvos" }
    ],

    // --- 2.3 STATYBINE DALIS ---
    construction: [
      { id:"concrete", label:"Betonas C30/37", value:288, unit:"kg CO2e/m3", basis:"Gelžbetonis" },
      { id:"rebar", label:"Armatūra", value:0.507, unit:"kg CO2e/kg", basis:"Plieno armatūra" },
      { id:"steel_struct", label:"Plieninės konstrukcijos", value:1.85, unit:"kg CO2e/kg", basis:"Konstrukcijos ir tvoros" },
      { id:"aluminium", label:"Aliuminio komponentai", value:8.24, unit:"kg CO2e/kg" },
      { id:"copper", label:"Vario komponentai", value:3.524, unit:"kg CO2e/kg" },
      { id:"pvp", label:"Pastotės valdymo pultas (PVP)", value:null, unit:"kg CO2e/vnt", supplierProvided:true, note:"Pasitikslinti apimtį" },
      { id:"ac_units", label:"Kondicionieriai", value:null, unit:"kg CO2e/vnt", supplierProvided:true, note:"Reikalauti EPD" }
    ],

    // --- 2.4 RELINE APSAUGA IR AUTOMATIKA ---
    relayProtection: [
      { id:"relays", label:"Mikroprocesorinės relės", value:null, unit:"kg CO2e/vnt", supplierProvided:true, note:"Reikalauti EPD" },
      { id:"control_meas", label:"Valdymo ir matavimo įranga", value:null, unit:"kg CO2e/vnt", supplierProvided:true, note:"Reikalauti EPD" }
    ],

    // --- 3. TRANSPORTAVIMAS (medziagu pervezimas) ---
    // DEMESIO: sios reiksmes atitinka zinomas g CO2e/(t*km) reiksmes (kelias ~137, gelez. ~24,
    // juru ~7, oro ~1036). Metodikos skaiciuokleje sumos eilute tikisi kg - galima vienetu
    // neatitiktis (reiketu /1000). Patvirtinti su metodikos savininku pries naudojant verslui.
    transport: [
      { id:"truck", label:"Sunkvežimiais", value:137, unit:"g CO2e/(t*km)?", basis:"Kelias", review:"Vienetas g vs kg - patikrinti, gali reikėti /1000" },
      { id:"train", label:"Traukiniais", value:24, unit:"g CO2e/(t*km)?", basis:"Geležinkelis", review:"Vienetas g vs kg" },
      { id:"ship", label:"Laivais", value:7, unit:"g CO2e/(t*km)?", basis:"Jūrų transportas", review:"Vienetas g vs kg" },
      { id:"plane", label:"Lėktuvais", value:1036, unit:"g CO2e/(t*km)?", basis:"Oro transportas", review:"Vienetas g vs kg" }
    ],

    // --- 4. STATYBOS DARBU ETAPAS ---
    constructionWorks: [
      { id:"cw_diesel", label:"Transportas - dyzelinas", value:2.513, unit:"kg CO2e/l", basis:"Sunkioji technika" },
      { id:"cw_petrol", label:"Transportas - benzinas", value:2.084, unit:"kg CO2e/l", basis:"Lengvoji technika" },
      { id:"cw_ev", label:"Transportas - elektra", value:0.56791, unit:"kg CO2e/kWh", basis:"Elektrinė technika" },
      { id:"cw_genset", label:"Dyzelgeneratorių kuras", value:2.513, unit:"kg CO2e/l", basis:"Kilnojamos el. stotelės" },
      { id:"cw_grid", label:"Elektra statybvietėje", value:0.56791, unit:"kg CO2e/kWh", basis:"Prijungta prie tinklo" }
    ],

    // --- EKSPLOATACINIAI (II dalis) ---
    operational: [
      { id:"op_diesel", label:"Dyzelinas (automobiliai)", value:2.513, unit:"kg CO2e/l" },
      { id:"op_petrol", label:"Benzinas (automobiliai)", value:2.084, unit:"kg CO2e/l" },
      { id:"op_sf6", label:"SF6 dujų nutekėjimas", value:24300, unit:"kg CO2e/kg", basis:"SF6 GWP", note:"Jei projektas nekeičia SF6 - nerašyti" },
      { id:"op_electricity", label:"Savos reikmės elektra / nuostoliai", value:0.56791, unit:"kg CO2e/kWh", basis:"LT tinklo intensyvumas" }
    ]
  };

  root.GP_CARBON_FACTORS = FACTORS;
})(typeof window !== "undefined" ? window : this);

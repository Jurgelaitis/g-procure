/* ==================== PIRKIMO BUDU TAKSONOMIJA ====================
 * Vienas tiesos saltinis pirkimo budams VISIEMS G-Procure moduliams
 * (analogiskas shared/thresholds.js). Keiciant buda ar pavadinima - keisk
 * TIK sita faila.
 *
 * VPI - perkancioji organizacija (VPI, klasikine direktyva 2014/24/ES)
 * PI  - perkantysis subjektas (PI sektorinis, direktyva 2014/25/ES). LITGRID = PI.
 *
 * MODELIS (dekomponuotas). Tikrai nepriklausomos yra dvi asys - PROCEDURA x
 * REZIMAS; "derybos" ir "skelbiama" daugumai budu ISVEDAMI is proceduros
 * (laisvi tik mazos vertes apklausoje). Enumeruojam TIK galiojancias kombinacijas
 * (validity table kaip duomenys), ne grynasandauga.
 *
 * IRASU LYGMENYS (statusas):
 *   pagrindinis - vartotojo 12 punktu (11 + apklausa zodziu); UI branduolys.
 *   bazinis     - proceduros lygmens irasas su rezimas:null (AK/SD/ND/MV).
 *                 Naudojamas migruojant saltinius, kurie rezimo NETURI - kad
 *                 rezimas NEBUTU ISGALVOTAS. UI paprastai nerodomas.
 *   papildomas  - retesnes procedūros / instrumentai (RK/KD/IP/KS/PS/CPO/VS).
 *   legacy      - tik atgaliniam suderinamumui (KONC); UI nerodyti.
 *
 * KODAI suderinti su pp-graphs / pp-plan (T-AK, S-ND, MV-SAD, DPS, DPS-K...).
 *
 * TEISINIS PATIKSLINIMAS: laukai su `tikslinti` PI (sektorinio istatymo) poziuriu
 * dar netvirtinti. NENAUDOK ju kaip teisinio fakto nepatikrines su PI tekstu.
 *
 * Naudojimas:
 *   GP_METHODS.byId('T-SD')
 *   GP_METHODS.listValid({ grupe:'mazos_vertes', skelbiama:false })
 *   GP_METHODS.fromLegacy('pp-ts', 'open', { international:true }) -> T-AK
 *   GP_METHODS.toModule('pp-protocol', 'T-AK')                    -> 'atviras_tarptautinis'
 */
(function (root) {
  "use strict";

  var PROCEDUROS = {
    mv_apklausa:        'Mažos vertės apklausa',
    atviras:            'Atviras konkursas',
    ribotas:            'Ribotas konkursas',
    skelb_derybos:      'Skelbiamos derybos',
    neskelb_derybos:    'Neskelbiamos derybos',
    konkur_dialogas:    'Konkurencinis dialogas',
    inovac_partner:     'Inovacijų partnerystė',
    kvalif_sistema:     'Kvalifikacijos sistema',
    preliminari_sutartis:'Preliminarioji sutartis',
    dps_sukurimas:      'Dinaminės pirkimų sistemos sukūrimas',
    dps_konkretus:      'Konkretus pirkimas pagal DPS',
    cpo:                'Pirkimas per CPO katalogą',
    vidaus_sandoris:    'Vidaus sandoris',
    koncesija:          'Koncesija',
  };
  var REZIMAI = {
    mazos_vertes:   'Mažos vertės pirkimas',
    supaprastintas: 'Supaprastintas pirkimas',
    tarptautinis:   'Tarptautinės vertės pirkimas',
  };
  /* Tvarkinga grupiu lentele UI (pp-graphs <optgroup> ir kt.). */
  var GRUPES = [
    { key:'mazos_vertes',  label:'Mažos vertės pirkimai' },
    { key:'supaprastinti', label:'Supaprastinti pirkimai' },
    { key:'tarptautiniai', label:'Tarptautinės vertės pirkimai' },
    { key:'dps',           label:'Dinaminė pirkimų sistema' },
    { key:'kitos_proc',    label:'Kitos procedūros' },
    { key:'kanalai',       label:'Kiti pirkimų būdai' },
  ];

  /* label = pilna (teisine) formuluote; labelTrumpas = UI (procedura be rezimo). */
  var LIST = [
    // --- BAZINIAI (procedura be rezimo; rezimas:null) - migracijos taikiniai
    //     saltiniams be rezimo. UI paprastai nerodomi. ---
    { id:'AK', label:'Atviras konkursas', labelTrumpas:'Atviras konkursas', procedura:'atviras', rezimas:null, derybos:false, skelbiama:true, salygos_seima:null, grupe:'kitos_proc', statusas:'bazinis' },
    { id:'SD', label:'Skelbiamos derybos', labelTrumpas:'Skelbiamos derybos', procedura:'skelb_derybos', rezimas:null, derybos:true, skelbiama:true, salygos_seima:null, grupe:'kitos_proc', statusas:'bazinis' },
    { id:'ND', label:'Neskelbiamos derybos', labelTrumpas:'Neskelbiamos derybos', procedura:'neskelb_derybos', rezimas:null, derybos:true, skelbiama:false, salygos_seima:null, grupe:'kitos_proc', statusas:'bazinis' },
    { id:'MV', label:'Mažos vertės pirkimas', labelTrumpas:'Mažos vertės pirkimas', procedura:'mv_apklausa', rezimas:'mazos_vertes', derybos:null, skelbiama:null, salygos_seima:null, grupe:'mazos_vertes', statusas:'bazinis' },

    // --- PAGRINDINIAI. Mazos vertes apklausos (rezimas = mazos_vertes) ---
    { id:'MV-NZ',  label:'Mažos vertės pirkimas - neskelbiama apklausa žodžiu',     labelTrumpas:'Neskelbiama apklausa žodžiu',     procedura:'mv_apklausa', rezimas:'mazos_vertes', derybos:false, skelbiama:false, salygos_seima:null, grupe:'mazos_vertes', statusas:'pagrindinis' },
    { id:'MV-NR',  label:'Mažos vertės pirkimas - neskelbiama apklausa raštu',      labelTrumpas:'Neskelbiama apklausa raštu',      procedura:'mv_apklausa', rezimas:'mazos_vertes', derybos:false, skelbiama:false, salygos_seima:null, grupe:'mazos_vertes', statusas:'pagrindinis', tikslinti:['Ar pp-salygos rengia salygas, ar uztenka pp-report pazymos'] },
    { id:'MV-SAB', label:'Mažos vertės pirkimas - skelbiama apklausa be derybų',    labelTrumpas:'Skelbiama apklausa be derybų',    procedura:'mv_apklausa', rezimas:'mazos_vertes', derybos:false, skelbiama:true,  salygos_seima:'MVP', grupe:'mazos_vertes', statusas:'pagrindinis' },
    { id:'MV-SAD', label:'Mažos vertės pirkimas - skelbiama apklausa su derybomis', labelTrumpas:'Skelbiama apklausa su derybomis', procedura:'mv_apklausa', rezimas:'mazos_vertes', derybos:true,  skelbiama:true,  salygos_seima:'MVP', grupe:'mazos_vertes', statusas:'pagrindinis' },

    // --- PAGRINDINIAI. Supaprastinti (rezimas = supaprastintas) ---
    { id:'S-AK',   label:'Atviras konkursas (supaprastintas pirkimas)',    labelTrumpas:'Atviras konkursas',    procedura:'atviras',         rezimas:'supaprastintas', derybos:false, skelbiama:true,  salygos_seima:'AK',  grupe:'supaprastinti', statusas:'pagrindinis' },
    { id:'S-SD',   label:'Skelbiamos derybos (supaprastintas pirkimas)',   labelTrumpas:'Skelbiamos derybos',   procedura:'skelb_derybos',   rezimas:'supaprastintas', derybos:true,  skelbiama:true,  salygos_seima:'SSD', grupe:'supaprastinti', statusas:'pagrindinis' },
    { id:'S-ND',   label:'Neskelbiamos derybos (supaprastintas pirkimas)', labelTrumpas:'Neskelbiamos derybos', procedura:'neskelb_derybos', rezimas:'supaprastintas', derybos:true,  skelbiama:false, salygos_seima:'ND',  grupe:'supaprastinti', statusas:'pagrindinis' },

    // --- PAGRINDINIAI. Tarptautines vertes (rezimas = tarptautinis) ---
    { id:'T-AK',   label:'Atviras konkursas (tarptautinis pirkimas)',    labelTrumpas:'Atviras konkursas',    procedura:'atviras',         rezimas:'tarptautinis', derybos:false, skelbiama:true,  salygos_seima:'AK',  grupe:'tarptautiniai', statusas:'pagrindinis' },
    { id:'T-SD',   label:'Skelbiamos derybos (tarptautinis pirkimas)',   labelTrumpas:'Skelbiamos derybos',   procedura:'skelb_derybos',   rezimas:'tarptautinis', derybos:true,  skelbiama:true,  salygos_seima:'TSD', grupe:'tarptautiniai', statusas:'pagrindinis' },
    { id:'T-ND',   label:'Neskelbiamos derybos (tarptautinis pirkimas)', labelTrumpas:'Neskelbiamos derybos', procedura:'neskelb_derybos', rezimas:'tarptautinis', derybos:true,  skelbiama:false, salygos_seima:'ND',  grupe:'tarptautiniai', statusas:'pagrindinis' },

    // --- PAGRINDINIAI. DPS. Rezimas FIKSUOTAS tarptautinis (vartotojo sprendimas
    //     2026-07; sutampa su pp-protocol/pp-plan). ---
    { id:'DPS',    label:'Dinaminė pirkimų sistema',     labelTrumpas:'DPS sukūrimas',            procedura:'dps_sukurimas', rezimas:'tarptautinis', derybos:false, skelbiama:true,  salygos_seima:'DPSK', grupe:'dps', statusas:'pagrindinis' },
    { id:'DPS-K',  label:'Konkretus pirkimas pagal DPS', labelTrumpas:'Konkretus pirkimas (DPS)', procedura:'dps_konkretus', rezimas:'tarptautinis', derybos:false, skelbiama:false, salygos_seima:'DPSP', grupe:'dps', statusas:'pagrindinis' },

    // --- PAPILDOMOS procedūros (rezimas dar neskaidomas - moduliai naudoja be
    //     rezimo). Sektoriniame PI (44 str.) atviras/ribotas/skelb. derybos
    //     laisvai pasirenkami; ribotas konkursas i vartotojo 11 punktu sarasa
    //     neitrauktas, todel statusas=papildomas (ne trukumas). ---
    { id:'RK',     label:'Ribotas konkursas',       labelTrumpas:'Ribotas konkursas',       procedura:'ribotas',              rezimas:null, derybos:false, skelbiama:true,  salygos_seima:null, grupe:'kitos_proc', statusas:'papildomas', tikslinti:['Rezimo skaidymas (supaprastintas/tarptautinis) pagal PI'] },
    { id:'KD',     label:'Konkurencinis dialogas',  labelTrumpas:'Konkurencinis dialogas',  procedura:'konkur_dialogas',      rezimas:null, derybos:true,  skelbiama:true,  salygos_seima:null, grupe:'kitos_proc', statusas:'papildomas', tikslinti:['Rezimo skaidymas; dialogas != derybos PI prasme'] },
    { id:'IP',     label:'Inovacijų partnerystė',   labelTrumpas:'Inovacijų partnerystė',   procedura:'inovac_partner',       rezimas:null, derybos:true,  skelbiama:true,  salygos_seima:null, grupe:'kitos_proc', statusas:'papildomas', tikslinti:['Rezimo skaidymas pagal PI'] },
    { id:'KS',     label:'Kvalifikacijos sistema',  labelTrumpas:'Kvalifikacijos sistema',  procedura:'kvalif_sistema',       rezimas:null, derybos:null,  skelbiama:true,  salygos_seima:null, grupe:'kitos_proc', statusas:'papildomas', tikslinti:['Sektorinis (PI, 46 str.) instrumentas - konkretus pirkimas kaip ribotas/derybos; taikymas ir rezimas'] },
    { id:'PS',     label:'Preliminarioji sutartis', labelTrumpas:'Preliminarioji sutartis', procedura:'preliminari_sutartis', rezimas:null, derybos:null,  skelbiama:true,  salygos_seima:null, grupe:'kitos_proc', statusas:'papildomas', tikslinti:['Technika (PI 51 str.), o ne procedura - sudaroma per atvira/ribota/derybas; modeliavima patikslinti'] },

    // --- Ne-procedūriniai poreikio tenkinimo budai (kanalai; nesukuria salygu). ---
    { id:'CPO',    label:'Pirkimas per CPO katalogą', labelTrumpas:'CPO katalogas',   procedura:'cpo',             rezimas:null, derybos:false, skelbiama:false, salygos_seima:null, grupe:'kanalai', statusas:'papildomas' },
    { id:'VS',     label:'Vidaus sandoris',           labelTrumpas:'Vidaus sandoris', procedura:'vidaus_sandoris', rezimas:null, derybos:false, skelbiama:false, salygos_seima:null, grupe:'kanalai', statusas:'papildomas', tikslinti:['pp-salygos turi vidaus sandorio prieda - patikslinti sasaja'] },

    // --- LEGACY (tik fromLegacy; UI nerodyti). ---
    // DEMESIO: koncesija NERA PI instrumentas - ja valdo atskiras Koncesiju
    // istatymas (Direktyva 2014/23/ES). Gyvos generacijos jai NETEIKTI.
    { id:'KONC',   label:'Koncesija', labelTrumpas:'Koncesija', procedura:'koncesija', rezimas:null, derybos:null, skelbiama:true, salygos_seima:null, grupe:'kanalai', statusas:'legacy', tikslinti:['NE PI instrumentas - atskiras Koncesiju istatymas / 2014/23/ES'] },
  ];

  var BY_ID = {};
  LIST.forEach(function (m) { BY_ID[m.id] = m; });

  /* Bazinio (be rezimo) budo isskaidymas i rezimo variantus. */
  var REZIMO_VARIANTAI = {
    AK: { supaprastintas:'S-AK', tarptautinis:'T-AK' },
    SD: { supaprastintas:'S-SD', tarptautinis:'T-SD' },
    ND: { supaprastintas:'S-ND', tarptautinis:'T-ND' },
  };
  /* Is opts nustatom rezima: opts.rezimas arba opts.international (bool). */
  function rezimasIsOpts(opts) {
    if (!opts) return null;
    if (opts.rezimas === 'tarptautinis' || opts.rezimas === 'supaprastintas') return opts.rezimas;
    if (opts.international === true) return 'tarptautinis';
    if (opts.international === false) return 'supaprastintas';
    return null;
  }
  /* Jei id yra bazinis (AK/SD/ND) IR opts nurodo rezima - grazinam rezimo varianta;
     kitaip - bazini id (rezimas lieka null, NEISGALVOJAM). */
  function taikytiRezima(id, opts) {
    var v = REZIMO_VARIANTAI[id];
    if (!v) return id;
    var rez = rezimasIsOpts(opts);
    return rez ? v[rez] : id;
  }

  var norm = function (s) {
    return String(s || '').toLowerCase()
      .replace(/[ąàá]/g, 'a').replace(/[čć]/g, 'c').replace(/[ęėé]/g, 'e').replace(/[įí]/g, 'i')
      .replace(/š/g, 's').replace(/[ųūú]/g, 'u').replace(/ž/g, 'z')
      .replace(/[^a-z0-9]+/g, ' ').trim();
  };

  /* --- Per-modulio LEGACY atvaizdziai (esama reiksme -> kanoninis id). Rezimo
   *     NETURINTYS saltiniai atvaizduojami i BAZINIUS id (AK/SD/ND/MV), kad
   *     rezimas nebutu isgalvotas; kviejant su opts (rezimas/international) jie
   *     paverciami rezimo variantais. --- */
  var LEGACY = {
    'pp-protocol': {
      // dabartine schema (rezimas ikoduotas)
      atviras_tarptautinis:'T-AK', atviras_supaprastintas:'S-AK',
      derybos_tarptautinis:'T-SD', derybos_supaprastintas:'S-SD',
      neskelbiamos_tarptautinis:'T-ND', neskelbiamos_supaprastintas:'S-ND',
      dps_steigimas:'DPS', dps_konkretus:'DPS-K',
      // senesni (be rezimo) -> baziniai
      atviras:'AK', ak:'AK', ribotas:'RK', derybu_skelb:'SD', sd:'SD',
      derybu_nesk:'ND', koncesija:'KONC', mazos:'MV',
    },
    'pp-negotiation': {   // procedureType (be rezimo) -> baziniai / instrumentai
      derybos_skelb:'SD', derybos_neskelb:'ND', konkurencinis_dialogas:'KD',
      inovaciju_partneryste:'IP', atviras:'AK', ribotas:'RK',
    },
    'pp-ts': {            // EN (be rezimo; rezima paduoda opts.international)
      open:'AK', restricted:'RK', negotiated_with_publication:'SD',
      negotiated_without_publication:'ND', competitive_dialogue:'KD',
      innovation_partnership:'IP', qualification_system:'KS',
      small_value:'MV', framework:'PS',
    },
    'pp-salygos': { TSD:'T-SD', SSD:'S-SD', DPSK:'DPS', DPSP:'DPS-K' },
  };

  /* Kanoninis id -> modulio dabartinis kodas (atvirkstinis migracijai / integracijai).
     Grazina null, jei modulis to budo neturi. */
  var CANON2 = {
    'pp-protocol': {
      'T-AK':'atviras_tarptautinis','S-AK':'atviras_supaprastintas',
      'T-SD':'derybos_tarptautinis','S-SD':'derybos_supaprastintas',
      'T-ND':'neskelbiamos_tarptautinis','S-ND':'neskelbiamos_supaprastintas',
      'DPS':'dps_steigimas','DPS-K':'dps_konkretus','KONC':'koncesija','RK':'ribotas',
      'AK':'atviras','SD':'derybu_skelb','ND':'derybu_nesk',
    },
    'pp-negotiation': {
      'SD':'derybos_skelb','S-SD':'derybos_skelb','T-SD':'derybos_skelb',
      'ND':'derybos_neskelb','S-ND':'derybos_neskelb','T-ND':'derybos_neskelb',
      'KD':'konkurencinis_dialogas','IP':'inovaciju_partneryste',
      'AK':'atviras','S-AK':'atviras','T-AK':'atviras','RK':'ribotas',
    },
    'pp-ts': {
      'AK':'open','S-AK':'open','T-AK':'open','RK':'restricted',
      'SD':'negotiated_with_publication','S-SD':'negotiated_with_publication','T-SD':'negotiated_with_publication',
      'ND':'negotiated_without_publication','S-ND':'negotiated_without_publication','T-ND':'negotiated_without_publication',
      'KD':'competitive_dialogue','IP':'innovation_partnership','KS':'qualification_system',
      'MV':'small_value','MV-NZ':'small_value','MV-NR':'small_value','MV-SAB':'small_value','MV-SAD':'small_value',
      'PS':'framework',
    },
  };

  /* Laisvo teksto atpazinimas (pp-plan p.budas, pp-report pirkimoBudas). */
  function fromText(txt) {
    var n = norm(txt);
    if (!n) return null;
    var tikslus = LIST.filter(function (m) { return norm(m.label) === n; })[0];
    if (tikslus) return tikslus.id;
    if (/mazos vertes|apklaus/.test(n)) {
      if (/zodziu/.test(n)) return 'MV-NZ';
      if (/neskelb/.test(n)) return 'MV-NR';
      if (/su deryb/.test(n)) return 'MV-SAD';
      if (/skelb/.test(n)) return 'MV-SAB';
      return 'MV';                                 // bendra mazos vertes (be porusio)
    }
    var t = /tarptautin/.test(n), s = /supaprastin/.test(n);
    var rez = t ? 'T' : (s ? 'S' : null);
    if (/dps|dinamin/.test(n)) return /konkret/.test(n) ? 'DPS-K' : 'DPS';
    if (/cpo|centralizuot/.test(n)) return 'CPO';
    if (/vidaus sandor/.test(n)) return 'VS';
    if (/koncesij/.test(n)) return 'KONC';
    if (/preliminar/.test(n)) return 'PS';
    if (/ribot/.test(n)) return 'RK';
    if (/dialog/.test(n)) return 'KD';
    if (/inovacij/.test(n)) return 'IP';
    if (/kvalifikacijos sistem/.test(n)) return 'KS';
    if (/neskelb.*deryb|neskelbiamos deryb/.test(n)) return rez ? rez + '-ND' : 'ND';
    if (/skelb.*deryb|skelbiamos deryb/.test(n)) return rez ? rez + '-SD' : 'SD';
    if (/atviras/.test(n)) return rez ? rez + '-AK' : 'AK';
    return null;
  }

  /* pp-salygos: budo kodas + rengejo pasirinkimai (rezimas, derybos). */
  function fromSalygos(budas, opts) {
    opts = opts || {};
    if (budas === 'AK' || budas === 'ND') return taikytiRezima(budas, opts);
    if (budas === 'MVP') return opts.derybos ? 'MV-SAD' : 'MV-SAB';
    if (budas === 'DPSK') return 'DPS';
    if (budas === 'DPSP') return 'DPS-K';
    return LEGACY['pp-salygos'][budas] || null;    // TSD/SSD
  }

  var API = {
    version: '1.0',
    PROCEDUROS: PROCEDUROS, REZIMAI: REZIMAI, GRUPES: GRUPES, LIST: LIST,

    byId: function (id) { return BY_ID[id] || null; },
    isValid: function (id) { return Object.prototype.hasOwnProperty.call(BY_ID, id); },

    /* label(id, {forma:'ilgas'|'trumpas'}) - numatytai ilgas (teisinis). */
    label: function (id, o) {
      var m = BY_ID[id]; if (!m) return null;
      return (o && o.forma === 'trumpas') ? m.labelTrumpas : m.label;
    },

    /* filtras: { grupe, statusas, rezimas, procedura, derybos, skelbiama, salygos_seima }.
       Numatytai be legacy IR be baziniu (rodom UI branduoli). */
    listValid: function (filtras) {
      filtras = filtras || {};
      var raktai = ['grupe','statusas','rezimas','procedura','derybos','skelbiama','salygos_seima'];
      return LIST.filter(function (m) {
        if (filtras.statusas == null && (m.statusas === 'legacy' || m.statusas === 'bazinis')) return false;
        for (var i = 0; i < raktai.length; i++) {
          var k = raktai[i];
          if (filtras[k] != null && m[k] !== filtras[k]) return false;
        }
        return true;
      });
    },

    /* Vartotojo "plokscias" sarasas = pagrindiniu budu pjuvis. */
    listPagrindiniai: function () {
      return LIST.filter(function (m) { return m.statusas === 'pagrindinis'; });
    },

    /* Paruosta <optgroup> struktura: [{ grupe, label, budai:[...] }]. */
    listByGroup: function (filtras) {
      var self = this;
      return GRUPES.map(function (g) {
        var f = {}; for (var k in (filtras || {})) f[k] = filtras[k]; f.grupe = g.key;
        return { grupe: g.key, label: g.label, budai: self.listValid(f) };
      }).filter(function (x) { return x.budai.length; });
    },

    /* Legacy reiksme -> kanoninis objektas. opts (rezimas/international/derybos)
       universalus VISIEMS moduliams; pp-ts ir baziniai budai is jo isskaido rezima. */
    fromLegacy: function (modulis, reiksme, opts) {
      if (reiksme == null) return null;
      if (modulis === 'pp-salygos') { var s = fromSalygos(reiksme, opts); return s ? BY_ID[s] : null; }
      var map = LEGACY[modulis];
      var id = map && map[reiksme];
      if (!id) id = fromText(reiksme);              // laisvas tekstas (pp-plan/pp-report)
      if (!id) return null;
      id = taikytiRezima(id, opts);                 // baziniai + opts -> rezimo variantas
      return BY_ID[id] || null;
    },
    fromText: function (txt) { var id = fromText(txt); return id ? BY_ID[id] : null; },

    /* Kanoninis id -> modulio dabartinis kodas (arba null, jei modulis neturi). */
    toModule: function (modulis, id) {
      if (modulis === 'pp-salygos') return this.toSalygos(id);
      var map = CANON2[modulis];
      return (map && map[id]) || null;
    },
    /* Kanoninis id -> pp-salygos generavimo parametrai. */
    toSalygos: function (id) {
      var m = BY_ID[id];
      if (!m || !m.salygos_seima) return null;
      return { seima: m.salygos_seima, rezimas: m.rezimas, derybos: m.derybos, skelbiama: m.skelbiama };
    },
  };

  root.GP_METHODS = API;
})(typeof window !== 'undefined' ? window : this);

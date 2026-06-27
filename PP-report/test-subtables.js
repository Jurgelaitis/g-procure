// Test per-part sub-tables and auto-fill
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync(path.join(__dirname, 'PP-report.html'), 'utf8');

const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  resources: 'usable',
  pretendToBeVisual: true,
  url: 'file:///' + __dirname + '/'
});

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  await wait(600);
  const win = dom.window;
  const doc = win.document;

  win.selectForm(2);
  await wait(300);

  console.log('=== Test 1: Initial single-table state ===');
  const pasBlock = doc.getElementById('pasiulymai-block');
  const galBlock = doc.getElementById('galutiniai-block');
  const kvalifBlock = doc.getElementById('kvalif-block');
  const sutBlock = doc.getElementById('sutarties-block');
  console.log('pasiulymai-block exists:', !!pasBlock);
  console.log('galutiniai-block exists:', !!galBlock);
  console.log('kvalif-block exists:', !!kvalifBlock);
  console.log('sutarties-block exists:', !!sutBlock);

  win.addPasiulymasRow();
  await wait(50);
  let pasTbody = doc.getElementById('pasiulymu-tbody');
  console.log('Single mode: pasiulymu-tbody has rows:', pasTbody?.children.length);

  console.log('\n=== Test 2: Enable parts ===');
  const skaidTaip = doc.querySelector('input[name="skaidoma"][value="taip"]');
  skaidTaip.checked = true;
  win.toggleSkaidymas(skaidTaip);
  await wait(100);
  console.log('Dalys tbody rows:', doc.querySelectorAll('#dalys-tbody tr').length);

  const dRows = doc.querySelectorAll('#dalys-tbody tr');
  dRows[0].querySelector('[data-field="dalisPav"]').value = 'LT paslaugos';
  dRows[0].querySelector('[data-field="dalisBePvm"]').value = '5000';
  dRows[0].querySelector('[data-field="dalisSuPvm"]').value = '6050';
  win.addDalis();
  await wait(50);
  const dRows2 = doc.querySelectorAll('#dalys-tbody tr');
  dRows2[1].querySelector('[data-field="dalisPav"]').value = 'LV paslaugos';
  dRows2[1].querySelector('[data-field="dalisBePvm"]').value = '5000';
  dRows2[1].querySelector('[data-field="dalisSuPvm"]').value = '6050';
  doc.getElementById('verte-be-pvm').value = '10000';
  doc.getElementById('verte-su-pvm').value = '12100';

  win.onDalisChange();
  await wait(100);

  console.log('\n=== Test 3: Restructure to sub-tables ===');
  const subPas = pasBlock.querySelectorAll('.dalis-subblock');
  const subGal = galBlock.querySelectorAll('.dalis-subblock');
  const subKvalif = kvalifBlock.querySelectorAll('.kvalif-subblock');
  const subSut = sutBlock.querySelectorAll('.sut-subblock');
  console.log('Pasiulymai sub-blocks:', subPas.length);
  console.log('Galutiniai sub-blocks:', subGal.length);
  console.log('Kvalif sub-blocks:', subKvalif.length);
  console.log('Sutarties sub-blocks:', subSut.length);
  subPas.forEach(s => console.log('  Pasiulymai:', s.querySelector('h5')?.textContent.substring(0, 60)));
  subSut.forEach(s => console.log('  Sutarties:', s.querySelector('h5')?.textContent));

  console.log('\n=== Test 4: Add suppliers per part ===');
  win.addPasiulymasRow('LT paslaugos');
  await wait(20);
  win.addPasiulymasRow('LT paslaugos');
  await wait(20);
  win.addPasiulymasRow('LV paslaugos');
  await wait(20);

  const ltTbody = doc.querySelector('.pasiulymu-tbody[data-dalis="LT paslaugos"]');
  const lvTbody = doc.querySelector('.pasiulymu-tbody[data-dalis="LV paslaugos"]');
  console.log('LT tbody rows:', ltTbody?.children.length);
  console.log('LV tbody rows:', lvTbody?.children.length);

  if (ltTbody) {
    ltTbody.children[0].querySelector('[data-field="tiekejas"]').value = 'UAB Vakaras';
    ltTbody.children[0].querySelector('[data-field="kainaBePvm"]').value = '4500';
    ltTbody.children[0].querySelector('[data-field="kainaSuPvm"]').value = '5445';
    ltTbody.children[0].querySelector('[data-field="pasiulVert"]').value = 'Atitinka';
    ltTbody.children[1].querySelector('[data-field="tiekejas"]').value = 'UAB Naktis';
    ltTbody.children[1].querySelector('[data-field="kainaBePvm"]').value = '4800';
    ltTbody.children[1].querySelector('[data-field="kainaSuPvm"]').value = '5808';
    ltTbody.children[1].querySelector('[data-field="pasiulVert"]').value = 'Atitinka';
  }
  if (lvTbody) {
    lvTbody.children[0].querySelector('[data-field="tiekejas"]').value = 'UAB Diena';
    lvTbody.children[0].querySelector('[data-field="kainaBePvm"]').value = '4900';
    lvTbody.children[0].querySelector('[data-field="kainaSuPvm"]').value = '5929';
    lvTbody.children[0].querySelector('[data-field="pasiulVert"]').value = 'Atitinka';
  }

  console.log('\n=== Test 5: gatherFormData ===');
  const data = win.gatherFormData();
  console.log('Total pasiulymai:', data.rows.pasiulymai.length);
  data.rows.pasiulymai.forEach(p => {
    console.log(`  ${p.tiekejas} | dalis=${p.dalis} | ${p.kainaBePvm}`);
  });

  console.log('\n=== Test 6: autoFillGalimasLaimetojas (per dalis) ===');
  win.autoFillGalimasLaimetojas();
  await wait(50);
  const ltLaim = doc.querySelector('[data-field="galimasLaimetojas__LT_paslaugos"]');
  const lvLaim = doc.querySelector('[data-field="galimasLaimetojas__LV_paslaugos"]');
  console.log('LT laimėtojas:', ltLaim?.value);
  console.log('LV laimėtojas:', lvLaim?.value);
  const ltTiek = doc.querySelector('[data-field="kvalifTiekejas__LT_paslaugos"]');
  const lvTiek = doc.querySelector('[data-field="kvalifTiekejas__LV_paslaugos"]');
  console.log('LT kvalif tiekėjas:', ltTiek?.value);
  console.log('LV kvalif tiekėjas:', lvTiek?.value);

  console.log('\n=== Test 7: autoFillSutartiesKaina (per dalis) ===');
  const radio = doc.querySelector('input[name="kainosTipas"][value="laimejusi"]');
  if (radio) radio.checked = true;
  win.autoFillSutartiesKaina();
  await wait(50);
  const ltBe = doc.querySelector('[data-field="sutartiesBePvm__LT_paslaugos"]');
  const lvBe = doc.querySelector('[data-field="sutartiesBePvm__LV_paslaugos"]');
  console.log('LT sutarties be PVM:', ltBe?.value);
  console.log('LV sutarties be PVM:', lvBe?.value);

  console.log('\n=== Test 8: gatherFormData with perDalis ===');
  const data2 = win.gatherFormData();
  console.log('perDalis keys:', Object.keys(data2.perDalis));
  Object.keys(data2.perDalis).forEach(k => {
    console.log(`  ${k}:`, JSON.stringify(data2.perDalis[k]));
  });

  console.log('\n=== Test 9: generateSprendimai per dalis ===');
  doc.getElementById('sprendimo-scenarijus').value = 'sutartis';
  const data3 = win.gatherFormData();
  const sprendimai = win.generateSprendimai(data3);
  sprendimai.forEach((s, i) => {
    console.log(`  ${i+1}. ${s.substring(0, 200).replace(/\n/g, ' | ')}`);
  });

  console.log('\n=== Test 10: Switch back to single mode ===');
  const skaidNe = doc.querySelector('input[name="skaidoma"][value="ne"]');
  skaidNe.checked = true;
  win.toggleSkaidymas(skaidNe);
  await wait(100);
  const singleTbody = doc.getElementById('pasiulymu-tbody');
  console.log('Single tbody exists after switch:', !!singleTbody);
  console.log('Single tbody has rows:', singleTbody?.children.length);
  const singleSut = doc.getElementById('sutarties-be-pvm');
  console.log('Single sutarties input exists:', !!singleSut);

  console.log('\n=== All tests complete ===');
  dom.window.close();
})().catch(e => {
  console.error('TEST ERROR:', e.message);
  console.error(e.stack);
  process.exit(1);
});

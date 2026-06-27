// Test: User workflow with parts + nepateike galutinio + auto-fill
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

  // Form 2 + skaidoma=taip
  win.selectForm(2);
  await wait(300);
  const skaidTaip = doc.querySelector('input[name="skaidoma"][value="taip"]');
  skaidTaip.checked = true;
  win.toggleSkaidymas(skaidTaip);
  await wait(50);

  // Set up two parts
  doc.getElementById('verte-be-pvm').value = '20000';
  doc.getElementById('verte-su-pvm').value = '24200';

  const dRows = doc.querySelectorAll('#dalys-tbody tr');
  dRows[0].querySelector('[data-field="dalisPav"]').value = 'Bandymo paslaugos LT';
  dRows[0].querySelector('[data-field="dalisBePvm"]').value = '10000';
  dRows[0].querySelector('[data-field="dalisSuPvm"]').value = '12100';
  win.addDalis();
  await wait(20);
  const dRows2 = doc.querySelectorAll('#dalys-tbody tr');
  dRows2[1].querySelector('[data-field="dalisPav"]').value = 'Bandymo paslaugos LV';
  dRows2[1].querySelector('[data-field="dalisBePvm"]').value = '10000';
  dRows2[1].querySelector('[data-field="dalisSuPvm"]').value = '12100';
  win.onDalisChange();
  await wait(100);

  // Enable derybos
  const derybRadio = doc.querySelector('input[name="derybos"][value="Vykdomos"]');
  if (derybRadio) {
    derybRadio.checked = true;
    if (derybRadio.onchange) derybRadio.onchange();
  }
  await wait(50);

  console.log('=== Test 1: Add primary suppliers per part ===');
  win.addPasiulymasRow('Bandymo paslaugos LT');
  await wait(20);
  win.addPasiulymasRow('Bandymo paslaugos LT');
  await wait(20);
  win.addPasiulymasRow('Bandymo paslaugos LV');
  await wait(20);

  const ltTbody = doc.querySelector('.pasiulymu-tbody[data-dalis="Bandymo paslaugos LT"]');
  const lvTbody = doc.querySelector('.pasiulymu-tbody[data-dalis="Bandymo paslaugos LV"]');

  // Fill primary data with PRICES and VERTINIMAS
  function setRow(tr, name, be, su, vert) {
    tr.querySelector('[data-field="tiekejas"]').value = name;
    const beInput = tr.querySelector('[data-field="kainaBePvm"]');
    beInput.value = be;
    beInput.dispatchEvent(new win.Event('input'));
    const suInput = tr.querySelector('[data-field="kainaSuPvm"]');
    suInput.value = su;
    suInput.dispatchEvent(new win.Event('input'));
    const v = tr.querySelector('[data-field="pasiulVert"]');
    v.value = vert;
    v.dispatchEvent(new win.Event('change'));
  }
  setRow(ltTbody.children[0], 'UAB X', '5000', '6050', 'Atitinka');
  setRow(ltTbody.children[1], 'UAB Y', '5500', '6655', 'Neatitinka');
  setRow(lvTbody.children[0], 'UAB ZZ', '4900', '5929', 'Atitinka');

  // Trigger sync - this should create galutiniai rows automatically
  win.syncGalutiniaiFromPasiulymai();
  await wait(50);

  console.log('Galutiniai LT rows:', doc.querySelectorAll('.galutiniai-tbody[data-dalis="Bandymo paslaugos LT"] tr').length);
  console.log('Galutiniai LV rows:', doc.querySelectorAll('.galutiniai-tbody[data-dalis="Bandymo paslaugos LV"] tr').length);

  // Verify linked-id is set on galutiniai rows
  const ltGalRows = doc.querySelectorAll('.galutiniai-tbody[data-dalis="Bandymo paslaugos LT"] tr');
  ltGalRows.forEach((tr, i) => {
    console.log(`  LT gal[${i}]: tiekejas=${tr.querySelector('[data-field="tiekejas"]')?.value}, linkedId=${tr.dataset.linkedId || 'NONE'}`);
  });

  console.log('\n=== Test 2: Click "Nepateikė galutinio" on each galutinis row ===');
  const allGalRows = doc.querySelectorAll('.galutiniai-tbody tr');
  allGalRows.forEach(tr => {
    const cb = tr.querySelector('[data-field="nepateikGalutinio"]');
    if (cb) {
      cb.checked = true;
      win.toggleNepateikGalutinio(cb);
    }
  });
  await wait(100);

  console.log('After "nepateike" - check prices transferred:');
  doc.querySelectorAll('.galutiniai-tbody tr').forEach((tr, i) => {
    const t = tr.querySelector('[data-field="tiekejas"]')?.value || '';
    const be = tr.querySelector('[data-field="galKainaBePvm"]')?.value || '';
    const su = tr.querySelector('[data-field="galKainaSuPvm"]')?.value || '';
    const vert = tr.querySelector('[data-field="galVert"]')?.value || '';
    console.log(`  Gal[${i}]: ${t} | be=${be}, su=${su}, vert=${vert}`);
  });

  console.log('\n=== Test 3: Check auto-fill ran ===');
  const ltLaim = doc.querySelector('[data-field="galimasLaimetojas__Bandymo_paslaugos_LT"]');
  const lvLaim = doc.querySelector('[data-field="galimasLaimetojas__Bandymo_paslaugos_LV"]');
  console.log('LT laimėtojas:', ltLaim?.value);
  console.log('LV laimėtojas:', lvLaim?.value);

  console.log('\n=== Test 4: Sutarties kaina per dalis ===');
  // Sutartis tipas = laimejusi (auto-fill)
  const radio = doc.querySelector('input[name="kainosTipas"][value="laimejusi"]');
  if (radio) {
    radio.checked = true;
    if (radio.onchange) radio.onchange();
  }
  win.autoFillSutartiesKaina();
  await wait(50);
  const ltBe = doc.querySelector('[data-field="sutartiesBePvm__Bandymo_paslaugos_LT"]');
  const lvBe = doc.querySelector('[data-field="sutartiesBePvm__Bandymo_paslaugos_LV"]');
  console.log('LT sutarties be PVM:', ltBe?.value);
  console.log('LV sutarties be PVM:', lvBe?.value);

  console.log('\n=== Test 5: Scenarijus sutartis + sprendimai ===');
  const scenSel = doc.getElementById('sprendimo-scenarijus');
  scenSel.value = 'sutartis';
  scenSel.dispatchEvent(new win.Event('change'));
  await wait(50);
  win.autoFillSprendimai();
  await wait(50);
  const laimEl = doc.getElementById('laimetojas');
  const eileEl = doc.getElementById('pasiulymu-eile');
  console.log('Laimėtojas field:', laimEl?.value);
  console.log('Eilė field:');
  (eileEl?.value || '').split('\n').forEach(l => console.log('  ' + l));

  console.log('\n=== Test 6: Generate notifications list ===');
  const data = win.gatherFormData();
  console.log('perDalis:', JSON.stringify(data.perDalis));
  const notifs = win.generateNotificationList(data);
  notifs.forEach(n => {
    console.log(`  Notification: ${n.recipient} | type=${n.type} | dalis="${n.dalis}" | filename=${n.filename}`);
  });

  console.log('\n=== Test 7: Notification text per dalis ===');
  if (notifs.length > 0 && typeof win.docx !== 'undefined') {
    try {
      const paragraphs = win.buildNotificationParagraphs(data, notifs[0]);
      console.log('First notification paragraphs (preview - just text):');
      paragraphs.slice(0, 5).forEach((p, i) => {
        // Try to extract text from Paragraph - jsdom may have docx undefined, skip if so
        console.log(`  ${i+1}. [Paragraph object]`);
      });
    } catch (e) {
      console.log('  (Cannot test - docx library not loaded in jsdom):', e.message);
    }
  } else {
    console.log('  (docx not loaded - skipping notification paragraph build)');
  }

  // Test the text content directly via manual replication
  console.log('\n=== Test 8: Verify notification intro has dalis info ===');
  // Look at the function content by checking notif.dalis is passed through
  const winnerNotif = notifs.find(n => n.type === 'winner');
  if (winnerNotif) {
    console.log('Winner notif:', winnerNotif.recipient, 'dalis=', winnerNotif.dalis);
    console.log('Expected text includes: pirkimo "____" pirkimo objekto dalies "' + winnerNotif.dalis + '"');
  }

  console.log('\n=== All tests done ===');
  dom.window.close();
})().catch(e => {
  console.error('TEST ERROR:', e.message);
  console.error(e.stack);
  process.exit(1);
});

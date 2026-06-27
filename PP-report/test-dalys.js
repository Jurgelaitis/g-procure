// End-to-end test using jsdom for parts handling, eur formatting, and validation
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync(path.join(__dirname, 'PP-report.html'), 'utf8');

// Stub docx and saveAs globals before scripts run
const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  resources: 'usable',
  pretendToBeVisual: true,
  url: 'file:///' + __dirname + '/'
});

// Wait for DOMContentLoaded + setup
function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  await wait(500);
  const win = dom.window;
  const doc = win.document;

  // Test 1: formatEur
  console.log('=== Test 1: formatEur ===');
  console.log('34000.25 =>', win.formatEur(34000.25));
  console.log('8000 =>', win.formatEur(8000));
  console.log('20000 =>', win.formatEur(20000));
  console.log('Empty =>', win.formatEur(''));

  // Test 2: Select form 2 (procurement organizer with parts)
  console.log('\n=== Test 2: Select form 2 ===');
  win.selectForm(2);
  await wait(300);
  console.log('currentForm:', win.currentForm);
  const skaidRadios = doc.querySelectorAll('input[name="skaidoma"]');
  console.log('Skaidoma radios found:', skaidRadios.length);

  // Test 3: Enable parts
  console.log('\n=== Test 3: Enable parts ===');
  const skaidTaip = doc.querySelector('input[name="skaidoma"][value="taip"]');
  skaidTaip.checked = true;
  win.toggleSkaidymas(skaidTaip);
  await wait(100);
  const dalysContainer = doc.getElementById('dalys-container');
  console.log('Dalys container shown:', dalysContainer.classList.contains('show'));
  const dalysTbodyRows = doc.querySelectorAll('#dalys-tbody tr').length;
  console.log('Dalys rows after enable:', dalysTbodyRows);

  // Test 4: Set procurement value and parts values
  console.log('\n=== Test 4: Set values + validate parts ===');
  doc.getElementById('verte-be-pvm').value = '20000';
  doc.getElementById('verte-su-pvm').value = '24200';
  // Set first dalis: 10000 / 12100
  let dRows = doc.querySelectorAll('#dalys-tbody tr');
  let row1 = dRows[0];
  row1.querySelector('[data-field="dalisPav"]').value = 'Bandymo paslaugos LT';
  row1.querySelector('[data-field="dalisBePvm"]').value = '10000';
  row1.querySelector('[data-field="dalisSuPvm"]').value = '12100';
  // Add second dalis
  win.addDalis();
  await wait(50);
  dRows = doc.querySelectorAll('#dalys-tbody tr');
  let row2 = dRows[1];
  row2.querySelector('[data-field="dalisPav"]').value = 'Bandymo paslaugos LV';
  row2.querySelector('[data-field="dalisBePvm"]').value = '11000';
  row2.querySelector('[data-field="dalisSuPvm"]').value = '13310';

  win.onDalisChange();
  await wait(50);

  const sumaBe = doc.getElementById('dalys-suma-be').textContent;
  const sumaSu = doc.getElementById('dalys-suma-su').textContent;
  console.log('Suma be PVM:', sumaBe);
  console.log('Suma su PVM:', sumaSu);
  const warnEl = doc.getElementById('dalys-validation');
  console.log('Warning shown:', warnEl.style.display);
  console.log('Warning text:', warnEl.textContent.substring(0, 100));

  // Test 5: Match values
  console.log('\n=== Test 5: Match values (10k + 10k = 20k) ===');
  row2.querySelector('[data-field="dalisBePvm"]').value = '10000';
  row2.querySelector('[data-field="dalisSuPvm"]').value = '12100';
  win.onDalisChange();
  await wait(50);
  console.log('Warning after match:', warnEl.textContent.substring(0, 100));
  console.log('Suma be PVM after match:', doc.getElementById('dalys-suma-be').textContent);

  // Test 6: Add pasiulymai with dalis assignment
  console.log('\n=== Test 6: Add pasiulymai with dalis ===');
  win.addPasiulymasRow();
  await wait(50);
  win.addPasiulymasRow();
  await wait(50);
  const pasRows = doc.querySelectorAll('#pasiulymu-tbody tr');
  console.log('Pasiulymai rows added:', pasRows.length);

  // Check that dalis column is visible
  const dalisColumns = doc.querySelectorAll('#pasiulymu-table .dalis-col');
  let visible = 0;
  dalisColumns.forEach(el => {
    const disp = win.getComputedStyle(el).display;
    if (disp !== 'none') visible++;
  });
  console.log('Dalis columns visible:', visible, '/', dalisColumns.length);

  // Check that dropdown has dalis options
  const dalisSelects = doc.querySelectorAll('#pasiulymu-tbody [data-field="dalis"]');
  console.log('Dalis dropdowns found:', dalisSelects.length);
  if (dalisSelects.length > 0) {
    console.log('Options in first dropdown:', dalisSelects[0].options.length);
    Array.from(dalisSelects[0].options).forEach(o => {
      console.log('  Option:', o.value);
    });
  }

  // Set values
  pasRows[0].querySelector('[data-field="tiekejas"]').value = 'UAB Vakaras';
  pasRows[0].querySelector('[data-field="kainaBePvm"]').value = '8000';
  pasRows[0].querySelector('[data-field="kainaSuPvm"]').value = '9680';
  pasRows[0].querySelector('[data-field="dalis"]').value = 'Bandymo paslaugos LT';
  pasRows[0].querySelector('[data-field="pasiulVert"]').value = 'Atitinka';
  pasRows[1].querySelector('[data-field="tiekejas"]').value = 'UAB Naktis';
  pasRows[1].querySelector('[data-field="kainaBePvm"]').value = '7900';
  pasRows[1].querySelector('[data-field="kainaSuPvm"]').value = '9559';
  pasRows[1].querySelector('[data-field="dalis"]').value = 'Bandymo paslaugos LV';
  pasRows[1].querySelector('[data-field="pasiulVert"]').value = 'Atitinka';

  // Test 7: gatherFormData should produce correct structure
  console.log('\n=== Test 7: gatherFormData ===');
  const data = win.gatherFormData();
  console.log('Form num:', data.formNum);
  console.log('Skaidoma:', data.radios.skaidoma);
  console.log('Dalys rows:', data.rows.dalys.length);
  console.log('Pasiulymai rows:', data.rows.pasiulymai.length);
  data.rows.pasiulymai.forEach((p, i) => {
    console.log(`  Pas[${i}]: ${p.tiekejas} | dalis="${p.dalis}" | ${p.kainaBePvm}`);
  });

  // Test 8: Print preview HTML should group by parts
  console.log('\n=== Test 8: Print preview ===');
  const showFn = win.showPrintPreview || win.printPreview;
  if (showFn) {
    showFn();
    await wait(100);
    const preview = doc.getElementById('print-preview-content');
    if (preview) {
      const txt = preview.textContent;
      console.log('Print preview contains "Bandymo paslaugos LT":', txt.includes('Bandymo paslaugos LT'));
      console.log('Print preview contains "Bandymo paslaugos LV":', txt.includes('Bandymo paslaugos LV'));
      console.log('Print preview contains "1 dalis":', txt.includes('1 dalis'));
      console.log('Print preview contains formatted "8 000,00":', txt.includes('8 000,00'));
    } else {
      console.log('No print preview element');
    }
  } else {
    console.log('showPrintPreview not exposed');
  }

  // Test 9: Sprendimai per dalis
  console.log('\n=== Test 9: Sprendimai per dalis ===');
  doc.getElementById('sprendimo-scenarijus').value = 'sutartis';
  // Re-gather data
  const data2 = win.gatherFormData();
  const sprendimai = win.generateSprendimai(data2);
  console.log('Sprendimu count:', sprendimai.length);
  sprendimai.forEach((s, i) => {
    console.log(`  ${i+1}.`, s.substring(0, 120).replace(/\n/g, ' | '));
  });

  console.log('\n=== All tests done ===');
  dom.window.close();
})().catch(e => {
  console.error('TEST ERROR:', e.message);
  console.error(e.stack);
  process.exit(1);
});

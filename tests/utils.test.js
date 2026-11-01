// Run with: node --test tests/
const test = require('node:test');
const assert = require('node:assert/strict');
const U = require('../js/utils.js');

test('invoiceTotals computes subtotal, discount, tax and total', () => {
  const t = U.invoiceTotals([{ qty: 2, rate: 500 }, { qty: 1, rate: 250.5 }], 18, 50.5);
  assert.deepEqual(t, { subtotal: 1250.5, discount: 50.5, taxable: 1200, tax: 216, total: 1416 });
});

test('invoiceTotals caps discount at subtotal and handles empty input', () => {
  assert.equal(U.invoiceTotals([{ qty: 1, rate: 100 }], 18, 500).total, 0);
  assert.equal(U.invoiceTotals([], 18, 0).total, 0);
  assert.equal(U.invoiceTotals(null).total, 0);
});

test('escapeHtml escapes dangerous characters', () => {
  assert.equal(U.escapeHtml('<img src=x onerror="a">&\''), '&lt;img src=x onerror=&quot;a&quot;&gt;&amp;&#39;');
  assert.equal(U.escapeHtml(null), '');
});

test('CSV round trip keeps commas, quotes and newlines', () => {
  const rows = [{ name: 'Rahul, Sr.', notes: 'Said "yes"\nCall back' }, { name: 'Priya', notes: '' }];
  const csv = U.toCSV(rows, ['name', 'notes']);
  assert.deepEqual(U.parseCSV(csv), rows);
});

test('parseCSV handles BOM, CRLF and blank lines', () => {
  const out = U.parseCSV('﻿Name,Phone\r\nAmit,98765\r\n\r\nSneha,90011\r\n');
  assert.deepEqual(out, [{ Name: 'Amit', Phone: '98765' }, { Name: 'Sneha', Phone: '90011' }]);
});

test('waPhone adds country code to 10 digit numbers', () => {
  assert.equal(U.waPhone('98765 43210', '91'), '919876543210');
  assert.equal(U.waPhone('+91-98765-43210', '91'), '919876543210');
  assert.equal(U.waPhone('', '91'), '');
});

test('nextInvoiceNumber increments the highest existing number', () => {
  assert.equal(U.nextInvoiceNumber([], 'INV-'), 'INV-0001');
  assert.equal(U.nextInvoiceNumber(['INV-0002', 'INV-0010', 'X'], 'INV-'), 'INV-0011');
});

test('date helpers', () => {
  assert.equal(U.addDays('2026-01-30', 3), '2026-02-02');
  assert.equal(U.isOverdue('2026-01-01', '2026-01-02'), true);
  assert.equal(U.isOverdue('2026-01-02', '2026-01-02'), false);
  assert.equal(U.isOverdue('', '2026-01-02'), false);
});

test('formatMoney uses Indian grouping for INR', () => {
  assert.match(U.formatMoney(150000, 'INR'), /1,50,000/);
});

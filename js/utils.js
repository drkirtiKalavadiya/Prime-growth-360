/* Prime Growth 360 CRM — pure helper functions (no DOM access).
 * Works in the browser (window.CRM.utils) and in Node (module.exports) for tests. */
(function (root) {
  'use strict';

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  var LOCALES = { INR: 'en-IN', USD: 'en-US', EUR: 'de-DE', GBP: 'en-GB', AED: 'en-AE' };

  function formatMoney(amount, currency) {
    currency = currency || 'INR';
    var n = Number(amount) || 0;
    try {
      return new Intl.NumberFormat(LOCALES[currency] || 'en-US', {
        style: 'currency',
        currency: currency,
        maximumFractionDigits: 2,
      }).format(n);
    } catch (e) {
      return currency + ' ' + n.toFixed(2);
    }
  }

  function round2(n) {
    return Math.round((Number(n) || 0) * 100) / 100;
  }

  /** Compute subtotal, discount, tax and total for invoice line items. */
  function invoiceTotals(items, taxRate, discount) {
    var subtotal = 0;
    (items || []).forEach(function (it) {
      subtotal += (Number(it.qty) || 0) * (Number(it.rate) || 0);
    });
    subtotal = round2(subtotal);
    var disc = Math.min(round2(discount), subtotal);
    var taxable = round2(subtotal - disc);
    var tax = round2((taxable * (Number(taxRate) || 0)) / 100);
    return { subtotal: subtotal, discount: disc, taxable: taxable, tax: tax, total: round2(taxable + tax) };
  }

  function todayISO(date) {
    var d = date || new Date();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + day;
  }

  function addDays(iso, days) {
    var d = new Date(iso + 'T00:00:00');
    d.setDate(d.getDate() + days);
    return todayISO(d);
  }

  function formatDate(iso) {
    if (!iso) return '';
    var d = new Date(String(iso).length === 10 ? iso + 'T00:00:00' : iso);
    if (isNaN(d)) return iso;
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function isOverdue(dueISO, today) {
    return !!dueISO && dueISO < (today || todayISO());
  }

  function csvCell(v) {
    var s = String(v == null ? '' : v);
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  /** rows: array of objects; columns: array of keys. */
  function toCSV(rows, columns) {
    var lines = [columns.map(csvCell).join(',')];
    rows.forEach(function (r) {
      lines.push(columns.map(function (c) { return csvCell(r[c]); }).join(','));
    });
    return lines.join('\n');
  }

  /** Parse CSV text into an array of objects keyed by the header row. */
  function parseCSV(text) {
    var rows = [];
    var row = [];
    var cell = '';
    var inQuotes = false;
    text = String(text || '').replace(/^﻿/, '');
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      if (inQuotes) {
        if (ch === '"') {
          if (text[i + 1] === '"') { cell += '"'; i++; } else { inQuotes = false; }
        } else {
          cell += ch;
        }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(cell); cell = '';
      } else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        row.push(cell); rows.push(row); row = []; cell = '';
      } else {
        cell += ch;
      }
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    rows = rows.filter(function (r) { return r.some(function (c) { return c.trim() !== ''; }); });
    if (!rows.length) return [];
    var header = rows[0].map(function (h) { return h.trim(); });
    return rows.slice(1).map(function (r) {
      var o = {};
      header.forEach(function (h, idx) { o[h] = (r[idx] || '').trim(); });
      return o;
    });
  }

  /** Digits-only phone for WhatsApp links; prefixes country code for 10-digit numbers. */
  function waPhone(phone, countryCode) {
    var digits = String(phone || '').replace(/\D/g, '');
    if (!digits) return '';
    if (digits.length === 10 && countryCode) digits = String(countryCode).replace(/\D/g, '') + digits;
    return digits;
  }

  /** Next invoice number e.g. INV-0007 given existing numbers. */
  function nextInvoiceNumber(existing, prefix) {
    prefix = prefix || 'INV-';
    var max = 0;
    (existing || []).forEach(function (num) {
      var m = String(num || '').match(/(\d+)\s*$/);
      if (m) max = Math.max(max, parseInt(m[1], 10));
    });
    return prefix + String(max + 1).padStart(4, '0');
  }

  var api = {
    uid: uid,
    escapeHtml: escapeHtml,
    formatMoney: formatMoney,
    round2: round2,
    invoiceTotals: invoiceTotals,
    todayISO: todayISO,
    addDays: addDays,
    formatDate: formatDate,
    isOverdue: isOverdue,
    toCSV: toCSV,
    parseCSV: parseCSV,
    waPhone: waPhone,
    nextInvoiceNumber: nextInvoiceNumber,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.CRM = root.CRM || {};
  root.CRM.utils = api;
})(typeof window !== 'undefined' ? window : globalThis);

/* Prime Growth 360 CRM — data layer.
 * All data is kept in the browser's localStorage, so the app works offline
 * with no server. Use Settings → Backup to export/import a JSON file. */
(function (root) {
  'use strict';
  var U = root.CRM.utils;
  var KEY = 'pg360-crm-v1';

  /* Pipeline stage presets so the same CRM fits any kind of business. */
  var INDUSTRY_PRESETS = {
    General: ['New Lead', 'Contacted', 'Proposal Sent', 'Negotiation', 'Won', 'Lost'],
    'Retail / Shop': ['Enquiry', 'Visited Store', 'Quotation', 'Follow-up', 'Won', 'Lost'],
    'Manufacturing': ['RFQ Received', 'Sample Sent', 'Quotation', 'Negotiation', 'Purchase Order', 'Won', 'Lost'],
    'Services / Agency': ['Lead', 'Discovery Call', 'Proposal', 'Negotiation', 'Won', 'Lost'],
    'Healthcare / Clinic': ['Enquiry', 'Appointment Booked', 'Consulted', 'Treatment Plan', 'Won', 'Lost'],
    'Education / Coaching': ['Enquiry', 'Demo Class', 'Counselling', 'Fee Discussion', 'Won', 'Lost'],
    'Real Estate': ['Lead', 'Site Visit', 'Shortlisted', 'Negotiation', 'Booking', 'Won', 'Lost'],
    'Trading / Wholesale': ['Enquiry', 'Price Shared', 'Sample / Trial', 'Negotiation', 'Won', 'Lost'],
  };

  var DEFAULT_SETTINGS = {
    businessName: 'My Business',
    ownerName: '',
    industry: 'General',
    phone: '',
    email: '',
    address: '',
    gstin: '',
    currency: 'INR',
    countryCode: '91',
    taxRate: 18,
    invoicePrefix: 'INV-',
    stages: INDUSTRY_PRESETS.General.slice(),
    invoiceTerms: 'Payment due within 15 days. Thank you for your business!',
  };

  var COLLECTIONS = ['customers', 'deals', 'tasks', 'invoices', 'products', 'activities'];

  function emptyDB() {
    var db = { version: 1, settings: JSON.parse(JSON.stringify(DEFAULT_SETTINGS)) };
    COLLECTIONS.forEach(function (c) { db[c] = []; });
    return db;
  }

  var db = load();
  var listeners = [];

  function load() {
    try {
      var raw = root.localStorage && root.localStorage.getItem(KEY);
      if (!raw) return emptyDB();
      return normalize(JSON.parse(raw));
    } catch (e) {
      console.warn('Could not load CRM data, starting fresh', e);
      return emptyDB();
    }
  }

  function normalize(data) {
    var base = emptyDB();
    if (!data || typeof data !== 'object') return base;
    base.settings = Object.assign(base.settings, data.settings || {});
    if (!Array.isArray(base.settings.stages) || !base.settings.stages.length) {
      base.settings.stages = DEFAULT_SETTINGS.stages.slice();
    }
    COLLECTIONS.forEach(function (c) {
      base[c] = Array.isArray(data[c]) ? data[c] : [];
    });
    return base;
  }

  function save() {
    try {
      root.localStorage.setItem(KEY, JSON.stringify(db));
    } catch (e) {
      alert('Could not save data: browser storage may be full. Please export a backup.');
    }
    listeners.forEach(function (fn) { fn(); });
  }

  var store = {
    INDUSTRY_PRESETS: INDUSTRY_PRESETS,
    COLLECTIONS: COLLECTIONS,

    onChange: function (fn) { listeners.push(fn); },

    settings: function () { return db.settings; },
    updateSettings: function (patch) {
      Object.assign(db.settings, patch);
      save();
    },

    list: function (coll) { return db[coll].slice(); },
    get: function (coll, id) {
      return db[coll].find(function (x) { return x.id === id; }) || null;
    },
    upsert: function (coll, obj) {
      var now = new Date().toISOString();
      if (obj.id) {
        var idx = db[coll].findIndex(function (x) { return x.id === obj.id; });
        if (idx >= 0) {
          db[coll][idx] = Object.assign({}, db[coll][idx], obj, { updatedAt: now });
          save();
          return db[coll][idx];
        }
      }
      var rec = Object.assign({ id: U.uid(), createdAt: now }, obj, { updatedAt: now });
      if (!rec.id) rec.id = U.uid();
      db[coll].push(rec);
      save();
      return rec;
    },
    remove: function (coll, id) {
      db[coll] = db[coll].filter(function (x) { return x.id !== id; });
      if (coll === 'customers') {
        // Keep related records but unlink tasks/activities that only make sense with a customer.
        db.activities = db.activities.filter(function (a) { return a.customerId !== id; });
      }
      save();
    },
    bulkInsert: function (coll, rows) {
      var now = new Date().toISOString();
      rows.forEach(function (r) {
        db[coll].push(Object.assign({ id: U.uid(), createdAt: now, updatedAt: now }, r));
      });
      save();
    },

    customerName: function (id) {
      var c = id && store.get('customers', id);
      return c ? (c.company ? c.name + ' (' + c.company + ')' : c.name) : '—';
    },

    exportJSON: function () { return JSON.stringify(db, null, 2); },
    importJSON: function (text) {
      var data = JSON.parse(text);
      if (!data || typeof data !== 'object' || !data.settings) {
        throw new Error('This file is not a Prime Growth 360 CRM backup.');
      }
      db = normalize(data);
      save();
    },
    reset: function () {
      db = emptyDB();
      save();
    },
    isEmpty: function () {
      return COLLECTIONS.every(function (c) { return db[c].length === 0; });
    },

    seedDemo: function () {
      var t = U.todayISO();
      var s = db.settings;
      var stages = s.stages;
      var c1 = store.upsert('customers', { name: 'Rahul Sharma', company: 'Sharma Traders', phone: '9876543210', email: 'rahul@sharmatraders.in', city: 'Ahmedabad', type: 'Customer', source: 'Referral', tags: 'wholesale, priority' });
      var c2 = store.upsert('customers', { name: 'Priya Patel', company: 'Patel Textiles', phone: '9898989898', email: 'priya@pateltextiles.com', city: 'Surat', type: 'Lead', source: 'Website', tags: 'textile' });
      var c3 = store.upsert('customers', { name: 'Amit Verma', company: 'Verma Clinic', phone: '9123456780', email: 'amit@vermaclinic.in', city: 'Pune', type: 'Customer', source: 'Walk-in', tags: '' });
      var c4 = store.upsert('customers', { name: 'Sneha Iyer', company: '', phone: '9001122334', email: 'sneha.iyer@gmail.com', city: 'Chennai', type: 'Lead', source: 'Instagram', tags: 'retail' });
      var p1 = store.upsert('products', { name: 'Consulting (per hour)', sku: 'SRV-001', price: 1500, unit: 'hour', stock: '' });
      store.upsert('products', { name: 'Premium Cotton Fabric', sku: 'FAB-210', price: 320, unit: 'metre', stock: 500 });
      store.upsert('products', { name: 'Annual Maintenance Contract', sku: 'AMC-01', price: 12000, unit: 'year', stock: '' });
      store.upsert('deals', { title: 'Bulk fabric order', customerId: c2.id, value: 160000, stage: stages[2] || stages[0], expectedClose: U.addDays(t, 10) });
      store.upsert('deals', { title: 'Annual maintenance', customerId: c1.id, value: 12000, stage: stages[1] || stages[0], expectedClose: U.addDays(t, 5) });
      store.upsert('deals', { title: 'Clinic software setup', customerId: c3.id, value: 45000, stage: stages[stages.length - 2] || stages[0], expectedClose: U.addDays(t, -3) });
      store.upsert('deals', { title: 'Boutique starter pack', customerId: c4.id, value: 25000, stage: stages[0], expectedClose: U.addDays(t, 20) });
      store.upsert('tasks', { title: 'Call Priya about fabric samples', customerId: c2.id, due: t, priority: 'High', done: false });
      store.upsert('tasks', { title: 'Send AMC renewal quotation', customerId: c1.id, due: U.addDays(t, 2), priority: 'Medium', done: false });
      store.upsert('tasks', { title: 'Collect pending payment', customerId: c3.id, due: U.addDays(t, -1), priority: 'High', done: false });
      store.upsert('activities', { customerId: c2.id, type: 'Call', note: 'Interested in 500m premium cotton. Wants samples.', date: U.addDays(t, -2) });
      store.upsert('activities', { customerId: c1.id, type: 'WhatsApp', note: 'Shared AMC brochure.', date: U.addDays(t, -1) });
      store.upsert('activities', { customerId: c3.id, type: 'Meeting', note: 'Demo done, invoice raised.', date: U.addDays(t, -6) });
      store.upsert('invoices', { number: s.invoicePrefix + '0001', customerId: c3.id, date: U.addDays(t, -6), dueDate: U.addDays(t, 9), taxRate: s.taxRate, discount: 0, status: 'Sent', items: [{ desc: p1.name, qty: 10, rate: 1500 }], notes: '' });
      store.upsert('invoices', { number: s.invoicePrefix + '0002', customerId: c1.id, date: U.addDays(t, -20), dueDate: U.addDays(t, -5), taxRate: s.taxRate, discount: 500, status: 'Paid', paidOn: t, items: [{ desc: 'Annual Maintenance Contract', qty: 1, rate: 12000 }], notes: '' });
    },
  };

  root.CRM.store = store;
})(typeof window !== 'undefined' ? window : globalThis);

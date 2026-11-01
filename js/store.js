/* Prime Growth 360 CRM — data layer.
 * Data is kept in the browser's localStorage, so the app works offline
 * with no server. When the app is opened as a Claude artifact, it is also
 * synced to the viewer's own private storage in their Claude account
 * (see "cloud sync" below), so it follows them between devices.
 * Use Settings → Backup to export/import a JSON file. */
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
  var syncListeners = [];

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
    if (data.savedAt) base.savedAt = data.savedAt;
    return base;
  }

  /** changed: list of collection names (or 'settings') that changed; omit for everything. */
  function save(changed) {
    db.savedAt = Date.now();
    try {
      root.localStorage.setItem(KEY, JSON.stringify(db));
    } catch (e) {
      console.warn('localStorage unavailable', e);
    }
    cloud.push(changed || ['settings'].concat(COLLECTIONS));
    listeners.forEach(function (fn) { fn(); });
  }

  /* ---------- cloud sync (only inside a Claude artifact) ----------
   * One private document per collection under data/users/<viewer id>/,
   * plus a "meta" document holding the last save time. Writes are
   * coalesced and never overlap for the same document. */
  var cloud = (function () {
    var ref = null;        // CollectionReference for this viewer, once ready
    var status = 'local';  // 'local' | 'connecting' | 'synced' | 'saving' | 'error'
    var dirty = {};
    var timer = null;
    var writing = false;
    var lastError = '';

    function setStatus(st, err) {
      status = st;
      lastError = err || '';
      syncListeners.forEach(function (fn) { fn(status, lastError); });
    }

    function docFor(name) { return ref.doc('crm-' + name); }

    function payloadFor(name) {
      return name === 'settings' ? { value: db.settings } : { items: db[name] };
    }

    function flush() {
      timer = null;
      if (!ref || writing) return;
      var names = Object.keys(dirty);
      if (!names.length) return;
      dirty = {};
      writing = true;
      setStatus('saving');
      var chain = Promise.resolve();
      var failed = '';
      names.forEach(function (name) {
        chain = chain.then(function () { return docFor(name).set(payloadFor(name)); })
          .catch(function (e) { failed = (e && (e.code || e.message)) || 'error'; dirty[name] = true; });
      });
      chain.then(function () {
        return failed ? null : docFor('meta').set({ savedAt: db.savedAt });
      }).catch(function (e) { failed = (e && (e.code || e.message)) || 'error'; }).then(function () {
        writing = false;
        if (failed) {
          setStatus('error', failed);
          dirty = {};  // keep data local; retry on the next change instead of looping
        } else if (Object.keys(dirty).length) {
          flush();
        } else {
          setStatus('synced');
        }
      });
    }

    function push(names) {
      if (!ref) return;
      names.forEach(function (n) { dirty[n] = true; });
      if (timer) clearTimeout(timer);
      timer = setTimeout(flush, 700);
    }

    function connect(onRemoteLoaded) {
      if (!root.claude || typeof root.claude.use !== 'function') return;
      setStatus('connecting');
      var giveUp = setTimeout(function () { if (!ref) setStatus('local'); }, 12000);
      Promise.all([root.claude.use('db'), root.claude.use('user')]).then(function (caps) {
        var dbCap = caps[0], user = caps[1];
        if (!dbCap || !user) { clearTimeout(giveUp); setStatus('local'); return null; }
        return user.id().then(function (uid) {
          if (!uid) { clearTimeout(giveUp); setStatus('local'); return null; }
          var col = dbCap.collection('data/users/' + uid);
          var names = ['meta', 'settings'].concat(COLLECTIONS);
          return Promise.all(names.map(function (n) { return col.doc('crm-' + n).get(); })).then(function (snaps) {
            clearTimeout(giveUp);
            ref = col;
            var meta = snaps[0].exists ? snaps[0].data() : null;
            var remoteNewer = meta && (!db.savedAt || meta.savedAt > db.savedAt);
            if (remoteNewer) {
              var data = { settings: snaps[1].exists ? snaps[1].data().value : {} };
              COLLECTIONS.forEach(function (c, i) {
                var sn = snaps[i + 2];
                data[c] = sn.exists ? sn.data().items : [];
              });
              db = normalize(data);
              db.savedAt = meta.savedAt;
              try { root.localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { /* ignore */ }
              setStatus('synced');
              if (onRemoteLoaded) onRemoteLoaded();
            } else if (!meta && store.isEmpty() && !db.savedAt) {
              setStatus('synced');
            } else {
              push(['settings'].concat(COLLECTIONS));  // this device has newer data: upload it
            }
          });
        });
      }).catch(function (e) {
        clearTimeout(giveUp);
        setStatus(ref ? 'error' : 'local', (e && (e.code || e.message)) || '');
      });
    }

    return { push: push, connect: connect, status: function () { return status; }, error: function () { return lastError; } };
  })();

  var store = {
    INDUSTRY_PRESETS: INDUSTRY_PRESETS,
    COLLECTIONS: COLLECTIONS,

    onChange: function (fn) { listeners.push(fn); },
    onSyncStatus: function (fn) { syncListeners.push(fn); },
    syncStatus: function () { return cloud.status(); },
    connectCloud: function (onRemoteLoaded) { cloud.connect(onRemoteLoaded); },

    settings: function () { return db.settings; },
    updateSettings: function (patch) {
      Object.assign(db.settings, patch);
      save(['settings']);
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
          save([coll]);
          return db[coll][idx];
        }
      }
      var rec = Object.assign({ id: U.uid(), createdAt: now }, obj, { updatedAt: now });
      if (!rec.id) rec.id = U.uid();
      db[coll].push(rec);
      save([coll]);
      return rec;
    },
    remove: function (coll, id) {
      db[coll] = db[coll].filter(function (x) { return x.id !== id; });
      var changed = [coll];
      if (coll === 'customers') {
        // Interaction history only makes sense with its contact, so remove it too.
        db.activities = db.activities.filter(function (a) { return a.customerId !== id; });
        changed.push('activities');
      }
      save(changed);
    },
    bulkInsert: function (coll, rows) {
      var now = new Date().toISOString();
      rows.forEach(function (r) {
        db[coll].push(Object.assign({ id: U.uid(), createdAt: now, updatedAt: now }, r));
      });
      save([coll]);
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

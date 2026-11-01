/* Prime Growth 360 CRM — user interface.
 * Hash-based router + views. No frameworks, no build step. */
(function () {
  'use strict';
  var U = CRM.utils;
  var S = CRM.store;
  var esc = U.escapeHtml;

  var view = document.getElementById('view');
  var modalRoot = document.getElementById('modal-root');
  var state = { customerSearch: '', customerType: 'All', taskFilter: 'Open', invoiceFilter: 'All', productSearch: '' };

  /* ---------- helpers ---------- */

  function money(n) { return U.formatMoney(n, S.settings().currency); }
  function isWon(stage) { return /won|booking|purchase order/i.test(stage || '') && !/lost/i.test(stage || ''); }
  function isLost(stage) { return /lost/i.test(stage || ''); }
  function isOpenDeal(d) { return !isWon(d.stage) && !isLost(d.stage); }
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $all(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  function invoiceStatus(inv) {
    if (inv.status === 'Sent' && U.isOverdue(inv.dueDate)) return 'Overdue';
    return inv.status || 'Draft';
  }
  function invoiceTotal(inv) { return U.invoiceTotals(inv.items, inv.taxRate, inv.discount).total; }

  // True when running inside a Claude artifact viewer (no print dialog, no plain downloads there).
  var IN_ARTIFACT = !!(window.claude && typeof window.claude.use === 'function');

  function invoiceWhatsAppUrl(inv) {
    var c = S.get('customers', inv.customerId) || {};
    var s = S.settings();
    var msg = 'Hello ' + (c.name || '') + ',\n\nPlease find details of ' + (inv.status === 'Quotation' ? 'quotation ' : 'invoice ') + inv.number +
      ' from ' + s.businessName + '.\nAmount: ' + money(invoiceTotal(inv)) + (inv.dueDate ? '\nDue date: ' + U.formatDate(inv.dueDate) : '') + '\n\nThank you!';
    return 'https://wa.me/' + U.waPhone(c.phone, s.countryCode) + '?text=' + encodeURIComponent(msg);
  }

  function badge(text, kind) {
    return '<span class="badge badge-' + esc(kind || String(text).toLowerCase().replace(/[^a-z]+/g, '-')) + '">' + esc(text) + '</span>';
  }

  function customerOptions(includeBlank) {
    var opts = S.list('customers')
      .sort(function (a, b) { return a.name.localeCompare(b.name); })
      .map(function (c) { return { value: c.id, label: c.name + (c.company ? ' — ' + c.company : '') }; });
    return includeBlank ? [{ value: '', label: '— None —' }].concat(opts) : opts;
  }

  function contactLinks(c) {
    var out = [];
    if (c.phone) {
      out.push('<a class="icon-link" href="tel:' + esc(c.phone) + '" title="Call">📞</a>');
      var wa = U.waPhone(c.phone, S.settings().countryCode);
      if (wa) out.push('<a class="icon-link" target="_blank" rel="noopener" href="https://wa.me/' + wa + '" title="WhatsApp">💬</a>');
    }
    if (c.email) out.push('<a class="icon-link" href="mailto:' + esc(c.email) + '" title="Email">✉️</a>');
    return out.join('');
  }

  function toast(msg) {
    $all('.toast').forEach(function (t) { t.remove(); });
    var el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(function () { el.classList.add('show'); }, 10);
    setTimeout(function () { el.classList.remove('show'); setTimeout(function () { el.remove(); }, 300); }, 2400);
  }

  function download(filename, text, type) {
    if (IN_ARTIFACT) {
      window.claude.use('downloads').then(function (dl) {
        if (!dl) { toast('Saving files is not available here.'); return; }
        dl.save({ filename: filename, data: text }).then(function () { toast('Saved ' + filename); }, function (err) {
          if (err && err.code === 'declined') return;
          toast(err && err.code === 'rate_limited' ? 'Please finish the open save prompt first.' : 'The file could not be saved.');
        });
      });
      return;
    }
    var blob = new Blob([text], { type: type || 'text/plain' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  function pickFile(accept, cb) {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = function () {
      var f = input.files[0];
      if (!f) return;
      var r = new FileReader();
      r.onload = function () { cb(String(r.result)); };
      r.readAsText(f);
    };
    input.click();
  }

  function emptyState(icon, title, text, actionHtml) {
    return '<div class="empty"><div class="empty-icon">' + icon + '</div><h3>' + esc(title) + '</h3><p>' + esc(text) + '</p>' + (actionHtml || '') + '</div>';
  }

  /* ---------- modal + generic form ---------- */

  /** In-page confirmation dialog. Calls onYes only if the person confirms. */
  function askConfirm(message, yesLabel, onYes, danger) {
    var root = document.getElementById('confirm-root');
    root.innerHTML = '<div class="modal-backdrop confirm-backdrop" data-confirm="no"></div>' +
      '<div class="modal confirm" role="alertdialog" aria-modal="true" aria-labelledby="confirm-msg">' +
      '<div class="modal-body"><p id="confirm-msg" class="confirm-msg">' + esc(message) + '</p>' +
      '<div class="form-actions"><span class="spacer"></span><button type="button" class="btn" data-confirm="no" id="confirm-no">Cancel</button>' +
      '<button type="button" class="btn ' + (danger === false ? 'btn-primary' : 'btn-danger-solid') + '" data-confirm="yes" id="confirm-yes">' + esc(yesLabel || 'Yes') + '</button></div></div></div>';
    function done(e) {
      var b = e.target.closest('[data-confirm]');
      if (!b) return;
      e.stopPropagation();
      root.removeEventListener('click', done);
      root.innerHTML = '';
      if (b.getAttribute('data-confirm') === 'yes') onYes();
    }
    root.addEventListener('click', done);
    document.getElementById('confirm-yes').focus();
  }

  function closeModal() { modalRoot.innerHTML = ''; document.body.classList.remove('modal-open'); }

  function openModal(title, bodyHtml, wide) {
    modalRoot.innerHTML =
      '<div class="modal-backdrop" data-action="close-modal"></div>' +
      '<div class="modal' + (wide ? ' modal-wide' : '') + '" role="dialog" aria-modal="true" aria-label="' + esc(title) + '">' +
      '<div class="modal-head"><h2>' + esc(title) + '</h2><button class="btn-icon" data-action="close-modal" aria-label="Close">✕</button></div>' +
      '<div class="modal-body">' + bodyHtml + '</div></div>';
    document.body.classList.add('modal-open');
    var first = $('.modal input, .modal select, .modal textarea', modalRoot);
    if (first) first.focus();
  }

  function fieldHtml(f, value) {
    var id = 'f-' + f.name;
    var req = f.required ? ' required' : '';
    var v = value == null ? (f.default == null ? '' : f.default) : value;
    var input;
    if (f.type === 'select') {
      input = '<select id="' + id + '" name="' + f.name + '"' + req + '>' +
        f.options.map(function (o) {
          var ov = typeof o === 'object' ? o.value : o;
          var ol = typeof o === 'object' ? o.label : o;
          return '<option value="' + esc(ov) + '"' + (String(ov) === String(v) ? ' selected' : '') + '>' + esc(ol) + '</option>';
        }).join('') + '</select>';
    } else if (f.type === 'textarea') {
      input = '<textarea id="' + id + '" name="' + f.name + '" rows="' + (f.rows || 3) + '"' + req + '>' + esc(v) + '</textarea>';
    } else if (f.type === 'checkbox') {
      return '<label class="field field-check' + (f.full ? ' full' : '') + '"><input type="checkbox" name="' + f.name + '"' + (v ? ' checked' : '') + '> ' + esc(f.label) + '</label>';
    } else {
      input = '<input id="' + id + '" type="' + (f.type || 'text') + '" name="' + f.name + '" value="' + esc(v) + '"' + req +
        (f.type === 'number' ? ' step="' + (f.step || 'any') + '" min="' + (f.min == null ? '' : f.min) + '"' : '') +
        (f.placeholder ? ' placeholder="' + esc(f.placeholder) + '"' : '') + '>';
    }
    return '<div class="field' + (f.full ? ' full' : '') + '"><label for="' + id + '">' + esc(f.label) + (f.required ? ' *' : '') + '</label>' + input + (f.hint ? '<small>' + esc(f.hint) + '</small>' : '') + '</div>';
  }

  function readForm(form, fields) {
    var out = {};
    fields.forEach(function (f) {
      var el = form.elements[f.name];
      if (!el) return;
      if (f.type === 'checkbox') out[f.name] = el.checked;
      else if (f.type === 'number') out[f.name] = el.value === '' ? '' : Number(el.value);
      else out[f.name] = el.value.trim();
    });
    return out;
  }

  /** Opens a modal with a form built from a field spec. */
  function openForm(opts) {
    var values = opts.values || {};
    var html = '<form class="form-grid" id="modal-form" novalidate>' +
      opts.fields.map(function (f) { return fieldHtml(f, values[f.name]); }).join('') +
      '<div class="form-actions full">' +
      (opts.onDelete ? '<button type="button" class="btn btn-danger" id="form-delete">Delete</button>' : '') +
      '<span class="spacer"></span><button type="button" class="btn" data-action="close-modal">Cancel</button>' +
      '<button type="submit" class="btn btn-primary">' + esc(opts.submitLabel || 'Save') + '</button></div></form>';
    openModal(opts.title, html, opts.wide);
    var form = $('#modal-form');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var missing = opts.fields.filter(function (f) { return f.required && !String(form.elements[f.name].value).trim(); });
      if (missing.length) {
        form.elements[missing[0].name].focus();
        toast('Please fill: ' + missing.map(function (f) { return f.label; }).join(', '));
        return;
      }
      opts.onSubmit(readForm(form, opts.fields));
      closeModal();
      render();
    });
    if (opts.onDelete) {
      $('#form-delete').addEventListener('click', function () {
        askConfirm('Delete this record? This cannot be undone.', 'Delete', function () {
          opts.onDelete();
          closeModal();
          render();
        });
      });
    }
  }

  /* ---------- entity forms ---------- */

  var CUSTOMER_TYPES = ['Lead', 'Customer', 'Vendor', 'Partner'];
  var SOURCES = ['Walk-in', 'Referral', 'Website', 'WhatsApp', 'Instagram', 'Facebook', 'Google', 'IndiaMART', 'JustDial', 'Trade Fair', 'Cold Call', 'Other'];

  function editCustomer(id, after) {
    var c = id ? S.get('customers', id) : null;
    openForm({
      title: c ? 'Edit contact' : 'Add contact',
      values: c || { type: 'Lead', source: 'Walk-in' },
      fields: [
        { name: 'name', label: 'Full name', required: true },
        { name: 'company', label: 'Company / Business' },
        { name: 'phone', label: 'Mobile', type: 'tel' },
        { name: 'email', label: 'Email', type: 'email' },
        { name: 'type', label: 'Type', type: 'select', options: CUSTOMER_TYPES },
        { name: 'source', label: 'Lead source', type: 'select', options: SOURCES },
        { name: 'city', label: 'City' },
        { name: 'gstin', label: 'GSTIN' },
        { name: 'address', label: 'Address', type: 'textarea', rows: 2, full: true },
        { name: 'tags', label: 'Tags', placeholder: 'e.g. wholesale, priority', full: true },
        { name: 'notes', label: 'Notes', type: 'textarea', full: true },
      ],
      onSubmit: function (data) {
        var rec = S.upsert('customers', Object.assign({ id: id }, data));
        toast(c ? 'Contact updated' : 'Contact added');
        if (after) after(rec);
      },
      onDelete: c ? function () { S.remove('customers', id); toast('Contact deleted'); location.hash = '#contacts'; } : null,
    });
  }

  function editDeal(id, defaults) {
    var d = id ? S.get('deals', id) : null;
    var stages = S.settings().stages;
    openForm({
      title: d ? 'Edit deal' : 'New deal',
      values: d || Object.assign({ stage: stages[0], expectedClose: U.addDays(U.todayISO(), 14) }, defaults),
      fields: [
        { name: 'title', label: 'Deal title', required: true, full: true },
        { name: 'customerId', label: 'Contact', type: 'select', options: customerOptions(true) },
        { name: 'value', label: 'Value (' + S.settings().currency + ')', type: 'number', min: 0 },
        { name: 'stage', label: 'Stage', type: 'select', options: stages.indexOf(d && d.stage) === -1 && d ? stages.concat([d.stage]) : stages },
        { name: 'expectedClose', label: 'Expected close', type: 'date' },
        { name: 'notes', label: 'Notes', type: 'textarea', full: true },
      ],
      onSubmit: function (data) { S.upsert('deals', Object.assign({ id: id }, data)); toast(d ? 'Deal updated' : 'Deal created'); },
      onDelete: d ? function () { S.remove('deals', id); toast('Deal deleted'); } : null,
    });
  }

  function editTask(id, defaults) {
    var t = id ? S.get('tasks', id) : null;
    openForm({
      title: t ? 'Edit follow-up' : 'New follow-up / task',
      values: t || Object.assign({ due: U.todayISO(), priority: 'Medium' }, defaults),
      fields: [
        { name: 'title', label: 'What needs to be done?', required: true, full: true },
        { name: 'customerId', label: 'Contact', type: 'select', options: customerOptions(true) },
        { name: 'due', label: 'Due date', type: 'date' },
        { name: 'priority', label: 'Priority', type: 'select', options: ['High', 'Medium', 'Low'] },
        { name: 'done', label: 'Completed', type: 'checkbox' },
        { name: 'notes', label: 'Notes', type: 'textarea', full: true },
      ],
      onSubmit: function (data) { S.upsert('tasks', Object.assign({ id: id }, data)); toast(t ? 'Task updated' : 'Task added'); },
      onDelete: t ? function () { S.remove('tasks', id); toast('Task deleted'); } : null,
    });
  }

  function editProduct(id) {
    var p = id ? S.get('products', id) : null;
    openForm({
      title: p ? 'Edit product / service' : 'Add product / service',
      values: p || { unit: 'pcs' },
      fields: [
        { name: 'name', label: 'Name', required: true, full: true },
        { name: 'sku', label: 'SKU / Code' },
        { name: 'hsn', label: 'HSN / SAC' },
        { name: 'price', label: 'Price (' + S.settings().currency + ')', type: 'number', min: 0, required: true },
        { name: 'unit', label: 'Unit', placeholder: 'pcs, kg, hour…' },
        { name: 'stock', label: 'Stock (blank for services)', type: 'number' },
        { name: 'description', label: 'Description', type: 'textarea', full: true },
      ],
      onSubmit: function (data) { S.upsert('products', Object.assign({ id: id }, data)); toast(p ? 'Product updated' : 'Product added'); },
      onDelete: p ? function () { S.remove('products', id); toast('Product deleted'); } : null,
    });
  }

  function logActivity(customerId) {
    openForm({
      title: 'Log interaction',
      values: { customerId: customerId || '', type: 'Call', date: U.todayISO() },
      fields: [
        { name: 'customerId', label: 'Contact', type: 'select', options: customerOptions(false), required: true },
        { name: 'type', label: 'Type', type: 'select', options: ['Call', 'WhatsApp', 'Meeting', 'Email', 'Visit', 'Note'] },
        { name: 'date', label: 'Date', type: 'date' },
        { name: 'note', label: 'What happened?', type: 'textarea', required: true, full: true },
      ],
      onSubmit: function (data) { S.upsert('activities', data); toast('Interaction logged'); },
    });
  }

  /* ---------- invoice editor ---------- */

  function editInvoice(id, defaults) {
    var s = S.settings();
    var inv = id ? JSON.parse(JSON.stringify(S.get('invoices', id))) : Object.assign({
      number: U.nextInvoiceNumber(S.list('invoices').map(function (i) { return i.number; }), s.invoicePrefix),
      date: U.todayISO(),
      dueDate: U.addDays(U.todayISO(), 15),
      taxRate: s.taxRate,
      discount: 0,
      status: 'Draft',
      items: [{ desc: '', qty: 1, rate: 0 }],
      notes: s.invoiceTerms,
    }, defaults);
    var custs = customerOptions(false);
    if (!custs.length) { toast('Add a contact first'); editCustomer(null); return; }
    var products = S.list('products');

    var html = '<form id="inv-form" class="form-grid">' +
      fieldHtml({ name: 'number', label: 'Invoice / Quote no.', required: true }, inv.number) +
      fieldHtml({ name: 'customerId', label: 'Bill to', type: 'select', options: custs, required: true }, inv.customerId) +
      fieldHtml({ name: 'date', label: 'Date', type: 'date' }, inv.date) +
      fieldHtml({ name: 'dueDate', label: 'Due date', type: 'date' }, inv.dueDate) +
      fieldHtml({ name: 'status', label: 'Status', type: 'select', options: ['Draft', 'Quotation', 'Sent', 'Paid', 'Cancelled'] }, inv.status) +
      fieldHtml({ name: 'taxRate', label: 'GST / Tax %', type: 'number', min: 0 }, inv.taxRate) +
      '<div class="full"><table class="items-table"><thead><tr><th>Item / description</th><th class="num">Qty</th><th class="num">Rate</th><th class="num">Amount</th><th></th></tr></thead><tbody id="inv-items"></tbody></table>' +
      '<div class="items-actions"><button type="button" class="btn btn-sm" id="add-line">+ Add line</button>' +
      (products.length ? '<select id="add-product" class="select-sm"><option value="">+ Add from products…</option>' + products.map(function (p) { return '<option value="' + esc(p.id) + '">' + esc(p.name) + ' — ' + esc(money(p.price)) + '</option>'; }).join('') + '</select>' : '') +
      '</div></div>' +
      fieldHtml({ name: 'discount', label: 'Discount (' + s.currency + ')', type: 'number', min: 0 }, inv.discount) +
      '<div class="field totals-box" id="inv-totals"></div>' +
      fieldHtml({ name: 'notes', label: 'Notes / terms', type: 'textarea', full: true }, inv.notes) +
      '<div class="form-actions full">' + (id ? '<button type="button" class="btn btn-danger" id="inv-delete">Delete</button>' : '') +
      '<span class="spacer"></span><button type="button" class="btn" data-action="close-modal">Cancel</button><button type="submit" class="btn btn-primary">Save</button></div></form>';

    openModal(id ? 'Edit ' + inv.number : 'New invoice / quotation', html, true);
    var form = $('#inv-form');
    var tbody = $('#inv-items');

    function drawItems() {
      tbody.innerHTML = inv.items.map(function (it, i) {
        return '<tr data-i="' + i + '"><td><input data-k="desc" value="' + esc(it.desc) + '" placeholder="Item name"></td>' +
          '<td class="num"><input data-k="qty" type="number" step="any" min="0" value="' + esc(it.qty) + '"></td>' +
          '<td class="num"><input data-k="rate" type="number" step="any" min="0" value="' + esc(it.rate) + '"></td>' +
          '<td class="num amt">' + esc(money((Number(it.qty) || 0) * (Number(it.rate) || 0))) + '</td>' +
          '<td><button type="button" class="btn-icon" data-remove="' + i + '" aria-label="Remove line">✕</button></td></tr>';
      }).join('');
      drawTotals();
    }
    function drawTotals() {
      var t = U.invoiceTotals(inv.items, form.elements.taxRate.value, form.elements.discount.value);
      $('#inv-totals').innerHTML =
        '<div><span>Subtotal</span><b>' + money(t.subtotal) + '</b></div>' +
        (t.discount ? '<div><span>Discount</span><b>− ' + money(t.discount) + '</b></div>' : '') +
        '<div><span>Tax (' + (Number(form.elements.taxRate.value) || 0) + '%)</span><b>' + money(t.tax) + '</b></div>' +
        '<div class="grand"><span>Total</span><b>' + money(t.total) + '</b></div>';
    }
    tbody.addEventListener('input', function (e) {
      var tr = e.target.closest('tr');
      var k = e.target.getAttribute('data-k');
      if (!tr || !k) return;
      var it = inv.items[+tr.getAttribute('data-i')];
      it[k] = k === 'desc' ? e.target.value : e.target.value;
      $('.amt', tr).textContent = money((Number(it.qty) || 0) * (Number(it.rate) || 0));
      drawTotals();
    });
    tbody.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-remove]');
      if (!btn) return;
      inv.items.splice(+btn.getAttribute('data-remove'), 1);
      if (!inv.items.length) inv.items.push({ desc: '', qty: 1, rate: 0 });
      drawItems();
    });
    $('#add-line').addEventListener('click', function () { inv.items.push({ desc: '', qty: 1, rate: 0 }); drawItems(); });
    var ap = $('#add-product');
    if (ap) ap.addEventListener('change', function () {
      var p = S.get('products', ap.value);
      if (p) {
        var blank = inv.items.length === 1 && !inv.items[0].desc && !Number(inv.items[0].rate);
        var line = { desc: p.name + (p.hsn ? ' (HSN ' + p.hsn + ')' : ''), qty: 1, rate: p.price };
        if (blank) inv.items[0] = line; else inv.items.push(line);
        drawItems();
      }
      ap.value = '';
    });
    form.elements.taxRate.addEventListener('input', drawTotals);
    form.elements.discount.addEventListener('input', drawTotals);
    if (id) $('#inv-delete').addEventListener('click', function () {
      askConfirm('Delete ' + inv.number + '? This cannot be undone.', 'Delete', function () { S.remove('invoices', id); closeModal(); toast('Invoice deleted'); location.hash = '#invoices'; render(); });
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.elements.number.value.trim()) { toast('Invoice number is required'); return; }
      var items = inv.items
        .filter(function (it) { return String(it.desc).trim() || Number(it.rate); })
        .map(function (it) { return { desc: String(it.desc).trim(), qty: Number(it.qty) || 0, rate: Number(it.rate) || 0 }; });
      if (!items.length) { toast('Add at least one line item'); return; }
      var rec = S.upsert('invoices', {
        id: id,
        number: form.elements.number.value.trim(),
        customerId: form.elements.customerId.value,
        date: form.elements.date.value,
        dueDate: form.elements.dueDate.value,
        status: form.elements.status.value,
        taxRate: Number(form.elements.taxRate.value) || 0,
        discount: Number(form.elements.discount.value) || 0,
        notes: form.elements.notes.value.trim(),
        items: items,
      });
      closeModal();
      toast('Saved ' + rec.number);
      location.hash = '#invoice-' + rec.id;
      render();
    });
    drawItems();
  }

  /* ---------- views ---------- */

  function pageHeader(title, subtitle, actions) {
    return '<div class="page-head"><div><h1>' + esc(title) + '</h1>' + (subtitle ? '<p class="muted">' + esc(subtitle) + '</p>' : '') + '</div><div class="page-actions">' + (actions || '') + '</div></div>';
  }

  function viewDashboard() {
    var s = S.settings();
    var customers = S.list('customers');
    var deals = S.list('deals');
    var tasks = S.list('tasks');
    var invoices = S.list('invoices');
    var today = U.todayISO();
    var month = today.slice(0, 7);

    var openDeals = deals.filter(isOpenDeal);
    var pipelineValue = openDeals.reduce(function (a, d) { return a + (Number(d.value) || 0); }, 0);
    var wonCount = deals.filter(function (d) { return isWon(d.stage); }).length;
    var closedCount = deals.filter(function (d) { return !isOpenDeal(d); }).length;
    var winRate = closedCount ? Math.round((wonCount / closedCount) * 100) : 0;
    var revenueMonth = invoices.filter(function (i) { return i.status === 'Paid' && String(i.paidOn || i.date).slice(0, 7) === month; })
      .reduce(function (a, i) { return a + invoiceTotal(i); }, 0);
    var outstanding = invoices.filter(function (i) { return i.status === 'Sent'; }).reduce(function (a, i) { return a + invoiceTotal(i); }, 0);
    var overdueInv = invoices.filter(function (i) { return invoiceStatus(i) === 'Overdue'; }).length;
    var openTasks = tasks.filter(function (t) { return !t.done; });
    var dueToday = openTasks.filter(function (t) { return t.due && t.due <= today; }).length;
    var leads = customers.filter(function (c) { return c.type === 'Lead'; }).length;

    var html = pageHeader('Namaste' + (s.ownerName ? ', ' + s.ownerName : '') + ' 👋', s.businessName + ' · ' + U.formatDate(today),
      '<button class="btn" data-action="log-activity">+ Log interaction</button><button class="btn btn-primary" data-action="new-customer">+ Add contact</button>');

    if (S.isEmpty()) {
      html += '<div class="card onboarding"><h2>Welcome to Prime Growth 360 CRM</h2>' +
        '<p>Manage contacts, leads, follow-ups, sales pipeline and GST invoices for your business — all in your browser. Your data stays on this device.</p>' +
        '<ol><li>Go to <a href="#setup">Settings</a> and set your business name, industry and GST rate.</li>' +
        '<li>Add your customers and leads (or import them from a CSV / Excel export).</li>' +
        '<li>Track deals on the Pipeline and never miss a follow-up.</li></ol>' +
        '<div class="row-gap"><button class="btn btn-primary" data-action="new-customer">Add first contact</button><button class="btn" data-action="seed-demo">Load demo data</button></div></div>';
    }

    html += '<div class="kpis">' +
      kpi('Contacts', customers.length, leads + ' active leads', '#contacts') +
      kpi('Open pipeline', money(pipelineValue), openDeals.length + ' deals · ' + winRate + '% win rate', '#pipeline') +
      kpi('Revenue this month', money(revenueMonth), 'from paid invoices', '#invoices') +
      kpi('Outstanding', money(outstanding), overdueInv ? overdueInv + ' overdue' : 'nothing overdue', '#invoices', overdueInv ? 'warn' : '') +
      kpi('Follow-ups due', dueToday, openTasks.length + ' open tasks', '#tasks', dueToday ? 'warn' : '') +
      '</div>';

    // pipeline chart
    var stageRows = s.stages.map(function (st) {
      var ds = deals.filter(function (d) { return d.stage === st; });
      return { stage: st, count: ds.length, value: ds.reduce(function (a, d) { return a + (Number(d.value) || 0); }, 0) };
    });
    var maxV = Math.max.apply(null, stageRows.map(function (r) { return r.value; }).concat([1]));
    var chart = stageRows.map(function (r) {
      var cls = isWon(r.stage) ? ' bar-won' : isLost(r.stage) ? ' bar-lost' : '';
      return '<div class="bar-row"><span class="bar-label">' + esc(r.stage) + '</span><div class="bar-track"><div class="bar' + cls + '" style="width:' + Math.max(2, (r.value / maxV) * 100) + '%"></div></div><span class="bar-val">' + money(r.value) + ' <small>(' + r.count + ')</small></span></div>';
    }).join('');

    var upcoming = openTasks.sort(function (a, b) { return String(a.due || '9999').localeCompare(String(b.due || '9999')); }).slice(0, 6);
    var acts = S.list('activities').sort(function (a, b) { return String(b.date).localeCompare(String(a.date)) || String(b.createdAt).localeCompare(String(a.createdAt)); }).slice(0, 6);

    html += '<div class="grid-2">' +
      '<section class="card"><div class="card-head"><h2>Sales pipeline</h2><a href="#pipeline">Open board →</a></div>' + (deals.length ? chart : '<p class="muted">No deals yet.</p>') + '</section>' +
      '<section class="card"><div class="card-head"><h2>Upcoming follow-ups</h2><a href="#tasks">All tasks →</a></div>' + (upcoming.length ? taskList(upcoming) : '<p class="muted">You are all caught up.</p>') + '</section>' +
      '</div>' +
      '<section class="card"><div class="card-head"><h2>Recent interactions</h2><button class="btn btn-sm" data-action="log-activity">+ Log</button></div>' + (acts.length ? timeline(acts, true) : '<p class="muted">Log calls, WhatsApp chats and meetings to build customer history.</p>') + '</section>';
    return html;
  }

  function kpi(label, value, sub, href, tone) {
    return '<a class="kpi' + (tone ? ' kpi-' + tone : '') + '" href="' + href + '"><span class="kpi-label">' + esc(label) + '</span><span class="kpi-value">' + esc(value) + '</span><span class="kpi-sub">' + esc(sub) + '</span></a>';
  }

  function taskList(tasks) {
    var today = U.todayISO();
    return '<ul class="task-list">' + tasks.map(function (t) {
      var due = t.due ? (t.due < today && !t.done ? '<span class="overdue">Overdue · ' + U.formatDate(t.due) + '</span>' : t.due === today ? '<span class="today">Today</span>' : U.formatDate(t.due)) : '';
      return '<li class="task' + (t.done ? ' done' : '') + '"><input type="checkbox" data-action="toggle-task" data-id="' + esc(t.id) + '"' + (t.done ? ' checked' : '') + ' aria-label="Mark done">' +
        '<div class="task-main" data-action="edit-task" data-id="' + esc(t.id) + '"><span class="task-title">' + esc(t.title) + '</span>' +
        '<span class="task-meta">' + badge(t.priority || 'Medium', 'p-' + String(t.priority || 'medium').toLowerCase()) + ' ' + due +
        (t.customerId ? ' · <a href="#contact-' + esc(t.customerId) + '">' + esc(S.customerName(t.customerId)) + '</a>' : '') + '</span></div></li>';
    }).join('') + '</ul>';
  }

  var ACT_ICONS = { Call: '📞', WhatsApp: '💬', Meeting: '🤝', Email: '✉️', Visit: '🚶', Note: '📝' };
  function timeline(acts, showCustomer) {
    return '<ul class="timeline">' + acts.map(function (a) {
      return '<li><span class="tl-icon">' + (ACT_ICONS[a.type] || '•') + '</span><div><div class="tl-head"><b>' + esc(a.type) + '</b>' +
        (showCustomer ? ' with <a href="#contact-' + esc(a.customerId) + '">' + esc(S.customerName(a.customerId)) + '</a>' : '') +
        ' <span class="muted">· ' + U.formatDate(a.date) + '</span> <button class="btn-link" data-action="delete-activity" data-id="' + esc(a.id) + '">delete</button></div><div class="tl-note">' + esc(a.note) + '</div></div></li>';
    }).join('') + '</ul>';
  }

  function viewCustomers() {
    var q = state.customerSearch.toLowerCase();
    var all = S.list('customers');
    var rows = all.filter(function (c) {
      if (state.customerType !== 'All' && c.type !== state.customerType) return false;
      if (!q) return true;
      return [c.name, c.company, c.phone, c.email, c.city, c.tags].join(' ').toLowerCase().indexOf(q) !== -1;
    }).sort(function (a, b) { return String(b.createdAt).localeCompare(String(a.createdAt)); });

    var html = pageHeader('Contacts', all.length + ' customers, leads & vendors',
      '<button class="btn" data-action="import-customers">Import CSV</button><button class="btn" data-action="export-customers">Export CSV</button><button class="btn btn-primary" data-action="new-customer">+ Add contact</button>');
    html += '<div class="toolbar"><input type="search" id="customer-search" placeholder="Search name, phone, city, tag…" value="' + esc(state.customerSearch) + '">' +
      '<div class="chips">' + ['All'].concat(CUSTOMER_TYPES).map(function (t) {
        return '<button class="chip' + (state.customerType === t ? ' active' : '') + '" data-action="customer-type" data-type="' + t + '">' + t + '</button>';
      }).join('') + '</div></div>';

    if (!all.length) return html + emptyState('👥', 'No contacts yet', 'Add your first customer or lead, or import a CSV file.', '<button class="btn btn-primary" data-action="new-customer">+ Add contact</button>');
    if (!rows.length) return html + '<p class="muted">No contacts match your search.</p>';

    html += '<div class="card table-wrap"><table class="table"><thead><tr><th>Name</th><th>Phone</th><th class="hide-sm">Email</th><th class="hide-sm">City</th><th>Type</th><th class="hide-sm">Source</th><th></th></tr></thead><tbody>' +
      rows.map(function (c) {
        return '<tr class="clickable" data-href="#contact-' + esc(c.id) + '"><td><b>' + esc(c.name) + '</b>' + (c.company ? '<div class="muted small">' + esc(c.company) + '</div>' : '') + '</td>' +
          '<td>' + esc(c.phone) + '</td><td class="hide-sm">' + esc(c.email) + '</td><td class="hide-sm">' + esc(c.city) + '</td><td>' + badge(c.type || 'Lead') + '</td><td class="hide-sm">' + esc(c.source) + '</td>' +
          '<td class="links">' + contactLinks(c) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
    return html;
  }

  function viewCustomerDetail(id) {
    var c = S.get('customers', id);
    if (!c) return emptyState('🔍', 'Contact not found', 'It may have been deleted.', '<a class="btn" href="#contacts">Back to contacts</a>');
    var deals = S.list('deals').filter(function (d) { return d.customerId === id; });
    var tasks = S.list('tasks').filter(function (t) { return t.customerId === id; }).sort(function (a, b) { return (a.done - b.done) || String(a.due).localeCompare(String(b.due)); });
    var invoices = S.list('invoices').filter(function (i) { return i.customerId === id; }).sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
    var acts = S.list('activities').filter(function (a) { return a.customerId === id; }).sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
    var lifetime = invoices.filter(function (i) { return i.status === 'Paid'; }).reduce(function (a, i) { return a + invoiceTotal(i); }, 0);
    var due = invoices.filter(function (i) { return i.status === 'Sent'; }).reduce(function (a, i) { return a + invoiceTotal(i); }, 0);

    var html = '<a class="back" href="#contacts">← Contacts</a>' +
      '<div class="card profile"><div class="avatar">' + esc((c.name || '?').charAt(0).toUpperCase()) + '</div><div class="profile-main">' +
      '<h1>' + esc(c.name) + ' ' + badge(c.type || 'Lead') + '</h1>' +
      '<p class="muted">' + [c.company, c.city, c.source ? 'Source: ' + c.source : ''].filter(Boolean).map(esc).join(' · ') + '</p>' +
      '<p>' + [c.phone, c.email, c.gstin ? 'GSTIN ' + c.gstin : ''].filter(Boolean).map(esc).join(' · ') + '</p>' +
      (c.tags ? '<p>' + String(c.tags).split(',').map(function (t) { return t.trim() ? '<span class="tag">' + esc(t.trim()) + '</span>' : ''; }).join('') + '</p>' : '') +
      (c.address ? '<p class="muted small">' + esc(c.address) + '</p>' : '') +
      (c.notes ? '<p class="note">' + esc(c.notes) + '</p>' : '') +
      '</div><div class="profile-actions">' + contactLinks(c) + '<button class="btn" data-action="edit-customer" data-id="' + esc(id) + '">Edit</button></div></div>' +
      '<div class="kpis kpis-sm">' +
      '<div class="kpi"><span class="kpi-label">Lifetime value</span><span class="kpi-value">' + money(lifetime) + '</span></div>' +
      '<div class="kpi' + (due ? ' kpi-warn' : '') + '"><span class="kpi-label">Amount due</span><span class="kpi-value">' + money(due) + '</span></div>' +
      '<div class="kpi"><span class="kpi-label">Open deals</span><span class="kpi-value">' + deals.filter(isOpenDeal).length + '</span></div>' +
      '<div class="kpi"><span class="kpi-label">Interactions</span><span class="kpi-value">' + acts.length + '</span></div></div>' +
      '<div class="grid-2">' +
      '<section class="card"><div class="card-head"><h2>Interactions</h2><button class="btn btn-sm" data-action="log-activity" data-id="' + esc(id) + '">+ Log</button></div>' + (acts.length ? timeline(acts, false) : '<p class="muted">No interactions logged yet.</p>') + '</section>' +
      '<div>' +
      '<section class="card"><div class="card-head"><h2>Follow-ups</h2><button class="btn btn-sm" data-action="new-task" data-id="' + esc(id) + '">+ Task</button></div>' + (tasks.length ? taskList(tasks) : '<p class="muted">No tasks.</p>') + '</section>' +
      '<section class="card"><div class="card-head"><h2>Deals</h2><button class="btn btn-sm" data-action="new-deal" data-id="' + esc(id) + '">+ Deal</button></div>' +
      (deals.length ? '<ul class="simple-list">' + deals.map(function (d) { return '<li data-action="edit-deal" data-id="' + esc(d.id) + '"><span>' + esc(d.title) + '</span><span>' + badge(d.stage, isWon(d.stage) ? 'won' : isLost(d.stage) ? 'lost' : 'stage') + ' <b>' + money(d.value) + '</b></span></li>'; }).join('') + '</ul>' : '<p class="muted">No deals.</p>') + '</section>' +
      '<section class="card"><div class="card-head"><h2>Invoices</h2><button class="btn btn-sm" data-action="new-invoice" data-id="' + esc(id) + '">+ Invoice</button></div>' +
      (invoices.length ? '<ul class="simple-list">' + invoices.map(function (i) { return '<li data-href="#invoice-' + esc(i.id) + '"><span>' + esc(i.number) + ' <span class="muted small">' + U.formatDate(i.date) + '</span></span><span>' + badge(invoiceStatus(i)) + ' <b>' + money(invoiceTotal(i)) + '</b></span></li>'; }).join('') + '</ul>' : '<p class="muted">No invoices.</p>') + '</section>' +
      '</div></div>';
    return html;
  }

  function viewPipeline() {
    var stages = S.settings().stages;
    var deals = S.list('deals');
    var orphan = deals.filter(function (d) { return stages.indexOf(d.stage) === -1; });
    var cols = stages.slice();
    if (orphan.length) cols.push('Other');
    var total = deals.filter(isOpenDeal).reduce(function (a, d) { return a + (Number(d.value) || 0); }, 0);
    var html = pageHeader('Sales pipeline', 'Drag deals or use the dropdown on each card · open value ' + money(total), '<a class="btn" href="#setup">Edit stages</a><button class="btn btn-primary" data-action="new-deal">+ New deal</button>');
    if (!deals.length) html += emptyState('📈', 'No deals yet', 'Create a deal for every enquiry or opportunity and move it across stages until it is won.', '<button class="btn btn-primary" data-action="new-deal">+ New deal</button>');
    html += '<div class="board">' + cols.map(function (st) {
      var ds = st === 'Other' && orphan.length ? orphan : deals.filter(function (d) { return d.stage === st; });
      var sum = ds.reduce(function (a, d) { return a + (Number(d.value) || 0); }, 0);
      var tone = isWon(st) ? ' col-won' : isLost(st) ? ' col-lost' : '';
      return '<div class="col' + tone + '" data-stage="' + esc(st) + '"><div class="col-head"><b>' + esc(st) + '</b><span>' + ds.length + ' · ' + money(sum) + '</span></div><div class="col-body">' +
        ds.map(function (d) {
          var late = d.expectedClose && isOpenDeal(d) && U.isOverdue(d.expectedClose);
          return '<div class="deal" draggable="true" data-id="' + esc(d.id) + '" data-action="edit-deal"><div class="deal-title">' + esc(d.title) + '</div>' +
            '<div class="deal-cust">' + esc(S.customerName(d.customerId)) + '</div>' +
            '<div class="deal-foot"><b>' + money(d.value) + '</b><span class="' + (late ? 'overdue' : 'muted') + '">' + (d.expectedClose ? U.formatDate(d.expectedClose) : '') + '</span></div>' +
            '<select class="deal-stage" data-id="' + esc(d.id) + '" aria-label="Move to stage">' +
            (stages.indexOf(d.stage) === -1 ? '<option selected>' + esc(d.stage) + '</option>' : '') +
            stages.map(function (s2) { return '<option value="' + esc(s2) + '"' + (s2 === d.stage ? ' selected' : '') + '>Move to: ' + esc(s2) + '</option>'; }).join('') +
            '</select></div>';
        }).join('') + '</div></div>';
    }).join('') + '</div>';
    return html;
  }

  function viewTasks() {
    var today = U.todayISO();
    var filters = {
      Open: function (t) { return !t.done; },
      Today: function (t) { return !t.done && t.due === today; },
      Overdue: function (t) { return !t.done && t.due && t.due < today; },
      Done: function (t) { return t.done; },
      All: function () { return true; },
    };
    var all = S.list('tasks');
    var rows = all.filter(filters[state.taskFilter]).sort(function (a, b) {
      return (a.done - b.done) || String(a.due || '9999').localeCompare(String(b.due || '9999'));
    });
    var html = pageHeader('Follow-ups & tasks', all.filter(filters.Open).length + ' open', '<button class="btn btn-primary" data-action="new-task">+ New task</button>');
    html += '<div class="toolbar"><div class="chips">' + Object.keys(filters).map(function (f) {
      var n = all.filter(filters[f]).length;
      return '<button class="chip' + (state.taskFilter === f ? ' active' : '') + '" data-action="task-filter" data-filter="' + f + '">' + f + ' <small>' + n + '</small></button>';
    }).join('') + '</div></div>';
    if (!rows.length) return html + emptyState('✅', 'Nothing here', 'Create follow-up reminders so no customer is forgotten.', '<button class="btn btn-primary" data-action="new-task">+ New task</button>');
    return html + '<div class="card">' + taskList(rows) + '</div>';
  }

  function viewInvoices() {
    var all = S.list('invoices').sort(function (a, b) { return String(b.date).localeCompare(String(a.date)) || String(b.number).localeCompare(String(a.number)); });
    var statuses = ['All', 'Draft', 'Quotation', 'Sent', 'Overdue', 'Paid', 'Cancelled'];
    var rows = all.filter(function (i) { return state.invoiceFilter === 'All' || invoiceStatus(i) === state.invoiceFilter; });
    var paid = all.filter(function (i) { return i.status === 'Paid'; }).reduce(function (a, i) { return a + invoiceTotal(i); }, 0);
    var due = all.filter(function (i) { return i.status === 'Sent'; }).reduce(function (a, i) { return a + invoiceTotal(i); }, 0);
    var html = pageHeader('Invoices & quotations', 'Collected ' + money(paid) + ' · Outstanding ' + money(due),
      '<button class="btn" data-action="export-invoices">Export CSV</button><button class="btn btn-primary" data-action="new-invoice">+ New invoice</button>');
    html += '<div class="toolbar"><div class="chips">' + statuses.map(function (st) {
      return '<button class="chip' + (state.invoiceFilter === st ? ' active' : '') + '" data-action="invoice-filter" data-filter="' + st + '">' + st + '</button>';
    }).join('') + '</div></div>';
    if (!all.length) return html + emptyState('🧾', 'No invoices yet', 'Create GST-ready invoices and quotations, then print or save as PDF.', '<button class="btn btn-primary" data-action="new-invoice">+ New invoice</button>');
    if (!rows.length) return html + '<p class="muted">No invoices with this status.</p>';
    return html + '<div class="card table-wrap"><table class="table"><thead><tr><th>Number</th><th>Customer</th><th class="hide-sm">Date</th><th class="hide-sm">Due</th><th>Status</th><th class="num">Total</th></tr></thead><tbody>' +
      rows.map(function (i) {
        return '<tr class="clickable" data-href="#invoice-' + esc(i.id) + '"><td><b>' + esc(i.number) + '</b></td><td>' + esc(S.customerName(i.customerId)) + '</td><td class="hide-sm">' + U.formatDate(i.date) + '</td><td class="hide-sm">' + U.formatDate(i.dueDate) + '</td><td>' + badge(invoiceStatus(i)) + '</td><td class="num"><b>' + money(invoiceTotal(i)) + '</b></td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  function viewInvoiceDetail(id) {
    var inv = S.get('invoices', id);
    if (!inv) return emptyState('🔍', 'Invoice not found', 'It may have been deleted.', '<a class="btn" href="#invoices">Back to invoices</a>');
    var s = S.settings();
    var c = S.get('customers', inv.customerId) || {};
    var t = U.invoiceTotals(inv.items, inv.taxRate, inv.discount);
    var title = inv.status === 'Quotation' ? 'QUOTATION' : 'TAX INVOICE';
    var half = U.round2(t.tax / 2);
    var html = '<div class="no-print"><a class="back" href="#invoices">← Invoices</a>' +
      '<div class="page-actions inv-actions">' +
      (inv.status !== 'Paid' ? '<button class="btn btn-primary" data-action="mark-paid" data-id="' + esc(id) + '">✓ Mark paid</button>' : '') +
      (inv.status === 'Draft' || inv.status === 'Quotation' ? '<button class="btn" data-action="mark-sent" data-id="' + esc(id) + '">Mark sent</button>' : '') +
      (c.phone ? '<a class="btn" target="_blank" rel="noopener" data-share-invoice="' + esc(id) + '" href="' + esc(invoiceWhatsAppUrl(inv)) + '">💬 Send on WhatsApp</a>' : '') +
      (IN_ARTIFACT ? '' : '<button class="btn" data-action="print">🖨 Print / PDF</button>') +
      '<button class="btn" data-action="download-invoice" data-id="' + esc(id) + '">⬇ Download invoice</button>' +
      '<button class="btn" data-action="edit-invoice" data-id="' + esc(id) + '">Edit</button></div></div>' +
      '<article class="invoice card">' +
      '<header class="inv-head"><div><h2>' + esc(s.businessName) + '</h2><p class="small">' + esc(s.address).replace(/\n/g, '<br>') + '</p><p class="small">' + [s.phone, s.email].filter(Boolean).map(esc).join(' · ') + '</p>' + (s.gstin ? '<p class="small"><b>GSTIN:</b> ' + esc(s.gstin) + '</p>' : '') + '</div>' +
      '<div class="inv-meta"><h3>' + title + '</h3><p><b>' + esc(inv.number) + '</b></p><p>Date: ' + U.formatDate(inv.date) + '</p>' + (inv.dueDate ? '<p>Due: ' + U.formatDate(inv.dueDate) + '</p>' : '') + '<p>' + badge(invoiceStatus(inv)) + '</p></div></header>' +
      '<section class="inv-bill"><span class="muted small">BILL TO</span><p><b>' + esc(c.company || c.name || '—') + '</b></p>' + (c.company ? '<p>' + esc(c.name) + '</p>' : '') + (c.address ? '<p class="small">' + esc(c.address) + '</p>' : '') + '<p class="small">' + [c.city, c.phone, c.email].filter(Boolean).map(esc).join(' · ') + '</p>' + (c.gstin ? '<p class="small"><b>GSTIN:</b> ' + esc(c.gstin) + '</p>' : '') + '</section>' +
      '<table class="table inv-table"><thead><tr><th>#</th><th>Description</th><th class="num">Qty</th><th class="num">Rate</th><th class="num">Amount</th></tr></thead><tbody>' +
      inv.items.map(function (it, i) { return '<tr><td>' + (i + 1) + '</td><td>' + esc(it.desc) + '</td><td class="num">' + esc(it.qty) + '</td><td class="num">' + money(it.rate) + '</td><td class="num">' + money(it.qty * it.rate) + '</td></tr>'; }).join('') +
      '</tbody></table>' +
      '<div class="inv-totals"><div><span>Subtotal</span><b>' + money(t.subtotal) + '</b></div>' +
      (t.discount ? '<div><span>Discount</span><b>− ' + money(t.discount) + '</b></div>' : '') +
      (t.tax ? (s.currency === 'INR'
        ? '<div><span>CGST (' + (inv.taxRate / 2) + '%)</span><b>' + money(half) + '</b></div><div><span>SGST (' + (inv.taxRate / 2) + '%)</span><b>' + money(U.round2(t.tax - half)) + '</b></div>'
        : '<div><span>Tax (' + inv.taxRate + '%)</span><b>' + money(t.tax) + '</b></div>') : '') +
      '<div class="grand"><span>Total</span><b>' + money(t.total) + '</b></div></div>' +
      (inv.notes ? '<footer class="inv-notes"><span class="muted small">NOTES & TERMS</span><p>' + esc(inv.notes).replace(/\n/g, '<br>') + '</p></footer>' : '') +
      '<p class="inv-sign">For <b>' + esc(s.businessName) + '</b><br><br><span class="muted small">Authorised signatory</span></p>' +
      '</article>';
    return html;
  }

  function viewProducts() {
    var q = state.productSearch.toLowerCase();
    var all = S.list('products');
    var rows = all.filter(function (p) { return !q || [p.name, p.sku, p.hsn, p.description].join(' ').toLowerCase().indexOf(q) !== -1; })
      .sort(function (a, b) { return a.name.localeCompare(b.name); });
    var html = pageHeader('Products & services', all.length + ' items in your catalogue', '<button class="btn btn-primary" data-action="new-product">+ Add item</button>');
    html += '<div class="toolbar"><input type="search" id="product-search" placeholder="Search products…" value="' + esc(state.productSearch) + '"></div>';
    if (!all.length) return html + emptyState('📦', 'No products yet', 'Add what you sell so you can build invoices in seconds.', '<button class="btn btn-primary" data-action="new-product">+ Add item</button>');
    return html + '<div class="card table-wrap"><table class="table"><thead><tr><th>Name</th><th class="hide-sm">SKU</th><th class="hide-sm">HSN/SAC</th><th class="num">Price</th><th class="hide-sm">Unit</th><th class="num">Stock</th></tr></thead><tbody>' +
      rows.map(function (p) {
        var low = p.stock !== '' && p.stock != null && Number(p.stock) <= 5;
        return '<tr class="clickable" data-action="edit-product" data-id="' + esc(p.id) + '"><td><b>' + esc(p.name) + '</b></td><td class="hide-sm">' + esc(p.sku) + '</td><td class="hide-sm">' + esc(p.hsn) + '</td><td class="num">' + money(p.price) + '</td><td class="hide-sm">' + esc(p.unit) + '</td><td class="num' + (low ? ' overdue' : '') + '">' + (p.stock === '' || p.stock == null ? '—' : esc(p.stock)) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  function viewSettings() {
    var s = S.settings();
    var industries = Object.keys(S.INDUSTRY_PRESETS);
    return pageHeader('Settings', 'Business profile, pipeline and data') +
      '<form id="settings-form" class="card form-grid">' +
      '<h2 class="full">Business profile</h2>' +
      fieldHtml({ name: 'businessName', label: 'Business name', required: true }, s.businessName) +
      fieldHtml({ name: 'ownerName', label: 'Your name' }, s.ownerName) +
      fieldHtml({ name: 'phone', label: 'Business phone' }, s.phone) +
      fieldHtml({ name: 'email', label: 'Business email', type: 'email' }, s.email) +
      fieldHtml({ name: 'gstin', label: 'GSTIN' }, s.gstin) +
      fieldHtml({ name: 'industry', label: 'Industry', type: 'select', options: industries }, s.industry) +
      fieldHtml({ name: 'address', label: 'Address (shown on invoices)', type: 'textarea', rows: 2, full: true }, s.address) +
      '<h2 class="full">Sales & invoicing</h2>' +
      fieldHtml({ name: 'currency', label: 'Currency', type: 'select', options: ['INR', 'USD', 'EUR', 'GBP', 'AED'] }, s.currency) +
      fieldHtml({ name: 'countryCode', label: 'Country code for WhatsApp', hint: '91 for India' }, s.countryCode) +
      fieldHtml({ name: 'taxRate', label: 'Default GST / tax %', type: 'number', min: 0 }, s.taxRate) +
      fieldHtml({ name: 'invoicePrefix', label: 'Invoice number prefix' }, s.invoicePrefix) +
      fieldHtml({ name: 'stages', label: 'Pipeline stages (one per line, in order)', type: 'textarea', rows: 7, full: true, hint: 'Stages containing "Won" or "Lost" count as closed. Pick an industry and click "Use industry stages" for a ready-made set.' }, s.stages.join('\n')) +
      fieldHtml({ name: 'invoiceTerms', label: 'Default invoice terms', type: 'textarea', rows: 2, full: true }, s.invoiceTerms) +
      '<div class="form-actions full"><button type="button" class="btn" data-action="apply-industry">Use industry stages</button><span class="spacer"></span><button type="submit" class="btn btn-primary">Save settings</button></div></form>' +
      '<section class="card"><h2>Your data</h2><p class="muted">Everything is stored in this browser only. Download a backup regularly and restore it on another computer or phone.</p>' +
      '<div class="row-gap"><button class="btn btn-primary" data-action="export-backup">⬇ Download backup</button><button class="btn" data-action="import-backup">⬆ Restore backup</button>' +
      '<button class="btn" data-action="seed-demo">Load demo data</button><button class="btn btn-danger" data-action="reset-data">Erase all data</button></div></section>';
  }

  /* ---------- router ---------- */

  var ROUTES = [
    { re: /^#contact-([A-Za-z0-9]+)$/, nav: 'customers', fn: viewCustomerDetail },
    { re: /^#contacts$/, nav: 'customers', fn: viewCustomers },
    { re: /^#pipeline$/, nav: 'pipeline', fn: viewPipeline },
    { re: /^#tasks$/, nav: 'tasks', fn: viewTasks },
    { re: /^#invoice-([A-Za-z0-9]+)$/, nav: 'invoices', fn: viewInvoiceDetail },
    { re: /^#invoices$/, nav: 'invoices', fn: viewInvoices },
    { re: /^#products$/, nav: 'products', fn: viewProducts },
    { re: /^#setup$/, nav: 'settings', fn: viewSettings },
    { re: /^.*$/, nav: 'dashboard', fn: viewDashboard },
  ];

  function render() {
    var hash = location.hash || '#dashboard';
    for (var i = 0; i < ROUTES.length; i++) {
      var m = hash.match(ROUTES[i].re);
      if (m) {
        var scrollY = window.scrollY;
        view.innerHTML = ROUTES[i].fn(m[1] ? decodeURIComponent(m[1]) : undefined);
        $all('.nav a').forEach(function (a) { a.classList.toggle('active', a.getAttribute('data-nav') === ROUTES[i].nav); });
        document.title = S.settings().businessName + ' · CRM';
        $('#brand-name').textContent = S.settings().businessName;
        updateBadges();
        afterRender(scrollY);
        return;
      }
    }
  }

  function updateBadges() {
    var today = U.todayISO();
    var n = S.list('tasks').filter(function (t) { return !t.done && t.due && t.due <= today; }).length;
    var b = $('#nav-task-count');
    b.textContent = n || '';
    b.hidden = !n;
  }

  function afterRender(scrollY) {
    var cs = $('#customer-search');
    if (cs) cs.addEventListener('input', function () {
      state.customerSearch = cs.value;
      var pos = cs.selectionStart;
      render();
      var el = $('#customer-search'); el.focus(); el.setSelectionRange(pos, pos);
    });
    var ps = $('#product-search');
    if (ps) ps.addEventListener('input', function () {
      state.productSearch = ps.value;
      var pos = ps.selectionStart;
      render();
      var el = $('#product-search'); el.focus(); el.setSelectionRange(pos, pos);
    });
    var sf = $('#settings-form');
    if (sf) sf.addEventListener('submit', function (e) {
      e.preventDefault();
      var stages = sf.elements.stages.value.split('\n').map(function (x) { return x.trim(); }).filter(Boolean);
      if (!stages.length) { toast('Add at least one pipeline stage'); return; }
      S.updateSettings({
        businessName: sf.elements.businessName.value.trim() || 'My Business',
        ownerName: sf.elements.ownerName.value.trim(),
        phone: sf.elements.phone.value.trim(),
        email: sf.elements.email.value.trim(),
        gstin: sf.elements.gstin.value.trim().toUpperCase(),
        industry: sf.elements.industry.value,
        address: sf.elements.address.value.trim(),
        currency: sf.elements.currency.value,
        countryCode: sf.elements.countryCode.value.trim(),
        taxRate: Number(sf.elements.taxRate.value) || 0,
        invoicePrefix: sf.elements.invoicePrefix.value.trim(),
        stages: stages,
        invoiceTerms: sf.elements.invoiceTerms.value.trim(),
      });
      toast('Settings saved');
      render();
    });
    setupDragAndDrop();
    window.scrollTo(0, scrollY || 0);
  }

  function setupDragAndDrop() {
    var dragId = null;
    $all('.deal').forEach(function (card) {
      card.addEventListener('dragstart', function (e) { dragId = card.getAttribute('data-id'); card.classList.add('dragging'); e.dataTransfer.setData('text/plain', dragId); });
      card.addEventListener('dragend', function () { card.classList.remove('dragging'); });
    });
    $all('.col').forEach(function (col) {
      col.addEventListener('dragover', function (e) { e.preventDefault(); col.classList.add('drop'); });
      col.addEventListener('dragleave', function () { col.classList.remove('drop'); });
      col.addEventListener('drop', function (e) {
        e.preventDefault();
        col.classList.remove('drop');
        var id = dragId || e.dataTransfer.getData('text/plain');
        var stage = col.getAttribute('data-stage');
        if (id && stage !== 'Other') moveDeal(id, stage);
      });
    });
  }

  /* ---------- actions ---------- */

  var ACTIONS = {
    'close-modal': closeModal,
    'new-customer': function () { editCustomer(null, function (rec) { location.hash = '#contact-' + rec.id; }); },
    'edit-customer': function (el) { editCustomer(el.dataset.id); },
    'new-deal': function (el) { editDeal(null, el.dataset.id ? { customerId: el.dataset.id } : {}); },
    'edit-deal': function (el) { editDeal(el.dataset.id); },
    'new-task': function (el) { editTask(null, el.dataset.id ? { customerId: el.dataset.id } : {}); },
    'edit-task': function (el, e) { if (e.target.closest('a')) return; editTask(el.dataset.id); },
    'toggle-task': function (el) {
      S.upsert('tasks', { id: el.dataset.id, done: el.checked });
      toast(el.checked ? 'Task completed ✓' : 'Task reopened');
      render();
    },
    'new-invoice': function (el) { editInvoice(null, el.dataset.id ? { customerId: el.dataset.id } : {}); },
    'edit-invoice': function (el) { editInvoice(el.dataset.id); },
    'mark-paid': function (el) { S.upsert('invoices', { id: el.dataset.id, status: 'Paid', paidOn: U.todayISO() }); toast('Marked as paid'); render(); },
    'mark-sent': function (el) { S.upsert('invoices', { id: el.dataset.id, status: 'Sent' }); toast('Marked as sent'); render(); },
    'download-invoice': function (el) {
      var inv = S.get('invoices', el.dataset.id);
      var article = $('.invoice');
      var css = Array.prototype.map.call(document.querySelectorAll('style'), function (st) { return st.textContent; }).join('\n');
      var links = Array.prototype.map.call(document.querySelectorAll('link[rel=stylesheet]'), function (l) { return '<link rel="stylesheet" href="' + l.href + '">'; }).join('');
      var html = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + esc(inv.number) + '</title>' + links +
        '<style>' + css + '\nbody{background:#fff;padding:24px}.invoice{margin:0 auto}</style></head><body>' + article.outerHTML +
        '<p class="no-print" style="text-align:center;margin-top:16px"><button onclick="print()" style="padding:8px 16px">Print / Save as PDF</button></p></body></html>';
      download(String(inv.number).replace(/[^A-Za-z0-9_-]+/g, '-') + '.html', html, 'text/html');
    },
    print: function () { window.print(); },
    'new-product': function () { editProduct(null); },
    'edit-product': function (el) { editProduct(el.dataset.id); },
    'log-activity': function (el) {
      if (!S.list('customers').length) { toast('Add a contact first'); editCustomer(null); return; }
      logActivity(el.dataset.id);
    },
    'delete-activity': function (el) { askConfirm('Delete this interaction?', 'Delete', function () { S.remove('activities', el.dataset.id); render(); }); },
    'customer-type': function (el) { state.customerType = el.dataset.type; render(); },
    'task-filter': function (el) { state.taskFilter = el.dataset.filter; render(); },
    'invoice-filter': function (el) { state.invoiceFilter = el.dataset.filter; render(); },
    'export-customers': function () {
      var cols = ['name', 'company', 'phone', 'email', 'type', 'source', 'city', 'gstin', 'address', 'tags', 'notes'];
      download('contacts-' + U.todayISO() + '.csv', U.toCSV(S.list('customers'), cols), 'text/csv');
    },
    'import-customers': function () {
      pickFile('.csv,text/csv', function (text) {
        var rows = U.parseCSV(text);
        // Accept common header spellings from Excel / Google Contacts exports.
        var map = { name: ['name', 'full name', 'customer name', 'contact name'], company: ['company', 'business', 'organization', 'firm'], phone: ['phone', 'mobile', 'phone number', 'contact', 'mobile number'], email: ['email', 'e-mail', 'email address'], city: ['city', 'location'], type: ['type'], source: ['source', 'lead source'], gstin: ['gstin', 'gst', 'gst no'], address: ['address'], tags: ['tags', 'labels'], notes: ['notes', 'remarks'] };
        var recs = rows.map(function (r) {
          var lower = {};
          Object.keys(r).forEach(function (k) { lower[k.toLowerCase()] = r[k]; });
          var o = {};
          Object.keys(map).forEach(function (k) {
            for (var i = 0; i < map[k].length; i++) if (lower[map[k][i]]) { o[k] = lower[map[k][i]]; break; }
          });
          if (CUSTOMER_TYPES.indexOf(o.type) === -1) o.type = 'Lead';
          return o;
        }).filter(function (o) { return o.name; });
        if (!recs.length) { toast('No rows with a "name" column were found'); return; }
        S.bulkInsert('customers', recs);
        toast('Imported ' + recs.length + ' contacts');
        render();
      });
    },
    'export-invoices': function () {
      var rows = S.list('invoices').map(function (i) {
        var t = U.invoiceTotals(i.items, i.taxRate, i.discount);
        return { number: i.number, customer: S.customerName(i.customerId), date: i.date, dueDate: i.dueDate, status: invoiceStatus(i), subtotal: t.subtotal, discount: t.discount, taxRate: i.taxRate, tax: t.tax, total: t.total };
      });
      download('invoices-' + U.todayISO() + '.csv', U.toCSV(rows, ['number', 'customer', 'date', 'dueDate', 'status', 'subtotal', 'discount', 'taxRate', 'tax', 'total']), 'text/csv');
    },
    'export-backup': function () { download('prime-growth-360-backup-' + U.todayISO() + '.json', S.exportJSON(), 'application/json'); },
    'import-backup': function () {
      pickFile('.json,application/json', function (text) {
        askConfirm('Restoring will replace ALL current data with the data in this backup file. Continue?', 'Restore backup', function () {
          try { S.importJSON(text); toast('Backup restored'); render(); } catch (err) { toast(err.message || 'This file could not be read as a backup.'); }
        });
      });
    },
    'seed-demo': function () {
      var go = function () { S.seedDemo(); toast('Demo data loaded'); render(); };
      if (S.isEmpty()) go(); else askConfirm('Add demo records alongside your existing data?', 'Add demo data', go, false);
    },
    'reset-data': function () {
      askConfirm('Erase ALL contacts, deals, tasks, invoices and settings? This cannot be undone. Download a backup first if you are unsure.', 'Erase everything', function () {
        S.reset(); toast('All data erased'); location.hash = '#dashboard'; render();
      });
    },
    'apply-industry': function () {
      var sel = $('#settings-form').elements.industry.value;
      $('#settings-form').elements.stages.value = S.INDUSTRY_PRESETS[sel].join('\n');
      toast('Stages for ' + sel + ' filled in — click Save');
    },
    'toggle-nav': function () { document.body.classList.toggle('nav-open'); },
  };

  function moveDeal(id, stage) {
    S.upsert('deals', { id: id, stage: stage });
    toast('Moved to ' + stage + (isWon(stage) ? ' 🎉' : ''));
    render();
  }

  // Stage dropdown on deal cards: works on phones where drag-and-drop does not.
  document.addEventListener('change', function (e) {
    if (e.target.classList.contains('deal-stage')) moveDeal(e.target.dataset.id, e.target.value);
  });

  document.addEventListener('click', function (e) {
    if (e.target.closest('.deal-stage')) return;
    var el = e.target.closest('[data-action]');
    if (el && ACTIONS[el.dataset.action]) {
      if (el.type === 'checkbox') { ACTIONS[el.dataset.action](el, e); return; }
      e.preventDefault();
      ACTIONS[el.dataset.action](el, e);
      return;
    }
    var share = e.target.closest('[data-share-invoice]');
    if (share) {
      var inv = S.get('invoices', share.getAttribute('data-share-invoice'));
      if (inv) S.upsert('activities', { customerId: inv.customerId, type: 'WhatsApp', note: 'Shared ' + inv.number + ' (' + money(invoiceTotal(inv)) + ')', date: U.todayISO() });
      return;
    }
    if (e.target.closest('a')) { document.body.classList.remove('nav-open'); return; }
    var row = e.target.closest('[data-href]');
    if (row) location.hash = row.getAttribute('data-href');
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modalRoot.innerHTML) closeModal();
  });

  window.addEventListener('hashchange', function () { document.body.classList.remove('nav-open'); window.scrollTo(0, 0); render(); });

  var SYNC_TEXT = {
    local: 'Saved on this device.<br>Back it up from Settings.',
    connecting: 'Connecting to your account…',
    saving: 'Saving to your account…',
    synced: '✓ Saved to your Claude account.<br>Open it on any device.',
    error: 'Saved on this device only.<br>Your account copy could not be updated.',
  };
  function showSync(st) {
    var el = $('#sync-status');
    if (!el) return;
    el.innerHTML = SYNC_TEXT[st] || SYNC_TEXT.local;
    el.className = 'sidebar-foot sync-' + st;
  }
  S.onSyncStatus(showSync);

  render();
  S.connectCloud(function () { toast('Loaded your saved data'); render(); });
})();

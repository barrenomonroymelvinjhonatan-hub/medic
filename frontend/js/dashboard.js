(() => {
'use strict';

// ================== CONFIGURACIÓN ==================
const API_BASE = 'http://127.0.0.1:8000/api';
const LOGIN_PAGE = 'login.html';
const ACCESS_KEYS = ['access', 'token', 'access_token'];
const REFRESH_KEYS = ['refresh', 'refresh_token'];
const PW_MIN = 8;   // debe coincidir con el backend
// ===================================================

// ---------- Autenticación y peticiones ----------
function leerClave(keys) {
  for (const k of keys) {
    const v = localStorage.getItem(k) || sessionStorage.getItem(k);
    if (v) return { key: k, value: v };
  }
  return null;
}
const getToken = () => leerClave(ACCESS_KEYS)?.value || null;

function logout() {
  localStorage.clear();
  sessionStorage.clear();
  window.location.href = LOGIN_PAGE;
}

async function renovarToken() {
  const r = leerClave(REFRESH_KEYS);
  if (!r) return false;
  const res = await fetch(`${API_BASE}/auth/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh: r.value }),
  });
  if (!res.ok) return false;
  const d = await res.json();
  const a = leerClave(ACCESS_KEYS);
  (localStorage.getItem(a?.key) ? localStorage : sessionStorage).setItem(a?.key || 'access', d.access);
  if (d.refresh) localStorage.setItem(r.key, d.refresh);
  return true;
}

async function api(path, options = {}, reintento = true) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (res.status === 401) {
    if (reintento && await renovarToken()) return api(path, options, false);
    logout();
    return;
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = new Error('Error en la petición');
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

// ---------- Utilidades ----------
const $ = id => document.getElementById(id);
const lista = d => (Array.isArray(d) ? d : d?.results || []);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nombre = r => `${r.name || ''} ${r.lastname || ''}`.trim();
const check = v => `<input class="form-check-input" type="checkbox" disabled ${v ? 'checked' : ''}>`;
const sexos = [['M', 'Masculino'], ['F', 'Femenino'], ['O', 'Otro']];

// ---------- Usuario actual y roles ----------
// Los datos salen del propio token JWT (tu login ya incluye is_staff, is_superuser, etc.)
function jwtPayload() {
  const t = getToken();
  if (!t) return null;
  try {
    const b = t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(decodeURIComponent(atob(b).split('').map(c =>
      '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')));
  } catch (_) { return null; }
}
function yo() {
  const p = jwtPayload();
  if (p && 'is_staff' in p) {
    return { id: p.user_id, username: p.username, name: p.name, lastname: p.lastname,
             is_staff: p.is_staff, is_superuser: p.is_superuser };
  }
  try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch (_) { return null; }
}
// Si no se puede saber el rol, se asume admin y el servidor decide (responde 403)
const esAdmin = () => { const m = yo(); return !m || !!(m.is_staff || m.is_superuser); };
const esYo = r => String(r.id) === String(yo()?.id);
const rolDe = r => (r.is_superuser ? 'Superadministrador' : r.is_staff ? 'Administrador' : 'Usuario');

// ---------- Contraseña ----------
function reglasPw(pw, usuario) {
  const u = (usuario || '').trim().toLowerCase();
  return [
    { ok: pw.length >= PW_MIN, t: `Mínimo ${PW_MIN} caracteres (${pw.length}/${PW_MIN})`, corto: `mínimo ${PW_MIN} caracteres` },
    { ok: /[A-Za-z]/.test(pw), t: 'Al menos una letra', corto: 'una letra' },
    { ok: /\d/.test(pw), t: 'Al menos un número', corto: 'un número' },
    { ok: !(u.length >= 3 && pw.toLowerCase().includes(u)), t: 'No debe contener el nombre de usuario', corto: 'no usar el nombre de usuario' },
  ];
}

function actualizarPw() {
  const el = $('f_password');
  const box = $('pwReglas');
  if (!el || !box) return;
  if (!el.value && editando) {
    box.innerHTML = '<li class="text-muted">Déjala vacía para conservar la contraseña actual.</li>';
    return;
  }
  box.innerHTML = reglasPw(el.value, $('f_username')?.value).map(r =>
    `<li class="${r.ok ? 'text-success' : 'text-danger'}"><i class="bi bi-${r.ok ? 'check-circle' : 'x-circle'}"></i> ${esc(r.t)}</li>`).join('');
  el.classList.remove('is-invalid');
}

function textoError(err) {
  const d = err.data;
  if (d?.detail) return d.detail;
  if (d && typeof d === 'object') {
    return Object.entries(d).map(([k, v]) => {
      const f = ent.campos.find(c => c.n === k);
      const msgs = [].concat(v).join(' ');
      return k === 'non_field_errors' ? msgs : `${f ? f.l : k}: ${msgs}`;
    }).join(' | ');
  }
  return `Error ${err.status || 'de conexión'} al guardar.`;
}

// ================== DEFINICIÓN DE CADA SECCIÓN ==================
// n=nombre en la API, l=etiqueta, t=tipo, col=ancho, req=obligatorio,
// reqCreate=obligatorio solo al crear, def=valor inicial, opts=opciones fijas,
// ref={ep,text}=opciones desde la API, noEmpty=sin opción vacía, bool=select que envía true/false,
// hint=texto de ayuda, noSelf=no editable en tu propio usuario
const entidades = {
  pacientes: {
    plural: 'Pacientes', nuevo: 'Nuevo paciente', editar: 'Editar paciente', singular: 'paciente', este: 'este paciente',
    ep: '/pacients/',
    nombreDe: nombre,
    buscar: r => `${nombre(r)} ${r.email} ${r.phone}`,
    cols: [
      { h: 'Nombre', f: r => esc(nombre(r)) },
      { h: 'Teléfono', f: r => esc(r.phone) },
      { h: 'Email', f: r => esc(r.email) },
      { h: 'Activo', f: r => check(r.is_active) },
    ],
    campos: [
      { n: 'name', l: 'Nombre', t: 'text', req: 1, col: 6 },
      { n: 'lastname', l: 'Apellido', t: 'text', req: 1, col: 6 },
      { n: 'phone', l: 'Teléfono', t: 'text', col: 6 },
      { n: 'email', l: 'Email', t: 'email', col: 6 },
      { n: 'gender', l: 'Género', t: 'select', opts: sexos, col: 6 },
      { n: 'day_of_birth', l: 'Fecha de nacimiento', t: 'date', col: 6 },
      { n: 'address', l: 'Dirección', t: 'text', col: 12 },
      { n: 'sick', l: 'Enfermedades', t: 'textarea', col: 6 },
      { n: 'alergy', l: 'Alergias', t: 'textarea', col: 6 },
      { n: 'is_active', l: 'Paciente activo', t: 'checkbox', col: 12, def: true },
    ],
  },

  medicos: {
    plural: 'Médicos', nuevo: 'Nuevo médico', editar: 'Editar médico', singular: 'médico', este: 'este médico',
    ep: '/medics/', soloAdminEscribe: true,
    nombreDe: nombre,
    buscar: r => `${nombre(r)} ${r.email} ${r.category_name}`,
    cols: [
      { h: 'Nombre', f: r => esc(nombre(r)) },
      { h: 'Categoría', f: r => esc(r.category_name) },
      { h: 'Teléfono', f: r => esc(r.phone) },
      { h: 'Email', f: r => esc(r.email) },
      { h: 'Activo', f: r => check(r.is_active) },
    ],
    campos: [
      { n: 'name', l: 'Nombre', t: 'text', req: 1, col: 6 },
      { n: 'lastname', l: 'Apellido', t: 'text', req: 1, col: 6 },
      { n: 'phone', l: 'Teléfono', t: 'text', col: 6 },
      { n: 'email', l: 'Email', t: 'email', col: 6 },
      { n: 'gender', l: 'Género', t: 'select', opts: sexos, col: 6 },
      { n: 'day_of_birth', l: 'Fecha de nacimiento', t: 'date', col: 6 },
      { n: 'address', l: 'Dirección', t: 'text', col: 12 },
      { n: 'category', l: 'Categoría', t: 'select', col: 6, ref: { ep: '/categories/', text: c => c.name } },
      { n: 'is_active', l: 'Médico activo', t: 'checkbox', col: 6, def: true },
    ],
  },

  reservas: {
    plural: 'Reservas', nuevo: 'Nueva reserva', editar: 'Editar reserva', singular: 'reserva', este: 'esta reserva',
    ep: '/reservations/',
    nombreDe: r => `${r.title}${r.pacient_name ? ` (${r.pacient_name})` : ''}`,
    buscar: r => `${r.title} ${r.pacient_name} ${r.medic_name} ${r.status_name}`,
    cols: [
      { h: 'Fecha', f: r => esc(r.date_at) },
      { h: 'Hora', f: r => esc((r.time_at || '').slice(0, 5)) },
      { h: 'Título', f: r => esc(r.title) },
      { h: 'Paciente', f: r => esc(r.pacient_name) },
      { h: 'Médico', f: r => esc(r.medic_name) },
      { h: 'Estado', f: r => esc(r.status_name) },
      { h: 'Pago', f: r => esc(r.payment_name) },
      { h: 'Precio', f: r => esc(r.price) },
    ],
    campos: [
      { n: 'title', l: 'Título', t: 'text', req: 1, col: 12 },
      { n: 'pacient', l: 'Paciente', t: 'select', req: 1, col: 6, ref: { ep: '/pacients/', text: nombre } },
      { n: 'medic', l: 'Médico', t: 'select', req: 1, col: 6, ref: { ep: '/medics/', text: nombre } },
      { n: 'date_at', l: 'Fecha', t: 'date', col: 4 },
      { n: 'time_at', l: 'Hora', t: 'time', col: 4 },
      { n: 'price', l: 'Precio', t: 'number', col: 4 },
      { n: 'status', l: 'Estado', t: 'select', req: 1, noEmpty: 1, col: 6, ref: { ep: '/status/', text: s => s.name } },
      { n: 'payment', l: 'Pago', t: 'select', req: 1, noEmpty: 1, col: 6, ref: { ep: '/payments/', text: p => p.name } },
      { n: 'symtoms', l: 'Síntomas', t: 'textarea', col: 6 },
      { n: 'note', l: 'Nota', t: 'textarea', col: 6 },
    ],
  },

  categorias: {
    plural: 'Categorías', nuevo: 'Nueva categoría', editar: 'Editar categoría', singular: 'categoría', este: 'esta categoría',
    ep: '/categories/', soloAdminEscribe: true,
    nombreDe: r => r.name,
    buscar: r => r.name,
    cols: [{ h: 'Nombre', f: r => esc(r.name) }],
    campos: [{ n: 'name', l: 'Nombre', t: 'text', req: 1, col: 12 }],
  },

  usuarios: {
    plural: 'Usuarios', nuevo: 'Nuevo usuario', editar: 'Editar usuario', singular: 'usuario', este: 'este usuario',
    ep: '/users/', soloAdmin: true, noBorrarYo: true,
    nombreDe: r => r.username,
    buscar: r => `${r.username} ${nombre(r)} ${r.email} ${rolDe(r)}`,
    cols: [
      { h: 'Usuario', f: r => esc(r.username) },
      { h: 'Nombre', f: r => esc(nombre(r)) },
      { h: 'Email', f: r => esc(r.email) },
      { h: 'Rol', f: r => `<span class="badge text-bg-${r.is_staff || r.is_superuser ? 'primary' : 'secondary'}">${rolDe(r)}</span>` },
      { h: 'Activo', f: r => check(r.is_active) },
    ],
    campos: [
      { n: 'username', l: 'Usuario', t: 'text', req: 1, col: 6 },
      { n: 'password', l: 'Contraseña', t: 'password', reqCreate: 1, col: 6 },
      { n: 'name', l: 'Nombre', t: 'text', col: 6 },
      { n: 'lastname', l: 'Apellido', t: 'text', col: 6 },
      { n: 'email', l: 'Email', t: 'email', col: 12 },
      { n: 'is_staff', l: 'Rol', t: 'select', bool: 1, noEmpty: 1, noSelf: 1, col: 6, def: 'false',
        opts: [['false', 'Usuario'], ['true', 'Administrador']],
        hint: 'Administrador: acceso total. Usuario: gestiona pacientes y reservas; solo consulta médicos y categorías.' },
      { n: 'is_active', l: 'Usuario activo', t: 'checkbox', noSelf: 1, col: 6, def: true },
    ],
  },
};

// ================== ESTADO ==================
let clave = null;      // sección actual
let ent = null;        // definición de la sección actual
let datos = [];        // registros cargados
let editando = null;   // registro que se edita (null = creando)
let pendiente = null;  // datos esperando confirmación

const puedeEscribir = () => !ent.soloAdminEscribe || esAdmin();

function aviso(msg) {
  $('toastTxt').textContent = msg;
  bootstrap.Toast.getOrCreateInstance($('toastOk'), { delay: 2500 }).show();
}

// ================== NAVEGACIÓN ==================
function mostrarSeccion(k) {
  document.querySelectorAll('#menu .nav-link').forEach(a =>
    a.classList.toggle('active', a.dataset.section === k));
  $('sec-resumen').classList.toggle('d-none', k !== 'resumen');
  $('sec-crud').classList.toggle('d-none', k === 'resumen');
  history.replaceState(null, '', `#${k}`);   // recordar la sección aunque se recargue la página

  if (k === 'resumen') {
    $('pageTitle').textContent = 'Resumen';
    return cargarResumen();
  }

  clave = k;
  ent = entidades[k];
  $('pageTitle').textContent = ent.plural;
  $('crudTitulo').textContent = ent.plural;
  $('buscar').value = '';
  $('btnNuevoTxt').textContent = ent.nuevo;
  $('btnNuevo').classList.toggle('d-none', !puedeEscribir());
  $('crudHead').innerHTML = '<tr>' + ent.cols.map(c => `<th>${c.h}</th>`).join('') +
    (puedeEscribir() ? '<th class="text-end">Acciones</th>' : '') + '</tr>';
  cargar();
}

document.querySelectorAll('#menu .nav-link').forEach(a =>
  a.addEventListener('click', e => {
    e.preventDefault();
    mostrarSeccion(a.dataset.section);
    bootstrap.Offcanvas.getInstance($('sidebar'))?.hide();   // cierra el menú en celular
  }));

// ================== LISTAR ==================
const nCols = () => ent.cols.length + (puedeEscribir() ? 1 : 0);
const filaVacia = (txt, cls = 'text-muted') =>
  `<tr><td colspan="${nCols()}" class="vacio ${cls} text-center py-3">${txt}</td></tr>`;

async function cargar() {
  const esta = clave;
  $('crudBody').innerHTML = filaVacia('Cargando...');
  try {
    const r = lista(await api(ent.ep));
    if (esta !== clave) return;   // el usuario cambió de sección mientras cargaba
    datos = r;
    pintar();
  } catch (e) {
    $('crudBody').innerHTML = filaVacia(e.status === 403
      ? 'No tienes permiso para ver esta sección.'
      : `No se pudo cargar (error ${e.status || 'de conexión'}).`, 'text-danger');
  }
}

function pintar() {
  const q = $('buscar').value.trim().toLowerCase();
  const filas = datos.filter(r => ent.buscar(r).toLowerCase().includes(q));
  if (!filas.length) { $('crudBody').innerHTML = filaVacia('No hay registros para mostrar.'); return; }

  $('crudBody').innerHTML = filas.map(r => {
    const borrar = !(ent.noBorrarYo && esYo(r));
    return `<tr>
      ${ent.cols.map(c => `<td data-label="${esc(c.h)}">${c.f(r)}</td>`).join('')}
      ${puedeEscribir() ? `<td class="acciones text-end">
        <button class="btn btn-warning btn-sm btn-editar" data-id="${r.id}" title="Editar" aria-label="Editar"><i class="bi bi-pencil"></i></button>
        ${borrar ? `<button class="btn btn-danger btn-sm btn-eliminar" data-id="${r.id}" title="Eliminar" aria-label="Eliminar"><i class="bi bi-trash"></i></button>` : ''}
      </td>` : ''}
    </tr>`;
  }).join('');
}

$('buscar').addEventListener('input', pintar);

$('crudBody').addEventListener('click', e => {
  const be = e.target.closest('.btn-editar');
  const bd = e.target.closest('.btn-eliminar');
  if (be) abrirFormulario(datos.find(r => r.id == be.dataset.id));
  if (bd) abrirEliminar(datos.find(r => r.id == bd.dataset.id));
});

// ================== FORMULARIO (crear / editar) ==================
const modalForm = new bootstrap.Modal($('modalForm'));

function vista(modo) {   // 'form' | 'confirm'
  const c = modo === 'confirm';
  $('formCampos').classList.toggle('d-none', c);
  $('formConfirm').classList.toggle('d-none', !c);
  $('footForm').classList.toggle('d-none', c);
  $('footConfirm').classList.toggle('d-none', !c);
  if (c) $('formError').classList.add('d-none');
}

function mostrarError(msg) {
  $('formError').textContent = msg;
  $('formError').classList.remove('d-none');
}

function campoHTML(f, val, refs) {
  const id = `f_${f.n}`;
  const req = (f.req || (f.reqCreate && !editando)) ? 'required' : '';
  const dis = (f.noSelf && editando && esYo(editando)) ? 'disabled' : '';
  const col = `col-12 col-md-${f.col}`;
  const hint = f.hint ? `<div class="form-text">${esc(f.hint)}</div>` : '';
  let input;

  if (f.t === 'checkbox') {
    return `<div class="${col}"><div class="form-check">
      <input class="form-check-input" type="checkbox" id="${id}" ${val ? 'checked' : ''} ${dis}>
      <label class="form-check-label" for="${id}">${esc(f.l)}</label></div></div>`;
  }
  if (f.t === 'textarea') {
    input = `<textarea class="form-control" id="${id}" rows="2">${esc(val)}</textarea>`;
  } else if (f.t === 'select') {
    const opts = f.ref ? refs[f.n].map(o => [o.id, f.ref.text(o)]) : f.opts;
    const vacia = f.noEmpty ? '' : '<option value="">Seleccionar</option>';
    input = `<select class="form-select" id="${id}" ${req} ${dis}>${vacia}` +
      opts.map(([v, t]) => `<option value="${esc(v)}" ${String(v) === String(val) ? 'selected' : ''}>${esc(t)}</option>`).join('') +
      '</select>';
  } else if (f.t === 'password') {
    input = `<input type="password" class="form-control" id="${id}" ${req} autocomplete="new-password">
      <ul id="pwReglas" class="list-unstyled small mb-0 mt-1" aria-live="polite"></ul>`;
  } else {
    const extra = f.t === 'number' ? 'step="0.01" min="0" inputmode="decimal"' : '';
    input = `<input type="${f.t}" class="form-control" id="${id}" value="${esc(val)}" ${req} ${extra}>`;
  }
  return `<div class="${col}"><label class="form-label" for="${id}">${esc(f.l)}${req ? ' *' : ''}</label>${input}${hint}</div>`;
}

async function abrirFormulario(reg = null) {
  editando = reg;
  pendiente = null;
  $('formError').classList.add('d-none');
  $('modalFormTitulo').textContent = reg ? ent.editar : ent.nuevo;

  const refs = {};
  try {
    await Promise.all(ent.campos.filter(f => f.ref).map(async f => {
      refs[f.n] = lista(await api(f.ref.ep));
    }));
  } catch (e) {
    return alert('No se pudieron cargar las listas del formulario.');
  }

  $('formCampos').innerHTML = ent.campos.map(f =>
    campoHTML(f, reg ? (f.bool ? String(!!reg[f.n]) : reg[f.n]) : (f.def ?? ''), refs)).join('');
  vista('form');

  if ($('f_password')) {
    $('f_password').addEventListener('input', actualizarPw);
    $('f_username')?.addEventListener('input', actualizarPw);
    actualizarPw();
  }
  modalForm.show();
}

$('btnNuevo').addEventListener('click', () => abrirFormulario());

function leerForm() {
  const body = {};
  for (const f of ent.campos) {
    const el = $(`f_${f.n}`);
    if (f.t === 'checkbox') { body[f.n] = el.checked; continue; }
    if (f.t === 'password') { if (el.value) body[f.n] = el.value; continue; }   // vacío = no cambiar
    const v = el.value.trim();
    if (f.bool) { body[f.n] = v === 'true'; continue; }
    if (v === '' && f.t === 'number') continue;                                  // usa el valor por defecto
    if (v === '' && (f.t === 'date' || f.t === 'time' || f.ref)) { body[f.n] = null; continue; }
    body[f.n] = v;
  }
  return body;
}

function validar() {
  const pw = $('f_password');
  if (pw && pw.value) {
    const fallan = reglasPw(pw.value, $('f_username')?.value).filter(r => !r.ok);
    if (fallan.length) {
      pw.classList.add('is-invalid');
      pw.focus();
      return `Contraseña débil. Debe tener: ${fallan.map(r => r.corto).join(', ')}.`;
    }
  }
  return null;
}

$('formCrud').addEventListener('submit', e => {
  e.preventDefault();
  $('formError').classList.add('d-none');
  const msg = validar();
  if (msg) return mostrarError(msg);

  const body = leerForm();
  if (editando) return guardar(body);

  // Al crear: pedir confirmación antes de guardar
  pendiente = body;
  $('confirmTxt').textContent = `¿Deseas crear ${ent.este}?`;
  $('confirmNombre').textContent = ent.nombreDe(body);
  vista('confirm');
});

$('btnVolver').addEventListener('click', () => vista('form'));
$('btnConfirmarCrear').addEventListener('click', () => guardar(pendiente));

async function guardar(body) {
  const btns = $('formCrud').querySelectorAll('button');
  btns.forEach(b => (b.disabled = true));   // evita doble clic
  try {
    await api(editando ? `${ent.ep}${editando.id}/` : ent.ep, {
      method: editando ? 'PATCH' : 'POST',
      body: JSON.stringify(body),
    });
    modalForm.hide();
    aviso(editando ? 'Cambios guardados.' : 'Registro creado correctamente.');
    cargar();   // se queda en la misma sección
  } catch (err) {
    vista('form');
    mostrarError(textoError(err));
  } finally {
    btns.forEach(b => (b.disabled = false));
  }
}

// ================== ELIMINAR ==================
const modalDel = new bootstrap.Modal($('modalEliminar'));
let idEliminar = null;

function abrirEliminar(r) {
  idEliminar = r.id;
  $('delTitulo').textContent = `Eliminar ${ent.singular}`;
  $('delNombre').textContent = ent.nombreDe(r);
  modalDel.show();
}

$('btnConfirmarEliminar').addEventListener('click', async () => {
  try {
    await api(`${ent.ep}${idEliminar}/`, { method: 'DELETE' });
    modalDel.hide();
    aviso('Registro eliminado.');
    cargar();
  } catch (err) {
    modalDel.hide();
    alert(err.status === 403
      ? 'No tienes permiso para eliminar este registro.'
      : 'No se pudo eliminar. Si tiene registros relacionados (reservas, médicos), elimínalos primero o desactívalo.');
  }
});

// ================== RESUMEN ==================
async function cargarResumen() {
  try {
    const hoy = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD en hora local
    const [pac, med, citas] = await Promise.all([
      api('/pacients/'), api('/medics/'), api(`/reservations/?date=${hoy}`),
    ]);
    $('cntPacientes').textContent = lista(pac).length;
    $('cntMedicos').textContent = lista(med).length;
    const c = lista(citas);
    $('cntHoy').textContent = c.length;
    $('tbHoy').innerHTML = c.length
      ? c.map(r => `<tr>
          <td data-label="Hora">${esc((r.time_at || '').slice(0, 5))}</td>
          <td data-label="Paciente">${esc(r.pacient_name)}</td>
          <td data-label="Médico">${esc(r.medic_name)}</td>
          <td data-label="Estado">${esc(r.status_name)}</td></tr>`).join('')
      : '<tr><td colspan="4" class="vacio text-muted text-center py-3">No hay citas para hoy.</td></tr>';
  } catch (_) { /* el resumen no debe romper el dashboard */ }
}

// ================== INICIO ==================
if (!getToken()) logout();
const m = yo();
if (m) {
  const quien = `${m.name || m.username || ''} ${m.lastname || ''}`.trim();
  $('userName').innerHTML = `${esc(quien)} <span class="badge text-bg-${m.is_staff || m.is_superuser ? 'primary' : 'secondary'} ms-1">${rolDe(m)}</span>`;
}
if (!esAdmin()) document.querySelector('[data-section="usuarios"]').closest('li').classList.add('d-none');

const inicial = location.hash.slice(1);
mostrarSeccion(entidades[inicial] && !(entidades[inicial].soloAdmin && !esAdmin()) ? inicial : 'resumen');

window.logout = logout; // lo usa el onclick del HTML
})();

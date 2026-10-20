const STORAGE_KEY = "hunter-registry-data";
const SESSION_KEY = "hunter-registry-session";

const previousSeed = [
  { id: 1, lastName: "Соколов", firstName: "Алексей", middleName: "Викторович", birthDate: "1985-04-12", phone: "+7 (912) 555-24-18", certificate: "ОХ-458921", region: "Московская область", status: "active", docs: [{ type: "Охотничий билет", number: "ОХ-458921", until: "2028-05-20" }], permits: [{ number: "Р-2026-091", type: "Сезонное", until: "2026-12-31", status: "active" }] },
  { id: 2, lastName: "Орлова", firstName: "Марина", middleName: "Сергеевна", birthDate: "1991-09-03", phone: "+7 (903) 221-09-44", certificate: "ОХ-334107", region: "Тверская область", status: "active", docs: [{ type: "Медицинская справка", number: "МС-8812", until: "2026-10-12" }], permits: [] },
  { id: 3, lastName: "Волков", firstName: "Илья", middleName: "Андреевич", birthDate: "1978-12-22", phone: "+7 (916) 832-61-09", certificate: "ОХ-119840", region: "Московская область", status: "suspended", docs: [{ type: "Разрешение на оружие", number: "РОХ-77109", until: "2026-08-01" }], permits: [{ number: "Р-2025-311", type: "Разовая", until: "2025-11-30", status: "expired" }] }
];

const seed = [
  { id: 1, lastName: "Раҳмонов", firstName: "Фарҳод", middleName: "Шавкатович", birthDate: "1985-04-12", phone: "+992 917 XXX XXX", certificate: "ОХ-458921", region: "Душанбе", status: "active", docs: [{ type: "Охотничий билет", number: "ОХ-458921", until: "2028-05-20" }], permits: [{ number: "Р-2026-091", type: "Сезонное", until: "2026-12-31", status: "active" }] },
  { id: 2, lastName: "Каримова", firstName: "Мадина", middleName: "Фирдавсовна", birthDate: "1991-09-03", phone: "+992 918 XXX XXX", certificate: "ОХ-334107", region: "Согдийская область", status: "active", docs: [{ type: "Медицинская справка", number: "МС-8812", until: "2026-10-12" }], permits: [] },
  { id: 3, lastName: "Саидов", firstName: "Ҷамшед", middleName: "Низомович", birthDate: "1978-12-22", phone: "+992 919 XXX XXX", certificate: "ОХ-119840", region: "Хатлонская область", status: "suspended", docs: [{ type: "Разрешение на оружие", number: "РОХ-77109", until: "2026-08-01" }], permits: [{ number: "Р-2025-311", type: "Разовая", until: "2025-11-30", status: "expired" }] }
];

const storedHunters = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
const hunters = storedHunters
  ? JSON.stringify(storedHunters) === JSON.stringify(previousSeed) ? seed : storedHunters
  : seed;

let state = {
  hunters,
  view: "dashboard",
  query: "",
  status: "all",
  region: "all",
  modal: null,
  editingId: null,
  editingDocIndex: null
};

const app = document.querySelector("#app");
const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]));
const save = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(state.hunters));
const fullName = h => [h.lastName, h.firstName, h.middleName].filter(Boolean).join(" ");
const statusLabel = s => ({ active: "Активен", suspended: "Приостановлен", archived: "Архив" }[s] || s);
const statusBadge = s => `<span class="badge badge-${s}">${statusLabel(s)}</span>`;
const initials = name => name.split(" ").map(x => x[0]).slice(0, 2).join("");
const regions = () => [...new Set(state.hunters.map(h => h.region).filter(Boolean))].sort();
const logoMark = `<img class="logo-image" src="logo.png" alt="Логотип ОхотРеестра">`;

function render() {
  if (!sessionStorage.getItem(SESSION_KEY)) return renderLogin();
  const active = state.view === "dashboard" ? "active" : "";
  app.innerHTML = `<div class="app-shell">
    <aside class="sidebar">
      <div class="brand"><span class="brand-mark">${logoMark}</span> ОхотРеестр</div>
      <nav class="nav">
        <button class="${active}" data-action="dashboard">⌂ &nbsp;Главная</button>
        <button class="${state.view === "hunters" ? "active" : ""}" data-action="hunters">♧ &nbsp;Охотники</button>
        <button data-action="documents">▣ &nbsp;Документы</button>
        <button data-action="permits">◷ &nbsp;Разрешения</button>
      </nav>
      <div class="sidebar-footer">Реестр охотников<br><small>Локальная версия 1.0</small></div>
    </aside>
    <main class="main">${state.view === "dashboard" ? dashboard() : listView()}</main>
  </div>${state.modal ? modal() : ""}`;
  bind();
}

function renderLogin() {
  app.innerHTML = `<div class="login-page"><div class="login-card">
    <div class="brand"><span class="brand-mark">${logoMark}</span> ОхотРеестр</div>
    <h1>Вход в систему</h1><p class="subtitle">Управление реестром охотников</p>
    <form id="login-form" style="margin-top:25px;display:grid;gap:15px">
      <div class="field"><label>Логин</label><input name="login" value="admin" required></div>
      <div class="field"><label>Пароль</label><input name="password" type="password" value="admin" required></div>
      <button class="btn btn-primary" type="submit">Войти</button>
    </form>
    <div class="notice">Демо-доступ: <b>admin</b> / <b>admin</b></div>
  </div></div>`;
  document.querySelector("#login-form").onsubmit = e => { e.preventDefault(); sessionStorage.setItem(SESSION_KEY, "admin"); render(); };
}

function dashboard() {
  const active = state.hunters.filter(h => h.status === "active").length;
  const expiring = state.hunters.flatMap(h => h.docs || []).filter(d => d.until && new Date(d.until) <= new Date(Date.now() + 30 * 86400000) && new Date(d.until) >= new Date()).length;
  return `<header class="topbar"><div><h1>Добрый день, администратор</h1><p class="subtitle">Обзор реестра охотников</p></div><div class="user-chip"><span class="avatar">А</span><span>Администратор</span><button class="btn btn-ghost" data-action="logout">Выйти</button></div></header>
    <section class="stats">
      <div class="stat"><div class="stat-label">Всего охотников</div><div class="stat-value">${state.hunters.length}</div><div class="stat-note">В реестре</div></div>
      <div class="stat"><div class="stat-label">Активные</div><div class="stat-value">${active}</div><div class="stat-note">Действующие записи</div></div>
      <div class="stat"><div class="stat-label">Документы истекают</div><div class="stat-value">${expiring}</div><div class="stat-note">В ближайшие 30 дней</div></div>
      <div class="stat"><div class="stat-label">Разрешения</div><div class="stat-value">${state.hunters.reduce((n,h) => n + (h.permits || []).length, 0)}</div><div class="stat-note">Всего оформлено</div></div>
    </section>
    <section class="panel"><div class="toolbar"><div><h2>Последние записи</h2><p class="subtitle">Недавно добавленные охотники</p></div><button class="btn btn-primary" data-action="add">+ Добавить охотника</button></div>${hunterTable(state.hunters.slice(-5).reverse())}</section>`;
}

function listView() {
  const docs = state.view === "documents", permits = state.view === "permits";
  if (docs) return `<header class="topbar"><div><h1>Документы</h1><p class="subtitle">Документы и лицензии охотников</p></div><button class="btn btn-primary" data-action="document-add">+ Добавить документ</button></header><section class="panel">${documentTable()}</section>`;
  if (permits) return `<header class="topbar"><div><h1>Разрешения</h1><p class="subtitle">История разрешений на охоту</p></div></header><section class="panel">${permitTable()}</section>`;
  const filtered = state.hunters.filter(h => {
    const q = state.query.toLowerCase();
    return (!q || `${fullName(h)} ${h.phone} ${h.certificate}`.toLowerCase().includes(q)) && (state.status === "all" || h.status === state.status) && (state.region === "all" || h.region === state.region);
  });
  return `<header class="topbar"><div><h1>Охотники</h1><p class="subtitle">Управление записями реестра</p></div><div class="user-chip"><span class="avatar">А</span><button class="btn btn-ghost" data-action="logout">Выйти</button></div></header>
  <section class="panel"><div class="toolbar"><div class="toolbar-left"><div class="search"><span>⌕</span><input id="search" placeholder="Имя, телефон или номер удостоверения" value="${esc(state.query)}"></div><select id="status-filter"><option value="all">Все статусы</option><option value="active">Активен</option><option value="suspended">Приостановлен</option><option value="archived">Архив</option></select><select id="region-filter"><option value="all">Все регионы</option>${regions().map(r => `<option ${r === state.region ? "selected" : ""}>${esc(r)}</option>`).join("")}</select></div><button class="btn btn-primary" data-action="add">+ Добавить</button></div>${hunterTable(filtered)}</section>`;
}

function hunterTable(items) {
  if (!items.length) return `<div class="empty">По вашему запросу ничего не найдено</div>`;
  return `<table><thead><tr><th>Охотник</th><th>Телефон</th><th>Удостоверение</th><th>Регион</th><th>Статус</th><th></th></tr></thead><tbody>${items.map(h => `<tr><td><div class="hunter-name">${esc(fullName(h))}</div><div class="hunter-id">ID-${String(h.id).padStart(5, "0")}</div></td><td>${esc(h.phone || "—")}</td><td>${esc(h.certificate || "—")}</td><td>${esc(h.region || "—")}</td><td>${statusBadge(h.status)}</td><td><div class="actions"><button class="btn btn-light" data-action="view" data-id="${h.id}">Открыть</button><button class="btn btn-ghost" data-action="edit" data-id="${h.id}">Изменить</button><button class="btn btn-danger" data-action="delete-hunter" data-id="${h.id}">Удалить</button></div></td></tr>`).join("")}</tbody></table>`;
}

function documentTable() {
  const rows = state.hunters.flatMap(h => (h.docs || []).map((d, index) => ({ ...d, hunter: fullName(h), hunterId: h.id, index })));
  return rows.length ? `<table><thead><tr><th>Охотник</th><th>Тип</th><th>Номер</th><th>Действует до</th><th>Статус</th><th></th></tr></thead><tbody>${rows.map(d => `<tr><td>${esc(d.hunter)}</td><td>${esc(d.type)}</td><td>${esc(d.number || "—")}</td><td>${esc(d.until || "—")}</td><td>${d.until && new Date(d.until) < new Date() ? statusBadge("expired") : statusBadge("active")}</td><td><button class="btn btn-light" data-action="document-edit" data-id="${d.hunterId}" data-doc-index="${d.index}">Изменить</button></td></tr>`).join("")}</tbody></table>` : `<div class="empty">Документы еще не добавлены</div>`;
}
function permitTable() {
  const rows = state.hunters.flatMap(h => (h.permits || []).map(p => ({ ...p, hunter: fullName(h) })));
  return rows.length ? `<table><thead><tr><th>Охотник</th><th>Номер</th><th>Тип</th><th>Действует до</th><th>Статус</th></tr></thead><tbody>${rows.map(p => `<tr><td>${esc(p.hunter)}</td><td>${esc(p.number)}</td><td>${esc(p.type)}</td><td>${esc(p.until)}</td><td>${statusBadge(p.status === "active" ? "active" : "archived")}</td></tr>`).join("")}</tbody></table>` : `<div class="empty">Разрешения еще не добавлены</div>`;
}

function modal() {
  const h = state.editingId ? state.hunters.find(x => x.id === state.editingId) : null;
  if (state.modal === "document-form") return documentModal();
  if (state.modal === "detail") return `<div class="modal-backdrop" data-action="close"><div class="modal-card" onclick="event.stopPropagation()"><div class="modal-header"><div><h2>${esc(fullName(h))}</h2><p class="subtitle">Карточка охотника · ID-${String(h.id).padStart(5, "0")}</p></div><button data-action="close">×</button></div><div class="detail-grid">${[["Телефон", h.phone],["Дата рождения", h.birthDate],["Удостоверение", h.certificate],["Регион", h.region],["Статус", statusLabel(h.status)]].map(x => `<div class="detail-item"><small>${x[0]}</small><b>${esc(x[1] || "—")}</b></div>`).join("")}</div><div class="detail-section"><h3>Документы</h3>${documentTableFor(h)}</div><div class="detail-section"><h3>История разрешений</h3>${permitTableFor(h)}</div><div class="modal-footer"><button class="btn btn-ghost" data-action="edit" data-id="${h.id}">Изменить данные</button><button class="btn btn-danger" data-action="delete" data-id="${h.id}">Архивировать</button></div></div></div>`;
  const values = h || { lastName: "", firstName: "", middleName: "", birthDate: "", phone: "", certificate: "", region: regions()[0] || "", status: "active" };
  return `<div class="modal-backdrop" data-action="close"><div class="modal-card" onclick="event.stopPropagation()"><div class="modal-header"><div><h2>${h ? "Редактировать охотника" : "Добавить охотника"}</h2><p class="subtitle">${h ? "Изменения сохранятся в карточке охотника" : "Заполните основные данные записи"}</p></div><button data-action="close">×</button></div><form id="hunter-form"><div class="form-grid">${field("Фамилия", "lastName", values.lastName)}${field("Имя", "firstName", values.firstName)}${field("Отчество", "middleName", values.middleName)}${field("Дата рождения", "birthDate", values.birthDate, "date")}${field("Телефон", "phone", values.phone)}${field("Номер удостоверения", "certificate", values.certificate)}${field("Регион", "region", values.region)}<div class="field"><label>Статус</label><select name="status"><option value="active" ${values.status==="active"?"selected":""}>Активен</option><option value="suspended" ${values.status==="suspended"?"selected":""}>Приостановлен</option><option value="archived" ${values.status==="archived"?"selected":""}>Архив</option></select></div></div><div class="modal-footer"><button type="button" class="btn btn-ghost" data-action="close">Отмена</button><button class="btn btn-primary">${h ? "Сохранить изменения" : "Добавить охотника"}</button></div></form></div></div>`;
}
const field = (label, name, value, type = "text") => `<div class="field"><label>${label}</label><input name="${name}" type="${type}" value="${esc(value)}" ${name === "lastName" || name === "firstName" ? "required" : ""}></div>`;
const documentTableFor = h => (h.docs?.length ? `<table><tbody>${h.docs.map((d, index) => `<tr><td>${esc(d.type)}</td><td>${esc(d.number)}</td><td>${esc(d.until)}</td><td><button class="btn btn-light" data-action="document-edit" data-id="${h.id}" data-doc-index="${index}">Изменить</button></td></tr>`).join("")}</tbody></table>` : `<p class="subtitle">Нет документов</p>`);
const permitTableFor = h => (h.permits?.length ? `<table><tbody>${h.permits.map(p => `<tr><td>${esc(p.number)}</td><td>${esc(p.type)}</td><td>${esc(p.until)}</td></tr>`).join("")}</tbody></table>` : `<p class="subtitle">Нет разрешений</p>`);

function documentModal() {
  const h = state.editingId ? state.hunters.find(x => x.id === state.editingId) : null;
  const doc = h && state.editingDocIndex !== null ? h.docs[state.editingDocIndex] : { type: "Охотничий билет", number: "", until: "" };
  return `<div class="modal-backdrop" data-action="close"><div class="modal-card" onclick="event.stopPropagation()"><div class="modal-header"><div><h2>${state.editingDocIndex === null ? "Добавить документ" : "Изменить документ"}</h2><p class="subtitle">${h ? `Охотник: ${esc(fullName(h))}` : "Выберите владельца документа"}</p></div><button data-action="close">×</button></div><form id="document-form"><div class="form-grid">${!h ? `<div class="field full"><label>Охотник</label><select name="hunterId" required>${state.hunters.map(x => `<option value="${x.id}">${esc(fullName(x))}</option>`).join("")}</select></div>` : ""}<div class="field"><label>Тип документа</label><select name="type"><option ${doc.type === "Охотничий билет" ? "selected" : ""}>Охотничий билет</option><option ${doc.type === "Медицинская справка" ? "selected" : ""}>Медицинская справка</option><option ${doc.type === "Разрешение на оружие" ? "selected" : ""}>Разрешение на оружие</option><option ${doc.type === "Лицензия" ? "selected" : ""}>Лицензия</option><option ${doc.type === "Другое" ? "selected" : ""}>Другое</option></select></div>${field("Номер документа", "number", doc.number)}${field("Действует до", "until", doc.until, "date")}</div><div class="modal-footer"><button type="button" class="btn btn-ghost" data-action="close">Отмена</button><button class="btn btn-primary">${state.editingDocIndex === null ? "Добавить документ" : "Сохранить изменения"}</button></div></form></div></div>`;
}

function bind() {
  document.querySelectorAll("[data-action]").forEach(el => el.onclick = () => {
    const action = el.dataset.action, id = Number(el.dataset.id);
    if (action === "logout") { sessionStorage.removeItem(SESSION_KEY); render(); }
    if (action === "dashboard") { state.view = "dashboard"; render(); }
    if (action === "hunters") { state.view = "hunters"; render(); }
    if (action === "documents") { state.view = "documents"; render(); }
    if (action === "permits") { state.view = "permits"; render(); }
    if (action === "add") { state.modal = "form"; state.editingId = null; render(); }
    if (action === "document-add") { state.modal = "document-form"; state.editingId = null; state.editingDocIndex = null; render(); }
    if (action === "document-edit") { state.modal = "document-form"; state.editingId = id; state.editingDocIndex = Number(el.dataset.docIndex); render(); }
    if (action === "view" || action === "edit") { state.editingId = id; state.modal = action === "view" ? "detail" : "form"; render(); }
    if (action === "close") { state.modal = null; render(); }
    if (action === "delete" && confirm("Переместить запись в архив?")) { state.hunters = state.hunters.map(h => h.id === id ? { ...h, status: "archived" } : h); save(); state.modal = null; render(); }
    if (action === "delete-hunter" && confirm("Удалить охотника и связанные документы и разрешения? Это действие нельзя отменить.")) { state.hunters = state.hunters.filter(h => h.id !== id); save(); render(); }
  });
  const search = document.querySelector("#search"); if (search) search.oninput = e => { state.query = e.target.value; render(); document.querySelector("#search")?.focus(); document.querySelector("#search").setSelectionRange(state.query.length, state.query.length); };
  const status = document.querySelector("#status-filter"); if (status) { status.value = state.status; status.onchange = e => { state.status = e.target.value; render(); }; }
  const region = document.querySelector("#region-filter"); if (region) region.onchange = e => { state.region = e.target.value; render(); };
  const form = document.querySelector("#hunter-form"); if (form) form.onsubmit = e => { e.preventDefault(); const data = Object.fromEntries(new FormData(form)); if (state.editingId) state.hunters = state.hunters.map(h => h.id === state.editingId ? { ...h, ...data } : h); else state.hunters.push({ ...data, id: Date.now(), docs: [{ type: "Охотничий билет", number: data.certificate || "", until: "" }], permits: [] }); save(); state.modal = null; render(); };
  const documentForm = document.querySelector("#document-form"); if (documentForm) documentForm.onsubmit = e => { e.preventDefault(); const data = Object.fromEntries(new FormData(documentForm)); const hunterId = state.editingId || Number(data.hunterId); state.hunters = state.hunters.map(h => { if (h.id !== hunterId) return h; const docs = [...(h.docs || [])]; if (state.editingDocIndex === null) docs.push({ type: data.type, number: data.number, until: data.until }); else docs[state.editingDocIndex] = { type: data.type, number: data.number, until: data.until }; return { ...h, docs }; }); save(); state.modal = null; state.editingDocIndex = null; render(); };
}
render();

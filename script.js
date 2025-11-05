// Incident Ticket Management — full working script

// --- Elements ---
const form = document.getElementById('ticketForm');
const tbody = document.getElementById('ticketBody');

const search = document.getElementById('search');
const filterStatus = document.getElementById('filterStatus');
const filterPriority = document.getElementById('filterPriority');
const clearFiltersBtn = document.getElementById('clearFilters');

// --- Config ---
const SLA_HOURS = { Critical: 2, High: 4, Medium: 8, Low: 24 };
const STATUSES = ['Open','In Progress','Resolved','Closed'];

// --- Helpers ---
function nowISO(){ return new Date().toISOString(); }
function addHours(iso, h){ const d=new Date(iso); d.setHours(d.getHours()+h); return d.toISOString(); }
function load(){ try { return JSON.parse(localStorage.getItem('tickets')||'[]'); } catch{ return []; } }
function save(t){ localStorage.setItem('tickets', JSON.stringify(t)); }

function timeLeft(dueISO){
  const ms = new Date(dueISO) - new Date();
  const sign = ms < 0 ? -1 : 1;
  const abs = Math.abs(ms);
  const h = Math.floor(abs/3600000);
  const m = Math.floor((abs%3600000)/60000);
  return { ms, text: `${sign<0?'-':''}${h}h ${m}m` };
}
function remainingClass(ms){
  if (ms < 0) return 'breach';         // SLA breached
  if (ms <= 60*60*1000) return 'warn'; // < 1 hour left
  return 'good';
}
function esc(s){ return s.replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c])); }

// --- Create ticket ---
function createTicket(){
  const titleEl = document.getElementById('title');
  const descEl = document.getElementById('description');
  const catEl = document.getElementById('category');
  const prioEl = document.getElementById('priority');
  const assigneeEl = document.getElementById('assignee');

  const title = titleEl.value.trim();
  const description = descEl.value.trim();
  const category = catEl.value;
  const priority = prioEl.value;
  const assignee = assigneeEl.value.trim();

  if (!title || !description) {
    alert('Please fill Title and Description');
    return;
  }

  const createdAt = nowISO();
  const dueAt = addHours(createdAt, SLA_HOURS[priority] || 24);

  const ticket = {
    id: 'T' + Math.random().toString(36).slice(2,8).toUpperCase(),
    title, description, category, priority, assignee,
    status: 'Open',
    createdAt, dueAt, updatedAt: createdAt
  };

  const tickets = load();
  tickets.unshift(ticket);
  save(tickets);
}

// --- Render table ---
function render(){
  const q = (search?.value || '').toLowerCase().trim();
  const fs = filterStatus?.value || 'all';
  const fp = filterPriority?.value || 'all';

  const rows = load()
    .filter(t => {
      const okQ = !q || t.id.toLowerCase().includes(q) || t.title.toLowerCase().includes(q);
      const okS = fs === 'all' || t.status === fs;
      const okP = fp === 'all' || t.priority === fp;
      return okQ && okS && okP;
    })
    .map(t => {
      const left = timeLeft(t.dueAt);
      const created = new Date(t.createdAt).toLocaleString();
      const due = new Date(t.dueAt).toLocaleString();
      return `
        <tr>
          <td>${t.id}</td>
          <td>${esc(t.title)}</td>
          <td><span class="badge priority-${t.priority}">${t.priority}</span></td>
          <td><span class="badge status-${t.status.replace(' ','\\ ')}">${t.status}</span></td>
          <td>${created}</td>
          <td>${due}</td>
          <td class="remaining ${remainingClass(left.ms)}">${left.text}</td>
          <td class="actions-cell">
            ${t.status==='Open' ? `<button class="table-btn" data-act="progress" data-id="${t.id}">Start</button>` : ''}
            ${t.status==='In Progress' ? `<button class="table-btn" data-act="resolve" data-id="${t.id}">Resolve</button>` : ''}
            ${t.status!=='Closed' ? `<button class="table-btn" data-act="close" data-id="${t.id}">Close</button>` : ''}
            <button class="table-btn" data-act="delete" data-id="${t.id}">Delete</button>
          </td>
        </tr>`;
    }).join('');

  tbody.innerHTML = rows || '';
}

// --- Event: form submit ---
form?.addEventListener('submit', (e) => {
  e.preventDefault();
  createTicket();
  form.reset();
  render();
});

// --- Event: table actions ---
tbody?.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-act]');
  if (!btn) return;
  const id = btn.getAttribute('data-id');
  const act = btn.getAttribute('data-act');

  const tickets = load();
  const t = tickets.find(x => x.id === id);
  if (!t) return;

  if (act === 'progress') t.status = 'In Progress';
  if (act === 'resolve') t.status = 'Resolved';
  if (act === 'close') t.status = 'Closed';
  if (act === 'delete') {
    const i = tickets.findIndex(x => x.id === id);
    tickets.splice(i, 1);
    save(tickets);
    render();
    return;
  }

  t.updatedAt = nowISO();
  save(tickets);
  render();
});

// --- Filters ---
[search, filterStatus, filterPriority].forEach(el => el && el.addEventListener('input', render));
clearFiltersBtn?.addEventListener('click', () => {
  if (search) search.value = '';
  if (filterStatus) filterStatus.value = 'all';
  if (filterPriority) filterPriority.value = 'all';
  render();
});

// Update SLA remaining every minute
setInterval(render, 60000);
render();

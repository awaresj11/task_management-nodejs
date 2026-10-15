'use strict';
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
let tasks = [];
let activeView = 'all';
let editingId = null;
let gridMode = false;
let toastTimer;
const statusNames = { todo: 'To do', 'in-progress': 'In progress', done: 'Completed' };
const priorityNames = { low: 'Low', medium: 'Medium', high: 'High' };
const esc = (value = '') => String(value).replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));
function showToast(message) { const toast = $('#toast'); toast.textContent = message; toast.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 2600); }
async function api(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } });
  if (!response.ok) { let message = 'Request failed.'; try { message = (await response.json()).error || message; } catch {} throw new Error(message); }
  return response.status === 204 ? null : response.json();
}
function dateLabel(dateString) {
  if (!dateString) return '<span class="due-date">No date</span>';
  const date = new Date(`${dateString}T12:00:00`); const now = new Date(); const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const days = Math.round((target - today) / 86400000);
  const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const cls = days < 0 ? 'overdue' : days === 0 ? 'today' : '';
  return `<span class="due-date ${cls}" title="${days < 0 ? 'Overdue' : days === 0 ? 'Due today' : ''}">${esc(label)}${days < 0 ? ' · overdue' : days === 0 ? ' · today' : ''}</span>`;
}
function filteredTasks() {
  const query = $('#taskSearch').value.trim().toLowerCase(); const priority = $('#priorityFilter').value;
  return tasks.filter(task => (activeView === 'all' || task.status === activeView) && (priority === 'all' || task.priority === priority) && (!query || `${task.title} ${task.description} ${task.category}`.toLowerCase().includes(query)));
}
function renderStats() {
  const counts = { all: tasks.length, todo: tasks.filter(t => t.status === 'todo').length, 'in-progress': tasks.filter(t => t.status === 'in-progress').length, done: tasks.filter(t => t.status === 'done').length };
  $('#totalStat').textContent = counts.all; $('#todoStat').textContent = counts.todo; $('#progressStat').textContent = counts['in-progress']; $('#doneStat').textContent = counts.done;
  $('#completionPercent').textContent = `${counts.all ? Math.round(counts.done / counts.all * 100) : 0}%`;
  $('#completionRing').style.background = `conic-gradient(#65c9a4 ${counts.all ? counts.done / counts.all * 360 : 0}deg,#edf7f3 0deg)`;
  $('#progressBar').style.width = `${counts.all ? counts['in-progress'] / counts.all * 100 : 0}%`;
  $('#navAllCount').textContent = counts.all; $('#navTodoCount').textContent = counts.todo; $('#navProgressCount').textContent = counts['in-progress']; $('#navDoneCount').textContent = counts.done;
  $('#tabAll').textContent = counts.all; $('#tabTodo').textContent = counts.todo; $('#tabProgress').textContent = counts['in-progress']; $('#tabDone').textContent = counts.done;
}
function renderTasks() {
  const visible = filteredTasks();
  $('#visibleCount').textContent = visible.length; $('#footerCount').textContent = `Showing ${visible.length} of ${tasks.length} task${tasks.length === 1 ? '' : 's'}`;
  $('#emptyState').hidden = visible.length > 0; $('.task-table-wrap').style.display = visible.length ? '' : 'none';
  $('#taskRows').innerHTML = visible.map(task => `<tr data-id="${esc(task.id)}"><td><input class="task-check" type="checkbox" aria-label="Mark ${esc(task.title)} completed" ${task.status === 'done' ? 'checked' : ''} data-action="complete"></td><td class="task-name-cell"><span class="task-title" title="${esc(task.title)}">${esc(task.title)}</span>${task.description ? `<span class="task-description" title="${esc(task.description)}">${esc(task.description)}</span>` : ''}<span class="task-category"><i class="category-dot"></i>${esc(task.category || 'General')}</span></td><td><span class="status-pill status-${task.status}">${statusNames[task.status]}</span></td><td><span class="priority-pill priority-${task.priority}">${priorityNames[task.priority]}</span></td><td>${dateLabel(task.dueDate)}</td><td><div class="row-actions"><button class="row-action" data-action="edit" title="Edit task" aria-label="Edit task">✎</button><button class="row-action" data-action="delete" title="Delete task" aria-label="Delete task">×</button></div></td></tr>`).join('');
  $('.task-table').classList.toggle('grid-mode', gridMode);
}
function render() { renderStats(); renderTasks(); }
function setView(view) {
  activeView = view; const title = view === 'all' ? 'Overview' : statusNames[view]; $('#breadcrumbTitle').textContent = title; $('#listTitle').childNodes[0].textContent = view === 'all' ? 'Your tasks ' : `${title} tasks `;
  $('#pageTitle').innerHTML = view === 'all' ? 'Good evening, Swapna <span class="wave">✦</span>' : `${title} tasks <span class="wave">✦</span>`;
  $$('.nav-item[data-view]').forEach(btn => btn.classList.toggle('active', btn.dataset.view === view)); $$('.task-tab').forEach(btn => btn.classList.toggle('selected', btn.dataset.tab === view)); renderTasks();
}
function openModal(task = null) {
  editingId = task?.id || null; $('#taskForm').reset(); $('#formError').textContent = '';
  $('#modalTitle').textContent = task ? 'Edit task' : 'Create a task'; $('#saveTaskBtn').innerHTML = task ? 'Save changes <span>→</span>' : 'Create task <span>→</span>';
  if (task) for (const key of ['title', 'description', 'status', 'priority', 'category', 'dueDate']) $(`#task${key[0].toUpperCase()}${key.slice(1)}`).value = task[key] ?? '';
  $('#taskModal').hidden = false; document.body.style.overflow = 'hidden'; setTimeout(() => $('#taskTitle').focus(), 40);
}
function closeModal() { $('#taskModal').hidden = true; document.body.style.overflow = ''; editingId = null; }
async function loadTasks() { try { tasks = await api('/api/tasks'); render(); } catch (error) { $('#taskRows').innerHTML = `<tr><td colspan="6" class="loading-cell">${esc(error.message)} Check that the server is running.</td></tr>`; showToast('Could not load tasks.'); } }
$('#newTaskBtn').addEventListener('click', () => openModal()); $('#emptyNewTask').addEventListener('click', () => openModal()); $('#closeModal').addEventListener('click', closeModal); $('#cancelModal').addEventListener('click', closeModal);
$('#taskModal').addEventListener('click', e => { if (e.target === $('#taskModal')) closeModal(); });
$('#taskForm').addEventListener('submit', async e => {
  e.preventDefault(); const form = new FormData(e.currentTarget); const payload = Object.fromEntries(form.entries()); $('#formError').textContent = '';
  const button = $('#saveTaskBtn'); button.disabled = true;
  try {
    if (editingId) { await api(`/api/tasks/${editingId}`, { method: 'PATCH', body: JSON.stringify(payload) }); showToast('Task updated successfully.'); }
    else { await api('/api/tasks', { method: 'POST', body: JSON.stringify(payload) }); showToast('New task created.'); }
    closeModal(); await loadTasks();
  } catch (error) { $('#formError').textContent = error.message; } finally { button.disabled = false; }
});
$('#taskRows').addEventListener('click', async e => {
  const action = e.target.closest('[data-action]')?.dataset.action; if (!action) return;
  const row = e.target.closest('tr'); const task = tasks.find(t => t.id === row?.dataset.id); if (!task) return;
  try {
    if (action === 'edit') openModal(task);
    else if (action === 'delete') { if (!confirm(`Delete “${task.title}”? This cannot be undone.`)) return; await api(`/api/tasks/${task.id}`, { method: 'DELETE' }); tasks = tasks.filter(t => t.id !== task.id); render(); showToast('Task deleted.'); }
    else if (action === 'complete') { const status = e.target.checked ? 'done' : 'todo'; await api(`/api/tasks/${task.id}`, { method: 'PATCH', body: JSON.stringify({ status }) }); task.status = status; render(); showToast(status === 'done' ? 'Nice work — task completed!' : 'Task moved back to To do.'); }
  } catch (error) { showToast(error.message); loadTasks(); }
});
$$('.nav-item[data-view]').forEach(btn => btn.addEventListener('click', () => { setView(btn.dataset.view); $('#sidebar').classList.remove('open'); }));
$$('.task-tab').forEach(btn => btn.addEventListener('click', () => setView(btn.dataset.tab)));
$('#taskSearch').addEventListener('input', renderTasks); $('#priorityFilter').addEventListener('change', renderTasks);
$('#clearFilters').addEventListener('click', () => { $('#taskSearch').value = ''; $('#priorityFilter').value = 'all'; setView('all'); showToast('Filters cleared.'); });
$('#listViewBtn').addEventListener('click', () => { gridMode = false; $('#listViewBtn').classList.add('active'); $('#gridViewBtn').classList.remove('active'); renderTasks(); });
$('#gridViewBtn').addEventListener('click', () => { gridMode = true; $('#gridViewBtn').classList.add('active'); $('#listViewBtn').classList.remove('active'); renderTasks(); });
$('#focusSearch').addEventListener('click', () => $('#taskSearch').focus()); $('#mobileMenu').addEventListener('click', () => $('#sidebar').classList.toggle('open'));
document.addEventListener('keydown', e => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); $('#taskSearch').focus(); } if (e.key === 'Escape' && !$('#taskModal').hidden) closeModal(); });
$('#addProjectBtn').addEventListener('click', () => showToast('Project management is a great next feature to add.')); $('#tipsBtn').addEventListener('click', () => showToast('Tip: use priorities and due dates to focus on what matters.')); $('#settingsBtn').addEventListener('click', () => showToast('Settings are not included in this starter version.'));
loadTasks();

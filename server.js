'use strict';

const express = require('express');
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'tasks.json');

app.use(express.json({ limit: '100kb' }));
app.use(express.static(path.join(__dirname, 'public')));

async function ensureDataFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try { await fs.access(DATA_FILE); }
  catch {
    const today = new Date();
    const date = (offset) => {
      const d = new Date(today);
      d.setDate(d.getDate() + offset);
      return d.toISOString().slice(0, 10);
    };
    const seed = [
      { id: randomUUID(), title: 'Design new dashboard experience', description: 'Explore a cleaner layout for the analytics overview.', status: 'in-progress', priority: 'high', category: 'Design', dueDate: date(1), createdAt: new Date().toISOString() },
      { id: randomUUID(), title: 'Review API integration', description: 'Check response handling and error states.', status: 'todo', priority: 'medium', category: 'Development', dueDate: date(2), createdAt: new Date().toISOString() },
      { id: randomUUID(), title: 'Prepare sprint demo', description: 'Collect updates and prepare a short walkthrough.', status: 'todo', priority: 'low', category: 'Planning', dueDate: date(4), createdAt: new Date().toISOString() },
      { id: randomUUID(), title: 'Ship authentication improvements', description: 'Finish validation and test sign-in flow.', status: 'done', priority: 'high', category: 'Development', dueDate: date(-1), createdAt: new Date().toISOString() },
      { id: randomUUID(), title: 'Update onboarding copy', description: 'Make the first-run experience more welcoming.', status: 'in-progress', priority: 'medium', category: 'Content', dueDate: date(3), createdAt: new Date().toISOString() },
      { id: randomUUID(), title: 'Organize project documentation', description: 'Document setup steps and common workflows.', status: 'done', priority: 'low', category: 'Planning', dueDate: date(-2), createdAt: new Date().toISOString() }
    ];
    await fs.writeFile(DATA_FILE, JSON.stringify(seed, null, 2));
  }
}
async function readTasks() { await ensureDataFile(); return JSON.parse(await fs.readFile(DATA_FILE, 'utf8')); }
async function writeTasks(tasks) { await fs.writeFile(DATA_FILE, JSON.stringify(tasks, null, 2)); }
const allowedStatuses = new Set(['todo', 'in-progress', 'done']);
const allowedPriorities = new Set(['low', 'medium', 'high']);

app.get('/api/tasks', async (_req, res, next) => {
  try { res.json(await readTasks()); } catch (e) { next(e); }
});
app.post('/api/tasks', async (req, res, next) => {
  try {
    const { title, description = '', status = 'todo', priority = 'medium', category = 'General', dueDate = '' } = req.body || {};
    if (typeof title !== 'string' || !title.trim()) return res.status(400).json({ error: 'Task title is required.' });
    if (!allowedStatuses.has(status)) return res.status(400).json({ error: 'Invalid task status.' });
    if (!allowedPriorities.has(priority)) return res.status(400).json({ error: 'Invalid priority.' });
    const tasks = await readTasks();
    const task = { id: randomUUID(), title: title.trim().slice(0, 120), description: String(description).slice(0, 500), status, priority, category: String(category).slice(0, 40) || 'General', dueDate: String(dueDate).slice(0, 10), createdAt: new Date().toISOString() };
    tasks.unshift(task); await writeTasks(tasks); res.status(201).json(task);
  } catch (e) { next(e); }
});
app.patch('/api/tasks/:id', async (req, res, next) => {
  try {
    const tasks = await readTasks();
    const index = tasks.findIndex(t => t.id === req.params.id);
    if (index < 0) return res.status(404).json({ error: 'Task not found.' });
    const patch = req.body || {};
    if (patch.status !== undefined && !allowedStatuses.has(patch.status)) return res.status(400).json({ error: 'Invalid task status.' });
    if (patch.priority !== undefined && !allowedPriorities.has(patch.priority)) return res.status(400).json({ error: 'Invalid priority.' });
    const allowed = ['title', 'description', 'status', 'priority', 'category', 'dueDate'];
    for (const key of allowed) if (patch[key] !== undefined) tasks[index][key] = key === 'title' ? String(patch[key]).trim().slice(0, 120) : String(patch[key]).slice(0, key === 'description' ? 500 : 120);
    if (!tasks[index].title) return res.status(400).json({ error: 'Task title cannot be empty.' });
    await writeTasks(tasks); res.json(tasks[index]);
  } catch (e) { next(e); }
});
app.delete('/api/tasks/:id', async (req, res, next) => {
  try {
    const tasks = await readTasks();
    const remaining = tasks.filter(t => t.id !== req.params.id);
    if (remaining.length === tasks.length) return res.status(404).json({ error: 'Task not found.' });
    await writeTasks(remaining); res.status(204).end();
  } catch (e) { next(e); }
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server.' });
});

ensureDataFile().then(() => app.listen(PORT, () => console.log(`Task dashboard running at http://localhost:${PORT}`))).catch(err => { console.error('Could not initialize task storage:', err); process.exit(1); });

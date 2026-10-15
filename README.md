# Taskflow — Task Management Dashboard

A polished, responsive task dashboard built with **Node.js 24**, Express 5, and vanilla HTML/CSS/JavaScript. No frontend build step is required.

## Features

- Dashboard statistics for total, to-do, in-progress, and completed tasks
- Create, edit, delete, and complete tasks
- Search by task title, description, or category
- Filter by status and priority
- List and grid views
- Due-date labels, including today and overdue indicators
- Responsive layout for desktop, tablet, and mobile
- JSON-file persistence for a quick local demo
- API validation and helpful error responses

## Requirements

- Node.js **24.x**
- npm

Check your Node version:

```bash
node --version
```

It should show `v24.x.x`.

## Run locally

```bash
cd task-management-dashboard
npm install
npm start
```

Open <http://localhost:3000>.

For auto-restart during development:

```bash
npm run dev
```

## API endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/tasks` | List all tasks |
| POST | `/api/tasks` | Create a task |
| PATCH | `/api/tasks/:id` | Update task fields |
| DELETE | `/api/tasks/:id` | Delete a task |

Example create request:

```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Deploy API","description":"Deploy to staging","status":"todo","priority":"high","category":"Development","dueDate":"2026-10-20"}'
```

## Project structure

```text
task-management-dashboard/
├── data/
│   └── tasks.json       # Created automatically on first run
├── public/
│   ├── index.html       # Dashboard markup
│   ├── styles.css       # Responsive dashboard theme
│   └── app.js           # Frontend behavior and API calls
├── package.json
├── server.js            # Express app and REST API
└── README.md
```

## Notes before production

This is a starter project intended for local learning and prototyping. JSON-file storage is not designed for concurrent writes or multi-instance deployments. For production, use PostgreSQL/MySQL or MongoDB, add authentication and authorization, validate all inputs with a schema library, add automated tests, and deploy behind HTTPS with environment-based configuration. Replace the sample workspace profile and demo project labels with real user/workspace data.

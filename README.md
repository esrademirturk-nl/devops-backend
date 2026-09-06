# DevOps Backend

A simple REST API written in Node.js + Express, with three endpoints.
Built for a DevOps course project: kept alive on an Ubuntu VPS with PM2,
served over HTTPS behind an Nginx reverse proxy, and automatically
deployed via GitHub Actions on every push to `main`.

## Table of Contents

- [Purpose and Technologies](#purpose-and-technologies)
- [Architecture](#architecture)
- [Endpoints](#endpoints)
- [Running Locally](#running-locally)
- [Environment Variables](#environment-variables)
- [Production Environment](#production-environment)
- [Deployment Process (CI/CD)](#deployment-process-cicd)
- [Process Management (PM2)](#process-management-pm2)
- [Security](#security)
- [Troubleshooting](#troubleshooting)

## Purpose and Technologies

This backend serves the frontend application, returning its running
status and version information. It's designed as a reference app for
this DevOps course to build an end-to-end "push code → auto-deploy"
pipeline.

| Component       | Technology                          |
|------------------|--------------------------------------|
| Runtime          | Node.js 20 LTS                      |
| Framework        | Express 4                           |
| Process manager  | PM2 (fork mode)                     |
| Reverse proxy    | Nginx                               |
| SSL              | Certbot (Let's Encrypt)             |
| CI/CD            | GitHub Actions                      |

## Architecture

```
Developer (local)
      │  git push (main)
      ▼
   GitHub
      │  GitHub Actions triggered
      ▼
GitHub Actions Runner
  1. checkout
  2. npm ci
  3. npm test
  4. SCP the code to the VPS
  5. SSH in: npm ci --omit=dev + pm2 reload/start
  6. SSH in: check /api/health
      │
      ▼
Ubuntu VPS (deploy user)
  /var/www/backend-app  ──▶  PM2 (backend-app) ──▶ 127.0.0.1:3000
                                                        │
                                                        ▼
                                              Nginx (reverse proxy)
                                                        │
                                                        ▼
                                        https://esra-backend.team-vit-devops.nl
```

The backend is never directly exposed to the internet — it only listens
on `127.0.0.1:3000`. All external traffic is received by Nginx over
HTTPS and proxied to the backend.

## Endpoints

### `GET /`

Returns a general message indicating the application is running.

```json
{ "message": "Backend application is running" }
```

### `GET /api/health`

Health check — used both for manual testing and for the deployment
pipeline's automated verification.

```json
{ "status": "UP" }
```

### `GET /api/info`

Returns the application name, version, and the environment it's
running in.

```json
{
  "application": "Backend Application",
  "version": "1.0.0",
  "environment": "production"
}
```

## Running Locally

Requirement: Node.js 20 LTS (via nvm: `nvm use 20`).

```bash
git clone https://github.com/esrademirturk-nl/devops-backend.git
cd devops-backend
cp .env.example .env
npm install
npm run dev
```

The app comes up at `http://127.0.0.1:3000`. To test it:

```bash
curl http://127.0.0.1:3000/api/health
```

## Environment Variables

| Variable       | Description                                       | Example                |
|----------------|-------------------------------------------------------|--------------------------|
| `PORT`         | Local port the app listens on                        | `3000`                 |
| `NODE_ENV`     | Runtime environment                                   | `production`            |
| `APP_VERSION`  | Version returned in `/api/info`                       | `1.0.0`                 |
| `DATABASE_URL` | (if any) database connection string                   | —                        |
| `API_KEY`      | (if any) external service API key                     | —                        |

Real values live in a local `.env` file and are **never committed** to
the repository (see `.gitignore`). The repository only ships
`.env.example` with placeholder values. In production, this file is
created manually on the server and is never sent to GitHub.

## Production Environment

| Item              | Value                                          |
|-------------------|-----------------------------------------------------|
| Domain            | `https://esra-backend.team-vit-devops.nl`           |
| Internal port     | `127.0.0.1:3000` (not exposed externally)           |
| File path         | `/var/www/backend-app`                              |
| Process manager   | PM2, process name `backend-app`                     |
| Running as        | `deploy` user (not root)                            |

## Deployment Process (CI/CD)

Deployment is defined in `.github/workflows/deploy.yml` and triggers
automatically on every push to `main`:

1. Code is checked out.
2. Dependencies are installed with `npm ci`.
3. Tests run, if present.
4. `server.js`, `package.json`, and `package-lock.json` are sent to the
   VPS's `/var/www/backend-app` directory via `scp`, authenticated with
   an SSH key.
5. On the server, production dependencies are installed with
   `npm ci --omit=dev`.
6. The app is restarted in a controlled way via PM2
   (`pm2 reload backend-app`, or `pm2 start` if not already running).
7. The `/api/health` endpoint is called to verify the deployment; the
   pipeline fails red if this check doesn't pass.

**Manually connecting to the server and running `git pull` is not an
accepted deployment method** — the entire process runs through GitHub
Actions.

### Required GitHub Actions Secrets

| Secret            | Description                                          |
|-------------------|-----------------------------------------------------------|
| `SERVER_HOST`     | VPS IP address                                       |
| `SERVER_USER`     | Restricted deployment user (`deploy`)                |
| `SERVER_SSH_KEY`  | SSH private key (belonging only to the `deploy` user)|
| `SERVER_PORT`     | SSH port (`22`)                                      |
| `DEPLOY_PATH`     | `/var/www/backend-app`                                |

## Process Management (PM2)

The backend is managed with PM2 so it keeps running after the terminal
disconnects and starts automatically when the server reboots.

```bash
pm2 list                    # list running processes
pm2 logs backend-app        # tail live logs
pm2 restart backend-app     # manual restart (if needed)
```

A systemd service (`pm2-deploy.service`) was created with
`pm2 startup systemd -u deploy --hp /home/deploy` so PM2 comes back up
automatically on reboot, and the process list was frozen with `pm2 save`.

## Security

- The backend only listens on `127.0.0.1:3000`; it is never exposed
  externally.
- The app runs as the restricted `deploy` user, not `root`.
- GitHub Actions authenticates to the server with an SSH key, not a
  password.
- The `.env` file and the SSH private key are never committed to the
  repository.
- The firewall (`ufw`) only allows SSH (22), HTTP (80), and HTTPS (443);
  the backend's port 3000 is not reachable from outside.

## Troubleshooting

| Symptom                                     | Likely cause / fix                                              |
|-----------------------------------------------|------------------------------------------------------------------|
| `/api/health` returns 502                    | Backend isn't running under PM2 → check with `pm2 list`         |
| Pipeline fails at "Health check failed"      | `npm ci --omit=dev` may have failed on the server, check the Actions log |
| SSH fails inside Actions                     | Check that the `SERVER_SSH_KEY` secret is current and correct    |
| Domain doesn't load but the IP works         | DNS record isn't up to date, check with the DNS provider          |

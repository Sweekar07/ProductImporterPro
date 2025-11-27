# ProductImporterPro

ProductImporterPro is a full-stack bulk product import platform for e-commerce-style catalogs. It allows you to upload CSV files, process them asynchronously, and manage products with a modern React UI and real-time progress updates.


## Features
- CSV upload with drag‑and‑drop and server‑side validation
= Asynchronous bulk import with progress bar and history
- Product listing, filtering, and management
- Webhook support for integration with external systems
- Production‑ready deployment using containers and a managed PostgreSQL service

## Tech Stack
- Frontend: React, Vite, TypeScript
- Backend: FastAPI (Python), SQLAlchemy
- Database: PostgreSQL (Aiven managed instance)
- Async & Queue: Celery, RabbitMQ, Redis (results/progress cache)
- Infrastructure: Docker, Railway (containers + orchestration)

## Why this stack?
- React + TypeScript – Type‑safe, component‑based UI with great DX and easy state management.
- FastAPI + SQLAlchemy – Fast async APIs, automatic docs, and a clean ORM layer for PostgreSQL.
- Celery + RabbitMQ + Redis – Reliable background job processing for large CSVs without blocking requests.
- PostgreSQL – Stable relational store with strong SQL support and indexing.
- Docker + Railway – Reproducible builds and one‑click deployment of all services.

## Architecture
- Railway cloud platform 
<img width="1918" height="987" alt="Product_importer_architecture" src="https://github.com/user-attachments/assets/e266fff0-a6da-406e-82c2-26c3ab0c3808" />

### Project structure backend
```
backend/
  app/
    main.py            # FastAPI app and router includes
    database.py        # DB engine/session creation
    models.py          # SQLAlchemy models
    schemas.py         # Pydantic schemas
    tasks.py           # Celery tasks (CSV processing, webhooks)
    celery_app.py      # Celery configuration
    routers/
      products.py      # Product CRUD APIs
      upload.py        # CSV upload + progress APIs (SSE)
      webhooks.py      # Webhook CRUD + test endpoint
      db_usage.py      # Database size/usage metrics API
    exceptions/        # (optional) centralized error handling
    utils/             # helpers (webhook sender, etc.)

```

### Project structure frontend
```
frontend/
|   .dockerignore      # Docker ignore patterns
|   .env              # Environment variables
|   .gitignore        # Git ignore
|   Dockerfile        # Docker build
|   eslint.config.js  # ESLint config
|   index.html        # Vite entry HTML
|   package.json      # Dependencies
|   tsconfig*.json    # TypeScript configs
|   vite.config.ts    # Vite config
|
+---public/
|       csv.png
|       github.png
|
+---src/
    |   App.tsx        # Root component
    |   main.tsx       # Entry point
    |   index.css      # Global styles
    |
    +---api/           # API layer (matches backend routers)
    |       axios.ts
    |       endpoints.ts
    |
    +---components/    # Feature components
    |   |   Toast.tsx
    |   |
    |   +---ConfirmDialog/
    |   +---FileUpload/
    |   +---Pagination/
    |   +---ProductTable/
    |   +---ProgressBar/
    |   +---TaskHistory/
    |   \---WebhookConfig/
    |
    +---hooks/         # Custom hooks
    |       useProducts.ts
    |       useSSE.ts      # SSE for upload progress
    |       useWebhooks.ts
    |
    +---types/
    |       index.ts
    |
    \---utils/
            formatters.ts
```


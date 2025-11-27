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

## Frontend Webpage Designs

- Home Page UI
<img width="1862" height="1073" alt="image" src="https://github.com/user-attachments/assets/bce8a064-6279-4b66-9ec9-306a8654d180" />

- File upload progress tracker UI
<img width="1693" height="1381" alt="image" src="https://github.com/user-attachments/assets/40a2132f-333c-4d3c-bc61-1259f637773b" />

- Products Tab
<img width="1693" height="2656" alt="image" src="https://github.com/user-attachments/assets/6d45e8f9-ebc9-4061-b7cf-73397b6908b0" />

- Webhook tab
<img width="1693" height="1536" alt="image" src="https://github.com/user-attachments/assets/812a020f-ead6-4bd1-a5c9-3d1ad46b829a" />

- Webhook response example with https://webhook.site
<img width="1693" height="899" alt="image" src="https://github.com/user-attachments/assets/e632ae18-d684-4227-9db5-887b951298ca" />

### Feel free to explore the project using the link below:
```
https://product-importer-frontend-production.up.railway.app/
```

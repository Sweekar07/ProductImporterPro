# Backend Development

## Stack Classification
```
| Name     | Type                  | Purpose                                    |
| -------- | --------------------- | ------------------------------------------ |
| FastAPI  | Web framework         | Build web APIs and servers                 |
| Celery   | Task queue framework  | Manage async background tasks              |
| Redis    | Cache / Session store | Fast caching, sessions, temporary data     |
| RabbitMQ | Message broker        | Celery task queue broker(reliable queuing) |
| Postgres | Relational database   | Persistent structured data storage         |
```

## Project structure backend
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
## Quick setup

- Clone the git repo
```
git clone https://github.com/Sweekar07/ProductImporterPro.git
cd ProductImporterPro
``` 

## Docker local setup

- Open a terminal from this root directory below (having a docker-compose.yml file)
```
|- backend
|- frontend
|- docker.compose.yml
```

- Start the Docker application/service and enter the command in the terminal/bash (It builds and starts the application)
```
docker-compose up --build
```

- backend running at:
```
http://localhost:8000/
```

The stack will be up and running in a Docker container.

## Prod setup

### Notes: 
- I'm using Docker Hub to push the built images.
- Using the Railway Cloud Provider service to pull the Docker image from Docker Hub

## Steps
- Open a terminal from the project root directory.
```
docker build -t dockerhub-username/product-importer-web:v1.1 ./backend 
docker push dockerhub-username/product-importer-web:v1.1
```

- For FastAPI Backend
```
- Log in to Railway and click on **create** and select the **Docker** option
- Copy the pushed *Docker Hub image name* i.e. *dockerhub-username/product-importer-web:v1.1*  and enter
- It will spin up the service, we can name it as **FastAPI Backend**
- Click on the new service created and visit the settings tabs in **Networking**, generate a custom domain
- Save and deploy the updates
```

- For Celery
```
- Repeat the same process, similar to FastAPI backend
- In the settings tab for this service, add this command: "celery -A app.celery_app worker --loglevel=info --concurrency=4"
- Save and deploy the updates
```

- For RabbitMQ
```
- Click **create** and select the "template" search for "rabbitmq" and open it.
- We can get the secret variables from the variables tab. 
```

- For Redis
```
- Click **create** and select the "template" search for "redis" and open it.
- We can get the secret variables from the variables tab. 
```

### Note: add these same secret variables for **FastAPI** and **Celery** service
<img width="1917" height="986" alt="image" src="https://github.com/user-attachments/assets/075ced2b-8854-4e7b-9cd3-9e9e582cc01b" />
- All the respective secret variables will be available in their respective service.


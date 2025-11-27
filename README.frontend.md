# Frontend

## Stack Classification
| Name           | Type              | Purpose                                           |
| -------------- | ----------------- | ------------------------------------------------- |
| Vite           | Build tool        | Fast dev server + bundler (replaces Webpack)      |
| React          | UI framework      | Component-based UI rendering                      |
| TypeScript     | Type system       | Type-safe JavaScript (like SQLAlchemy type hints) |
| React Router   | Routing framework | Client-side navigation (pages/)                   |

## Project structure frontend
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

## Docker local setup

- Open a terminal from this root directory below (having a docker-compose.yml file)
```
|- backend
|- frontend
|- docker.compose.yml
```

- Start the Docker application/service and enter the command in the terminal/bash (It builds and starts the application)
```
docker build -t dockerhub-username/product-importer-frontend:v1.1 ./frontend
docker run -d -p 5173:80 --name product-frontend dockerhub-username/product-importer-frontend:v1.1
```

- frontend running at:
```
localhost:5173
```

## Docker local setup
- Open the terminal from the root directory
```
cd frontend
npm run dev
```

- frontend running at:
```
localhost:5173
```

## Prod setup

### Notes: 
- I'm using Docker Hub to push the built images.
- Using the Railway Cloud Provider service to pull the Docker image from Docker Hub

## Steps

- Open a terminal from the project root directory.

```
docker build -t dockerhub-username/product-importer-frontend:v1.1 ./frontend 
docker push dockerhub-username/product-importer-frontend:v1.1
```

- For React Frontend
```
- Log in to Railway and click on **create** and select the **Docker** option
- Copy the pushed *Docker Hub image name* i.e. *dockerhub-username/product-importer-frontend:v1.1*  and enter
- It will spin up the service, we can name it as **React Frontend**
- Click on the new service created and visit the settings tabs in **Networking**, generate a custom domain
- Save and deploy the updates
```

- Add the FastAPI Backend service URL to the secret variable for the frontend service.
<img width="1918" height="983" alt="image" src="https://github.com/user-attachments/assets/2d0e7926-a312-4f26-96fb-bc6cdc9aff09" />



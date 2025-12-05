# Render Deployment Guide

This guide explains how to deploy your application with 3 services on Render.

## Overview

You need to deploy 3 separate services:
1. **Backend (Deno)** - Main API server
2. **Semantic Search Service (Python)** - FastAPI service for semantic search
3. **Frontend (Vue.js)** - Static site

---

## Service 1: Backend (Deno) - Web Service

### Configuration
- **Type**: Web Service
- **Name**: `your-app-backend` (or any name you prefer)
- **Environment**: Docker
- **Region**: Choose closest to your users
- **Branch**: `dev` (or your main branch)

### Build & Deploy Settings
- **Dockerfile Path**: `Dockerfile` (root directory)
- **Docker Context**: Root directory (`.`)

### Environment Variables
Add these in Render's dashboard under "Environment":

```
PORT=10000
MONGODB_URL=your_mongodb_connection_string
DB_NAME=your_database_name
SEMANTIC_SERVICE_URL=http://your-semantic-search-service.onrender.com
REQUESTING_BASE_URL=/api
REQUESTING_ALLOWED_DOMAIN=your-frontend-url.onrender.com
GEMINI_API_KEY=your_gemini_api_key (if using LinkedIn import)
LINKEDIN_CLIENT_ID=your_linkedin_client_id (if using LinkedIn OAuth)
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret (if using LinkedIn OAuth)
LINKEDIN_REDIRECT_URI=https://your-backend-url.onrender.com/api/LinkedInImport/oauth/callback
```

**Important Notes:**
- `SEMANTIC_SERVICE_URL` should point to your semantic search service URL (you'll set this after deploying service 2)
- `REQUESTING_ALLOWED_DOMAIN` should match your frontend URL (you'll set this after deploying service 3)
- Render will automatically assign a URL like `your-app-backend.onrender.com`

---

## Service 2: Semantic Search Service (Python) - Web Service

### Configuration
- **Type**: Web Service
- **Name**: `your-app-semantic-search` (or any name you prefer)
- **Environment**: Docker
- **Region**: Same as backend (for lower latency)
- **Branch**: `dev` (or your main branch)

### Build & Deploy Settings
- **Dockerfile Path**: `semantic_search_service/Dockerfile`
- **Docker Context**: `semantic_search_service` directory

### Environment Variables
```
CONFIG=/app/app.yml
KMP_DUPLICATE_LIB_OK=TRUE
```

**Note:** The service runs on port 8001 internally, but Render will handle the external port mapping automatically.

### After Deployment
1. Copy the service URL (e.g., `your-app-semantic-search.onrender.com`)
2. Update the backend service's `SEMANTIC_SERVICE_URL` environment variable to: `https://your-app-semantic-search.onrender.com`

---

## Service 3: Frontend (Vue.js) - Static Site

### Configuration
- **Type**: Static Site
- **Name**: `your-app-frontend` (or any name you prefer)
- **Branch**: `dev` (or your main branch)

### Build & Deploy Settings
- **Build Command**: `cd frontend && npm install && npm run build`
- **Publish Directory**: `frontend/dist`

### Environment Variables
Add these in Render's dashboard:

```
VITE_API_BASE_URL=https://your-backend-url.onrender.com/api
```

**Important:**
- Replace `your-backend-url.onrender.com` with the actual backend service URL from Service 1
- The `VITE_` prefix is required for Vite to expose the variable to the frontend code

### After Deployment
1. Copy the frontend URL (e.g., `your-app-frontend.onrender.com`)
2. Update the backend service's `REQUESTING_ALLOWED_DOMAIN` environment variable to: `https://your-app-frontend.onrender.com`

---

## Deployment Order

1. **Deploy Service 2 (Semantic Search)** first - it's independent
2. **Deploy Service 1 (Backend)** second - update `SEMANTIC_SERVICE_URL` after Service 2 is live
3. **Deploy Service 3 (Frontend)** last - update `VITE_API_BASE_URL` with backend URL, then update backend's `REQUESTING_ALLOWED_DOMAIN`

---

## Step-by-Step Instructions

### Step 1: Deploy Semantic Search Service

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click "New +" → "Web Service"
3. Connect your repository
4. Configure:
   - **Name**: `your-app-semantic-search`
   - **Environment**: Docker
   - **Dockerfile Path**: `semantic_search_service/Dockerfile`
   - **Docker Context**: `semantic_search_service`
5. Add environment variables:
   ```
   CONFIG=/app/app.yml
   KMP_DUPLICATE_LIB_OK=TRUE
   ```
6. Click "Create Web Service"
7. Wait for deployment and copy the service URL

### Step 2: Deploy Backend Service

1. Click "New +" → "Web Service"
2. Select the same repository
3. Configure:
   - **Name**: `your-app-backend`
   - **Environment**: Docker
   - **Dockerfile Path**: `Dockerfile`
   - **Docker Context**: `.` (root)
4. Add environment variables (use the semantic search URL from Step 1):
   ```
   PORT=10000
   MONGODB_URL=your_mongodb_connection_string
   DB_NAME=your_database_name
   SEMANTIC_SERVICE_URL=https://your-app-semantic-search.onrender.com
   REQUESTING_BASE_URL=/api
   REQUESTING_ALLOWED_DOMAIN=*  (update after frontend is deployed)
   ```
5. Click "Create Web Service"
6. Copy the backend service URL

### Step 3: Deploy Frontend

1. Click "New +" → "Static Site"
2. Select the same repository
3. Configure:
   - **Name**: `your-app-frontend`
   - **Build Command**: `cd frontend && npm install && npm run build`
   - **Publish Directory**: `frontend/dist`
4. Add environment variable (use the backend URL from Step 2):
   ```
   VITE_API_BASE_URL=https://your-app-backend.onrender.com/api
   ```
5. Click "Create Static Site"
6. Copy the frontend URL

### Step 4: Update CORS Settings

1. Go back to your Backend service settings
2. Update `REQUESTING_ALLOWED_DOMAIN` to your frontend URL:
   ```
   REQUESTING_ALLOWED_DOMAIN=https://your-app-frontend.onrender.com
   ```
3. Save and redeploy if needed

---

## Troubleshooting

### Backend can't connect to Semantic Search Service
- Verify `SEMANTIC_SERVICE_URL` includes `https://` protocol
- Check that the semantic search service is running and healthy
- Ensure both services are in the same region for better connectivity

### Frontend can't connect to Backend
- Verify `VITE_API_BASE_URL` is set correctly in the frontend service
- Check CORS settings in backend (`REQUESTING_ALLOWED_DOMAIN`)
- Ensure backend service is running

### Build Failures
- **Backend**: Ensure `deno.json` and all source files are in the repository
- **Semantic Search**: Check that `semantic_search_service/app.yml` exists
- **Frontend**: Verify `frontend/package.json` and all dependencies are correct

### Environment Variables Not Working
- For Vite (frontend), variables must start with `VITE_`
- After adding/updating environment variables, trigger a new deployment
- Check Render logs for any environment variable errors

---

## Cost Considerations

- **Free Tier**: Each service gets 750 hours/month free
- **3 Services**: You'll need to monitor usage (3 × 750 hours = 2250 total hours)
- **Sleeping Services**: Free tier services sleep after 15 minutes of inactivity
- **Wake Time**: First request after sleep may take 30-60 seconds

---

## Alternative: Using Render Blueprint

You can also create a `render.yaml` file in your repository root to define all services:

```yaml
services:
  - type: web
    name: your-app-backend
    env: docker
    dockerfilePath: ./Dockerfile
    dockerContext: .
    envVars:
      - key: PORT
        value: 10000
      - key: MONGODB_URL
        sync: false  # Set manually in dashboard
      - key: DB_NAME
        value: your_database_name
      - key: SEMANTIC_SERVICE_URL
        fromService:
          type: web
          name: your-app-semantic-search
          property: host
      - key: REQUESTING_BASE_URL
        value: /api

  - type: web
    name: your-app-semantic-search
    env: docker
    dockerfilePath: ./semantic_search_service/Dockerfile
    dockerContext: ./semantic_search_service
    envVars:
      - key: CONFIG
        value: /app/app.yml
      - key: KMP_DUPLICATE_LIB_OK
        value: TRUE

  - type: web
    name: your-app-frontend
    buildCommand: cd frontend && npm install && npm run build
    staticPublishPath: ./frontend/dist
    envVars:
      - key: VITE_API_BASE_URL
        fromService:
          type: web
          name: your-app-backend
          property: host
```

Then deploy via: "New +" → "Blueprint" → Select your repository

---

## Next Steps

1. Set up MongoDB Atlas (or your preferred MongoDB hosting)
2. Configure all API keys (Gemini, LinkedIn, etc.)
3. Test each service individually
4. Update environment variables with actual URLs
5. Test the full application flow

Good luck with your deployment! 🚀

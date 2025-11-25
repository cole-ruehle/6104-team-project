# Setup Guide

This guide covers the dependencies and setup steps needed to run both the backend and frontend of this project.

## Prerequisites

### Backend Dependencies

1. **Deno** (v2.5.6 or later)
   - Download from: https://deno.land/
   - Installation instructions: https://deno.land/manual/getting_started/installation
   - Verify installation: `deno --version`

2. **MongoDB**
   - Either use MongoDB Atlas (cloud) or install MongoDB locally
   - For Atlas: Create a free account at https://www.mongodb.com/cloud/atlas
   - For local: Download from https://www.mongodb.com/try/download/community

3. **Environment Variables**
   - Create a `.env` file in the project root with:
     ```
     MONGODB_URL=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?appName=<appName>
     DB_NAME=FrontEnd
     PORT=8000
     REQUESTING_BASE_URL=/api
     ```
   - Replace `<username>`, `<password>`, and `<cluster>` with your MongoDB credentials

### Frontend Dependencies

1. **Node.js** (v18 or later)
   - Download from: https://nodejs.org/
   - Verify installation: `node --version` and `npm --version`

2. **npm** (comes with Node.js)
   - Verify installation: `npm --version`

## Setup Steps

### Backend Setup

1. **Install Deno** (if not already installed)
   ```powershell
   # Windows (PowerShell)
   irm https://deno.land/install.ps1 | iex

   # Add to PATH permanently (if needed)
   [Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\Users\$env:USERNAME\.deno\bin", "User")
   ```

2. **Configure Environment Variables**
   - Create `.env` file in the project root
   - Add your MongoDB connection string and other variables (see Prerequisites)

3. **Build the project** (generates concept imports)
   ```powershell
   deno task build
   ```

4. **Start the backend server**
   ```powershell
   deno task start
   ```
   - Server will run on `http://localhost:8000`
   - API endpoints available at `http://localhost:8000/api/*`

### Frontend Setup

1. **Navigate to frontend directory**
   ```powershell
   cd frontend
   ```

2. **Install dependencies**
   ```powershell
   npm install
   ```

3. **Configure environment variables** (optional)
   - Create `frontend/.env` file if you need to override the default API URL:
     ```
     VITE_API_BASE_URL=http://localhost:8000/api
     ```
   - Default is already set to `http://localhost:8000/api` in the code

4. **Start the development server**
   ```powershell
   npm run dev
   ```
   - Frontend will run on `http://localhost:5173` (or another port if 5173 is busy)

5. **Build for production** (optional)
   ```powershell
   npm run build
   ```
   - Output will be in `frontend/dist/`

## Running Both Servers

To run the full application:

1. **Terminal 1 - Backend:**
   ```powershell
   deno task start
   ```

2. **Terminal 2 - Frontend:**
   ```powershell
   cd frontend
   npm run dev
   ```

3. **Access the application:**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000/api

## Dependencies Summary

### Backend (Deno)
- **Deno runtime** - JavaScript/TypeScript runtime
- **MongoDB driver** - Handled via Deno's import system
- No `package.json` or `node_modules` required

### Frontend (Node.js/npm)
- **vue** (^3.5.13) - Frontend framework
- **vue-router** (^4.4.3) - Client-side routing
- **pinia** (^2.1.7) - State management
- **vite** (^6.0.11) - Build tool and dev server
- **typescript** (~5.9.3) - Type checking
- **vue-tsc** (^2.2.4) - Vue TypeScript compiler

## Troubleshooting

### Deno not recognized
- Ensure Deno is added to your PATH
- Restart your terminal/IDE after installation
- Verify with `deno --version`

### MongoDB connection failed
- Verify your `MONGODB_URL` in `.env`
- Check that your IP address is whitelisted in MongoDB Atlas
- Ensure database user has proper permissions
- Test connection with `mongosh` or MongoDB Compass

### Frontend can't connect to backend
- Ensure backend is running on port 8000
- Check `VITE_API_BASE_URL` in `frontend/.env` matches backend
- Verify CORS is properly configured (if needed)

### Port already in use
- Change `PORT` in `.env` for backend
- Change port in `vite.config.ts` or use `npm run dev -- --port <port>` for frontend

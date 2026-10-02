# 🚀 ArcticFiles Startup Guide

Welcome to ArcticFiles! Since this project is divided into three distinct microservices (the Python AI worker, the Node.js backend server, and the React/Electron frontend), you will need to open **three separate terminal windows** to run the app locally.

> **Prerequisite:** Make sure Docker Desktop is open and your Qdrant container is running before you start.

---

### 🟢 Terminal 1: The Semantic Worker (Python)
This terminal runs the AI engine that handles document processing, OCR, and vector embeddings.

1. Open your first terminal and navigate to the worker directory:
   `ash
   cd worker
   `
2. Activate the virtual environment (if you are on Windows):
   `ash
   .\venv\Scripts\activate
   `
3. Start the Python FastAPI server:
   `ash
   python app.py
   `
*(You should see a message saying SEMANTIC WORKER API IS READY FOR ACTION!)*

---

### 🟡 Terminal 2: The Backend Server (Node.js)
This terminal runs the Express backend that manages the local SQLite database, file watching, and communicates with the Python worker.

1. Open your second terminal and navigate to the ackend directory:
   `ash
   cd backend
   `
2. Start the development server using nodemon:
   `ash
   npm run dev
   `
*(You should see a message saying BACKEND SERVER READY!)*

---

### 🟣 Terminal 3: The Frontend App (Electron / React)
This terminal launches the actual user interface that you will interact with.

1. Open your third terminal and navigate to the rontend directory:
   `ash
   cd frontend
   `
2. Start the Electron development app:
   `ash
   npm run electron-dev
   `
*(This will compile the React app and automatically pop open the desktop application window!)*

---

### 🛠️ Troubleshooting

- **"Cannot communicate with worker"**: Double check that Terminal 1 is running and hasn't thrown any Python errors.
- **"HTTP 404 / Connection Refused"**: Double check that Terminal 2 is running and listening on port 3001.
- **Ghost files in search**: If you manually delete files via Windows File Explorer while the app is closed, you may need to open the app, remove the watched directory, and re-add it so it can sync correctly.

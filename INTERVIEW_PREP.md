# 🚀 ArcticFiles - Ultimate Interview Masterclass

## 1. Project Overview & Elevator Pitch
**The Pitch:**
"ArcticFiles is a privacy-first, local semantic search engine. Standard search tools like Windows File Explorer only use keyword matching—if you search 'Apple CEO', it won't find a document that only says 'Tim Cook'. I built an AI-powered desktop application using a microservices architecture that ingests local documents, converts the text into mathematical vectors using machine learning, and allows users to search their local files based on *meaning* and *context*, all while keeping their data 100% private."

---

## 2. The Tech Stack: Who, What, and Why?

### Frontend: Electron + React
*   **What it does:** Provides the native desktop UI.
*   **Why this stack:** We need to access local files on the hard drive. Web browsers (Chrome) block this for security. Electron allows us to build a native desktop app with React that has full access to the user's local operating system.

### Orchestration/Backend: Node.js + Express
*   **What it does:** Acts as the middleman. It receives requests from the UI, saves folder metadata to SQLite, and uses chokidar to "watch" folders for live edits.
*   **Why this stack:** Node.js is asynchronous and event-driven. It is the best technology for handling I/O operations (like watching a filesystem) without freezing. 

### Machine Learning Worker: Python + FastAPI
*   **What it does:** Parses text from files (using PyMuPDF, python-docx, OCR), chunks the text, and runs the SentenceTransformers model (ll-MiniLM-L6-v2) to generate vectors.
*   **Why this stack:** Python is the industry standard for ML. By decoupling it from Node.js, the heavy CPU processing doesn't freeze the React UI. FastAPI was chosen because it's asynchronous, extremely fast, and automatically validates data using Pydantic.

### Databases: Qdrant (Vector DB) & SQLite (Relational DB)
*   **Why SQLite:** Used strictly for lightweight metadata (which folders are tracked).
*   **Why Qdrant:** Stores the AI vectors and performs Cosine Similarity search. We chose Qdrant over Pinecone because Pinecone is cloud-only (violating privacy), and over ChromaDB because Qdrant is built in Rust, runs locally via Docker, and handles real-time updates much better.

---

## 3. Core Concepts to Explain

### Semantic Search vs. Lexical Search
*   **Lexical (Keyword):** Looks for exact string overlap. Fails if the exact word isn't present.
*   **Semantic (Vector):** Converts text to high-dimensional math arrays. Documents with similar concepts are placed closer together in "vector space," allowing the AI to know that "Database structure" is related to "SQL Schema."

### Overlapping Semantic Chunking
*   **What it is:** Breaking large files into 1200-character blocks with a 200-character overlap.
*   **Why:** AI models have token limits and lose context on massive documents. The 200-character overlap prevents sentences or concepts from being accidentally sliced in half at the chunk boundary.

### In-Memory Python Caching (The 20-40x Speedup)
*   **What it is:** A Python dictionary that temporarily stores recent queries and embeddings.
*   **Why:** Running text through the ML model takes heavy CPU power. If a user searches the same query twice, the cache intercepts the request and instantly returns the saved result, dropping latency from ~400ms down to ~15ms.
*   **Smart Invalidation:** The exact millisecond the Node.js watcher detects a file edit, it commands Python to flush that specific file from the cache to prevent stale data.

### The "Ghost File" Cascading Deletion Protocol
*   **The Problem:** If a user untracks a directory, just deleting the folder from SQLite leaves thousands of orphaned vectors inside Qdrant. Searching would return "Ghost Files" that aren't being tracked anymore.
*   **The Solution:** You engineered a sequence where Node.js halts the folder watcher, queries SQLite for all associated file paths, fires API requests to Python to surgically scrub those vector IDs from Qdrant, flushes the cache, and *then* deletes the SQL records. This ensures perfect synchronization across all three databases.

---

## 4. Anticipated Interview Questions & "What Ifs"

**Q1: "What if a user drops an image or a scanned PDF into the folder?"**
**Answer:** "The parsing layer detects that there is no selectable text layer. It triggers an Optical Character Recognition (OCR) fallback using Tesseract. It visually reads the text from the pixels and pushes that text into the standard embedding pipeline."

**Q2: "What happens if I edit a file while the app is running?"**
**Answer:** "The Node.js chokidar watcher detects the 'change' event instantly. It sends a targeted payload to the Python worker, which invalidates the old cache for that file, re-chunks the new text, and overwrites the vectors in Qdrant—all incrementally in the background without requiring a full system re-index."

**Q3: "Why use a microservices approach instead of a monolith?"**
**Answer:** "If I put the heavy machine learning tasks and OCR parsing into the same Node/Electron process as the UI, indexing a large PDF would block the main thread. The UI would freeze, and the app would crash. By decoupling the ML into a Python FastAPI worker, the UI remains responsive while Python crunches the data."

**Q4: "How does the system handle massive folders without crashing the CPU?"**
**Answer:** "The Python worker utilizes batch indexing. Instead of pushing 10,000 chunks into the AI model at once, it processes them in configurable batches (e.g., 500 at a time) with a slight delay. This prevents memory spikes and keeps the system stable."

**Q5: "What if you wanted to scale this to a cloud enterprise version?"**
**Answer:** "I would replace SQLite with PostgreSQL, move the Python worker to a Kubernetes cluster for horizontal auto-scaling, and utilize a managed vector database or distributed Qdrant cluster. I would also add a Message Broker like RabbitMQ or Celery to handle the massive indexing task queues."

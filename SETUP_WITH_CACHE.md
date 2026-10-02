# 🚀 ArcticFiles Setup Guide - Cache Implementation

## 📋 Overview
This guide helps other developers set up ArcticFiles with the high-performance caching system on their machines.

## ⚡ Cache System Features
- **20-40x Speedup**: Repeated searches and embeddings are lightning fast
- **Memory-Based**: No persistent cache files - fresh start each time
- **Auto-Scaling**: Cache size configurable (default: 512MB embedding + 128MB search)
- **Smart Invalidation**: Automatically clears cache when files change

## 🛠️ Setup Instructions

### 1. Clone the Repository
```bash
git clone https://github.com/shivamjha10k/arcticfiles.git
cd arcticfiles
```

### 2. Install Dependencies

#### Backend (Node.js)
```bash
cd backend
npm install
```

#### Worker (Python)
```bash
cd worker
pip install -r requirements.txt
# OR if using virtual environment
python -m venv .venv
.venv\Scripts\activate  # Windows
source .venv/bin/activate  # Linux/Mac
pip install -r requirements.txt
```

#### Frontend (React/Electron)
```bash
cd frontend
npm install
```

### 3. Install Cachetools (Critical for Performance)
The cache system requires the `cachetools` library:

```bash
cd worker
pip install cachetools
```

**Note**: The system has fallback support - if cachetools isn't available, it uses a simpler cache, but you'll miss the advanced LRU features.

### 4. Configuration

#### Worker Configuration (Optional)
Edit `worker/config.py` or set environment variables:

```python
# Cache settings (defaults work well)
EMBEDDING_CACHE_SIZE_MB = 512      # 512MB embedding cache
EMBEDDING_CACHE_TTL_SECONDS = 3600 # 1 hour TTL
SEARCH_CACHE_SIZE_MB = 128         # 128MB search cache  
SEARCH_CACHE_TTL_SECONDS = 1800    # 30 minutes TTL
```

#### Environment Variables (Optional)
```bash
# .env file in worker directory
EMBEDDING_CACHE_SIZE_MB=512
SEARCH_CACHE_SIZE_MB=128
```

### 5. Start Services

#### Option A: Individual Services
```bash
# Terminal 1: Worker (Python)
cd worker
python app.py

# Terminal 2: Backend (Node.js) 
cd backend
node src/server.js

# Terminal 3: Frontend (Electron)
cd frontend
npm run electron-dev
```

#### Option B: System Status Check
```bash
# Check all services
node system_status.js

# Or use enhanced startup
cd backend && node start_enhanced.js
```

## 🔄 How Cache Works for New Users

### First Launch:
1. **Empty Cache**: No cached data initially
2. **Model Download**: AI model downloads automatically (~120MB)
3. **Gradual Speedup**: Each search/indexing operation populates cache

### Cache Population Timeline:
- **First search**: ~2-5 seconds (computing embeddings)
- **Repeated search**: ~50-200ms (cache hit! ⚡)
- **Similar searches**: Fast due to embedding reuse
- **File changes**: Cache automatically invalidates affected entries

### Memory Usage:
- **Fresh start**: ~200MB RAM (model + basic cache)
- **After use**: ~500-800MB RAM (with full cache)
- **Cache full**: Oldest entries automatically removed (LRU)

## 🎯 Performance Expectations

### Without Cache:
- Search: 1-5 seconds per query
- Indexing: 2-10 seconds per file
- Memory: ~200MB

### With Cache (after warmup):
- Search: 50-200ms per query ⚡
- Indexing: 200-500ms per file ⚡  
- Memory: ~500-800MB
- **20-40x speedup on repeated operations**

## 🐛 Troubleshooting

### Cache Not Working?
1. **Check cachetools installation**:
   ```bash
   python -c "import cachetools; print('Cache available!')"
   ```

2. **Monitor cache hits in logs**:
   ```
   ✅ ⚡ Cache hit! Retrieved from embedding cache
   ❌ Cache miss, computing embeddings...
   ```

3. **Clear cache if needed** (restart worker):
   ```bash
   # Just restart the worker service
   # Cache will rebuild automatically
   ```

### Performance Issues?
1. **Insufficient RAM**: Reduce cache sizes in config
2. **Slow first searches**: Normal - cache needs to warm up
3. **No speedup**: Check if cachetools is properly installed

## 📊 Monitoring Cache Performance

### Visual Indicators:
- ⚡ = Cache hit (fast!)
- ❌ = Cache miss (computing...)
- 📊 = Cache statistics
- 🧹 = Cache invalidation

### Console Output:
```
🌟 ⚡ Embedding Cache: 512MB capacity, TTL: 1h
🌟 🔍 Search Cache: 128MB capacity, TTL: 30min
✅ ⚡ Cache hit! Retrieved from embedding cache (5ms)
❌ Cache miss, computing embeddings... (1200ms)
📊 Cache stats: 156 entries, 85% hit rate
```

## 🚀 Ready to Demo!

Once setup is complete, you'll have:
- ✅ High-performance caching system
- ✅ Visual logging with emojis  
- ✅ Real-time file monitoring
- ✅ 20-40x speedup on repeated operations
- ✅ Professional demo-ready interface

The cache system will automatically optimize performance as it's used, with no manual intervention required!

## 💡 Pro Tips

1. **Let it warm up**: First few searches populate the cache
2. **Keep services running**: Restarting clears the cache
3. **Monitor logs**: Visual indicators show cache performance
4. **Adjust cache size**: Modify config for your RAM constraints
5. **Demo preparation**: Run a few searches before presenting to warm up cache

---

🎉 **Your ArcticFiles installation is now ready with high-performance caching!**

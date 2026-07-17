# Market Microstructure Analyzer Backend

This backend powers the **Market Microstructure Analyzer** dashboard.  
It provides a WebSocket API that streams live market data, caches recent history, and integrates machine learning predictions using NumPy and other libraries.

---

## 🚀 Features
- **WebSocket Server**: Real-time streaming of market ticks.
- **Rolling Cache**: Keeps the last 30 minutes of data in memory or Redis.
- **ML Predictions**: Uses NumPy/scikit-learn for trend forecasting and analytics.
- **Frontend Integration**: Designed to work with a React frontend hosted on GitHub Pages.
- **Deployable on Render**: Runs as a Render Web Service with optional Redis Key Value instance.

---

## 🛠 Tech Stack

### Frontend
- **Language**: JavaScript (ES6+)
- **Framework**: React
- **Charts**: Recharts / Chart.js (for line and candlestick charts)
- **State Management**: React hooks + Context API
- **Deployment**: GitHub Pages (static hosting)
- **WebSocket Client**: Native `WebSocket` API for live data

### Backend
- **Language**: Python 3.9+
- **Framework**: FastAPI + Uvicorn
- **Data & ML**:
  - NumPy, pandas (data processing)
  - scikit-learn (basic ML models)
  - Optional: PyTorch/TensorFlow (advanced ML)
- **Caching**:
  - In-memory buffer (default)
  - Redis (Render Key Value instance for persistence)
- **Deployment**: Render Web Service

---

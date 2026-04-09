# Production Deployment Guide - Final Horizon AI

## ✅ Quick Start (5 minutes)

### 1. **Start the Server**

**On Windows:**
```bash
./start.bat
```

**On macOS/Linux:**
```bash
chmod +x start.sh
./start.sh
```

**Manual Start:**
```bash
npm run build       # Build production bundle
npm run start:prod  # Start both frontend & backend
```

### 2. **Access the Application**
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:3004

---

## 🏗️ Architecture

### **Frontend (Port 3000)**
- Built with React + TypeScript + Vite
- Served as static files from `/dist` folder
- Handles all UI and user interactions
- Communicates with backend for AI features

### **Backend (Port 3004)**
- Express.js API server
- Proxies requests to NVIDIA AI APIs
- Handles key rotation and rate limiting
- Provides `/api/*` endpoints

### **Database**
- Supabase PostgreSQL (cloud-based)
- Authentication via Supabase Auth
- User profiles and roadmap data

---

## 🚀 Running in Production

### **Option 1: Using npm start (Recommended)**
```bash
npm run start:prod
```
- Builds frontend automatically
- Starts both servers
- Handles port conflicts
- Best for simple deployments

### **Option 2: Running Services Separately**
```bash
# Terminal 1: Build once
npm run build

# Terminal 1: Start backend
npm run dev:backend

# Terminal 2: Serve frontend (manual)
cd dist
npx http-server -p 3000 -c-1
```

### **Option 3: Docker Deployment**
```dockerfile
FROM node:20-slim
WORKDIR /app
COPY . .
RUN npm install --production
RUN npm run build
EXPOSE 3000 3004
CMD ["npm", "run", "start:prod"]
```

---

## 🔧 Environment Configuration

### **Required Variables (.env.local)**

```env
# Supabase
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# NVIDIA AI APIs
VITE_NVIDIA_API_KEY=nvapi-...
VITE_NVIDIA_API_BASE=https://integrate.api.nvidia.com/v1
VITE_API_PROXY_BASE=http://localhost:3004/api

# Backend
NVIDIA_API_KEY=nvapi-...
NVIDIA_API_BASE=https://integrate.api.nvidia.com/v1
BACKEND_PORT=3004
FRONTEND_PORT=3000

# Key Pool (for rotation)
NVIDIA_API_KEY_1=nvapi-...
NVIDIA_API_KEY_2=nvapi-...
NVIDIA_API_KEY_3=nvapi-...
```

---

## 📊 Troubleshooting

### **Issue: Port Already in Use**
```bash
# Kill processes on port 3000/3004
Windows:
  netstat -ano | find ":3000"
  taskkill /PID <PID> /F

macOS/Linux:
  lsof -i :3000
  kill -9 <PID>
```

### **Issue: Build Fails**
```bash
# Clear cache and rebuild
rm -rf node_modules dist
npm install
npm run build
```

### **Issue: Cannot Connect to Supabase**
- Check `.env.local` has correct URL and key
- Verify API key is not expired
- Check network connectivity

### **Issue: AI API Timeouts**
- Verify NVIDIA API key is valid
- Check NVIDIA API base URL
- Ensure API quota not exceeded

### **Issue: Infinite Loading Page**
- Check browser console for errors (F12)
- Verify backend is running: `curl http://localhost:3004/api/health`
- Check network tab in DevTools
- Review server logs: `tail -f /tmp/server.log`

---

## 📈 Performance Optimization

### **Frontend Optimization**
```bash
# Check bundle size
npm run build
# Output in dist/ folder

# Gzip compression (automatic in production)
# Lazy loading of components (already implemented)
# Code splitting (Vite handles automatically)
```

### **Backend Optimization**
- Connection pooling enabled
- Compression middleware active (gzip level 6)
- Key rotation prevents rate limits
- Timeout handling prevents hanging requests

### **Database Optimization**
- RLS (Row Level Security) policies enabled
- Indexes on frequently queried fields
- Connection pooling via Supabase

---

## 🔐 Security Checklist

- [x] Environment variables in `.env.local` (not committed)
- [x] HTTPS enforced (via Vercel/hosting provider)
- [x] CORS properly configured
- [x] Input validation on all endpoints
- [x] API key rotation implemented
- [x] Session timeouts enforced
- [x] rate limiting configured
- [x] CSP headers set
- [x] XSS protection enabled

### **Before Production Deployment:**
1. ✅ Test with real Supabase instance
2. ✅ Verify all API keys are valid
3. ✅ Run security audit: `npm audit fix`
4. ✅ Test on staging environment first
5. ✅ Enable HTTPS everywhere
6. ✅ Set up monitoring/logging
7. ✅ Configure backup strategy
8. ✅ Document team access procedures

---

## 📝 Deployment Platforms

### **Vercel (Recommended)**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Environment variables in Vercel dashboard:
# - VITE_SUPABASE_URL
# - VITE_SUPABASE_ANON_KEY
# - VITE_NVIDIA_API_KEY
# - NVIDIA_API_KEY
```

### **Railway.app**
```bash
# Push to GitHub
git push

# Connect repo in Railway.app
# Set environment variables in dashboard
# Auto-deploys on push
```

### **Self-Hosted (Linux Server)**
```bash
# Install Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone repo
git clone <repo>
cd <project>

# Setup
npm install
echo "VITE_SUPABASE_URL=..." > .env.local
# ... add all env vars

# Start with PM2 (process manager)
npm i -g pm2
pm2 start "npm run start:prod" --name horizon-ai
pm2 save
```

---

## 🎯 Monitoring

### **Health Checks**
```bash
# Check frontend
curl http://localhost:3000

# Check backend
curl http://localhost:3004/api/health

# Check both with monitoring
while true; do
  echo "$(date): Frontend $(curl -s http://localhost:3000 | head -c 20)... Backend $(curl -s http://localhost:3004/api/health)..."
  sleep 30
done
```

### **Logs**
```bash
# View server logs
tail -f /tmp/server.log

# Filter for errors
tail -f /tmp/server.log | grep -i error
```

---

## 🔄 Updates & Maintenance

### **Update Dependencies**
```bash
# Check outdated
npm outdated

# Update safely
npm update

# Run tests
npm run typecheck

# Rebuild
npm run build
```

### **Database Migrations**
- All migrations handled by Supabase
- No manual SQL needed for current deployment

### **Restart Service**
```bash
# Kill current server
ps aux | grep "npm run start:prod"
kill <PID>

# Start fresh
npm run start:prod
```

---

## 💡 Pro Tips

1. **Use `.env.local`** - Never commit secrets
2. **Keep API keys rotated** - Use key pool
3. **Monitor logs** - Check for errors early
4. **Test staging first** - Before production
5. **Enable backups** - Supabase handles daily backups
6. **Use PM2** - For process management on Linux
7. **Set up monitoring** - Get alerts on downtime
8. **Document config** - Keep team in sync

---

## 📞 Support

- **Frontend Issues:** Check browser console (F12)
- **Backend Issues:** Check server logs
- **Auth Issues:** Verify Supabase configuration
- **AI Issues:** Check NVIDIA API key and limits

---

**Last Updated:** April 9, 2026
**Status:** Production Ready ✅

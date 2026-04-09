# 🚨 FIX: Stuck Loading Page

## Problem
You see: "Generating your personalized assessment..." (stuck forever)

## Root Causes

1. **Backend not running** - `npm run dev` starts both frontend + backend with `concurrently`
2. **NVIDIA API keys invalid** - Wrong or expired keys
3. **Supabase not configured** - Database not set up
4. **Old process still running** - Port 3000 or 3004 in use

---

## ✅ Complete Fix (Follow EXACTLY)

### Step 1: Kill All Existing Processes

```bash
# Kill all Node processes
npx kill-port 3000 3004 5173

# Or manually:
taskkill /F /IM node.exe   # Windows
# killall node               # Mac/Linux
```

### Step 2: Verify Environment File

Check you have `.env.local` in your project root:

```bash
# From project directory
dir .env.local
# or
ls .env.local
```

You should see it listed. If not, the file wasn't created properly.

### Step 3: Clean Install

```bash
# From: d:\Projects\nvidia\Final Horizon AI

# Clear node modules
rm -r node_modules
rm package-lock.json

# Reinstall
npm install

# This takes 2-3 minutes
```

### Step 4: Start Development (BOTH frontend + backend)

```bash
npm run dev
```

This will show:
```
  VITE v6.4.1  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help

[tsx] Watching for changes...
Server running at http://localhost:3004
```

**Both** should appear. If you only see **one**, the backend crashed.

### Step 5: Test

1. Open `http://localhost:5173`
2. You should see Horizon AI loading (NOT stuck)
3. Should take **5-15 seconds max** to load assessment
4. If still stuck after 20 seconds, check below

---

## 🔍 Troubleshooting If Still Stuck

### Check 1: Is Backend Running?

In a NEW terminal (keep `npm run dev` running):

```bash
curl http://localhost:3004/api/health
```

**Good response:**
```json
{"status":"ok"}
```

**Bad response:**
```
Connection refused
```

If bad, the backend is not running. Check the `npm run dev` output for errors.

### Check 2: Check Browser Console

Press **F12** → **Console** tab

Look for errors like:
- `Failed to fetch` → Backend not responding
- `401 Unauthorized` → Auth issue
- `NVIDIA API error` → Keys invalid

**Screenshot and share** the exact error

### Check 3: Check API Logs

In the terminal running `npm run dev`, look for backend output:

```
Server running at http://localhost:3004
```

If you DON'T see this, backend crashed. Scroll up to find the error.

### Check 4: Test API Directly

```bash
curl -X GET http://localhost:3004/api/health
```

Should return `{"status":"ok"}`

If not, backend not working.

---

## 🛠️ Advanced Debug

### View Backend Errors Only

```bash
npm run dev:backend
```

This runs ONLY the backend. You'll see all errors clearly.

### View Frontend Errors Only

```bash
npm run dev:frontend
```

This runs ONLY the frontend. You'll see all errors clearly.

---

## ✅ Step-by-Step Video Guide

```
1. Close browser tab with Horizon AI
2. Stop npm run dev (Ctrl+C)
3. Kill ports: npx kill-port 3000 3004
4. Check .env.local exists
5. Clear: rm -r node_modules && rm package-lock.json
6. Install: npm install (wait 2-3 min)
7. Start: npm run dev
8. Wait for BOTH:
   - "Local: http://localhost:5173"
   - "Server running at http://localhost:3004"
9. Open http://localhost:5173
10. Should load in 5-15 seconds
```

---

## 🎯 If Nothing Works

**Last Resort:**

```bash
# Completely reset everything
cd "D:\Projects\nvidia\Final Horizon AI"

# Kill all
npx kill-port 3000 3004 5173

# Deep clean
rm -r node_modules dist .next build
rm package-lock.json

# Reinstall from scratch
npm install --legacy-peer-deps

# Try again
npm run dev
```

---

## ✨ Verification Checklist

Before assuming it's broken:

- [ ] `.env.local` file exists
- [ ] `npm install` completed without errors
- [ ] Both frontend AND backend started in `npm run dev`
- [ ] Can access `http://localhost:3004/api/health`
- [ ] Frontend running on `http://localhost:5173`
- [ ] Waited at least 30 seconds for loading
- [ ] Browser console has NO red errors
- [ ] Backend console has NO red errors

---

## 📞 Still Stuck?

Share:
1. Output of `npm run dev` (first 50 lines)
2. Browser console errors (F12 → Console → Right-click → Save as)
3. Backend errors (the red text from terminal)
4. Your `.env.local` file (hide sensitive keys)

Then we can debug together!

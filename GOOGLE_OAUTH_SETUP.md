# 🔐 Google Sign-In Setup Guide - FINAL HORIZON AI

## ⚠️ What You Need to Do Right Now

Your app is **ready for Google OAuth**, but you need to complete the setup in Supabase. Follow these steps:

---

## 📋 Step 1: Get Google OAuth Credentials

### **1.1 Go to Google Cloud Console**
- Open: https://console.cloud.google.com
- Click **"Select a Project"** → **"New Project"**
- Name it: `Horizon AI`
- Click **Create**

### **1.2 Enable Google+ API**
1. In the left sidebar, go to **"APIs & Services"** → **"Library"**
2. Search for **"Google+ API"**
3. Click it and press **"Enable"**

### **1.3 Create OAuth Credentials**
1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"+ Create Credentials"** → **"OAuth Client ID"**
3. Choose **"Web application"**
4. Name it: `Horizon AI Web`
5. Under **"Authorized JavaScript origins"**, add:
   ```
   http://localhost:3000
   http://127.0.0.1:3000
   https://hiemszubdkzeffzopous.supabase.co
   ```
6. Under **"Authorized redirect URIs"**, add:
   ```
   http://localhost:3000/auth/callback
   http://127.0.0.1:3000/auth/callback
   https://hiemszubdkzeffzopous.supabase.co/auth/v1/callback?provider=google
   ```
7. Click **Create**
8. Copy your **Client ID** and **Client Secret**

---

## 🔧 Step 2: Configure Supabase

### **2.1 Open Supabase Dashboard**
- Go to: https://app.supabase.com
- Select your project: `hiemszubdkzeffzopous`

### **2.2 Add Google Provider**
1. Left sidebar → **Authentication** → **Providers**
2. Find **Google** and click it
3. Toggle **Enable** to ON
4. Paste your **Google Client ID** from step 1.8
5. Paste your **Google Client Secret** from step 1.8
6. Click **Save**

### **2.3 Set Redirect URL**
1. Go to **Authentication** → **URL Configuration**
2. Under **Redirect URLs**, add:
   - `http://localhost:3000/auth/callback`
   - Your production URL (e.g., `https://yourdomain.com/auth/callback`)
3. Click **Save**

---

## ✅ Step 3: Test Google Sign-In

1. Open your browser to: **http://localhost:3000**
2. Click **"Sign in with Google"**
3. You should be redirected to Google login
4. After successful login, you should be back on the app

---

## 🐛 If Google Sign-In Still Doesn't Work

### **Check These:**

**Error: "Unauthorized origin"**
- The domain isn't added to Google Cloud Console
- Go back to Step 1.5 and add your current domain

**Error: "Client ID not found"**
- Check that Google OAuth is enabled in Supabase (Step 2.2)
- Verify Client ID is correct (no extra spaces)

**Error: "Redirect URI mismatch"**
- Check that the redirect URL in Supabase matches your browser URL
- If testing from `localhost:3000`, ensure it's added in Step 2.3

**Pop-up blocked?**
- Check browser pop-up settings
- Allow pop-ups for your domain

---

## 🎯 Environment Variables (Optional)

If you want to add Google credentials to `.env.local`, you can add (these are for reference only):

```env
# Google OAuth (already configured in Supabase)
# You don't need to add these to .env - Supabase handles it
# Just make sure the credentials are in Supabase!

VITE_SUPABASE_URL=https://hiemszubdkzeffzopous.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...  # Already set
```

---

## 🚀 Quick Test Checklist

- [ ] Google credentials created in Google Cloud Console
- [ ] Redirect URIs added to Google Cloud Console
- [ ] Google provider enabled in Supabase
- [ ] Client ID and Secret pasted in Supabase
- [ ] Redirect URL configured in Supabase
- [ ] App running at http://localhost:3000
- [ ] Click "Sign in with Google" and test

---

## 📞 Need Help?

**If it still doesn't work:**

1. Check browser console (F12) for detailed error messages
2. Check Supabase logs: **Authentication** → **View logs**
3. Ensure Google Cloud project is active (Step 1.2)
4. Clear browser cookies and try again
5. Try a different browser

---

## 🔒 Production Deployment

Before deploying to production:

1. Add your production domain to Google Cloud Console authorized origins
2. Add your production callback URL to Supabase
3. Test Google sign-in on production domain
4. Monitor Supabase auth logs for errors

---

**Status:** Your app code is ready, just need Supabase configuration! ✅

# 🔧 Database Setup Guide - Fix "relation 'users' does not exist"

## ❌ The Problem

When you start Horizon AI, you might see this error:

```
Error: Failed to run sql query: ERROR: 42P01: relation "users" does not exist
```

**What does this mean?** The database tables haven't been created yet. Even though your Supabase project exists, the actual storage containers (tables) for your data are missing.

---

## ✅ The Solution (5 Minutes)

### **Step 1: Access Your Supabase Project**

1. Go to [app.supabase.com](https://app.supabase.com/)
2. Sign in with your account
3. Click on your project name

### **Step 2: Open SQL Editor**

1. On the left sidebar, find **SQL Editor** (looks like `</>`)
2. Click it
3. You'll see a code editor at the top of the screen

### **Step 3: Create a New Query**

1. Click the blue **"New query"** button
2. Or click **"+"** tab to create a new SQL query

### **Step 4: Copy the Setup Code**

1. Go to your project folder: `Final Horizon AI/database/rls-policies.sql`
2. Open that file
3. Select ALL the code (Ctrl+A)
4. Copy it (Ctrl+C)

### **Step 5: Paste into Supabase**

1. Go back to your browser (Supabase SQL Editor)
2. Click in the empty code editor
3. Paste the code (Ctrl+V)

You should now see a VERY LONG SQL script (300+ lines). Don't worry, it's exactly what you need.

### **Step 6: Run the Setup**

1. Click the blue **"Run"** button (bottom right of the code editor)
2. Wait about 10-30 seconds...
3. You'll see a success message at the bottom: ✅ **"Queries executed successfully"**

### **Step 7: Verify It Worked**

1. On the left sidebar, click **"Databases"**
2. Look for these new tables (you should see all of them):
   - ✅ `users`
   - ✅ `profiles`
   - ✅ `roadmaps`
   - ✅ `quiz_results`
   - ✅ `learning_progress`
   - ✅ `public_courses`

If you see all 6 tables, **you're done!** 🎉

---

## 🎯 What Just Happened?

You just created:

1. **6 Database Tables** - These are like organized filing cabinets that store:
   - Your user information (login details)
   - Your learning progress
   - Your roadmaps and plans
   - Your quiz results

2. **Security Rules** - Invisible guardians that make sure:
   - You can only see YOUR data
   - Nobody can see anyone else's data
   - Only admins can see everything

3. **Automatic Features** - Systems that:
   - Remember when data was last updated
   - Keep track of when things happened
   - Speed up searches

---

## 🚀 Next Steps

After the database is set up:

1. **Go back to your terminal**
2. **Run** `npm run dev`
3. **Open** `http://localhost:5173` in your browser
4. **Sign up** with your email or Google account
5. **Start learning!** 🎓

---

## ❓ Troubleshooting

### **"I clicked Run but nothing happened"**
- Make sure you have ALL the code pasted
- Check that you're connected to the internet
- Try clicking Run again

### **"I see an error message"**
- Copy the error message and search for it
- It usually tells you exactly what went wrong
- Most common: You already ran this setup (it's already created the tables)

### **"I don't see a success message"**
- Scroll down in the Supabase code editor
- Look for green ✅ checkmarks
- Look for the word "successfully"

### **"I still see 'relation users does not exist' after setup"**
- You might not have run ALL the code
- Try copying the entire file again
- Make sure you waited for it to finish (watch the bottom right button)

---

## 📞 Still Need Help?

1. Check the [Main README](../README.md)
2. Read [PHILOSOPHY_AND_APPROACH.md](../PHILOSOPHY_AND_APPROACH.md) for simple explanations
3. Check [AUTHENTICATION_GUIDE.md](./Markdown's/AUTHENTICATION_GUIDE.md) for technical help

---

## ✨ That's It!

Your database is now ready. Horizon AI will work perfectly from now on.

**Happy learning! 🚀**

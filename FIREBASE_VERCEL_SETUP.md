# Firebase + Firestore Integration & Vercel Deployment Guide

## 📋 Prerequisites
- Firebase account (free tier works)
- Vercel account (free tier works)
- Git installed
- Node.js installed

---

## 🔥 Step 1: Firebase Setup

### 1.1 Create Firebase Project
1. Go to [firebase.google.com](https://firebase.google.com)
2. Sign in with Google
3. Click "Go to Console"
4. Click "Create a project"
5. Name: `door-to-honey`
6. Click "Create project"

### 1.2 Enable Firebase Services

**Authentication:**
- In left sidebar → Build → Authentication
- Click "Get Started"
- Choose "Email/Password" → Enable → Save

**Firestore Database:**
- In left sidebar → Build → Firestore Database
- Click "Create database"
- Choose location (closest to your users)
- Start in "Test mode" (for development)
- Click "Create"

### 1.3 Get Firebase Config
1. Click "Project Settings" (⚙️ icon at top)
2. Scroll to "SDK setup and configuration"
3. Choose "Web"
4. Copy the firebaseConfig object

### 1.4 Add Config to Your Project
Replace the placeholder values in `firebase-config.js`:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY_FROM_FIREBASE",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef123456"
};
```

---

## 📚 Step 2: Firestore Database Structure

Create these collections in Firestore with this structure:

### **users** collection
```
{
  id: "uid",
  name: "User Name",
  email: "user@example.com",
  password: "hashed_password", // Better to use Firebase Auth!
  city: "City",
  role: "user" or "admin",
  createdAt: "2026-04-15T..."
}
```

### **items** collection
```
{
  name: "Honey Almond Dream",
  emoji: "fas fa-birthday-cake",
  image: "images/honey1.jpeg",
  category: "birthday",
  price: 950,
  desc: "Description...",
  bg: "bg1",
  unit: "kg",
  active: true,
  createdAt: "2026-04-15T..."
}
```

### **orders** collection
```
{
  userId: "uid",
  userName: "User Name",
  items: [
    { name: "Honey Almond Dream", qty: 1, price: 950 }
  ],
  total: 950,
  date: "15 Apr 2026",
  status: "pending" or "accepted" or "rejected",
  createdAt: "2026-04-15T...",
  updatedAt: "2026-04-15T..."
}
```

---

## 🔧 Step 3: Update HTML Files

### Update index.html (Landing Page)
Change script imports from:
```html
<script src="common.js"></script>
<script src="landing.js"></script>
```

To:
```html
<script type="module" src="firebase-config.js"></script>
<script type="module" src="firebase-auth.js"></script>
<script type="module" src="firebase-db.js"></script>
<script type="module" src="common.js"></script>
<script type="module" src="landing.js"></script>
```

### Update user.html
```html
<script type="module" src="firebase-config.js"></script>
<script type="module" src="firebase-auth.js"></script>
<script type="module" src="firebase-db.js"></script>
<script type="module" src="common.js"></script>
<script type="module" src="user.js"></script>
```

### Update admin.html
```html
<script type="module" src="firebase-config.js"></script>
<script type="module" src="firebase-auth.js"></script>
<script type="module" src="firebase-db.js"></script>
<script type="module" src="common.js"></script>
<script type="module" src="admin.js"></script>
```

---

## 💾 Step 4: Update common.js

Replace authentication and order functions with Firebase versions:

```javascript
import { handleLogin, handleRegister, logout } from "./firebase-auth.js";
import { 
    createOrderInFirestore,
    updateOrderStatusInFirestore,
    getUserOrdersFromFirestore,
    getAllOrdersFromFirestore 
} from "./firebase-db.js";

// Keep existing functions for cart, UI, etc.
// Replace auth functions with Firebase imports
```

---

## 🚀 Step 5: Deploy to Vercel

### 5.1 Prepare for Deployment

1. **Initialize Git** (if not already done):
```bash
cd "e:\code\Antigravity\door to honey"
git init
git add .
git commit -m "Initial commit: Firebase integration"
```

2. **Create GitHub Repository**:
   - Go to [github.com/new](https://github.com/new)
   - Name: `door-to-honey`
   - Create repository
   - Push your code:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/door-to-honey.git
   git branch -M main
   git push -u origin main
   ```

### 5.2 Deploy to Vercel

**Option A: Using Vercel CLI**
```bash
npm install -g vercel
vercel login
vercel
```

**Option B: Using Vercel Web UI**
1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Click "Import"
4. Framework: "Other" (it's vanilla JS)
5. Root directory: `.`
6. Click "Deploy"

Vercel automatically detects that it's a static site and deploys it!

### 5.3 Set Environment Variables (Optional)
If you want to keep Firebase config secret:

1. In Vercel project settings → Environment Variables
2. Add your Firebase credentials
3. Update firebase-config.js to use them

---

## 🔒 Step 6: Firestore Security Rules

Replace test mode rules with these in Firestore:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users can only read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
    
    // Everyone can read items
    match /items/{document=**} {
      allow read: if true;
      allow write: if request.auth.token.role == "admin";
    }
    
    // Users can read their orders, admins can read all
    match /orders/{orderId} {
      allow read: if request.auth.uid == resource.data.userId || request.auth.token.role == "admin";
      allow create: if request.auth.uid == request.resource.data.userId;
      allow update: if request.auth.token.role == "admin";
    }
  }
}
```

---

## ✅ Testing Checklist

- [ ] Firebase Project Created
- [ ] Authentication Enabled
- [ ] Firestore Created
- [ ] Config added to firebase-config.js
- [ ] HTML files updated with module imports
- [ ] Registered a test user
- [ ] Placed a test order
- [ ] Pushed code to GitHub
- [ ] Deployed to Vercel
- [ ] Test in production: https://your-project.vercel.app

---

## 🆘 Troubleshooting

**Problem: "Firebase is not defined"**
- Solution: Make sure all HTML files use `type="module"`

**Problem: CORS errors**
- Solution: Vercel automatically handles CORS for Firebase

**Problem: Firestore permission denied**
- Solution: Update security rules or check Firebase config is correct

**Problem: User auth not persisting**
- Solution: Add to common.js:
```javascript
watchAuthState((user) => {
  state.currentUser = user;
});
```

---

## 📦 Your new file structure:
```
door-to-honey/
├── index.html
├── user.html
├── admin.html
├── style.css
├── firebase-config.js        (NEW)
├── firebase-auth.js          (NEW)
├── firebase-db.js            (NEW)
├── common.js                 (UPDATED)
├── landing.js
├── user.js                   (NEEDS UPDATES)
├── admin.js                  (NEEDS UPDATES)
└── images/
```

---

Would you like me to update the actual code files now?

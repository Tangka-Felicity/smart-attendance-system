# Firebase Setup & Integration Guide

Your Firebase project has been configured and initialized. Here's everything you need to know.

## ✅ What's Been Set Up

### Files Created:
1. **Mobile**: `mobile/src/config/firebase.ts` - Firebase initialization
2. **Web**: `web/src/config/firebase.ts` - Firebase initialization
3. **Mobile**: `mobile/src/config/firebaseServices.ts` - Reusable Firebase operations
4. **Web**: `web/src/config/firebaseServices.ts` - Reusable Firebase operations
5. **Mobile**: `mobile/src/config/FIREBASE_USAGE_EXAMPLES.ts` - Usage examples

### Configuration:
- ✅ Firebase Authentication (Email/Password)
- ✅ Cloud Firestore Database
- ✅ Cloud Storage
- ✅ Cloud Messaging (for push notifications)
- ✅ Initialized in both mobile and web apps

---

## 🚀 Quick Start

### 1. **Mobile App (React Native/Expo)**

Import and use Firebase services:

```typescript
import { authService, firestoreService } from '../config/firebaseServices';

// Login
const { user, error } = await authService.login('email@example.com', 'password');

// Add data to Firestore
const { id } = await firestoreService.addDocument('users', {
  email: 'user@example.com',
  name: 'User Name',
  role: 'student',
});

// Get data
const { data } = await firestoreService.getDocument('users', userId);
```

### 2. **Web App (React/Vite)**

Same Firebase services available:

```typescript
import { authService, firestoreService } from '../config/firebaseServices';

// Works identically to mobile!
```

---

## 📚 Available Services

### Authentication (`authService`)
```typescript
// Register
authService.register(email, password)

// Login
authService.login(email, password)

// Logout
authService.logout()

// Get current user
authService.getCurrentUser()

// Listen to auth changes
authService.onAuthStateChange((user) => {})
```

### Firestore (`firestoreService`)
```typescript
// Create/Add document
firestoreService.addDocument(collectionName, data, docId?)

// Get single document
firestoreService.getDocument(collectionName, docId)

// Get all documents
firestoreService.getCollection(collectionName)

// Query documents
firestoreService.queryDocuments(collectionName, field, operator, value)

// Update document
firestoreService.updateDocument(collectionName, docId, data)

// Delete document
firestoreService.deleteDocument(collectionName, docId)
```

---

## 🔧 Firebase Configuration

Your Firebase project is: **smart-attendance-systems-9bcfb**

### Project Details:
- **API Key**: AIzaSyCV8J4oVML625ipMd_saE_9zd2iKhaoRYw
- **Auth Domain**: smart-attendance-systems-9bcfb.firebaseapp.com
- **Project ID**: smart-attendance-systems-9bcfb
- **Storage Bucket**: smart-attendance-systems-9bcfb.firebasestorage.app
- **Messaging Sender ID**: 847627919025
- **App ID**: 1:847627919025:web:403488ff0ee4942c6a8c90

---

## 📋 Recommended Collection Structure

Create these collections in your Firebase Console:

### 1. **users**
```json
{
  "uid": "firebase_uid",
  "email": "user@example.com",
  "name": "User Name",
  "role": "student|lecturer|admin",
  "avatar": "url_to_profile_photo",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### 2. **courses**
```json
{
  "courseId": "COMP101",
  "name": "Introduction to Computing",
  "lecturer": "lecturer_uid",
  "students": ["student_uid_1", "student_uid_2"],
  "startDate": "timestamp",
  "endDate": "timestamp",
  "createdAt": "timestamp"
}
```

### 3. **attendance**
```json
{
  "studentId": "student_uid",
  "courseId": "COMP101",
  "date": "timestamp",
  "status": "present|absent|late",
  "method": "face_recognition|qr_code|manual",
  "location": {
    "latitude": 0.0,
    "longitude": 0.0,
    "timestamp": "timestamp"
  },
  "createdAt": "timestamp"
}
```

### 4. **sessions**
```json
{
  "courseId": "COMP101",
  "lecturerId": "lecturer_uid",
  "startTime": "timestamp",
  "endTime": "timestamp",
  "method": "qr_code|face_recognition",
  "qrCode": "qr_data",
  "location": {
    "latitude": 0.0,
    "longitude": 0.0
  },
  "status": "active|completed",
  "createdAt": "timestamp"
}
```

### 5. **notifications**
```json
{
  "userId": "user_uid",
  "title": "Notification Title",
  "message": "Notification message",
  "type": "attendance|session|announcement",
  "read": false,
  "createdAt": "timestamp"
}
```

---

## 🔐 Security Rules (Set in Firebase Console)

Add these rules to Firestore:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own documents
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
    
    // Courses - public read, lecturer write
    match /courses/{courseId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == resource.data.lecturer;
    }
    
    // Attendance - students can read own, lecturers can read course attendance
    match /attendance/{docId} {
      allow read: if request.auth.uid == resource.data.studentId 
                  || request.auth.uid == resource.data.lecturerId;
      allow create: if request.auth != null;
    }
    
    // Sessions - public read, lecturer write
    match /sessions/{docId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == resource.data.lecturerId;
    }
    
    // Notifications - users can read their own
    match /notifications/{docId} {
      allow read, write: if request.auth.uid == resource.data.userId;
    }
  }
}
```

---

## 🧪 Testing Firebase Connection

Run this in your terminal to test:

```bash
# Mobile
cd mobile
npm test

# Web
cd web
npm test
```

Or import and test in your component:

```typescript
import { authService } from '../config/firebaseServices';

async function testFirebase() {
  const user = await authService.getCurrentUser();
  console.log('Firebase connected:', !!user);
}
```

---

## 🐛 Troubleshooting

### "Firebase is not initialized"
- Make sure you imported `./config/firebase` at the top of `App.tsx`

### "Collection not found"
- Create the collection in Firebase Console first, or Firestore will auto-create it on first write

### "Authentication error"
- Check that email/password auth is enabled in Firebase Console > Authentication > Sign-in method

### "Firestore permission denied"
- Update your Firestore security rules (see section above)

---

## 📱 Next Steps

1. **Create Firestore collections** in your Firebase Console
2. **Set security rules** to protect user data
3. **Update your login screen** to use `authService.login()`
4. **Implement attendance features** using `firestoreService`
5. **Set up push notifications** using `messaging` service
6. **Enable face recognition integration** with your backend API

---

## 📞 Additional Resources

- [Firebase JavaScript SDK Docs](https://firebase.google.com/docs/web)
- [Firestore Documentation](https://firebase.google.com/docs/firestore)
- [Firebase Authentication](https://firebase.google.com/docs/auth)
- [React Native Firebase](https://rnfirebase.io/)

---

**Happy coding! 🎉**

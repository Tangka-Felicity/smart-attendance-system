/**
 * Firebase Integration Guide
 * 
 * This file contains examples of how to use Firebase services in your app.
 */

import { authService, firestoreService } from '../config/firebaseServices';

// ============================================
// AUTHENTICATION EXAMPLES
// ============================================

/**
 * Example: Register a new user
 */
export async function exampleRegister() {
  const { user, error } = await authService.register('user@example.com', 'password123');
  
  if (error) {
    console.error('Registration error:', error);
    return;
  }
  
  console.log('User registered:', user?.uid);
  
  // Create user profile in Firestore
  await firestoreService.addDocument('users', {
    uid: user?.uid,
    email: user?.email,
    name: 'User Name',
    role: 'student', // or 'lecturer', 'admin'
  }, user?.uid);
}

/**
 * Example: Login user
 */
export async function exampleLogin() {
  const { user, error } = await authService.login('user@example.com', 'password123');
  
  if (error) {
    console.error('Login error:', error);
    return;
  }
  
  console.log('User logged in:', user?.uid);
}

/**
 * Example: Logout user
 */
export async function exampleLogout() {
  const { error } = await authService.logout();
  
  if (error) {
    console.error('Logout error:', error);
    return;
  }
  
  console.log('User logged out');
}

/**
 * Example: Listen to auth state changes (use in useEffect)
 */
export function exampleListenToAuthState() {
  const unsubscribe = authService.onAuthStateChange((user) => {
    if (user) {
      console.log('User is signed in:', user.uid);
      // Fetch user profile or update UI
    } else {
      console.log('User is signed out');
      // Redirect to login
    }
  });
  
  // Don't forget to unsubscribe when component unmounts
  return unsubscribe;
}

// ============================================
// FIRESTORE EXAMPLES
// ============================================

/**
 * Example: Add attendance record
 */
export async function exampleAddAttendance() {
  const { id, error } = await firestoreService.addDocument('attendance', {
    studentId: 'student123',
    courseId: 'course456',
    date: new Date(),
    status: 'present',
    method: 'face_recognition', // or 'qr_code', 'manual'
  });
  
  if (error) {
    console.error('Add attendance error:', error);
    return;
  }
  
  console.log('Attendance record created:', id);
}

/**
 * Example: Get user profile
 */
export async function exampleGetUserProfile(userId: string) {
  const { data, error } = await firestoreService.getDocument('users', userId);
  
  if (error) {
    console.error('Get user error:', error);
    return;
  }
  
  console.log('User profile:', data);
  return data;
}

/**
 * Example: Get all courses
 */
export async function exampleGetAllCourses() {
  const { data, error } = await firestoreService.getCollection('courses');
  
  if (error) {
    console.error('Get courses error:', error);
    return;
  }
  
  console.log('Courses:', data);
  return data;
}

/**
 * Example: Query student's attendance records
 */
export async function exampleQueryStudentAttendance(studentId: string) {
  const { data, error } = await firestoreService.queryDocuments(
    'attendance',
    'studentId',
    '==',
    studentId
  );
  
  if (error) {
    console.error('Query attendance error:', error);
    return;
  }
  
  console.log('Attendance records:', data);
  return data;
}

/**
 * Example: Update user profile
 */
export async function exampleUpdateUserProfile(userId: string) {
  const { error } = await firestoreService.updateDocument('users', userId, {
    name: 'Updated Name',
    phoneNumber: '+1234567890',
  });
  
  if (error) {
    console.error('Update user error:', error);
    return;
  }
  
  console.log('User profile updated');
}

/**
 * Example: Delete attendance record
 */
export async function exampleDeleteAttendance(attendanceId: string) {
  const { error } = await firestoreService.deleteDocument('attendance', attendanceId);
  
  if (error) {
    console.error('Delete attendance error:', error);
    return;
  }
  
  console.log('Attendance record deleted');
}

// ============================================
// REACT HOOK EXAMPLES (for Mobile/Web)
// ============================================

/**
 * Example React Hook: Use auth state
 */
export function useAuthState() {
  const [user, setUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  
  React.useEffect(() => {
    const unsubscribe = authService.onAuthStateChange((user) => {
      setUser(user);
      setLoading(false);
    });
    
    return unsubscribe;
  }, []);
  
  return { user, loading };
}

/**
 * Example React Hook: Fetch Firestore data
 */
export function useFirestoreDocument(collectionName: string, docId: string) {
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  
  React.useEffect(() => {
    const fetchData = async () => {
      const { data, error } = await firestoreService.getDocument(collectionName, docId);
      if (error) {
        setError(error);
      } else {
        setData(data);
      }
      setLoading(false);
    };
    
    fetchData();
  }, [collectionName, docId]);
  
  return { data, loading, error };
}

/**
 * Example: React Component using Firebase
 */
export function ExampleComponent() {
  const { user, loading } = useAuthState();
  const { data: profile } = useFirestoreDocument('users', user?.uid || '');
  
  if (loading) return <div>Loading...</div>;
  
  if (!user) return <div>Please login</div>;
  
  return (
    <div>
      <h1>Welcome, {profile?.name}</h1>
      <p>Email: {user.email}</p>
    </div>
  );
}

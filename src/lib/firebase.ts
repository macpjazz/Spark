import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  deleteUser,
  updatePassword,
  User as FirebaseUser,
  signOut,
  sendPasswordResetEmail
} from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  serverTimestamp,
  getDocs,
  query,
  where
} from 'firebase/firestore';
import { getFunctions, httpsCallable, HttpsCallableResult } from 'firebase/functions';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const analytics = getAnalytics(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);

export interface UserData {
  email: string;
  firstName: string;
  lastName: string;
  department: string;
  role: 'admin' | 'instructor' | 'learner';
  createdAt?: string;
  updatedAt?: string;
}

// Send password reset email
export async function sendPasswordReset(email: string) {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error: any) {
    const errorMessage = error.message || 'Failed to send password reset email';
    
    if (error.code === 'auth/user-not-found') {
      throw new Error('No user found with this email address');
    }
    
    throw new Error(errorMessage);
  }
}

// Reset user's password (admin function)
export async function resetUserPassword(userId: string, newPassword: string) {
  try {
    const resetPasswordFunction = httpsCallable(functions, 'resetUserPassword');
    await resetPasswordFunction({ userId, newPassword });
    return { success: true };
  } catch (error: any) {
    const errorMessage = error.details?.message || 
                        error.message || 
                        'Failed to reset password';

    if (errorMessage.includes('auth/weak-password')) {
      throw new Error('Password should be at least 6 characters');
    } else if (errorMessage.includes('auth/requires-recent-login')) {
      throw new Error('This action requires the user to sign in again');
    } else if (errorMessage.includes('auth/user-not-found')) {
      throw new Error('User not found');
    }

    throw new Error(errorMessage);
  }
}

// Create a new user
export async function createUser(userData: UserData & { password: string }) {
  try {
    const createUserFunction = httpsCallable(functions, 'createUser');
    const result = await createUserFunction({
      email: userData.email,
      password: userData.password,
      firstName: userData.firstName,
      lastName: userData.lastName,
      department: userData.department,
      role: userData.role
    });

    return result.data;
  } catch (error: any) {
    const errorMessage = error.details?.message || 
                        error.message || 
                        'An error occurred while creating the user';
    
    if (errorMessage.includes('auth/email-already-in-use')) {
      throw new Error('This email is already registered');
    } else if (errorMessage.includes('auth/invalid-email')) {
      throw new Error('Invalid email address');
    } else if (errorMessage.includes('auth/weak-password')) {
      throw new Error('Password should be at least 6 characters');
    }

    throw new Error(errorMessage);
  }
}

// Update an existing user
export async function updateUser(userId: string, updates: Partial<UserData>) {
  try {
    // Validate updates object
    if (!updates || Object.keys(updates).length === 0) {
      throw new Error('No updates provided');
    }

    // Validate role if it's being updated
    if (updates.role && !['admin', 'instructor', 'learner'].includes(updates.role)) {
      throw new Error('Invalid role specified');
    }

    const updateUserFunction = httpsCallable(functions, 'updateUser');
    const result = await updateUserFunction({
      userId,
      updates: {
        ...updates,
        updatedAt: new Date().toISOString()
      }
    });

    return result.data;
  } catch (error: any) {
    console.error('Update user error:', error);
    
    // Extract the error message from the Firebase Functions error
    const errorMessage = error.details?.message || 
                        error.message || 
                        'An error occurred while updating the user';

    // Map specific error cases
    if (errorMessage.includes('permission-denied')) {
      throw new Error('You do not have permission to update users');
    } else if (errorMessage.includes('not-found')) {
      throw new Error('User not found');
    } else if (errorMessage.includes('invalid-argument')) {
      throw new Error(errorMessage);
    }

    throw new Error(errorMessage);
  }
}

// Delete a user account
export async function deleteUserAccount(userId: string) {
  try {
    const deleteUserFunction = httpsCallable(functions, 'deleteUser');
    const result = await deleteUserFunction({
      userId
    });

    return result.data;
  } catch (error: any) {
    const errorMessage = error.details?.message || 
                        error.message || 
                        'An error occurred while deleting the user';
    throw new Error(errorMessage);
  }
}

// Get all users
export async function getAllUsers() {
  try {
    const usersCollection = collection(db, 'users');
    const usersSnapshot = await getDocs(usersCollection);
    return usersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error: any) {
    const errorMessage = error.message || 'An error occurred while fetching users';
    throw new Error(errorMessage);
  }
}

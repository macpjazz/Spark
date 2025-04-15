import { create } from 'zustand';
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface User {
  id: string;
  email: string;
  role?: 'admin' | 'instructor' | 'learner';
  isNewUser?: boolean;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  setUser: (user: User | null) => void;
}

export const useAuth = create<AuthState>((set) => {
  // Set initial loading state
  set({ isLoading: true });

  // Listen to auth state changes
  onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      try {
        // Fetch user data from Firestore
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        const userData = userDoc.data();
        
        set({ 
          isAuthenticated: true, 
          user: {
            id: firebaseUser.uid,
            email: firebaseUser.email!,
            role: userData?.role,
            isNewUser: !userDoc.exists()
          },
          isLoading: false
        });
      } catch (error) {
        console.error('Error fetching user data:', error);
        set({ isLoading: false });
      }
    } else {
      set({ isAuthenticated: false, user: null, isLoading: false });
    }
  });

  return {
    isAuthenticated: false,
    user: null,
    isLoading: true,
    setUser: (user) => set({ user, isAuthenticated: !!user }),
    signIn: async (email: string, password: string) => {
      try {
        const { user: firebaseUser } = await signInWithEmailAndPassword(auth, email, password);
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        const userData = userDoc.data();
        
        set({ 
          isAuthenticated: true, 
          user: {
            id: firebaseUser.uid,
            email: firebaseUser.email!,
            role: userData?.role,
            isNewUser: !userDoc.exists()
          }
        });
      } catch (error: any) {
        if (error.code === 'auth/invalid-credential') {
          throw new Error('Invalid email or password');
        }
        throw new Error('Authentication failed. Please try again later.');
      }
    },
    signUp: async (email: string, password: string) => {
      if (!email || !password) {
        throw new Error('Email and password are required for sign up');
      }
      try {
        const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, email, password);
        
        set({
          isAuthenticated: true,
          user: {
            id: firebaseUser.uid,
            email: email,
            role: 'learner',
            isNewUser: true
          }
        });
      } catch (error: any) {
        switch (error.code) {
          case 'auth/email-already-in-use':
            throw new Error('An account with this email already exists');
          case 'auth/invalid-email':
            throw new Error('The email address is not valid');
          case 'auth/operation-not-allowed':
            throw new Error('Email/password accounts are not enabled. Please contact support.');
          case 'auth/weak-password':
            throw new Error('Password should be at least 6 characters');
          default:
            console.error('Signup error:', error);
            throw new Error('Registration failed. Please try again later.');
        }
      }
    },
    signOut: async () => {
      try {
        await firebaseSignOut(auth);
        set({ isAuthenticated: false, user: null });
      } catch (error) {
        console.error('Signout error:', error);
        throw new Error('Sign out failed. Please try again.');
      }
    }
  };
});

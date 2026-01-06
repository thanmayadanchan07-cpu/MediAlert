import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  type AuthError,
} from 'firebase/auth';
import { auth, db } from './config';
import { doc, setDoc } from 'firebase/firestore';

export async function signInOrSignUp(email: string, password: string): Promise<{ success: boolean; error?: string }> {
  try {
    await signInWithEmailAndPassword(auth, email, password);
    return { success: true };
  } catch (error) {
    const authError = error as AuthError;
    if (authError.code === 'auth/user-not-found' || authError.code === 'auth/invalid-credential') {
      try {
        const newUserCredential = await createUserWithEmailAndPassword(auth, email, password);
        // Store user email in Firestore profile upon creation
        await setDoc(doc(db, 'users', newUserCredential.user.uid, 'profile', 'data'), {
          email: newUserCredential.user.email,
        });
        return { success: true };
      } catch (createError) {
        const createAuthError = createError as AuthError;
        return { success: false, error: createAuthError.message };
      }
    }
    // Handle other errors like wrong password
    let friendlyMessage = 'An unknown error occurred.';
    if (authError.code === 'auth/wrong-password') {
        friendlyMessage = 'Incorrect password. Please try again.';
    } else if (authError.code === 'auth/invalid-email') {
        friendlyMessage = 'The email address is not valid.';
    }
    return { success: false, error: friendlyMessage };
  }
}

export async function signOutUser() {
  await signOut(auth);
}

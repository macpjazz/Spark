import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as cors from 'cors';

admin.initializeApp();

const corsHandler = cors({
  origin: true, // Allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
});

// Reset user password (admin only)
export const resetUserPassword = functions.https.onCall(async (data, context) => {
  // Verify the caller is authenticated and has admin privileges
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only administrators can reset passwords'
    );
  }

  const { userId, newPassword } = data;

  if (!userId || !newPassword) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Missing required fields'
    );
  }

  try {
    // Update the user's password
    await admin.auth().updateUser(userId, {
      password: newPassword,
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error resetting password:', error);
    throw new functions.https.HttpsError(
      'internal',
      error.message || 'Failed to reset password'
    );
  }
});

// Create a new user (admin only)
export const createUser = functions.https.onCall(async (data, context) => {
  // Verify admin privileges
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only administrators can create users'
    );
  }

  const { email, password, firstName, lastName, department, role } = data;

  try {
    // Create the user in Firebase Auth
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: `${firstName} ${lastName}`,
    });

    // Set custom claims based on role
    await admin.auth().setCustomUserClaims(userRecord.uid, { role });

    // Create user document in Firestore
    await admin.firestore().collection('users').doc(userRecord.uid).set({
      email,
      firstName,
      lastName,
      department,
      role,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { userId: userRecord.uid };
  } catch (error: any) {
    console.error('Error creating user:', error);
    throw new functions.https.HttpsError(
      'internal',
      error.message || 'Failed to create user'
    );
  }
});

// Update user (admin only)
export const updateUser = functions.https.onCall(async (data, context) => {
  // Verify admin privileges
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only administrators can update users'
    );
  }

  const { userId, updates } = data;

  if (!userId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'User ID is required'
    );
  }

  if (!updates || Object.keys(updates).length === 0) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'No updates provided'
    );
  }

  try {
    // Start a batch write
    const batch = admin.firestore().batch();
    const userRef = admin.firestore().collection('users').doc(userId);

    // Verify user exists
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'User not found'
      );
    }

    // Update user in Firebase Auth if name is being updated
    if (updates.firstName || updates.lastName) {
      const currentData = userDoc.data();
      const newFirstName = updates.firstName || currentData?.firstName;
      const newLastName = updates.lastName || currentData?.lastName;
      
      await admin.auth().updateUser(userId, {
        displayName: `${newFirstName} ${newLastName}`.trim(),
      });
    }

    // Update custom claims if role is being updated
    if (updates.role) {
      if (!['admin', 'instructor', 'learner'].includes(updates.role)) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'Invalid role specified'
        );
      }
      await admin.auth().setCustomUserClaims(userId, { role: updates.role });
    }

    // Update user document in Firestore
    const updateData = {
      ...updates,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    batch.update(userRef, updateData);

    // Commit the batch
    await batch.commit();

    return { success: true, userId };
  } catch (error: any) {
    console.error('Error updating user:', error);
    
    // Map Firebase Auth errors to appropriate error types
    if (error.code === 'auth/user-not-found') {
      throw new functions.https.HttpsError('not-found', 'User not found');
    }
    if (error.code === 'auth/invalid-display-name') {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid name format');
    }
    
    throw new functions.https.HttpsError(
      'internal',
      error.message || 'Failed to update user'
    );
  }
});

// Delete user (admin only)
export const deleteUser = functions.https.onCall(async (data, context) => {
  // Verify admin privileges
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only administrators can delete users'
    );
  }

  const { userId } = data;

  try {
    // Delete user from Firebase Auth
    await admin.auth().deleteUser(userId);

    // Delete user document from Firestore
    await admin.firestore().collection('users').doc(userId).delete();

    return { success: true };
  } catch (error: any) {
    console.error('Error deleting user:', error);
    throw new functions.https.HttpsError(
      'internal',
      error.message || 'Failed to delete user'
    );
  }
});

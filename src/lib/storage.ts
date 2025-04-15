import { db } from './firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  serverTimestamp,
  query,
  where,
  type Timestamp,
  addDoc,
  Timestamp as FirestoreTimestamp
} from 'firebase/firestore';
import type { Campaign, UserProfile, Department } from './types';
import { validateUrl } from './utils';

class FirestoreStorage {
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) return null;
      
      const data = userDoc.data();
      return {
        id: userDoc.id,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        department: data.department,
        createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
        updatedAt: (data.updatedAt as Timestamp).toDate().toISOString()
      };
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }

  async createUserProfile(userId: string, data: { 
    email: string;
    firstName: string;
    lastName: string;
    department: Department;
  }): Promise<UserProfile> {
    try {
      const userRef = doc(db, 'users', userId);
      const timestamp = serverTimestamp();
      const userData = {
        ...data,
        createdAt: timestamp,
        updatedAt: timestamp
      };
      
      await setDoc(userRef, userData);
      
      return {
        id: userId,
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error creating user profile:', error);
      throw new Error('Failed to create user profile');
    }
  }

  async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw new Error('Failed to update user profile');
    }
  }

  async getCampaigns(): Promise<Campaign[]> {
    try {
      const campaignsSnapshot = await getDocs(collection(db, 'campaigns'));
      return campaignsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title,
          description: data.description,
          imageUrl: data.imageUrl,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          createdBy: data.createdBy,
          isActive: data.isActive,
          startDate: data.startDate?.toDate?.()?.toISOString(),
          endDate: data.endDate?.toDate?.()?.toISOString(),
          hasQuestions: data.hasQuestions,
          participantLimit: data.participantLimit,
          learningMaterialsUrl: data.learningMaterialsUrl,
          learningMaterialsLastVerified: data.learningMaterialsLastVerified?.toDate?.()?.toISOString(),
          learningMaterialsBackupUrl: data.learningMaterialsBackupUrl,
          isTestCampaign: data.isTestCampaign || false,
          currentTestDay: data.currentTestDay || 0,
          totalTestDays: data.totalTestDays || 7
        };
      });
    } catch (error) {
      console.error('Error getting campaigns:', error);
      return [];
    }
  }

  async getCampaignParticipants(campaignId: string): Promise<number> {
    try {
      const participantsSnapshot = await getDocs(
        query(
          collection(db, 'campaign_participants'),
          where('campaignId', '==', campaignId)
        )
      );
      return participantsSnapshot.size;
    } catch (error) {
      console.error('Error getting campaign participants:', error);
      return 0;
    }
  }

  async isUserParticipant(userId: string, campaignId: string): Promise<boolean> {
    try {
      const participantsSnapshot = await getDocs(
        query(
          collection(db, 'campaign_participants'),
          where('campaignId', '==', campaignId),
          where('userId', '==', userId)
        )
      );
      return !participantsSnapshot.empty;
    } catch (error) {
      console.error('Error checking participant status:', error);
      return false;
    }
  }

  async joinCampaign(userId: string, campaignId: string): Promise<void> {
    try {
      const isParticipant = await this.isUserParticipant(userId, campaignId);
      if (isParticipant) {
        throw new Error('You are already participating in this campaign');
      }

      const participantData = {
        userId,
        campaignId,
        joinedAt: serverTimestamp(),
        score: 0,
        completedQuestions: []
      };

      await addDoc(collection(db, 'campaign_participants'), participantData);
    } catch (error) {
      console.error('Error joining campaign:', error);
      throw error;
    }
  }

  async createCampaign(campaignData: Partial<Campaign>): Promise<Campaign> {
    try {
      // Validate learning materials URL if provided
      if (campaignData.learningMaterialsUrl) {
        const isValid = await validateUrl(campaignData.learningMaterialsUrl);
        if (!isValid) {
          throw new Error('Invalid learning materials URL');
        }
      }

      const campaignRef = doc(collection(db, 'campaigns'));
      const timestamp = serverTimestamp();
      
      const campaign = {
        ...campaignData,
        id: campaignRef.id,
        createdAt: timestamp,
        updatedAt: timestamp,
        startDate: campaignData.startDate ? FirestoreTimestamp.fromDate(new Date(campaignData.startDate)) : null,
        endDate: campaignData.endDate ? FirestoreTimestamp.fromDate(new Date(campaignData.endDate)) : null,
        hasQuestions: false,
        isActive: true,
        learningMaterialsLastVerified: campaignData.learningMaterialsUrl ? timestamp : null,
        isTestCampaign: campaignData.isTestCampaign || false,
        currentTestDay: campaignData.isTestCampaign ? 0 : null,
        totalTestDays: campaignData.isTestCampaign ? (campaignData.totalTestDays || 7) : null
      };

      await setDoc(campaignRef, campaign);

      // Log the learning materials URL addition
      if (campaignData.learningMaterialsUrl) {
        await this.logLearningMaterialsChange(campaignRef.id, {
          type: 'add',
          url: campaignData.learningMaterialsUrl,
          timestamp: new Date().toISOString(),
          status: 'success'
        });
      }

      return {
        ...campaign,
        id: campaignRef.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        startDate: campaignData.startDate,
        endDate: campaignData.endDate,
        learningMaterialsLastVerified: new Date().toISOString()
      } as Campaign;
    } catch (error) {
      console.error('Error creating campaign:', error);
      throw new Error('Failed to create campaign');
    }
  }

  async updateCampaign(campaignId: string, updates: Partial<Campaign>): Promise<Campaign> {
    try {
      // Validate learning materials URL if it's being updated
      if (updates.learningMaterialsUrl) {
        const isValid = await validateUrl(updates.learningMaterialsUrl);
        if (!isValid) {
          throw new Error('Invalid learning materials URL');
        }
      }

      const campaignRef = doc(db, 'campaigns', campaignId);
      const timestamp = serverTimestamp();

      const updateData = {
        ...(updates.title !== undefined && { title: updates.title }),
        ...(updates.description !== undefined && { description: updates.description }),
        ...(updates.imageUrl !== undefined && { imageUrl: updates.imageUrl }),
        ...(updates.isActive !== undefined && { isActive: updates.isActive }),
        ...(updates.participantLimit !== undefined && { participantLimit: updates.participantLimit }),
        ...(updates.learningMaterialsUrl !== undefined && { 
          learningMaterialsUrl: updates.learningMaterialsUrl,
          learningMaterialsLastVerified: timestamp
        }),
        ...(updates.isTestCampaign !== undefined && { 
          isTestCampaign: updates.isTestCampaign,
          currentTestDay: updates.isTestCampaign ? (updates.currentTestDay || 0) : null,
          totalTestDays: updates.isTestCampaign ? (updates.totalTestDays || 7) : null
        }),
        ...(updates.currentTestDay !== undefined && { currentTestDay: updates.currentTestDay }),
        ...(updates.totalTestDays !== undefined && { totalTestDays: updates.totalTestDays }),
        updatedAt: timestamp,
        startDate: updates.startDate ? FirestoreTimestamp.fromDate(new Date(updates.startDate)) : null,
        endDate: updates.endDate ? FirestoreTimestamp.fromDate(new Date(updates.endDate)) : null
      };

      await updateDoc(campaignRef, updateData);

      // Log the learning materials URL update
      if (updates.learningMaterialsUrl !== undefined) {
        await this.logLearningMaterialsChange(campaignId, {
          type: 'update',
          url: updates.learningMaterialsUrl,
          timestamp: new Date().toISOString(),
          status: 'success'
        });
      }

      // Get the updated campaign
      const updatedDoc = await getDoc(campaignRef);
      const data = updatedDoc.data()!;

      return {
        id: updatedDoc.id,
        title: data.title,
        description: data.description,
        imageUrl: data.imageUrl,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: data.createdBy,
        isActive: data.isActive,
        startDate: data.startDate?.toDate?.()?.toISOString(),
        endDate: data.endDate?.toDate?.()?.toISOString(),
        hasQuestions: data.hasQuestions,
        participantLimit: data.participantLimit,
        learningMaterialsUrl: data.learningMaterialsUrl,
        learningMaterialsLastVerified: data.learningMaterialsLastVerified?.toDate?.()?.toISOString(),
        learningMaterialsBackupUrl: data.learningMaterialsBackupUrl,
        isTestCampaign: data.isTestCampaign || false,
        currentTestDay: data.currentTestDay || 0,
        totalTestDays: data.totalTestDays || 7
      };
    } catch (error) {
      console.error('Error updating campaign:', error);
      throw new Error('Failed to update campaign');
    }
  }

  async deleteCampaign(campaignId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'campaigns', campaignId));
    } catch (error) {
      console.error('Error deleting campaign:', error);
      throw new Error('Failed to delete campaign');
    }
  }

  private async logLearningMaterialsChange(campaignId: string, logData: {
    type: 'add' | 'update' | 'verify';
    url: string;
    timestamp: string;
    status: 'success' | 'error';
    error?: string;
  }): Promise<void> {
    try {
      await addDoc(collection(db, 'learning_materials_logs'), {
        campaignId,
        ...logData,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error logging learning materials change:', error);
    }
  }

  async verifyLearningMaterialsUrl(campaignId: string): Promise<boolean> {
    try {
      const campaignRef = doc(db, 'campaigns', campaignId);
      const campaignDoc = await getDoc(campaignRef);
      
      if (!campaignDoc.exists()) {
        throw new Error('Campaign not found');
      }

      const data = campaignDoc.data();
      const url = data.learningMaterialsUrl;

      if (!url) {
        return false;
      }

      const isValid = await validateUrl(url);

      // Update verification timestamp and log the result
      await updateDoc(campaignRef, {
        learningMaterialsLastVerified: serverTimestamp()
      });

      await this.logLearningMaterialsChange(campaignId, {
        type: 'verify',
        url,
        timestamp: new Date().toISOString(),
        status: isValid ? 'success' : 'error',
        error: isValid ? undefined : 'URL not accessible'
      });

      return isValid;
    } catch (error) {
      console.error('Error verifying learning materials URL:', error);
      return false;
    }
  }

  async getLeaderboard(): Promise<LeaderboardEntry[]> {
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const responsesSnapshot = await getDocs(collection(db, 'user_responses'));
      
      // Create a map to store user scores
      const userScores = new Map<string, {
        score: number;
        firstName: string;
        lastName: string;
        department: Department;
      }>();

      // Calculate total scores for each user
      responsesSnapshot.docs.forEach(doc => {
        const response = doc.data();
        const userId = response.userId;
        const points = response.pointsEarned || 0;

        if (!userScores.has(userId)) {
          const userDoc = usersSnapshot.docs.find(d => d.id === userId);
          if (userDoc) {
            const userData = userDoc.data();
            userScores.set(userId, {
              score: points,
              firstName: userData.firstName,
              lastName: userData.lastName,
              department: userData.department
            });
          }
        } else {
          const currentScore = userScores.get(userId)!;
          userScores.set(userId, {
            ...currentScore,
            score: currentScore.score + points
          });
        }
      });

      // Convert map to array and sort by score
      const leaderboard = Array.from(userScores.entries()).map(([userId, data]) => ({
        userId,
        ...data
      }));

      // Sort by score in descending order
      leaderboard.sort((a, b) => b.score - a.score);

      // Add rank to each entry
      return leaderboard.map((entry, index) => ({
        ...entry,
        rank: index + 1
      }));
    } catch (error) {
      console.error('Error getting leaderboard:', error);
      return [];
    }
  }
}

export const storage = new FirestoreStorage();

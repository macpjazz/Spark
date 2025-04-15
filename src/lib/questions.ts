import { 
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  type DocumentReference,
  type QuerySnapshot,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from './firebase';
import type { Question, UserResponse, QuestionType } from './types';

export const questionsService = {
  async getQuestions(campaignId: string, isTestCampaign: boolean = false, currentTestDay?: number): Promise<Question[]> {
    try {
      const questionsRef = collection(db, 'questions');
      let q = query(questionsRef, where('campaignId', '==', campaignId));
      
      // For test campaigns in challenge view, get questions for the specific day
      if (isTestCampaign && typeof currentTestDay === 'number') {
        q = query(q, where('dayNumber', '==', currentTestDay));
      }
      
      const snapshot = await getDocs(q);
      
      // Sort in memory instead of using orderBy to avoid index requirements
      const questions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Question[];

      return questions.sort((a, b) => 
        a.createdAt.toMillis() - b.createdAt.toMillis()
      );
    } catch (error) {
      console.error('Error getting questions:', error);
      throw error;
    }
  },

  async createQuestion(question: Omit<Question, 'id' | 'createdAt' | 'updatedAt'>): Promise<Question> {
    try {
      const timestamp = serverTimestamp();
      const questionData = {
        ...question,
        createdAt: timestamp,
        updatedAt: timestamp
      };

      const docRef = await addDoc(collection(db, 'questions'), questionData);
      
      return {
        id: docRef.id,
        ...questionData,
        createdAt: timestamp,
        updatedAt: timestamp
      } as Question;
    } catch (error) {
      console.error('Error creating question:', error);
      throw error;
    }
  },

  async updateQuestion(questionId: string, updates: Partial<Question>): Promise<void> {
    try {
      const questionRef = doc(db, 'questions', questionId);
      await updateDoc(questionRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating question:', error);
      throw error;
    }
  },

  async deleteQuestion(questionId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'questions', questionId));
    } catch (error) {
      console.error('Error deleting question:', error);
      throw error;
    }
  },

  async submitAnswer(answer: Omit<UserResponse, 'id' | 'createdAt'>): Promise<UserResponse> {
    try {
      const answerData = {
        ...answer,
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'user_responses'), answerData);
      
      return {
        id: docRef.id,
        ...answerData
      } as UserResponse;
    } catch (error) {
      console.error('Error submitting answer:', error);
      throw error;
    }
  },

  async getUserResponses(userId: string, campaignId: string): Promise<UserResponse[]> {
    try {
      const responsesRef = collection(db, 'user_responses');
      const q = query(
        responsesRef,
        where('userId', '==', userId),
        where('campaignId', '==', campaignId)
      );
      const snapshot = await getDocs(q);
      
      // Sort in memory instead of using orderBy to avoid index requirements
      const responses = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as UserResponse[];

      return responses.sort((a, b) => 
        b.createdAt.toMillis() - a.createdAt.toMillis()
      );
    } catch (error) {
      console.error('Error getting user responses:', error);
      throw error;
    }
  },

  async getTotalScore(userId: string, campaignId: string): Promise<number> {
    try {
      const responses = await this.getUserResponses(userId, campaignId);
      return responses.reduce((total, response) => total + response.pointsEarned, 0);
    } catch (error) {
      console.error('Error calculating total score:', error);
      return 0;
    }
  }
};

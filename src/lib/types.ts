import { Timestamp } from 'firebase/firestore';

export type Department = 'Learning and Development' | 'Culture Team' | 'Right2Drive';

export interface Campaign {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  isActive: boolean;
  startDate?: string;
  endDate?: string;
  hasQuestions: boolean;
  participantLimit?: number;
  isTestCampaign?: boolean;
  currentTestDay?: number;
  totalTestDays?: number;
  learningMaterialsUrl?: string;
  learningMaterialsLastVerified?: string;
  learningMaterialsBackupUrl?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  department: Department;
  createdAt: string;
  updatedAt: string;
}

export interface LeaderboardEntry {
  userId: string;
  firstName: string;
  lastName: string;
  department: Department;
  score: number;
  rank?: number;
}

export type QuestionType = 'multiple_choice' | 'select_all';

export interface Question {
  id: string;
  campaignId: string;
  type: QuestionType;
  text: string;
  options: string[];
  correctAnswers: number[];
  imageUrl?: string;
  points: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  dayNumber?: number;
}

export interface UserResponse {
  id: string;
  userId: string;
  questionId: string;
  campaignId: string;
  selectedAnswers: number[];
  isCorrect: boolean;
  pointsEarned: number;
  attemptNumber: number;
  createdAt: Timestamp;
  isTestResponse?: boolean;
}

export interface CampaignParticipant {
  userId: string;
  campaignId: string;
  joinedAt: Timestamp;
  score: number;
  completedQuestions: string[];
  currentTestDay?: number;
}

export interface WelcomeMessageState {
  seen: boolean;
  campaignId: string;
}

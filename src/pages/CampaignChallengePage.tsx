import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, ChevronRight, Calendar, X, Beaker, ChevronLeft, ChevronRightIcon } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { storage } from '../lib/storage';
import { questionsService } from '../lib/questions';
import type { Campaign, Question, UserResponse, WelcomeMessageState } from '../lib/types';
import { formatDate } from '../lib/utils';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';

const WELCOME_MESSAGE_KEY = 'campaign_welcome_message';

export default function CampaignChallengePage() {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [quizResult, setQuizResult] = useState<'correct' | 'incorrect' | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [showWelcomeMessage, setShowWelcomeMessage] = useState(false);
  const [totalScore, setTotalScore] = useState(0);
  const [hasCompletedToday, setHasCompletedToday] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isAdmin = user?.role === 'admin';

  const currentQuestion = questions[currentQuestionIndex];

  useEffect(() => {
    const checkWelcomeMessage = () => {
      const welcomeMessages = localStorage.getItem(WELCOME_MESSAGE_KEY);
      if (welcomeMessages && campaignId) {
        const messages: WelcomeMessageState[] = JSON.parse(welcomeMessages);
        const hasSeenMessage = messages.some(msg => msg.campaignId === campaignId && msg.seen);
        setShowWelcomeMessage(!hasSeenMessage);
      } else {
        setShowWelcomeMessage(true);
      }
    };

    checkWelcomeMessage();
  }, [campaignId]);

  const loadQuestions = async (campaignId: string, currentDay?: number) => {
    const questionsRef = collection(db, 'questions');
    let questionsQuery;
    
    if (typeof currentDay === 'number') {
      questionsQuery = query(
        questionsRef,
        where('campaignId', '==', campaignId),
        where('dayNumber', '==', currentDay)
      );
    } else {
      questionsQuery = query(
        questionsRef,
        where('campaignId', '==', campaignId)
      );
    }

    const questionsSnapshot = await getDocs(questionsQuery);
    return questionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Question[];
  };

  useEffect(() => {
    const loadCampaignData = async () => {
      if (!campaignId || !user) return;

      try {
        setIsLoading(true);
        setError(null);

        const campaigns = await storage.getCampaigns();
        const foundCampaign = campaigns.find(c => c.id === campaignId);
        
        if (!foundCampaign) {
          setError('Campaign not found');
          return;
        }
        
        setCampaign(foundCampaign);

        const loadedQuestions = await loadQuestions(
          campaignId,
          foundCampaign.isTestCampaign ? foundCampaign.currentTestDay : undefined
        );

        if (loadedQuestions.length === 0) {
          setError('No questions available for this campaign');
          return;
        }

        setQuestions(loadedQuestions);
        setCurrentQuestionIndex(0);
        setSelectedAnswers([]);
        setQuizResult(null);
        setAttempts(0);

        const score = await questionsService.getTotalScore(user.id, campaignId);
        setTotalScore(score);

        const responses = await questionsService.getUserResponses(user.id, campaignId);
        const today = new Date().toDateString();
        const todayResponses = responses.filter(r => 
          new Date(r.createdAt.toDate()).toDateString() === today
        );
        setHasCompletedToday(todayResponses.length >= loadedQuestions.length);

      } catch (error) {
        console.error('Error loading campaign data:', error);
        setError('Failed to load campaign data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadCampaignData();
  }, [campaignId, user]);

  const handleWelcomeMessageClose = () => {
    if (!campaignId) return;

    const welcomeMessages = localStorage.getItem(WELCOME_MESSAGE_KEY);
    const messages: WelcomeMessageState[] = welcomeMessages ? JSON.parse(welcomeMessages) : [];
    
    messages.push({
      campaignId,
      seen: true
    });

    localStorage.setItem(WELCOME_MESSAGE_KEY, JSON.stringify(messages));
    setShowWelcomeMessage(false);
  };

  const handleAnswerSelect = (index: number) => {
    if (!currentQuestion || quizResult) return;

    if (currentQuestion.type === 'multiple_choice') {
      setSelectedAnswers([index]);
    } else {
      setSelectedAnswers(prev => 
        prev.includes(index)
          ? prev.filter(i => i !== index)
          : [...prev, index]
      );
    }
  };

  const moveToNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswers([]);
      setQuizResult(null);
      setAttempts(0);
    } else {
      setHasCompletedToday(true);
    }
  };

  const handleSubmit = async () => {
    if (!currentQuestion || !campaign || !user) return;

    setIsSubmitting(true);
    try {
      const isCorrect = currentQuestion.correctAnswers.length === selectedAnswers.length &&
        currentQuestion.correctAnswers.every(answer => selectedAnswers.includes(answer));

      const responseData = {
        userId: user.id,
        questionId: currentQuestion.id,
        campaignId: campaign.id,
        selectedAnswers,
        isCorrect,
        pointsEarned: isCorrect ? currentQuestion.points : 0,
        attemptNumber: attempts + 1,
        isTestResponse: campaign.isTestCampaign,
        createdAt: new Date()
      };

      await questionsService.submitAnswer(responseData);

      if (isCorrect) {
        setTotalScore(prev => prev + currentQuestion.points);
      }

      setQuizResult(isCorrect ? 'correct' : 'incorrect');

      if (isCorrect || attempts >= 1) {
        if (campaign.isTestCampaign && isAdmin) {
          const currentDay = campaign.currentTestDay || 0;
          await storage.updateCampaign(campaign.id, {
            currentTestDay: currentDay + 1
          });
        }

        setTimeout(() => {
          moveToNextQuestion();
        }, 2000);
      } else {
        setAttempts(prev => prev + 1);
        setTimeout(() => {
          setQuizResult(null);
          setSelectedAnswers([]);
        }, 2000);
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
      setError('Failed to submit answer. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNextDay = async () => {
    if (!campaign || !isAdmin) return;
    
    const currentDay = campaign.currentTestDay || 0;
    const totalDays = campaign.totalTestDays || 7;
    
    if (currentDay < totalDays - 1) {
      try {
        setIsLoading(true);
        await storage.updateCampaign(campaign.id, {
          currentTestDay: currentDay + 1
        });
        
        const updatedCampaign = {
          ...campaign,
          currentTestDay: currentDay + 1
        };
        setCampaign(updatedCampaign);
        
        const loadedQuestions = await loadQuestions(campaign.id, currentDay + 1);
        setQuestions(loadedQuestions);
        setCurrentQuestionIndex(0);
        setSelectedAnswers([]);
        setQuizResult(null);
        setAttempts(0);
        setHasCompletedToday(false);
      } catch (error) {
        console.error('Error navigating to next day:', error);
        setError('Failed to navigate to next day');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handlePreviousDay = async () => {
    if (!campaign || !isAdmin) return;
    
    const currentDay = campaign.currentTestDay || 0;
    if (currentDay > 0) {
      try {
        setIsLoading(true);
        await storage.updateCampaign(campaign.id, {
          currentTestDay: currentDay - 1
        });
        
        const updatedCampaign = {
          ...campaign,
          currentTestDay: currentDay - 1
        };
        setCampaign(updatedCampaign);
        
        const loadedQuestions = await loadQuestions(campaign.id, currentDay - 1);
        setQuestions(loadedQuestions);
        setCurrentQuestionIndex(0);
        setSelectedAnswers([]);
        setQuizResult(null);
        setAttempts(0);
        setHasCompletedToday(false);
      } catch (error) {
        console.error('Error navigating to previous day:', error);
        setError('Failed to navigate to previous day');
      } finally {
        setIsLoading(false);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#1E1E1E] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#1E1E1E] flex items-center justify-center">
        <div className="text-center text-gray-400">
          <p>{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-4 inline-flex items-center text-[#fecf0c] hover:text-[#fecf0c]/80"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!campaign || !currentQuestion) {
    return (
      <div className="min-h-screen bg-[#1E1E1E] flex items-center justify-center">
        <div className="text-center text-gray-400">
          <p>Campaign not found or no questions available.</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-4 inline-flex items-center text-[#fecf0c] hover:text-[#fecf0c]/80"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (showWelcomeMessage) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center p-4"
        style={{
          backgroundImage: campaign?.imageUrl 
            ? `linear-gradient(rgba(30, 30, 30, 0.85), rgba(30, 30, 30, 0.85)), url(${campaign.imageUrl})`
            : `linear-gradient(rgba(30, 30, 30, 0.85), rgba(30, 30, 30, 0.85)), url(https://images.unsplash.com/photo-1516321318423-f06f85e504b3)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div className="bg-[#2D2D2D]/80 backdrop-blur-sm rounded-lg shadow-xl max-w-2xl w-full p-8">
          <h2 className="text-3xl font-bold text-white mb-6">
            Hey there{user?.firstName ? `, ${user.firstName}` : ''}!
          </h2>
          <div className="space-y-4 text-gray-300">
            <p>Thank you for joining this campaign. Here's how it works:</p>
            <ul className="list-disc list-inside space-y-2">
              <li>This campaign will run for {campaign?.totalTestDays || 7} days, and each day, you'll answer 2 questions about the topic.</li>
              <li>For every correct answer, you'll earn points that contribute to your final score.</li>
              <li>To get your score, you must complete the entire campaign before {formatDate(campaign?.endDate)}.</li>
            </ul>
            {campaign?.learningMaterialsUrl && (
              <p>
                Before you start, take a moment to review the{' '}
                <a
                  href={campaign.learningMaterialsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#fecf0c] hover:text-[#fecf0c]/80"
                >
                  learning materials here
                </a>
                .
              </p>
            )}
          </div>
          <button
            onClick={handleWelcomeMessageClose}
            className="mt-8 w-full py-4 px-6 bg-[#fecf0c] text-black rounded-lg font-medium hover:bg-[#fecf0c]/80 transition-colors"
          >
            I'm Ready!
          </button>
        </div>
      </div>
    );
  }

  const progress = campaign.isTestCampaign
    ? ((campaign.currentTestDay || 0) / (campaign.totalTestDays || 7)) * 100
    : 0;

  return (
    <div className="min-h-screen bg-[#1E1E1E]">
      <header className="bg-[#2D2D2D] shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center">
            <img 
              src="https://www.icxeed.ai/wp-content/themes/icxeed-2024-template/img/white-logo-icxeed.png"
              alt="iCxeed Logo"
              className="h-8 w-auto"
            />
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-white">{campaign.title}</h1>
            {campaign.learningMaterialsUrl ? (
              <a
                href={campaign.learningMaterialsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-[#fecf0c] hover:text-[#fecf0c]/80"
              >
                <BookOpen className="h-4 w-4 mr-2" />
                Access Learning Materials
              </a>
            ) : (
              <button
                className="inline-flex items-center text-gray-400 cursor-not-allowed"
                disabled
                title="No learning materials available"
              >
                <BookOpen className="h-4 w-4 mr-2" />
                No Learning Materials
              </button>
            )}
          </div>

          {campaign.isTestCampaign && (
            <div className="mb-4 bg-yellow-400/10 text-yellow-400 px-4 py-2 rounded-md text-sm flex items-center justify-between">
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                Test Mode Active - Day {(campaign.currentTestDay || 0) + 1} of {campaign.totalTestDays || 7}
              </div>
              {isAdmin && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handlePreviousDay}
                    disabled={campaign.currentTestDay === 0}
                    className={`p-1 rounded ${
                      campaign.currentTestDay === 0
                        ? 'text-gray-500 cursor-not-allowed'
                        : 'hover:bg-yellow-400/20'
                    }`}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={handleNextDay}
                    disabled={campaign.currentTestDay === (campaign.totalTestDays || 7) - 1}
                    className={`p-1 rounded ${
                      campaign.currentTestDay === (campaign.totalTestDays || 7) - 1
                        ? 'text-gray-500 cursor-not-allowed'
                        : 'hover:bg-yellow-400/20'
                    }`}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="relative pt-1">
            <div className="flex mb-2 items-center justify-between">
              <div>
                <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-[#fecf0c] bg-[#fecf0c]/10">
                  {campaign.isTestCampaign 
                    ? `Test Day ${(campaign.currentTestDay || 0) + 1} of ${campaign.totalTestDays || 7}`
                    : 'Progress'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold inline-block text-[#fecf0c]">
                  {Math.round(progress)}%
                </span>
              </div>
            </div>
            <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-[#2D2D2D]">
              <div
                style={{ width: `${progress}%` }}
                className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-[#fecf0c]"
              ></div>
            </div>
          </div>
        </div>

        {hasCompletedToday && !campaign.isTestCampaign ? (
          <div className="bg-[#2D2D2D] rounded-lg p-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-4">
              You're done for today's challenge!
            </h2>
            <p className="text-gray-300 mb-6">
              Come back tomorrow for your next set of questions.
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-black bg-[#fecf0c] hover:bg-[#fecf0c]/80"
            >
              Return to Dashboard
              <ChevronRight className="h-5 w-5 ml-2" />
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-[#2D2D2D] rounded-lg overflow-hidden h-[400px]">
              {currentQuestion.imageUrl ? (
                <img
                  src={currentQuestion.imageUrl}
                  alt="Question visual"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#fecf0c]/20 to-[#fecf0c]/5 flex items-center justify-center">
                  <img 
                    src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3"
                    alt="Default campaign image"
                    className="w-full h-full object-contain opacity-50"
                  />
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="bg-[#2D2D2D] rounded-lg p-6">
                <h2 className="text-xl font-bold text-white mb-2">
                  For {currentQuestion.points} points, today's question is...
                </h2>
                <p className="text-gray-300 text-lg mb-6">{currentQuestion.text}</p>

                <div className="space-y-4">
                  {currentQuestion.options.map((option, index) => (
                    <button
                      key={index}
                      onClick={() => handleAnswerSelect(index)}
                      disabled={!!quizResult}
                      className={`w-full text-left p-6 rounded-lg border text-lg transition-colors ${
                        selectedAnswers.includes(index)
                          ? 'border-[#fecf0c] bg-[#fecf0c]/10 text-white'
                          : 'border-gray-700 hover:border-gray-600 text-gray-300 hover:bg-[#1E1E1E]'
                      }`}
                    >
                      <span className="font-semibold">{String.fromCharCode(65 + index)}.</span> {option}
                    </button>
                  ))}
                </div>

                {quizResult && (
                  <div className={`mt-8 p-6 rounded-lg text-lg ${
                    quizResult === 'correct'
                      ? 'bg-green-100/10 text-green-400'
                      : 'bg-red-100/10 text-red-400'
                  }`}>
                    {quizResult === 'correct'
                      ? `Correct! You earned ${currentQuestion.points} points!`
                      : attempts >= 1
                        ? 'Incorrect. Come back tomorrow for another question!'
                        : 'Incorrect. You have one more try!'}
                  </div>
                )}

                {!quizResult && selectedAnswers.length > 0 && (
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="mt-8 w-full py-4 px-6 border border-transparent rounded-lg shadow-sm text-lg font-medium text-black bg-[#fecf0c] hover:bg-[#fecf0c]/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black mr-2"></div>
                        Submitting...
                      </div>
                    ) : (
                      'Submit Answer'
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

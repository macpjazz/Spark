import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Pencil, Trash2, X, Eye, ImageIcon } from 'lucide-react';
import { storage } from '../lib/storage';
import { questionsService } from '../lib/questions';
import type { Campaign, Question } from '../lib/types';

export default function QuestionsPage() {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Partial<Question> | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewState, setPreviewState] = useState({
    selectedAnswers: [] as number[],
    attempts: 0,
    quizResult: null as 'correct' | 'incorrect' | null
  });

  useEffect(() => {
    const loadData = async () => {
      if (!campaignId) return;

      try {
        setIsLoading(true);
        // Load campaign
        const campaigns = await storage.getCampaigns();
        const foundCampaign = campaigns.find(c => c.id === campaignId);
        if (foundCampaign) {
          setCampaign(foundCampaign);
        }

        // Load questions
        const loadedQuestions = await questionsService.getQuestions(campaignId);
        setQuestions(loadedQuestions);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [campaignId]);

  const handlePreview = (question: Question) => {
    setEditingQuestion(question);
    setPreviewState({
      selectedAnswers: [],
      attempts: 0,
      quizResult: null
    });
    setIsPreviewModalOpen(true);
  };

  const handleAnswerSelect = (index: number) => {
    if (!editingQuestion) return;

    if (editingQuestion.type === 'multiple_choice') {
      setPreviewState(prev => ({
        ...prev,
        selectedAnswers: [index]
      }));
    } else {
      setPreviewState(prev => ({
        ...prev,
        selectedAnswers: prev.selectedAnswers.includes(index)
          ? prev.selectedAnswers.filter(i => i !== index)
          : [...prev.selectedAnswers, index]
      }));
    }
  };

  const handleSubmitPreview = () => {
    if (!editingQuestion) return;

    const isCorrect = editingQuestion.correctAnswers.length === previewState.selectedAnswers.length &&
      editingQuestion.correctAnswers.every(answer => previewState.selectedAnswers.includes(answer));

    if (isCorrect || previewState.attempts >= 1) {
      setPreviewState(prev => ({
        ...prev,
        quizResult: isCorrect ? 'correct' : 'incorrect'
      }));

      setTimeout(() => {
        setIsPreviewModalOpen(false);
        setEditingQuestion(null);
        setPreviewState({
          selectedAnswers: [],
          attempts: 0,
          quizResult: null
        });
      }, 2000);
    } else {
      setPreviewState(prev => ({
        ...prev,
        attempts: prev.attempts + 1,
        quizResult: 'incorrect'
      }));

      setTimeout(() => {
        setPreviewState(prev => ({
          ...prev,
          quizResult: null
        }));
      }, 1500);
    }
  };

  const handleAddQuestion = () => {
    setEditingQuestion({
      type: 'multiple_choice',
      text: '',
      options: ['', '', '', ''],
      correctAnswers: [],
      imageUrl: '',
      points: 0,
    });
    setIsModalOpen(true);
  };

  const validateImageUrl = (url: string): boolean => {
    if (!url) return true;
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuestion || !campaignId) return;

    if (editingQuestion.options?.some(option => !option.trim())) {
      setFormErrors({ options: 'All options must be filled out' });
      return;
    }

    if (!editingQuestion.correctAnswers?.length) {
      setFormErrors({ correct_answers: 'Please select at least one correct answer' });
      return;
    }

    if (editingQuestion.imageUrl && !validateImageUrl(editingQuestion.imageUrl)) {
      setFormErrors({ image_url: 'Please enter a valid URL' });
      return;
    }

    if (typeof editingQuestion.points !== 'number' || editingQuestion.points < 0) {
      setFormErrors({ points: 'Points must be 0 or greater' });
      return;
    }

    setIsLoading(true);
    try {
      if (editingQuestion.id) {
        await questionsService.updateQuestion(editingQuestion.id, editingQuestion);
        setQuestions(prev => prev.map(q => 
          q.id === editingQuestion.id 
            ? { ...q, ...editingQuestion }
            : q
        ));
      } else {
        const newQuestion = await questionsService.createQuestion({
          ...editingQuestion,
          campaignId
        });
        setQuestions(prev => [...prev, newQuestion]);
      }

      setIsModalOpen(false);
      setEditingQuestion(null);
      setFormErrors({});
    } catch (error: any) {
      setFormErrors({ submit: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (questionId: string) => {
    if (!window.confirm('Are you sure you want to delete this question?')) return;

    try {
      await questionsService.deleteQuestion(questionId);
      setQuestions(prev => prev.filter(q => q.id !== questionId));
    } catch (error) {
      console.error('Error deleting question:', error);
    }
  };

  const handleSave = async () => {
    if (!campaignId) return;
    
    setIsSaving(true);
    try {
      await storage.updateCampaign(campaignId, { hasQuestions: true });
      navigate('/admin');
    } catch (error: any) {
      console.error('Error saving campaign:', error);
    } finally {
      setIsSaving(false);
    }
  };

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
            onClick={() => navigate('/admin')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Admin Dashboard
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-white">
            Questions for {campaign?.title}
          </h1>
          <button
            onClick={handleAddQuestion}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-black bg-[#fecf0c] hover:bg-[#fecf0c]/80"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Question
          </button>
        </div>

        <div className="bg-[#2D2D2D] rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-700">
            <h3 className="text-lg font-medium text-white">Questions</h3>
          </div>
          {questions.length === 0 ? (
            <div className="p-6 text-center text-gray-400">
              No questions added yet. Click the "Add Question" button to create your first question.
            </div>
          ) : (
            <div className="divide-y divide-gray-700">
              {questions.map((question, index) => (
                <div key={question.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex gap-6 flex-1">
                      {question.imageUrl && (
                        <div className="w-32 h-32 rounded-lg overflow-hidden flex-shrink-0">
                          <img
                            src={question.imageUrl}
                            alt="Question visual"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-3">
                          <h4 className="text-lg font-medium text-white">
                            Question {index + 1}
                          </h4>
                          <span className="text-sm font-medium text-[#fecf0c]">
                            {question.points} {question.points === 1 ? 'point' : 'points'}
                          </span>
                        </div>
                        <p className="mt-1 text-gray-300">{question.text}</p>
                        <div className="mt-4 space-y-2">
                          {question.options.map((option, optionIndex) => (
                            <div
                              key={optionIndex}
                              className={`flex items-center space-x-2 text-sm ${
                                question.correctAnswers.includes(optionIndex)
                                  ? 'text-green-400'
                                  : 'text-gray-400'
                              }`}
                            >
                              <span>{String.fromCharCode(65 + optionIndex)}.</span>
                              <span>{option}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handlePreview(question)}
                        className="text-[#fecf0c] hover:text-[#fecf0c]/80"
                        title="Preview question"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingQuestion(question);
                          setIsModalOpen(true);
                        }}
                        className="text-[#fecf0c] hover:text-[#fecf0c]/80"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(question.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <div className="px-6 py-4 border-t border-gray-700 flex justify-end">
            <button
              onClick={handleSave}
              disabled={isSaving || questions.length === 0}
              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-black ${
                isSaving || questions.length === 0
                  ? 'bg-[#fecf0c]/50 cursor-not-allowed'
                  : 'bg-[#fecf0c] hover:bg-[#fecf0c]/80'
              }`}
            >
              {isSaving ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2"></div>
                  Saving...
                </div>
              ) : (
                'Save Questions'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Question Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-[#2D2D2D] rounded-lg shadow-xl max-w-2xl w-full mx-4 my-4 flex flex-col max-h-[calc(100vh-2rem)]">
            <div className="px-6 py-4 border-b border-gray-700 flex justify-between items-center">
              <h3 className="text-lg font-medium text-white">
                {editingQuestion?.id ? 'Edit Question' : 'Add New Question'}
              </h3>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingQuestion(null);
                  setFormErrors({});
                }}
                className="text-gray-400 hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300">Question Type</label>
                  <select
                    value={editingQuestion?.type}
                    onChange={(e) => setEditingQuestion({
                      ...editingQuestion!,
                      type: e.target.value as Question['type']
                    })}
                    className="mt-1 block w-full rounded-md bg-[#1E1E1E] border-gray-700 text-white h-12 px-4"
                  >
                    <option value="multiple_choice">Multiple Choice</option>
                    <option value="select_all">Select All That Apply</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300">Points</label>
                  <input
                    type="number"
                    min="0"
                    value={editingQuestion?.points ?? 0}
                    onChange={(e) => setEditingQuestion({
                      ...editingQuestion!,
                      points: parseInt(e.target.value) || 0
                    })}
                    className="mt-1 block w-full rounded-md bg-[#1E1E1E] border-gray-700 text-white h-12 px-4"
                  />
                  {formErrors.points && (
                    <p className="mt-1 text-sm text-red-400">{formErrors.points}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300">Image URL</label>
                  <div className="mt-1 space-y-2">
                    <input
                      type="text"
                      value={editingQuestion?.imageUrl || ''}
                      onChange={(e) => setEditingQuestion({
                        ...editingQuestion!,
                        imageUrl: e.target.value
                      })}
                      placeholder="https://example.com/image.jpg"
                      className="block w-full rounded-md bg-[#1E1E1E] border-gray-700 text-white h-12 px-4"
                    />
                    {editingQuestion?.imageUrl && validateImageUrl(editingQuestion.imageUrl) && (
                      <div className="relative w-32 h-32 rounded-lg overflow-hidden bg-[#1E1E1E]">
                        <img
                          src={editingQuestion.imageUrl}
                          alt="Question visual preview"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = 'https://via.placeholder.com/400x400?text=Invalid+Image';
                          }}
                        />
                      </div>
                    )}
                    {formErrors.image_url && (
                      <p className="text-sm text-red-400">{formErrors.image_url}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300">Question Text</label>
                  <textarea
                    value={editingQuestion?.text}
                    onChange={(e) => setEditingQuestion({
                      ...editingQuestion!,
                      text: e.target.value
                    })}
                    className="mt-1 block w-full rounded-md bg-[#1E1E1E] border-gray-700 text-white h-24 px-4 py-2"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Options</label>
                  <div className="space-y-2">
                    {editingQuestion?.options?.map((option, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <input
                          type={editingQuestion.type === 'multiple_choice' ? 'radio' : 'checkbox'}
                          checked={editingQuestion.correctAnswers?.includes(index)}
                          onChange={(e) => {
                            const newCorrectAnswers = editingQuestion.type === 'multiple_choice'
                              ? [index]
                              : e.target.checked
                                ? [...(editingQuestion.correctAnswers || []), index]
                                : (editingQuestion.correctAnswers || []).filter(i => i !== index);
                            setEditingQuestion({
                              ...editingQuestion,
                              correctAnswers: newCorrectAnswers
                            });
                          }}
                          className="rounded bg-[#1E1E1E] border-gray-700 text-[#fecf0c]"
                        />
                        <input
                          type="text"
                          value={option}
                          onChange={(e) => {
                            const newOptions = [...editingQuestion.options!];
                            newOptions[index] = e.target.value;
                            setEditingQuestion({
                              ...editingQuestion,
                              options: newOptions
                            });
                          }}
                          className="flex-1 rounded-md bg-[#1E1E1E] border-gray-700 text-white h-12 px-4"
                          placeholder={`Option ${String.fromCharCode(65 + index)}`}
                          required
                        />
                      </div>
                    ))}
                  </div>
                  {formErrors.options && (
                    <p className="mt-2 text-sm text-red-400">{formErrors.options}</p>
                  )}
                  {formErrors.correct_answers && (
                    <p className="mt-2 text-sm text-red-400">{formErrors.correct_answers}</p>
                  )}
                </div>

                {formErrors.submit && (
                  <div className="mt-4 text-red-400 text-sm">{formErrors.submit}</div>
                )}
              </form>
            </div>
            <div className="px-6 py-4 border-t border-gray-700 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingQuestion(null);
                  setFormErrors({});
                }}
                className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className={`px-4 py-2 text-sm font-medium rounded-md text-black ${
                  isLoading 
                    ? 'bg-[#fecf0c]/50 cursor-not-allowed' 
                    : 'bg-[#fecf0c] hover:bg-[#fecf0c]/80'
                }`}
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2"></div>
                    {editingQuestion?.id ? 'Updating...' : 'Creating...'}
                  </div>
                ) : (
                  editingQuestion?.id ? 'Update Question' : 'Create Question'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {isPreviewModalOpen && editingQuestion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-[#2D2D2D] rounded-lg shadow-xl w-full max-w-5xl">
            <div className="px-8 py-6 border-b border-gray-700 flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-bold text-white">
                  For {editingQuestion.points} {editingQuestion.points === 1 ? 'point' : 'points'}, today's question is...
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsPreviewModalOpen(false);
                  setEditingQuestion(null);
                  setPreviewState({
                    selectedAnswers: [],
                    attempts: 0,
                    quizResult: null
                  });
                }}
                className="text-gray-400 hover:text-gray-300"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-8">
              <div className="flex gap-8">
                <div className="w-1/3">
                  <div className="aspect-square bg-[#1E1E1E] rounded-lg flex items-center justify-center">
                    {editingQuestion.imageUrl ? (
                      <img
                        src={editingQuestion.imageUrl}
                        alt="Question visual"
                        className="w-full h-full object-cover rounded-lg"
                        onError={(e) => {
                          e.currentTarget.src = 'https://via.placeholder.com/400x400?text=Invalid+Image';
                        }}
                      />
                    ) : (
                      <ImageIcon className="h-12 w-12 text-gray-600" />
                    )}
                  </div>
                </div>

                <div className="w-2/3">
                  <div className="mb-8">
                    <p className="text-2xl text-white leading-relaxed">{editingQuestion.text}</p>
                  </div>
                  <div className="space-y-4">
                    {editingQuestion.options.map((option, index) => (
                      <button
                        key={index}
                        onClick={() => handleAnswerSelect(index)}
                        disabled={!!previewState.quizResult}
                        className={`w-full text-left p-6 rounded-lg border text-lg ${
                          previewState.selectedAnswers.includes(index)
                            ? 'border-[#fecf0c] bg-[#fecf0c]/10 text-white'
                            : 'border-gray-700 hover:border-gray-600 text-gray-300 hover:bg-[#1E1E1E]'
                        }`}
                      >
                        <span className="font-semibold">{String.fromCharCode(65 + index)}.</span> {option}
                      </button>
                    ))}
                  </div>

                  {previewState.quizResult && (
                    <div className={`mt-8 p-6 rounded-lg text-lg ${
                      previewState.quizResult === 'correct'
                        ? 'bg-green-100/10 text-green-400'
                        : 'bg-red-100/10 text-red-400'
                    }`}>
                      {previewState.quizResult === 'correct'
                        ? `Correct! You earned ${editingQuestion.points} ${editingQuestion.points === 1 ? 'point' : 'points'}!`
                        : previewState.attempts >= 1
                          ? 'Incorrect. Come back tomorrow for another question!'
                          : 'Incorrect. You have one more try!'}
                    </div>
                  )}

                  {!previewState.quizResult && previewState.selectedAnswers.length > 0 && (
                    <button
                      onClick={handleSubmitPreview}
                      className="mt-8 w-full py-4 px-6 border border-transparent rounded-lg shadow-sm text-lg font-medium text-black bg-[#fecf0c] hover:bg-[#fecf0c]/80 transition-colors"
                    >
                      Submit Answer
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

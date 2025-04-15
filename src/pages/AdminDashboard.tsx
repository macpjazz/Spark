import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Plus, Pencil, Trash2, X, Users, HelpCircle, Medal, 
  UserCheck, ChevronDown, Download, Key, UserPlus, ImageIcon, Book,
  ChevronRight, Star, TestTube
} from 'lucide-react';
import { storage, type Campaign } from '../lib/storage';
import { useAuth } from '../hooks/useAuth';
import { exportToCSV, formatDate } from '../lib/utils';
import { db, createUser, updateUser, resetUserPassword, deleteUserAccount, type UserData } from '../lib/firebase';
import { collection, onSnapshot, doc, query, where, getDocs } from 'firebase/firestore';
import { getAuth, User as FirebaseUser } from 'firebase/auth';

type ActiveTab = 'users' | 'campaigns' | 'badges';
type ModalType = 'add' | 'edit' | 'reset-password' | 'delete' | 'campaign' | 'learning-materials';

interface UserStats {
  totalUsers: number;
  activeUsers: number;
  learners: number;
  instructors: number;
}

interface User extends UserData {
  id: string;
}

interface CampaignWithParticipants extends Campaign {
  participantCount: number;
  learningMaterialUrl?: string;
}

interface CampaignParticipant {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  score: number;
  completedQuestions: string[];
  joinedAt: Date;
  currentTestDay?: number;
}

const validateUrl = (url: string): boolean => {
  if (!url) return true;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
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

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('users');
  const [campaigns, setCampaigns] = useState<CampaignWithParticipants[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [modalType, setModalType] = useState<ModalType | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Partial<Campaign> | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [userFormData, setUserFormData] = useState<Partial<UserData> & { password?: string }>({
    email: '',
    firstName: '',
    lastName: '',
    department: 'Learning and Development',
    role: 'learner',
    password: ''
  });
  const [newPassword, setNewPassword] = useState('');
  const [userStats, setUserStats] = useState<UserStats>({
    totalUsers: 0,
    activeUsers: 0,
    learners: 0,
    instructors: 0
  });
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignWithParticipants | null>(null);
  const [learningMaterialUrl, setLearningMaterialUrl] = useState('');
  const [materialErrors, setMaterialErrors] = useState<Record<string, string>>({});
  const [expandedCampaign, setExpandedCampaign] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Record<string, CampaignParticipant[]>>({});
  const [loadingParticipants, setLoadingParticipants] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data() as UserData
      }));

      setUsers(usersList);
      
      setUserStats({
        totalUsers: usersList.length,
        activeUsers: usersList.length,
        learners: usersList.filter(u => u.role === 'learner').length,
        instructors: usersList.filter(u => u.role === 'instructor').length
      });
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const loadCampaigns = async () => {
      try {
        const allCampaigns = await storage.getCampaigns();
        
        const campaignsWithParticipants = await Promise.all(
          allCampaigns.map(async (campaign) => {
            const participantCount = await storage.getCampaignParticipants(campaign.id);
            return {
              ...campaign,
              participantCount,
              isActive: campaign.endDate && new Date(campaign.endDate) < new Date() 
                ? false 
                : campaign.isActive
            };
          })
        );

        setCampaigns(campaignsWithParticipants);
      } catch (error) {
        console.error('Error loading campaigns:', error);
        setCampaigns([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadCampaigns();
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setFormErrors({});

    try {
      if (!userFormData.email || !userFormData.password || !userFormData.firstName || !userFormData.lastName) {
        throw new Error('All fields are required');
      }

      await createUser(userFormData as UserData & { password: string });
      setIsModalOpen(false);
      setUserFormData({
        email: '',
        firstName: '',
        lastName: '',
        department: 'Learning and Development',
        role: 'learner',
        password: ''
      });
    } catch (error: any) {
      setFormErrors({ submit: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    
    setIsLoading(true);
    setFormErrors({});

    try {
      await updateUser(selectedUser.id, userFormData);
      setIsModalOpen(false);
      setSelectedUser(null);
      setUserFormData({});
    } catch (error: any) {
      setFormErrors({ submit: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    
    setIsLoading(true);
    setFormErrors({});

    try {
      await resetUserPassword(selectedUser.id, newPassword);
      setIsModalOpen(false);
      setSelectedUser(null);
      setNewPassword('');
    } catch (error: any) {
      setFormErrors({ submit: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    
    setIsLoading(true);
    setFormErrors({});

    try {
      await deleteUserAccount(selectedUser.id);
      setIsModalOpen(false);
      setSelectedUser(null);
    } catch (error: any) {
      setFormErrors({ submit: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportUsers = () => {
    const formattedUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      first_name: user.firstName,
      last_name: user.lastName,
      department: user.department,
      role: user.role,
      created_at: user.createdAt,
      updated_at: user.updatedAt
    }));

    exportToCSV(formattedUsers, 'users.csv');
  };

  const handleAddCampaign = () => {
    setEditingCampaign({
      title: '',
      description: '',
      isActive: true,
      hasQuestions: false,
      participantLimit: undefined
    });
    setModalType('campaign');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCampaign) return;

    if (!editingCampaign.title?.trim()) {
      setFormErrors({ title: 'Title is required' });
      return;
    }

    if (editingCampaign.imageUrl && !validateImageUrl(editingCampaign.imageUrl)) {
      setFormErrors({ imageUrl: 'Please enter a valid URL' });
      return;
    }

    if (editingCampaign.learningMaterialsUrl && !validateImageUrl(editingCampaign.learningMaterialsUrl)) {
      setFormErrors({ learningMaterialsUrl: 'Please enter a valid URL' });
      return;
    }

    if (editingCampaign.startDate && editingCampaign.endDate) {
      const start = new Date(editingCampaign.startDate);
      const end = new Date(editingCampaign.endDate);
      if (end < start) {
        setFormErrors({ endDate: 'End date must be after start date' });
        return;
      }
    }

    setIsLoading(true);
    try {
      let updatedCampaign: Campaign;
      if (editingCampaign.id) {
        updatedCampaign = await storage.updateCampaign(editingCampaign.id, editingCampaign);
        setCampaigns(prev => prev.map(c => 
          c.id === editingCampaign.id ? { ...updatedCampaign, participantCount: c.participantCount } : c
        ));
      } else {
        updatedCampaign = await storage.createCampaign(editingCampaign);
        setCampaigns(prev => [...prev, { ...updatedCampaign, participantCount: 0 }]);
      }

      setIsModalOpen(false);
      setEditingCampaign(null);
      setFormErrors({});
    } catch (error: any) {
      setFormErrors({ submit: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (campaignId: string) => {
    if (!window.confirm('Are you sure you want to delete this campaign?')) return;

    try {
      await storage.deleteCampaign(campaignId);
      setCampaigns(prev => prev.filter(c => c.id !== campaignId));
    } catch (error: any) {
      console.error('Error deleting campaign:', error);
    }
  };

  const handleLearningMaterialsClick = (campaign: CampaignWithParticipants) => {
    setSelectedCampaign(campaign);
    setLearningMaterialUrl(campaign.learningMaterialUrl || '');
    setModalType('learning-materials');
    setIsModalOpen(true);
  };

  const handleLearningMaterialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCampaign) return;

    setMaterialErrors({});

    if (learningMaterialUrl && !validateUrl(learningMaterialUrl)) {
      setMaterialErrors({ url: 'Please enter a valid URL' });
      return;
    }

    setIsLoading(true);
    try {
      await storage.updateCampaign(selectedCampaign.id, {
        ...selectedCampaign,
        learningMaterialUrl
      });

      setCampaigns(prev => prev.map(c => 
        c.id === selectedCampaign.id 
          ? { ...c, learningMaterialUrl } 
          : c
      ));

      setIsModalOpen(false);
      setSelectedCampaign(null);
      setLearningMaterialUrl('');
    } catch (error: any) {
      setMaterialErrors({ submit: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleParticipants = async (campaignId: string) => {
    if (expandedCampaign === campaignId) {
      setExpandedCampaign(null);
      return;
    }

    setExpandedCampaign(campaignId);
    setLoadingParticipants(campaignId);

    try {
      const participantsRef = collection(db, 'campaign_participants');
      const participantsQuery = query(participantsRef, where('campaignId', '==', campaignId));
      const participantsSnapshot = await getDocs(participantsQuery);
      
      const participantsList: CampaignParticipant[] = [];
      
      for (const doc of participantsSnapshot.docs) {
        const data = doc.data();
        const userDoc = await getDocs(query(collection(db, 'users'), where('id', '==', data.userId)));
        const userData = userDoc.docs[0]?.data();
        
        if (userData) {
          participantsList.push({
            userId: data.userId,
            firstName: userData.firstName,
            lastName: userData.lastName,
            email: userData.email,
            score: data.score || 0,
            completedQuestions: data.completedQuestions || [],
            joinedAt: data.joinedAt.toDate()
          });
        }
      }

      setParticipants(prev => ({
        ...prev,
        [campaignId]: participantsList
      }));
    } catch (error) {
      console.error('Error loading participants:', error);
    } finally {
      setLoadingParticipants(null);
    }
  };

  const handleAdvanceTestDay = async (campaignId: string) => {
    const campaign = campaigns.find(c => c.id === campaignId);
    if (!campaign || !campaign.isTestCampaign) return;

    try {
      const currentDay = campaign.currentTestDay || 0;
      const totalDays = campaign.totalTestDays || 0;

      if (currentDay >= totalDays) {
        alert('Campaign test has reached its final day');
        return;
      }

      await storage.updateCampaign(campaignId, {
        ...campaign,
        currentTestDay: currentDay + 1
      });

      setCampaigns(prev => prev.map(c => 
        c.id === campaignId 
          ? { ...c, currentTestDay: (c.currentTestDay || 0) + 1 }
          : c
      ));
    } catch (error) {
      console.error('Error advancing test day:', error);
      alert('Failed to advance test day');
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
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-4">Admin Dashboard</h1>
          <div className="border-b border-gray-700">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('users')}
                className={`py-4 px-1 inline-flex items-center border-b-2 font-medium text-sm ${
                  activeTab === 'users'
                    ? 'border-[#fecf0c] text-[#fecf0c]'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                }`}
              >
                <Users className="h-5 w-5 mr-2" />
                Active Users
              </button>
              <button
                onClick={() => setActiveTab('campaigns')}
                className={`py-4 px-1 inline-flex items-center border-b-2 font-medium text-sm ${
                  activeTab === 'campaigns'
                    ? 'border-[#fecf0c] text-[#fecf0c]'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                }`}
              >
                <UserCheck className="h-5 w-5 mr-2" />
                Campaign Management
              </button>
              <button
                onClick={() => setActiveTab('badges')}
                className={`py-4 px-1 inline-flex items-center border-b-2 font-medium text-sm ${
                  activeTab === 'badges'
                    ? 'border-[#fecf0c] text-[#fecf0c]'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                }`}
              >
                <Medal className="h-5 w-5 mr-2" />
                Badges
              </button>
            </nav>
          </div>
        </div>

        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-[#2D2D2D] rounded-lg shadow p-6">
                <div className="flex items-center">
                  <Users className="h-8 w-8 text-[#fecf0c]" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-400">Total Users</p>
                    <p className="text-2xl font-semibold text-white">{userStats.totalUsers}</p>
                  </div>
                </div>
              </div>
              <div className="bg-[#2D2D2D] rounded-lg shadow p-6">
                <div className="flex items-center">
                  <UserCheck className="h-8 w-8 text-[#fecf0c]" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-400">Active Users</p>
                    <p className="text-2xl font-semibold text-white">{userStats.activeUsers}</p>
                  </div>
                </div>
              </div>
              <div className="bg-[#2D2D2D] rounded-lg shadow p-6">
                <div className="flex items-center">
                  <Users className="h-8 w-8 text-[#fecf0c]" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-400">Learners</p>
                    <p className="text-2xl font-semibold text-white">{userStats.learners}</p>
                  </div>
                </div>
              </div>
              <div className="bg-[#2D2D2D] rounded-lg shadow p-6">
                <div className="flex items-center">
                  <Users className="h-8 w-8 text-[#fecf0c]" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-400">Instructors</p>
                    <p className="text-2xl font-semibold text-white">{userStats.instructors}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#2D2D2D] rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-700 flex justify-between items-center">
                <h3 className="text-lg font-medium text-white">User Management</h3>
                <div className="flex space-x-4">
                  <button 
                    onClick={handleExportUsers}
                    className="inline-flex items-center text-sm text-[#fecf0c] hover:text-[#fecf0c]/80"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export Users
                  </button>
                  <button
                    onClick={() => {
                      setModalType('add');
                      setIsModalOpen(true);
                    }}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-black bg-[#fecf0c] hover:bg-[#fecf0c]/80"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add User
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-700">
                  <thead className="bg-[#363636]">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Role</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Department</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Created At</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">
                          {user.firstName} {user.lastName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">
                          {user.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200 capitalize">
                          {user.role}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">
                          {user.department}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">
                          {new Date(user.createdAt as string).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setUserFormData(user);
                                setModalType('edit');
                                setIsModalOpen(true);
                              }}
                              className="text-[#fecf0c] hover:text-[#fecf0c]/80"
                              title="Edit user"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setModalType('reset-password');
                                setIsModalOpen(true);
                              }}
                              className="text-[#fecf0c] hover:text-[#fecf0c]/80"
                              title="Reset password"
                            >
                              <Key className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setModalType('delete');
                                setIsModalOpen(true);
                              }}
                              className="text-red-400 hover:text-red-300"
                              title="Delete user"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'campaigns' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-white">Campaign Management</h2>
              <button
                onClick={handleAddCampaign}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-black bg-[#fecf0c] hover:bg-[#fecf0c]/80"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Campaign
              </button>
            </div>

            <div className="bg-[#2D2D2D] rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-700">
                <h3 className="text-lg font-medium text-white">Campaigns</h3>
              </div>
              <div className="overflow-x-auto">
                {isLoading ? (
                  <div className="p-6 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
                    <p className="mt-2 text-gray-400">Loading campaigns...</p>
                  </div>
                ) : campaigns.length === 0 ? (
                  <div className="p-6 text-center text-gray-400">
                    No campaigns created yet. Click the "Add Campaign" button to create your first campaign.
                  </div>
                ) : (
                  <div className="divide-y divide-gray-700">
                    {campaigns.map((campaign) => (
                      <div key={campaign.id}>
                        <div className="px-6 py-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div>
                                <div className="flex items-center">
                                  <span className="text-lg font-medium text-white">{campaign.title}</span>
                                  {campaign.isTestCampaign && (
                                    <div className="ml-2 px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                                      Test Campaign
                                    </div>
                                  )}
                                  {campaign.description && (
                                    <div className="relative group ml-2">
                                      <HelpCircle className="h-4 w-4 text-gray-400 cursor-help" />
                                      <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 bg-gray-800 text-white text-sm rounded-lg p-2 shadow-lg">
                                        {campaign.description}
                                      </div>
                                    </div>
                                  )}
                                </div>
                                <div className="mt-1 flex items-center space-x-4 text-sm text-gray-400">
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    campaign.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                  }`}>
                                    {campaign.isActive ? 'Active' : 'Inactive'}
                                  </span>
                                  <span>{formatDate(campaign.startDate)} - {formatDate(campaign.endDate)}</span>
                                  {campaign.isTestCampaign && (
                                    <span className="text-purple-400">
                                      Day {campaign.currentTestDay || 0} of {campaign.totalTestDays}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-4">
                              {campaign.isTestCampaign && (
                                <button
                                  onClick={() => handleAdvanceTestDay(campaign.id)}
                                  className="text-purple-400 hover:text-purple-300"
                                  title="Advance test day"
                                >
                                  <TestTube className="h-4 w-4" />
                                </button>
                              )}
                              <button
                                onClick={() => handleToggleParticipants(campaign.id)}
                                className="flex items-center text-gray-400 hover:text-white transition-colors"
                              >
                                <Users className="h-4 w-4 mr-2" />
                                <span>{campaign.participantCount}</span>
                                <ChevronRight className={`h-4 w-4 ml-1 transition-transform ${
                                  expandedCampaign === campaign.id ? 'rotate-90' : ''
                                }`} />
                              </button>
                              <button
															  onClick={() => navigate(`/admin/campaigns/${campaign.id}/questions`)}
															  className="text-[#fecf0c] hover:text-[#fecf0c]/80"
															>
															  {campaign.hasQuestions ? 'Edit Questions' : 'Add Questions'}
															</button>
                              <button
                                onClick={() => handleLearningMaterialsClick(campaign)}
                                className="text-[#fecf0c] hover:text-[#fecf0c]/80"
                                title="Learning Materials"
                              >
                                <Book className="h-4 w-4" />
                              
                              </button>
                              <button
                                onClick={() => {
                                  setEditingCampaign(campaign);
                                  setModalType('campaign');
                                  setIsModalOpen(true);
                                }}
                                className="text-[#fecf0c] hover:text-[#fecf0c]/80"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(campaign.id)}
                                className="text-red-400 hover:text-red-300"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {expandedCampaign === campaign.id && (
                          <div className="bg-[#363636] px-6 py-4">
                            {loadingParticipants === campaign.id ? (
                              <div className="flex justify-center py-4">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#fecf0c]"></div>
                              </div>
                            ) : participants[campaign.id]?.length === 0 ? (
                              <p className="text-center text-gray-400 py-4">No participants yet</p>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="min-w-full">
                                  <thead>
                                    <tr>
                                      <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider py-2">Name</th>
                                      <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider py-2">Email</th>
                                      <th className="text-center text-xs font-medium text-gray-400 uppercase tracking-wider py-2">Score</th>
                                      <th className="text-center text-xs font-medium text-gray-400 uppercase tracking-wider py-2">Progress</th>
                                      <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider py-2">Joined</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-700">
                                    {participants[campaign.id]?.map((participant) => (
                                      <tr key={participant.userId}>
                                        <td className="py-2 text-sm text-white">
                                          {participant.firstName} {participant.lastName}
                                        </td>
                                        <td className="py-2 text-sm text-gray-300">
                                          {participant.email}
                                        </td>
                                        <td className="py-2 text-center">
                                          <div className="flex items-center justify-center text-[#fecf0c]">
                                            <Star className="h-4 w-4 mr-1" />
                                            <span>{participant.score}</span>
                                          </div>
                                        </td>
                                        <td className="py-2 text-center text-sm text-gray-300">
                                          {participant.completedQuestions.length} completed
                                        </td>
                                        <td className="py-2 text-sm text-gray-300">
                                          {formatDate(participant.joinedAt.toISOString())}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'badges' && (
          <div className="bg-[#2D2D2D] rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-700">
              <h3 className="text-lg font-medium text-white">Badge Management</h3>
            </div>
            <div className="p-6">
              <p className="text-gray-400">Badge management features coming soon...</p>
            </div>
          </div>
        )}

        {isModalOpen && modalType !== 'campaign' && modalType !== 'learning-materials' && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-[#2D2D2D] rounded-lg shadow-xl max-w-md w-full">
              <div className="px-6 py-4 border-b border-gray-700 flex justify-between items-center">
                <h3 className="text-lg font-medium text-white">
                  {modalType === 'add' && 'Add New User'}
                  {modalType === 'edit' && 'Edit User'}
                  {modalType === 'reset-password' && 'Reset Password'}
                  {modalType === 'delete' && 'Delete User'}
                </h3>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setSelectedUser(null);
                    setUserFormData({});
                    setFormErrors({});
                  }}
                  className="text-gray-400 hover:text-gray-300"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <form onSubmit={modalType === 'add' ? handleAddUser : modalType === 'edit' ? handleEditUser : handleResetPassword}>
                <div className="p-6 space-y-4">
                  {(modalType === 'add' || modalType === 'edit') && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-300">Email</label>
                        <input
                          type="email"
                          value={userFormData.email || ''}
                          onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                          disabled={modalType === 'edit'}
                          className="mt-1 block w-full rounded-md bg-[#1E1E1E] border-gray-700 text-white"
                          required
                        />
                      </div>
                      
                      {modalType === 'add' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-300">Password</label>
                          <input
                            type="password"
                            value={userFormData.password || ''}
                            onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                            className="mt-1 block w-full rounded-md bg-[#1E1E1E] border-gray-700 text-white"
                            required
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-gray-300">First Name</label>
                        <input
                          type="text"
                          value={userFormData.firstName || ''}
                          onChange={(e) => setUserFormData({ ...userFormData, firstName: e.target.value })}
                          className="mt-1 block w-full rounded-md bg-[#1E1E1E] border-gray-700 text-white"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300">Last Name</label>
                        <input
                          type="text"
                          value={userFormData.lastName || ''}
                          onChange={(e) => setUserFormData({ ...userFormData, lastName: e.target.value })}
                          className="mt-1 block w-full rounded-md bg-[#1E1E1E] border-gray-700 text-white"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300">Department</label>
                        <select
                          value={userFormData.department || 'Learning and Development'}
                          onChange={(e) => setUserFormData({ ...userFormData, department: e.target.value })}
                          className="mt-1 block w-full rounded-md bg-[#1E1E1E] border-gray-700 text-white"
                          required
                        >
                          <option value="Learning and Development">Learning and Development</option>
                          <option value="Culture Team">Culture Team</option>
                          <option value="Right2Drive">Right2Drive</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300">Role</label>
                        <select
                          value={userFormData.role || 'learner'}
                          onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value as UserData['role'] })}
                          className="mt-1 block w-full rounded-md bg-[#1E1E1E] border-gray-700 text-white"
                          required
                        >
                          <option value="learner">Learner</option>
                          <option value="instructor">Instructor</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                    </>
                  )}

                  {modalType === 'reset-password' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300">New Password</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="mt-1 block w-full rounded-md bg-[#1E1E1E] border-gray-700 text-white"
                        required
                      />
                    </div>
                  )}

                  {modalType === 'delete' && (
                    <div className="text-gray-300">
                      <p>Are you sure you want to delete this user?</p>
                      <p className="mt-2 text-sm text-gray-400">This action cannot be undone.</p>
                    </div>
                  )}

                  {formErrors.submit && (
                    <div className="text-red-400 text-sm">{formErrors.submit}</div>
                  )}
                </div>

                <div className="px-6 py-4 border-t border-gray-700 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setSelectedUser(null);
                      setUserFormData({});
                      setFormErrors({});
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white"
                  >
                    Cancel
                  </button>
                  {modalType === 'delete' ? (
                    <button
                      type="button"
                      onClick={handleDeleteUser}
                      disabled={isLoading}
                      className="px-4 py-2 text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-500"
                    >
                      {isLoading ? 'Deleting...' : 'Delete User'}
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="px-4 py-2 text-sm font-medium rounded-md text-black bg-[#fecf0c] hover:bg-[#fecf0c]/80"
                    >
                      {isLoading ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2"></div>
                          {modalType === 'add' ? 'Creating...' : modalType === 'edit' ? 'Updating...' : 'Resetting...'}
                        </div>
                      ) : (
                        modalType === 'add' ? 'Create User' : modalType === 'edit' ? 'Update User' : 'Reset Password'
                      )}
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        )}

        {isModalOpen && modalType === 'campaign' && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center overflow-y-auto p-4">
            <div className="bg-[#2D2D2D] rounded-lg shadow-xl max-w-2xl w-full my-8">
              <div className="px-6 py-4 border-b border-gray-700 flex justify-between items-center sticky top-0 bg-[#2D2D2D] z-10 rounded-t-lg">
                <h3 className="text-lg font-medium text-white">
                  {editingCampaign?.id ? 'Edit Campaign' : 'Add New Campaign'}
                </h3>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingCampaign(null);
                    setFormErrors({});
                  }}
                  className="text-gray-400 hover:text-gray-300"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-6 max-h-[calc(100vh-16rem)] overflow-y-auto">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300">Title</label>
                    <input
                      type="text"
                      value={editingCampaign?.title || ''}
                      onChange={(e) => setEditingCampaign({
                        ...editingCampaign!,
                        title: e.target.value
                      })}
                      className="mt-1 block w-full rounded-md bg-[#1E1E1E] border-gray-700 text-white"
                      required
                    />
                    {formErrors.title && (
                      <p className="mt-1 text-sm text-red-400">{formErrors.title}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300">Description</label>
                    <textarea
                      value={editingCampaign?.description || ''}
                      onChange={(e) => setEditingCampaign({
                        ...editingCampaign!,
                        description: e.target.value
                      })}
                      className="mt-1 block w-full rounded-md bg-[#1E1E1E] border-gray-700 text-white h-24"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300">Image URL</label>
                    <div className="mt-1 space-y-2">
                      <input
                        type="text"
                        value={editingCampaign?.imageUrl || ''}
                        onChange={(e) => setEditingCampaign({
                          ...editingCampaign!,
                          imageUrl: e.target.value
                        })}
                        placeholder="https://example.com/image.jpg"
                        className="block w-full rounded-md bg-[#1E1E1E] border-gray-700 text-white"
                      />
                      {editingCampaign?.imageUrl && validateUrl(editingCampaign.imageUrl) && (
                        <div className="relative w-32 h-32 rounded-lg overflow-hidden bg-[#1E1E1E]">
                          <img
                            src={editingCampaign.imageUrl}
                            alt="Campaign preview"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = 'https://via.placeholder.com/400x400?text=Invalid+Image';
                            }}
                          />
                        </div>
                      )}
                      {formErrors.imageUrl && (
                        <p className="text-sm text-red-400">{formErrors.imageUrl}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300">Learning Materials URL</label>
                    <input
                      type="text"
                      value={editingCampaign?.learningMaterialsUrl || ''}
                      onChange={(e) => setEditingCampaign({
                        ...editingCampaign!,
                        learningMaterialsUrl: e.target.value
                      })}
                      placeholder="https://example.com/materials"
                      className="mt-1 block w-full rounded-md bg-[#1E1E1E] border-gray-700 text-white"
                    />
                    {formErrors.learningMaterialsUrl && (
                      <p className="mt-1 text-sm text-red-400">{formErrors.learningMaterialsUrl}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300">Start Date</label>
                      <input
                        type="datetime-local"
                        value={editingCampaign?.startDate?.slice(0, 16) || ''}
                        onChange={(e) => setEditingCampaign({
                          ...editingCampaign!,
                          startDate: e.target.value
                        })}
                        className="mt-1 block w-full rounded-md bg-[#1E1E1E] border-gray-700 text-white [color-scheme:dark]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300">End Date</label>
                      <input
                        type="datetime-local"
                        value={editingCampaign?.endDate?.slice(0, 16) || ''}
                        onChange={(e) => setEditingCampaign({
                          ...editingCampaign!,
                          endDate: e.target.value
                        })}
                        className="mt-1 block w-full rounded-md bg-[#1E1E1E] border-gray-700 text-white [color-scheme:dark]"
                      />
                      {formErrors.endDate && (
                        <p className="mt-1 text-sm text-red-400">{formErrors.endDate}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300">Participant Limit</label>
                    <input
                      type="number"
                      min="0"
                      value={editingCampaign?.participantLimit || ''}
                      onChange={(e) => setEditingCampaign({
                        ...editingCampaign!,
                        participantLimit: e.target.value ? parseInt(e.target.value) : undefined
                      })}
                      className="mt-1 block w-full rounded-md bg-[#1E1E1E] border-gray-700 text-white"
                      placeholder="Optional"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="isTestCampaign"
                      checked={editingCampaign?.isTestCampaign || false}
                      onChange={(e) => setEditingCampaign({
                        ...editingCampaign!,
                        isTestCampaign: e.target.checked,
                        currentTestDay: e.target.checked ? 0 : undefined,
                        totalTestDays: e.target.checked ? (editingCampaign?.totalTestDays || 7) : undefined
                      })}
                      className="rounded bg-[#1E1E1E] border-gray-700 text-[#fecf0c]"
                    />
                    <label htmlFor="isTestCampaign" className="text-sm text-gray-300">
                      This is a Test Campaign
                    </label>
                  </div>

                  {editingCampaign?.isTestCampaign && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300">Total Test Days</label>
                      <input
                        type="number"
                        min="1"
                        value={editingCampaign?.totalTestDays || 7}
                        onChange={(e) => setEditingCampaign({
                          ...editingCampaign!,
                          totalTestDays: parseInt(e.target.value) || 7
                        })}
                        className="mt-1 block w-full rounded-md bg-[#1E1E1E] border-gray-700 text-white"
                      />
                      {formErrors.totalTestDays && (
                        <p className="mt-1 text-sm text-red-400">{formErrors.totalTestDays}</p>
                      )}
                    </div>
                  )}

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editingCampaign?.isActive}
                      onChange={(e) => setEditingCampaign({
                        ...editingCampaign!,
                        isActive: e.target.checked
                      })}
                      className="rounded bg-[#1E1E1E] border-gray-700 text-[#fecf0c]"
                    />
                    <label className="ml-2 text-sm text-gray-300">Active</label>
                  </div>

                  {formErrors.submit && (
                    <div className="text-red-400 text-sm">{formErrors.submit}</div>
                  )}
                </form>
              </div>
              <div className="px-6 py-4 border-t border-gray-700 flex justify-end space-x-3 sticky bottom-0 bg-[#2D2D2D] rounded-b-lg">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingCampaign(null);
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
                      {editingCampaign?.id ? 'Updating...' : 'Creating...'}
                    </div>
                  ) : (
                    editingCampaign?.id ? 'Update Campaign' : 'Create Campaign'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {isModalOpen && modalType === 'learning-materials' && selectedCampaign && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-[#2D2D2D] rounded-lg shadow-xl max-w-md w-full">
              <div className="px-6 py-4 border-b border-gray-700 flex justify-between items-center">
                <h3 className="text-lg font-medium text-white">Learning Materials</h3>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setSelectedCampaign(null);
                    setLearningMaterialUrl('');
                    setMaterialErrors({});
                  }}
                  className="text-gray-400 hover:text-gray-300"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleLearningMaterialSubmit} className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300">Learning Material URL</label>
                  <input
                    type="text"
                    value={learningMaterialUrl}
                    onChange={(e) => setLearningMaterialUrl(e.target.value)}
                    placeholder="https://example.com/learning-material"
                    className="mt-1 block w-full rounded-md bg-[#1E1E1E] border-gray-700 text-white"
                  />
                  {materialErrors.url && (
                    <p className="mt-1 text-sm text-red-400">{materialErrors.url}</p>
                  )}
                </div>

                {materialErrors.submit && (
                  <div className="text-red-400 text-sm">{materialErrors.submit}</div>
                )}

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setSelectedCampaign(null);
                      setLearningMaterialUrl('');
                      setMaterialErrors({});
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
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
                        Saving...
                      </div>
                    ) : (
                      'Save URL'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

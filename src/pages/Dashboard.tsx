import React, { useState, useEffect, useRef } from 'react';
import { Trophy, Award, Target, LogOut, Settings, Users, HelpCircle, X, UserCircle, ChevronDown, Cog, Play, Calendar, Users2, ArrowRight, Beaker, ChevronDownIcon } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { storage } from '../lib/storage';
import { formatDate } from '../lib/utils';
import type { Campaign, LeaderboardEntry } from '../lib/types';

export default function Dashboard() {
  const dropdownRef = useRef(null);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [joiningCampaign, setJoiningCampaign] = useState<string | null>(null);
  const [hoveredDescription, setHoveredDescription] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [userScore, setUserScore] = useState(0);
  const [streakCount, setStreakCount] = useState(0);
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const loadLeaderboard = async () => {
      if (!user) return;
      
      try {
        const entries = await storage.getLeaderboard();
        setLeaderboard(entries);
        
        const userEntry = entries.find(entry => entry.userId === user.id);
        if (userEntry) {
          setUserRank(userEntry.rank);
          setUserScore(userEntry.score);
        }
      } catch (error) {
        console.error('Error loading leaderboard:', error);
      }
    };

    loadLeaderboard();
  }, [user]);

  useEffect(() => {
    const loadCampaigns = async () => {
      if (!user) return;
      
      try {
        const allCampaigns = await storage.getCampaigns();
        
        const campaignsWithParticipants = await Promise.all(
          allCampaigns.map(async (campaign) => {
            const [participantCount, isParticipating] = await Promise.all([
              storage.getCampaignParticipants(campaign.id),
              storage.isUserParticipant(user.id, campaign.id)
            ]);
            
            return {
              ...campaign,
              participantCount,
              isParticipating,
              isActive: campaign.endDate && new Date(campaign.endDate) < new Date() 
                ? false 
                : campaign.isActive
            };
          })
        );

        setCampaigns(campaignsWithParticipants);
      } catch (error) {
        console.error('Error loading campaigns:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadCampaigns();
  }, [user]);

  const handleJoinCampaign = async (campaignId: string) => {
    if (!user) return;
    
    setJoiningCampaign(campaignId);
    try {
      await storage.joinCampaign(user.id, campaignId);
      
      setCampaigns(prevCampaigns => 
        prevCampaigns.map(campaign => 
          campaign.id === campaignId
            ? { 
                ...campaign, 
                isParticipating: true,
                participantCount: campaign.participantCount + 1
              }
            : campaign
        )
      );
    } catch (error: any) {
      console.error('Error joining campaign:', error);
      alert(error.message || 'Failed to join campaign');
    } finally {
      setJoiningCampaign(null);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleStartCampaign = (campaignId: string) => {
    navigate(`/campaign-challenge/${campaignId}`);
  };

  return (
    <div className="min-h-screen bg-[#1E1E1E] flex flex-col">
      <header className="bg-[#2D2D2D] shadow fixed w-full z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center">
            <img 
              src="https://www.icxeed.ai/wp-content/themes/icxeed-2024-template/img/white-logo-icxeed.png"
              alt="iCxeed Logo"
              className="h-8 w-auto"
            />
          </div>
          <div className="flex items-center">
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center space-x-3 text-gray-300 hover:text-white focus:outline-none"
              >
                <UserCircle className="h-8 w-8" />
                <span className="text-sm font-medium">{user?.email}</span>
                <ChevronDown className="h-4 w-4" />
              </button>

              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-[#2D2D2D] ring-1 ring-black ring-opacity-5">
                  <div className="py-1" role="menu">
                    {isAdmin && (
                      <button
                        className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-[#1E1E1E] hover:text-white"
                        role="menuitem"
                        onClick={() => {
                          setIsDropdownOpen(false);
                          navigate('/admin');
                        }}
                      >
                        <Users className="inline-block h-4 w-4 mr-2" />
                        Admin Panel
                      </button>
                    )}
                    <button
                      className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-[#1E1E1E] hover:text-white"
                      role="menuitem"
                      onClick={() => {
                        setIsDropdownOpen(false);
                        alert('Account settings coming soon!');
                      }}
                    >
                      <Settings className="inline-block h-4 w-4 mr-2" />
                      Account Settings
                    </button>
                    <button
                      className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-[#1E1E1E] hover:text-white"
                      role="menuitem"
                      onClick={handleSignOut}
                    >
                      <LogOut className="inline-block h-4 w-4 mr-2" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main id="dashboard-content" className="flex-1 pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Welcome Section */}
          <div className="mb-8 bg-gradient-to-r from-[#2D2D2D] to-[#2D2D2D]/70 rounded-lg p-6 border border-gray-700/50">
            <h1 className="text-3xl font-bold text-white mb-2">
              Hello, {leaderboard.find(entry => entry.userId === user?.id)?.firstName || 'Learner'}! 👋
            </h1>
            <p className="text-gray-300 text-lg">
              Ready to level up your skills today? Jump into a campaign and start your learning adventure! 
              {streakCount > 0 && ` You're on a ${streakCount}-day streak - keep that momentum going! 🔥`}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Leaderboard Section */}
            <div className="lg:col-span-2">
              <div className="bg-[#2D2D2D] rounded-lg shadow-lg overflow-hidden h-[400px]">
                <div className="px-6 py-4 border-b border-gray-700">
                  <h2 className="text-xl font-bold text-white">Top Performers</h2>
                </div>
                <div className="p-6 h-[calc(400px-64px)] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                  <div className="space-y-3">
                    {Array(5).fill(null).map((_, index) => {
                      const entry = leaderboard[index];
                      return (
                        <div
                          key={entry?.userId || index}
                          className={`flex items-center justify-between p-3 rounded-lg ${
                            entry?.userId === user?.id
                              ? 'bg-[#fecf0c]/10 border border-[#fecf0c]/20'
                              : 'bg-[#1E1E1E]'
                          }`}
                        >
                          <div className="flex items-center space-x-4">
                            <div className={`w-7 h-7 flex items-center justify-center rounded-full ${
                              index === 0 ? 'bg-[#fecf0c] text-black' :
                              index === 1 ? 'bg-gray-300 text-black' :
                              index === 2 ? 'bg-amber-700 text-white' :
                              'bg-gray-700 text-gray-300'
                            } font-bold text-sm`}>
                              {index + 1}
                            </div>
                            <div>
                              {entry ? (
                                <>
                                  <p className="font-medium text-white">
                                    {entry.firstName} {entry.lastName}
                                  </p>
                                  <p className="text-sm text-gray-400">{entry.department}</p>
                                </>
                              ) : (
                                <>
                                  <p className="font-medium text-gray-500">Spot not claimed</p>
                                  <p className="text-sm text-gray-600">Join a campaign to compete</p>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            {entry ? (
                              <p className="text-lg font-bold text-[#fecf0c]">
                                {entry.score} pts
                              </p>
                            ) : (
                              <p className="text-sm text-gray-500">0 pts</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-[#2D2D2D] rounded-lg shadow p-6">
                <div className="flex items-center">
                  <Trophy className="h-8 w-8 text-[#fecf0c]" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-400">Your Total Score</p>
                    <div className="flex items-baseline">
                      <p className="text-2xl font-semibold text-white">{userScore}</p>
                      {userRank && (
                        <p className="ml-2 text-sm text-gray-400">
                          Rank #{userRank}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-[#2D2D2D] rounded-lg shadow p-6">
                <div className="flex items-center">
                  <Award className="h-8 w-8 text-[#fecf0c]" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-400">Current Streak</p>
                    <p className="text-2xl font-semibold text-white">{streakCount} days</p>
                  </div>
                </div>
              </div>

              <div className="bg-[#2D2D2D] rounded-lg shadow p-6">
                <div className="flex items-center">
                  <Target className="h-8 w-8 text-[#fecf0c]" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-400">Joined Campaigns</p>
                    <p className="text-2xl font-semibold text-white">
                      {campaigns.filter(c => c.isParticipating).length}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 border-t border-gray-700 pt-8">
            <h2 className="text-2xl font-bold text-white mb-2">Learning Campaigns</h2>
            <p className="text-gray-400">Join campaigns to earn points and improve your skills</p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          ) : campaigns.length === 0 ? (
            <div className="bg-[#2D2D2D] rounded-lg shadow p-8 text-center">
              <p className="text-gray-400">No campaigns available at the moment.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
              {campaigns.map((campaign) => (
                <div 
                  key={campaign.id}
                  className={`bg-[#2D2D2D] rounded-lg shadow-lg overflow-hidden transition-transform duration-200 hover:transform hover:scale-[1.02] ${
                    !campaign.isActive && 'opacity-75'
                  }`}
                >
                  <div className="h-48 bg-gradient-to-br from-[#fecf0c]/20 to-[#fecf0c]/5 flex items-center justify-center">
                    <img
                      src={campaign.imageUrl || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3"}
                      alt={campaign.title}
                      className="w-full h-full object-cover opacity-50"
                    />
                  </div>
                  
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-white">{campaign.title}</h3>
                        <div className="flex gap-2 mt-2">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            campaign.isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {campaign.isActive ? 'Active' : 'Inactive'}
                          </span>
                          {campaign.isTestCampaign && (
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800 flex items-center">
                              <Beaker className="h-3 w-3 mr-1" />
                              Test Mode
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {campaign.description && (
                      <div 
                        className="relative group"
                        onMouseEnter={() => setHoveredDescription(campaign.id)}
                        onMouseLeave={() => setHoveredDescription(null)}
                      >
                        <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                          {campaign.description}
                        </p>
                        {hoveredDescription === campaign.id && campaign.description.length > 100 && (
                          <div className="absolute z-10 left-0 right-0 mt-1 p-4 bg-[#1E1E1E] rounded-lg shadow-xl border border-gray-700 text-gray-300 text-sm">
                            {campaign.description}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="space-y-3">
                      <div className="flex items-center text-gray-400 text-sm">
                        <Calendar className="h-4 w-4 mr-2 text-[#fecf0c]" />
                        <span>
                          {formatDate(campaign.startDate)} - {formatDate(campaign.endDate)}
                        </span>
                      </div>
                      
                      <div className="flex items-center text-gray-400 text-sm">
                        <Users2 className="h-4 w-4 mr-2" />
                        <span>
                          {campaign.participantCount} - {campaign.participantLimit ? campaign.participantLimit : '∞'} participants
                        </span>
                      </div>
                    </div>

                    <div className="mt-6">
                      {campaign.isParticipating ? (
                        <button
                          onClick={() => handleStartCampaign(campaign.id)}
                          className="w-full flex items-center justify-center bg-[#fecf0c] text-black py-2 px-4 rounded-lg font-medium hover:bg-[#fecf0c]/80 transition-colors"
                        >
                          <span>Let's Go!</span>
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleJoinCampaign(campaign.id)}
                          disabled={!campaign.isActive || joiningCampaign === campaign.id}
                          className={`w-full flex items-center justify-center py-2 px-4 rounded-lg font-medium ${
                            campaign.isActive
                              ? 'bg-[#fecf0c] text-black hover:bg-[#fecf0c]/80'
                              : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          {joiningCampaign === campaign.id ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                              Joining...
                            </>
                          ) : (
                            <>
                              <Play className="h-4 w-4 mr-2" />
                              Join Campaign
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <footer className="bg-[#2D2D2D] py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="text-gray-400 text-sm">
            © All rights reserved. iCXeed 2025 ®
          </div>
          {isAdmin && (
            <button
              onClick={() => navigate('/admin')}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <Cog className="h-5 w-5" />
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}

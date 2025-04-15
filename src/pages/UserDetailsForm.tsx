import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { storage } from '../lib/storage';
import { useAuth } from '../hooks/useAuth';
import type { Department } from '../lib/types';

const departments = [
  'Learning and Development',
  'Culture Team',
  'Right2Drive'
] as const;

export default function UserDetailsForm() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    department: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const checkAuthAndProfile = async () => {
      if (!isAuthenticated || !user) {
        navigate('/auth');
        return;
      }

      try {
        const profile = await storage.getUserProfile(user.id);
        if (profile) {
          navigate('/dashboard');
        } else {
          setTimeout(() => setShowForm(true), 300);
        }
      } catch (error) {
        console.error('Error checking profile:', error);
      }
    };

    checkAuthAndProfile();
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.id) {
      setError('No user ID found. Please try signing in again.');
      return;
    }

    if (isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.department) {
        throw new Error('Please fill in all fields');
      }

      await storage.createUserProfile(user.id, {
        email: user.email,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        department: formData.department as Department
      });

      setIsRedirecting(true);
      window.location.href = '/dashboard';
    } catch (err: any) {
      console.error('Error saving profile:', err);
      setError(err.message || 'Failed to save profile. Please try again.');
      setIsSubmitting(false);
    }
  };

  if (isRedirecting) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <>
      <div className="profile-overlay fixed inset-0 bg-black/60 backdrop-blur-sm z-40" />
      <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative z-50">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <h2 className="text-center text-3xl font-extrabold text-gray-100">
            Complete Your Profile
          </h2>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className={`bg-[#2D2D2D]/90 backdrop-blur-sm py-8 px-4 shadow-xl shadow-black/20 sm:rounded-lg sm:px-10 transition-all duration-400 ${
            showForm ? 'auth-slide-up' : 'opacity-0 translate-y-4'
          }`}>
            {error && (
              <div className="mb-4 p-4 text-sm text-red-400 bg-red-400/10 rounded-md">
                {error}
              </div>
            )}

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-200">
                  First Name
                </label>
                <input
                  type="text"
                  id="firstName"
                  required
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="mt-1 block w-full rounded-md bg-[#1E1E1E]/80 border-gray-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-gray-100"
                />
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-200">
                  Last Name
                </label>
                <input
                  type="text"
                  id="lastName"
                  required
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="mt-1 block w-full rounded-md bg-[#1E1E1E]/80 border-gray-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-gray-100"
                />
              </div>

              <div>
                <label htmlFor="department" className="block text-sm font-medium text-gray-200">
                  Department
                </label>
                <select
                  id="department"
                  required
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="mt-1 block w-full rounded-md bg-[#1E1E1E]/80 border-gray-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-gray-100"
                >
                  <option value="">Select a department</option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#1D458C] hover:bg-[#15336A] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1D458C] ${
                    isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {isSubmitting ? 'Saving...' : 'Complete Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}

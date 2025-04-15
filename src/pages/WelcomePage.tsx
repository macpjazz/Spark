import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { storage } from '../lib/storage';
import type { Department } from '../lib/types';

const departments: Department[] = ['Learning and Development', 'Culture Team', 'Right2Drive'];

export default function WelcomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    department: 'Learning and Development' as Department
  });
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      await storage.createUserProfile(user.id, {
        email: user.email,
        ...formData
      });
      
      // Force a reload to ensure all states are fresh
      window.location.href = '/dashboard';
    } catch (error) {
      setError('Failed to save profile. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen bg-[#1E1E1E] flex flex-col justify-center py-12 sm:px-6 lg:px-8"
      style={{
        backgroundImage: 'url(https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=2070)',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <img 
            src="https://www.icxeed.ai/wp-content/themes/icxeed-2024-template/img/white-logo-icxeed.png"
            alt="iCxeed Logo"
            className="h-12 w-auto"
          />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
          Hey there!
        </h2>
        <p className="mt-2 text-center text-sm text-gray-300">
          Just one more step to complete your profile
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-[#2D2D2D] py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {error && (
            <div className="mb-4 bg-red-400/10 text-red-400 p-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-200">
                Email
              </label>
              <input
                type="email"
                value={user?.email}
                disabled
                className="mt-1 block w-full rounded-md bg-[#1E1E1E] border-gray-700 shadow-sm text-gray-400 cursor-not-allowed"
              />
            </div>

            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-200">
                First Name
              </label>
              <input
                id="firstName"
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="mt-1 block w-full rounded-md bg-[#1E1E1E] border-gray-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-white"
              />
            </div>

            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-200">
                Last Name
              </label>
              <input
                id="lastName"
                type="text"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="mt-1 block w-full rounded-md bg-[#1E1E1E] border-gray-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-white"
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
                onChange={(e) => setFormData({ ...formData, department: e.target.value as Department })}
                className="mt-1 block w-full rounded-md bg-[#1E1E1E] border-gray-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-white"
              >
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
                disabled={isLoading}
                className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-black bg-[#fecf0c] hover:bg-[#fecf0c]/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#fecf0c] ${
                  isLoading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2"></div>
                    Saving...
                  </div>
                ) : (
                  'Complete Profile'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

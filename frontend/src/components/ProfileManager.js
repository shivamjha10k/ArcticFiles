import React, { useState, useEffect } from 'react';
import { X, Plus, User, Edit, Trash2, Calendar, Sparkles, GraduationCap, Briefcase, Heart } from 'lucide-react';

// Mock profile service since we're not touching backend
const mockProfileService = {
  getAllProfiles: async () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          profiles: [
            {
              id: 1,
              profile_name: 'Student Profile',
              description: 'For academic research and learning',
              created_at: new Date().toISOString()
            },
            {
              id: 2,
              profile_name: 'Professional Profile',
              description: 'For business and work-related content',
              created_at: new Date().toISOString()
            }
          ]
        });
      }, 500);
    });
  },
  
  createProfile: async (profileData) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          id: Date.now(),
          ...profileData,
          created_at: new Date().toISOString()
        });
      }, 1000);
    });
  },
  
  updateProfile: async (id, profileData) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          id,
          ...profileData,
          created_at: new Date().toISOString()
        });
      }, 1000);
    });
  },
  
  deleteProfile: async (id) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true });
      }, 500);
    });
  }
};

const ProfileManager = ({ isOpen, onClose, onProfileSelect, currentProfile, isDarkMode = false }) => {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    profile_name: '',
    description: ''
  });

  useEffect(() => {
    if (isOpen) {
      loadProfiles();
    }
  }, [isOpen]);

  const loadProfiles = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await mockProfileService.getAllProfiles();
      setProfiles(response.profiles || []);
    } catch (err) {
      setError('Failed to load profiles');
      console.error('Error loading profiles:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      profile_name: '',
      description: ''
    });
    setEditingProfile(null);
    setShowCreateForm(false);
  };

  const handleCreateProfile = async () => {
    if (!formData.profile_name.trim()) {
      setError('Please enter a profile name');
      return;
    }

    try {
      setError(null);
      await mockProfileService.createProfile(formData);
      await loadProfiles();
      resetForm();
    } catch (err) {
      setError(err.message || 'Failed to create profile');
    }
  };

  const handleUpdateProfile = async () => {
    if (!formData.profile_name.trim()) {
      setError('Please enter a profile name');
      return;
    }

    try {
      setError(null);
      await mockProfileService.updateProfile(editingProfile.id, formData);
      await loadProfiles();
      resetForm();
    } catch (err) {
      setError(err.message || 'Failed to update profile');
    }
  };

  const handleEditProfile = (profile) => {
    setFormData({
      profile_name: profile.profile_name,
      description: profile.description || ''
    });
    setEditingProfile(profile);
    setShowCreateForm(true);
  };

  const handleDeleteProfile = async (profileId) => {
    if (!window.confirm('Are you sure you want to delete this profile?')) {
      return;
    }

    try {
      setError(null);
      await mockProfileService.deleteProfile(profileId);
      await loadProfiles();
    } catch (err) {
      setError(err.message || 'Failed to delete profile');
    }
  };

  const handleSelectProfile = (profile) => {
    onProfileSelect(profile);
    onClose();
  };

  const getProfileIcon = (profileName) => {
    const name = profileName?.toLowerCase() || '';
    if (name.includes('student')) return GraduationCap;
    if (name.includes('professional')) return Briefcase;
    return Heart;
  };

  const getProfileColors = (profileName) => {
    const name = profileName?.toLowerCase() || '';
    if (name.includes('student')) {
      return {
        color: "from-blue-500 to-purple-600",
        bgColor: "from-blue-500/20 to-purple-600/20",
        borderColor: "border-blue-500/30",
      };
    }
    if (name.includes('professional')) {
      return {
        color: "from-emerald-500 to-teal-600",
        bgColor: "from-emerald-500/20 to-teal-600/20",
        borderColor: "border-emerald-500/30",
      };
    }
    return {
      color: "from-pink-500 to-rose-600",
      bgColor: "from-pink-500/20 to-rose-600/20",
      borderColor: "border-pink-500/30",
    };
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className={`absolute inset-0 backdrop-blur-sm ${isDarkMode ? 'bg-black/60' : 'bg-black/40'}`} onClick={onClose} />

      {/* Modal */}
      <div className={`relative w-full max-w-2xl mx-4 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden ${
        isDarkMode 
          ? 'bg-gradient-to-br from-slate-900/95 to-blue-950/95 border border-white/20' 
          : 'bg-gradient-to-br from-white/95 to-gray-50/95 border border-gray-200'
      }`}>
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className={`absolute -top-20 -right-20 w-40 h-40 rounded-full blur-2xl animate-pulse ${
            isDarkMode ? 'bg-blue-500/10' : 'bg-blue-200/20'
          }`}></div>
          <div className={`absolute -bottom-20 -left-20 w-40 h-40 rounded-full blur-2xl animate-pulse delay-1000 ${
            isDarkMode ? 'bg-purple-500/10' : 'bg-purple-200/20'
          }`}></div>
        </div>

        {/* Header */}
        <div className={`relative z-10 flex items-center justify-between p-6 border-b ${
          isDarkMode ? 'border-white/10' : 'border-gray-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Profile Manager</h2>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-4 py-2 rounded-xl shadow-lg transition-all duration-300 hover:scale-105 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Profile
            </button>
            <button
              onClick={onClose}
              className={`rounded-xl w-8 h-8 flex items-center justify-center transition-all duration-300 ${
                isDarkMode 
                  ? 'text-white/70 hover:text-white hover:bg-white/10' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10 p-6">
          {showCreateForm ? (
            /* New Profile Form */
            <div className="max-w-md mx-auto">
              <div className={`backdrop-blur-sm rounded-2xl border ${
                isDarkMode 
                  ? 'bg-gradient-to-br from-white/5 to-white/10 border-white/20' 
                  : 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200 shadow-lg'
              }`}>
                <div className="p-6 space-y-4">
                  <h3 className={`text-lg font-semibold mb-4 ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    {editingProfile ? 'Edit Profile' : 'Create New Profile'}
                  </h3>

                  <div className="space-y-2">
                    <label className={`text-sm font-medium block ${
                      isDarkMode ? 'text-white/80' : 'text-gray-700'
                    }`}>Profile Name</label>
                    <input
                      type="text"
                      value={formData.profile_name}
                      onChange={(e) => setFormData({...formData, profile_name: e.target.value})}
                      placeholder="Enter profile name"
                      className={`w-full p-3 rounded-xl focus:outline-none transition-all duration-300 ${
                        isDarkMode 
                          ? 'bg-white/10 border border-white/20 text-white placeholder:text-white/50 focus:border-purple-500' 
                          : 'bg-white border border-gray-200 text-gray-900 placeholder:text-gray-500 focus:border-purple-500'
                      }`}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className={`text-sm font-medium block ${
                      isDarkMode ? 'text-white/80' : 'text-gray-700'
                    }`}>Description (Optional)</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      placeholder="Brief description of this profile's purpose..."
                      className={`w-full p-3 rounded-xl h-24 resize-none focus:outline-none transition-all duration-300 ${
                        isDarkMode 
                          ? 'bg-white/10 border border-white/20 text-white placeholder:text-white/50 focus:border-purple-500' 
                          : 'bg-white border border-gray-200 text-gray-900 placeholder:text-gray-500 focus:border-purple-500'
                      }`}
                    />
                  </div>

                  {error && (
                    <div className={`rounded-xl p-3 backdrop-blur-sm text-sm ${
                      isDarkMode 
                        ? 'text-red-300 bg-gradient-to-r from-red-500/10 to-pink-500/10 border border-red-500/20' 
                        : 'text-red-700 bg-gradient-to-r from-red-100/80 to-pink-100/80 border border-red-300/40'
                    }`}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          isDarkMode ? 'bg-red-400' : 'bg-red-500'
                        }`}></div>
                        {error}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={editingProfile ? handleUpdateProfile : handleCreateProfile}
                      className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white py-3 rounded-xl font-medium transition-all duration-300 hover:scale-105 shadow-lg"
                    >
                      {editingProfile ? 'Update Profile' : 'Create Profile'}
                    </button>
                    <button
                      onClick={resetForm}
                      className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                        isDarkMode 
                          ? 'border border-white/20 text-white hover:bg-white/10' 
                          : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Profile List */
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className={`text-base font-semibold mb-4 ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>Select Profile</h3>

                {loading && (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-4"></div>
                    <p className={isDarkMode ? 'text-white/70' : 'text-gray-600'}>Loading profiles...</p>
                  </div>
                )}

                {error && !loading && (
                  <div className={`rounded-xl p-3 backdrop-blur-sm text-sm text-center ${
                    isDarkMode 
                      ? 'text-red-300 bg-gradient-to-r from-red-500/10 to-pink-500/10 border border-red-500/20' 
                      : 'text-red-700 bg-gradient-to-r from-red-100/80 to-pink-100/80 border border-red-300/40'
                  }`}>
                    <div className="flex items-center justify-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        isDarkMode ? 'bg-red-400' : 'bg-red-500'
                      }`}></div>
                      {error}
                    </div>
                  </div>
                )}

                {!loading && profiles.length === 0 && (
                  <div className="text-center py-12">
                    <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center shadow-xl backdrop-blur-sm border ${
                      isDarkMode 
                        ? 'bg-gradient-to-br from-slate-700/50 to-slate-800/50 border-white/10' 
                        : 'bg-gradient-to-br from-gray-100 to-gray-200 border-gray-200'
                    }`}>
                      <User className={`w-8 h-8 ${isDarkMode ? 'text-slate-300' : 'text-gray-500'}`} />
                    </div>
                    <h3 className={`text-lg font-semibold mb-2 ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>No profiles yet</h3>
                    <p className={`text-sm leading-relaxed mb-6 ${
                      isDarkMode ? 'text-white/70' : 'text-gray-600'
                    }`}>
                      Create your first profile to get started
                    </p>
                    <button
                      onClick={() => setShowCreateForm(true)}
                      className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-6 py-3 rounded-xl font-medium transition-all duration-300 hover:scale-105 shadow-lg"
                    >
                      Create Profile
                    </button>
                  </div>
                )}

                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {profiles.map((profile) => {
                    const IconComponent = getProfileIcon(profile.profile_name);
                    const colors = getProfileColors(profile.profile_name);
                    const isSelected = currentProfile?.id === profile.id;

                    return (
                      <div
                        key={profile.id}
                        className={`cursor-pointer transition-all duration-300 hover:scale-105 rounded-2xl border ${
                          isSelected
                            ? `bg-gradient-to-r ${colors.bgColor} border-2 ${colors.borderColor} shadow-lg`
                            : (isDarkMode 
                                ? "bg-white/5 border-white/10 hover:bg-white/10" 
                                : "bg-white border-gray-200 hover:bg-gray-50 shadow-sm")
                        }`}
                        onClick={() => handleSelectProfile(profile)}
                      >
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-10 h-10 bg-gradient-to-br ${colors.color} rounded-xl flex items-center justify-center shadow-lg`}
                              >
                                <IconComponent className="w-5 h-5 text-white" />
                              </div>
                              <div>
                                <h4 className={`font-semibold ${
                                  isDarkMode ? 'text-white' : 'text-gray-900'
                                }`}>{profile.profile_name}</h4>
                                {profile.description && (
                                  <p className={`text-sm ${
                                    isDarkMode ? 'text-white/70' : 'text-gray-600'
                                  }`}>{profile.description}</p>
                                )}
                              </div>
                            </div>

                            {isSelected && (
                              <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white border-0 px-3 py-1 rounded-full text-sm font-medium">
                                Selected
                              </div>
                            )}
                          </div>

                          <div className={`flex items-center justify-between text-xs ${
                            isDarkMode ? 'text-white/60' : 'text-gray-500'
                          }`}>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>Created {new Date(profile.created_at).toLocaleDateString()}</span>
                            </div>

                            <div className="flex gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditProfile(profile);
                                }}
                                className={`w-6 h-6 rounded transition-all duration-300 flex items-center justify-center ${
                                  isDarkMode 
                                    ? 'text-white/60 hover:text-white hover:bg-white/10' 
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                                }`}
                              >
                                <Edit className="w-3 h-3" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteProfile(profile.id);
                                }}
                                className={`w-6 h-6 rounded transition-all duration-300 flex items-center justify-center ${
                                  isDarkMode 
                                    ? 'text-white/60 hover:text-red-400 hover:bg-red-500/10' 
                                    : 'text-gray-500 hover:text-red-600 hover:bg-red-50'
                                }`}
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Profile Info */}
              <div className="text-center py-4">
                <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center border shadow-lg ${
                  isDarkMode 
                    ? 'bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/30' 
                    : 'bg-gradient-to-br from-purple-100 to-pink-100 border-purple-200'
                }`}>
                  <User className={`w-8 h-8 ${
                    isDarkMode ? 'text-purple-300' : 'text-purple-600'
                  }`} />
                </div>

                <h3 className={`text-lg font-semibold mb-2 ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  Select a profile from the list or create a new one
                </h3>

                <p className={`text-sm mb-4 leading-relaxed ${
                  isDarkMode ? 'text-white/60' : 'text-gray-600'
                }`}>
                  Profiles help organize your documents and maintain context for better AI analysis
                </p>

                <div className={`flex items-center justify-center gap-2 text-sm ${
                  isDarkMode ? 'text-purple-400' : 'text-purple-600'
                }`}>
                  <Sparkles className="w-4 h-4" />
                  <span>Personalized Experience</span>
                  <Sparkles className="w-4 h-4" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileManager;

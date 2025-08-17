import React, { useState, useEffect } from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Edit2, 
  Save, 
  X, 
  Camera, 
  Shield, 
  BookOpen, 
  Award,
  Globe,
  Linkedin,
  Twitter,
  Github,
  Eye,
  EyeOff,
  Upload,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import './Profile.css';

const Profile = ({ userRole, userData, onDataUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);

  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    bio: '',
    dateOfBirth: '',
    avatar: '',
    address: {
      street: '',
      city: '',
      state: '',
      country: '',
      zipCode: ''
    },
    socialLinks: {
      website: '',
      linkedin: '',
      twitter: '',
      github: ''
    }
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5555/api';

  // Load user data on component mount
  useEffect(() => {
    if (userData) {
      setProfileData({
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        email: userData.email || '',
        phone: userData.phone || '',
        bio: userData.bio || '',
        dateOfBirth: userData.dateOfBirth ? userData.dateOfBirth.split('T')[0] : '',
        avatar: userData.avatar || '',
        address: {
          street: userData.address?.street || '',
          city: userData.address?.city || '',
          state: userData.address?.state || '',
          country: userData.address?.country || '',
          zipCode: userData.address?.zipCode || ''
        },
        socialLinks: {
          website: userData.socialLinks?.website || '',
          linkedin: userData.socialLinks?.linkedin || '',
          twitter: userData.socialLinks?.twitter || '',
          github: userData.socialLinks?.github || ''
        }
      });
    }
  }, [userData]);

  // Clear messages after 5 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage('');
        setMessageType('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [section, field] = name.split('.');
      setProfileData(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value
        }
      }));
    } else {
      setProfileData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setMessage('Please select a valid image file');
        setMessageType('error');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setMessage('Image size should be less than 5MB');
        setMessageType('error');
        return;
      }

      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadAvatar = async () => {
    if (!avatarFile) return profileData.avatar;

    const formData = new FormData();
    formData.append('avatar', avatarFile);

    try {
      const token = localStorage.getItem('userToken');
      const response = await fetch(`${API_BASE_URL}/users/upload-avatar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();
      if (data.success) {
        return data.data.avatarUrl;
      } else {
        throw new Error(data.message || 'Failed to upload avatar');
      }
    } catch (error) {
      console.error('Avatar upload error:', error);
      setMessage('Failed to upload avatar');
      setMessageType('error');
      return profileData.avatar;
    }
  };

  const validateForm = () => {
    const errors = [];

    if (!profileData.firstName.trim()) {
      errors.push('First name is required');
    }
    if (!profileData.lastName.trim()) {
      errors.push('Last name is required');
    }
    if (profileData.phone && !/^\+?[\d\s-()]+$/.test(profileData.phone)) {
      errors.push('Please enter a valid phone number');
    }
    if (profileData.bio && profileData.bio.length > 500) {
      errors.push('Bio cannot exceed 500 characters');
    }
    if (profileData.dateOfBirth) {
      const dob = new Date(profileData.dateOfBirth);
      const today = new Date();
      if (dob > today) {
        errors.push('Date of birth cannot be in the future');
      }
    }

    // Validate social links format
    const urlFields = ['website', 'linkedin', 'twitter', 'github'];
    urlFields.forEach(field => {
      const url = profileData.socialLinks[field];
      if (url && url.trim() !== '') {
        try {
          new URL(url);
        } catch {
          errors.push(`Please enter a valid ${field} URL`);
        }
      }
    });

    if (errors.length > 0) {
      setMessage(errors.join('. '));
      setMessageType('error');
      return false;
    }

    return true;
  };

  const handleSaveProfile = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setMessage('');
    
    try {
      // Upload avatar if changed
      let avatarUrl = profileData.avatar;
      if (avatarFile) {
        avatarUrl = await uploadAvatar();
      }

      const updatedProfileData = {
        ...profileData,
        avatar: avatarUrl
      };

      const token = localStorage.getItem('userToken');
      const response = await fetch(`${API_BASE_URL}/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updatedProfileData)
      });

      const data = await response.json();

      if (data.success) {
        // Update localStorage with new user data
        const currentUserData = JSON.parse(localStorage.getItem('userData') || '{}');
        const updatedUserData = { ...currentUserData, ...data.data.user };
        localStorage.setItem('userData', JSON.stringify(updatedUserData));
        
        // Call parent component update function
        if (onDataUpdate) {
          onDataUpdate(updatedUserData);
        }

        setMessage('Profile updated successfully!');
        setMessageType('success');
        setIsEditing(false);
        setAvatarFile(null);
        setAvatarPreview(null);
      } else {
        setMessage(data.message || 'Failed to update profile');
        setMessageType('error');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      setMessage('Network error. Please try again.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage('New passwords do not match');
      setMessageType('error');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setMessage('Password must be at least 6 characters long');
      setMessageType('error');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const token = localStorage.getItem('userToken');
      const response = await fetch(`${API_BASE_URL}/users/change-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });

      const data = await response.json();

      if (data.success) {
        setMessage('Password changed successfully!');
        setMessageType('success');
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setShowPasswordSection(false);
      } else {
        setMessage(data.message || 'Failed to change password');
        setMessageType('error');
      }
    } catch (error) {
      console.error('Password change error:', error);
      setMessage('Network error. Please try again.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    // Reset form data to original userData
    if (userData) {
      setProfileData({
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        email: userData.email || '',
        phone: userData.phone || '',
        bio: userData.bio || '',
        dateOfBirth: userData.dateOfBirth ? userData.dateOfBirth.split('T')[0] : '',
        avatar: userData.avatar || '',
        address: {
          street: userData.address?.street || '',
          city: userData.address?.city || '',
          state: userData.address?.state || '',
          country: userData.address?.country || '',
          zipCode: userData.address?.zipCode || ''
        },
        socialLinks: {
          website: userData.socialLinks?.website || '',
          linkedin: userData.socialLinks?.linkedin || '',
          twitter: userData.socialLinks?.twitter || '',
          github: userData.socialLinks?.github || ''
        }
      });
    }
    setIsEditing(false);
    setAvatarFile(null);
    setAvatarPreview(null);
    setMessage('');
    setMessageType('');
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getRoleColor = () => {
    switch (userRole) {
      case 'instructor':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'student':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'admin':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getInitials = () => {
    if (profileData.firstName && profileData.lastName) {
      return `${profileData.firstName.charAt(0)}${profileData.lastName.charAt(0)}`.toUpperCase();
    }
    return profileData.email?.charAt(0).toUpperCase() || 'U';
  };

  return (
    <div className="profile-container">
      <div className="profile-header">
        <div className="container mx-auto px-4 py-8">
          <div className="profile-header-content">
            <div className="profile-avatar-section">
              <div className="profile-avatar">
                {avatarPreview || profileData.avatar ? (
                  <img 
                    src={avatarPreview || profileData.avatar} 
                    alt="Profile" 
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <span className="avatar-initials">{getInitials()}</span>
                )}
                {isEditing && (
                  <label className="avatar-edit-btn cursor-pointer">
                    <Camera className="w-4 h-4" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
              <div className="profile-basic-info">
                <h1 className="profile-name">
                  {profileData.firstName && profileData.lastName 
                    ? `${profileData.firstName} ${profileData.lastName}`
                    : 'User Name'}
                </h1>
                <div className="profile-role">
                  <span className={`role-badge ${getRoleColor()}`}>
                    <Shield className="w-4 h-4" />
                    {userRole?.charAt(0).toUpperCase() + userRole?.slice(1)}
                  </span>
                </div>
                <p className="profile-email">
                  <Mail className="w-4 h-4" />
                  {profileData.email}
                </p>
                {profileData.phone && (
                  <p className="profile-phone">
                    <Phone className="w-4 h-4" />
                    {profileData.phone}
                  </p>
                )}
              </div>
            </div>
            <div className="profile-stats">
              <div className="stat-item">
                <BookOpen className="w-5 h-5" />
                <span className="stat-number">
                  {userRole === 'student' 
                    ? userData?.enrolledCourses?.length || 0 
                    : userData?.createdCourses?.length || 0}
                </span>
                <span className="stat-label">
                  {userRole === 'student' ? 'Enrolled Courses' : 'Created Courses'}
                </span>
              </div>
              <div className="stat-item">
                <Award className="w-5 h-5" />
                <span className="stat-number">0</span>
                <span className="stat-label">
                  {userRole === 'student' ? 'Certificates' : 'Reviews'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="profile-content">
        <div className="container mx-auto px-4 py-8">
          {message && (
            <div className={`message ${messageType === 'success' ? 'message-success' : 'message-error'}`}>
              {messageType === 'success' ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
              {message}
            </div>
          )}

          <div className="profile-sections">
            {/* Personal Information Section */}
            <div className="profile-section">
              <div className="section-header">
                <h2>Personal Information</h2>
                <button
                  onClick={() => isEditing ? handleCancelEdit() : setIsEditing(true)}
                  className="edit-btn"
                  disabled={loading}
                >
                  {isEditing ? <X className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                  {isEditing ? 'Cancel' : 'Edit'}
                </button>
              </div>

              <div className="section-content">
                <div className="form-grid">
                  <div className="form-group">
                    <label>First Name *</label>
                    <input
                      type="text"
                      name="firstName"
                      value={profileData.firstName}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className="form-input"
                      maxLength={50}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Last Name *</label>
                    <input
                      type="text"
                      name="lastName"
                      value={profileData.lastName}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className="form-input"
                      maxLength={50}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      name="email"
                      value={profileData.email}
                      disabled={true} // Email should not be editable
                      className="form-input disabled"
                    />
                  </div>
                  <div className="form-group">
                    <label>Phone</label>
                    <input
                      type="tel"
                      name="phone"
                      value={profileData.phone}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className="form-input"
                      placeholder="Enter phone number"
                    />
                  </div>
                  <div className="form-group">
                    <label>Date of Birth</label>
                    <input
                      type="date"
                      name="dateOfBirth"
                      value={profileData.dateOfBirth}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Bio</label>
                  <textarea
                    name="bio"
                    value={profileData.bio}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="form-textarea"
                    placeholder="Tell us about yourself..."
                    rows={4}
                    maxLength={500}
                  />
                  {isEditing && (
                    <div className="text-sm text-gray-500 mt-1">
                      {profileData.bio.length}/500 characters
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Address Section */}
            <div className="profile-section">
              <div className="section-header">
                <h2>Address Information</h2>
              </div>
              <div className="section-content">
                <div className="form-grid">
                  <div className="form-group col-span-2">
                    <label>Street Address</label>
                    <input
                      type="text"
                      name="address.street"
                      value={profileData.address.street}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className="form-input"
                      placeholder="Enter street address"
                    />
                  </div>
                  <div className="form-group">
                    <label>City</label>
                    <input
                      type="text"
                      name="address.city"
                      value={profileData.address.city}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className="form-input"
                      placeholder="Enter city"
                    />
                  </div>
                  <div className="form-group">
                    <label>State/Province</label>
                    <input
                      type="text"
                      name="address.state"
                      value={profileData.address.state}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className="form-input"
                      placeholder="Enter state"
                    />
                  </div>
                  <div className="form-group">
                    <label>Country</label>
                    <input
                      type="text"
                      name="address.country"
                      value={profileData.address.country}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className="form-input"
                      placeholder="Enter country"
                    />
                  </div>
                  <div className="form-group">
                    <label>ZIP/Postal Code</label>
                    <input
                      type="text"
                      name="address.zipCode"
                      value={profileData.address.zipCode}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className="form-input"
                      placeholder="Enter ZIP code"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Social Links Section */}
            <div className="profile-section">
              <div className="section-header">
                <h2>Social Links</h2>
              </div>
              <div className="section-content">
                <div className="form-grid">
                  <div className="form-group">
                    <label>
                      <Globe className="w-4 h-4" />
                      Website
                    </label>
                    <input
                      type="url"
                      name="socialLinks.website"
                      value={profileData.socialLinks.website}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className="form-input"
                      placeholder="https://yourwebsite.com"
                    />
                  </div>
                  <div className="form-group">
                    <label>
                      <Linkedin className="w-4 h-4" />
                      LinkedIn
                    </label>
                    <input
                      type="url"
                      name="socialLinks.linkedin"
                      value={profileData.socialLinks.linkedin}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className="form-input"
                      placeholder="https://linkedin.com/in/username"
                    />
                  </div>
                  <div className="form-group">
                    <label>
                      <Twitter className="w-4 h-4" />
                      Twitter
                    </label>
                    <input
                      type="url"
                      name="socialLinks.twitter"
                      value={profileData.socialLinks.twitter}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className="form-input"
                      placeholder="https://twitter.com/username"
                    />
                  </div>
                  <div className="form-group">
                    <label>
                      <Github className="w-4 h-4" />
                      GitHub
                    </label>
                    <input
                      type="url"
                      name="socialLinks.github"
                      value={profileData.socialLinks.github}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className="form-input"
                      placeholder="https://github.com/username"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Security Section */}
            <div className="profile-section">
              <div className="section-header">
                <h2>Security</h2>
                <button
                  onClick={() => setShowPasswordSection(!showPasswordSection)}
                  className="edit-btn"
                  disabled={loading}
                >
                  Change Password
                </button>
              </div>

              {showPasswordSection && (
                <div className="section-content">
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Current Password *</label>
                      <div className="password-input-group">
                        <input
                          type={showCurrentPassword ? 'text' : 'password'}
                          name="currentPassword"
                          value={passwordData.currentPassword}
                          onChange={handlePasswordChange}
                          className="form-input"
                          placeholder="Enter current password"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="password-toggle"
                        >
                          {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="form-group">
                      <label>New Password *</label>
                      <div className="password-input-group">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          name="newPassword"
                          value={passwordData.newPassword}
                          onChange={handlePasswordChange}
                          className="form-input"
                          placeholder="Enter new password (min 6 characters)"
                          minLength={6}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="password-toggle"
                        >
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Confirm New Password *</label>
                      <div className="password-input-group">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          name="confirmPassword"
                          value={passwordData.confirmPassword}
                          onChange={handlePasswordChange}
                          className="form-input"
                          placeholder="Confirm new password"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="password-toggle"
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="password-actions">
                    <button
                      onClick={handleChangePassword}
                      disabled={loading || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                      className="btn-primary"
                    >
                      {loading ? 'Changing Password...' : 'Change Password'}
                    </button>
                    <button
                      onClick={() => {
                        setShowPasswordSection(false);
                        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                      }}
                      className="btn-secondary ml-3"
                      disabled={loading}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Account Information (Read-only) */}
            <div className="profile-section">
              <div className="section-header">
                <h2>Account Information</h2>
              </div>
              <div className="section-content">
                <div className="form-grid">
                  <div className="form-group">
                    <label>Member Since</label>
                    <div className="form-display">
                      <Calendar className="w-4 h-4" />
                      {formatDate(userData?.createdAt)}
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Last Updated</label>
                    <div className="form-display">
                      <Calendar className="w-4 h-4" />
                      {formatDate(userData?.updatedAt)}
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Account Status</label>
                    <div className="form-display">
                      <span className={`status-badge ${userData?.isActive ? 'active' : 'inactive'}`}>
                        {userData?.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Email Verified</label>
                    <div className="form-display">
                      <span className={`status-badge ${userData?.isEmailVerified ? 'verified' : 'unverified'}`}>
                        {userData?.isEmailVerified ? 'Verified' : 'Unverified'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Save Button for Profile Changes */}
            {isEditing && (
              <div className="profile-actions">
                <button
                  onClick={handleSaveProfile}
                  disabled={loading}
                  className="btn-primary"
                >
                  <Save className="w-4 h-4" />
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="btn-secondary ml-3"
                  disabled={loading}
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
import React, { useState, useEffect } from "react";
import { User, useAuth } from "../../Contexts/AuthenticationContext";
import { Edit, Save, User as UserIcon, Mail, Book, Award } from "lucide-react";
import "../../Styles/Profile.css";

const ProfilePage: React.FC = () => {
  const { currentUser, updateUserProfile, refreshUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    bio: "",
    preferredLanguage: "en",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    // Update form data when currentUser changes
    if (currentUser) {
      setFormData({
        name: currentUser.name || "",
        email: currentUser.email || "",
        bio: currentUser.bio || "",
        preferredLanguage: currentUser.preferredLanguage || "en",
      });
    }
  }, [currentUser]);

  if (!currentUser) {
    return <div className="profile-container">Loading user data...</div>;
  }

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      // Only update the display name through the auth method
      await updateUserProfile(formData.name);

      // Update other fields directly in the user profile
      const updates: Partial<User> = {};

      if (formData.name !== currentUser.name) updates.name = formData.name;
      if (formData.bio !== currentUser.bio) updates.bio = formData.bio;
      if (formData.preferredLanguage !== currentUser.preferredLanguage) {
        updates.preferredLanguage = formData.preferredLanguage;
      }

      // Refresh user data after update
      await refreshUser();

      setSuccessMessage("Profile updated successfully!");
      setIsEditing(false);
    } catch (err) {
      setError("Failed to update profile. Please try again.");
      console.error("Error updating profile:", err);
    } finally {
      setLoading(false);
    }
  };

  const getLanguageDisplay = (code: string) => {
    const languages = {
      en: "English",
      tw: "Twi",
      es: "Spanish",
      fr: "French",
    };

    return languages[code as keyof typeof languages] || code;
  };

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h1>Your Profile</h1>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="btn-primary flex items-center"
          >
            <Edit size={16} className="mr-2" />
            Edit Profile
          </button>
        ) : (
          <button onClick={() => setIsEditing(false)} className="btn-secondary">
            Cancel
          </button>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}
      {successMessage && (
        <div className="success-message">{successMessage}</div>
      )}

      <div className="profile-content">
        <div className="profile-avatar">
          <div className="avatar-placeholder">
            {currentUser.photoURL ? (
              <img
                src={currentUser.photoURL}
                alt={currentUser.name}
                className="avatar-image"
              />
            ) : (
              <UserIcon size={64} />
            )}
          </div>
          <h2>{currentUser.name || currentUser.email}</h2>
          <p className="user-role">{currentUser.role}</p>
        </div>

        <div className="profile-details">
          {isEditing ? (
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="name">Full Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Your full name"
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  disabled
                  className="disabled"
                />
                <p className="field-note">Email cannot be changed</p>
              </div>

              <div className="form-group">
                <label htmlFor="bio">Bio</label>
                <textarea
                  id="bio"
                  name="bio"
                  value={formData.bio}
                  onChange={handleInputChange}
                  placeholder="Tell us about yourself"
                  rows={4}
                />
              </div>

              <div className="form-group">
                <label htmlFor="preferredLanguage">Preferred Language</label>
                <select
                  id="preferredLanguage"
                  name="preferredLanguage"
                  value={formData.preferredLanguage}
                  onChange={handleInputChange}
                >
                  <option value="en">English</option>
                  <option value="tw">Twi</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                </select>
              </div>

              <div className="form-actions">
                <button
                  type="submit"
                  className="btn-primary flex items-center"
                  disabled={loading}
                >
                  <Save size={16} className="mr-2" />
                  {loading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          ) : (
            <div className="profile-info">
              <div className="info-item">
                <UserIcon size={20} className="info-icon" />
                <div>
                  <h3>Full Name</h3>
                  <p>{currentUser.name || "Not set"}</p>
                </div>
              </div>

              <div className="info-item">
                <Mail size={20} className="info-icon" />
                <div>
                  <h3>Email</h3>
                  <p>{currentUser.email}</p>
                </div>
              </div>

              <div className="info-item">
                <Book size={20} className="info-icon" />
                <div>
                  <h3>Bio</h3>
                  <p>{currentUser.bio || "No bio available"}</p>
                </div>
              </div>

              <div className="info-item">
                <Award size={20} className="info-icon" />
                <div>
                  <h3>Preferred Language</h3>
                  <p>
                    {getLanguageDisplay(currentUser.preferredLanguage || "en")}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;

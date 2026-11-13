import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { SystemStorage } from '@/services/storage';
import { getProfileApi, updateProfileApi } from '@/services/api';

// Import Baseline Profile Template
import { profileMockData, type UserProfileData } from '../../data/profileMockData';

// Import Subcomponents
import { Breadcrumb } from './components/Breadcrumb';
import { ProfileHeader } from './components/ProfileHeader';
import { ProfileHero } from './components/ProfileHero';
import { PersonalInformation } from './components/PersonalInformation';
import { VerificationActivity } from './components/VerificationActivity';
import { UsageSummary } from './components/UsageSummary';
import { RecentActivity } from './components/RecentActivity';
import { AccountInformation } from './components/AccountInformation';
import { ProfileCompletion } from './components/ProfileCompletion';
import { SecurityCard } from './components/SecurityCard';
import { DangerZone } from './components/DangerZone';
import { PhotoUploadModal } from './components/PhotoUploadModal';
import { SaveToast } from '../ScanDetails/components/SaveToast';

export const Profile: React.FC = () => {
  const { lang } = useLanguage();
  const isBn = lang === 'bn';
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const { user: authUser } = useAuth();

  // State Management with dynamic system telemetry
  const [profileData, setProfileData] = useState<UserProfileData>(() => {
    const user = SystemStorage.getUserProfile();
    const stats = SystemStorage.getSystemStats();
    const scans = SystemStorage.getScans();

    const activeName = authUser?.full_name || user.name || 'Shahriar Abdullah';
    const activeEmail = authUser?.email || user.email || 'shahriarabdullahtoufiq@gmail.com';
    const activeRole = authUser?.role ? authUser.role.replace('ROLE_', '') + ' Investigator' : user.role || 'Senior Verification Analyst';
    const initials = activeName
      .trim()
      .split(/\s+/)
      .map((p) => p[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();

    const mappedActivity: UserProfileData['recentActivity'] = scans.slice(0, 5).map((s) => ({
      id: `act-${s.id}`,
      type: s.type,
      title: s.title,
      time: new Date(s.createdAt).toLocaleDateString(),
      result: (s.result as any) || 'UNVERIFIED',
      scanId: s.id
    }));

    return {
      ...profileMockData,
      user: {
        ...profileMockData.user,
        name: activeName,
        email: activeEmail,
        location: user.location,
        phone: user.phone,
        memberSince: user.joinedDate,
        initials,
        accountType: activeRole,
      },
      stats: {
        totalScans: stats.total,
        savedEvidence: stats.saved,
        thisWeek: scans.length,
      },
      activity: {
        rumor: stats.rumor,
        scam: stats.scam,
        image: stats.image,
      },
      recentActivity: mappedActivity.length > 0 ? mappedActivity : profileMockData.recentActivity,
    };
  });
  const [isHeaderEditing, setIsHeaderEditing] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync profile data with Identity microservice and current session
  useEffect(() => {
    let isMounted = true;
    const stats = SystemStorage.getSystemStats();
    const scans = SystemStorage.getScans();
    const mappedActivity: UserProfileData['recentActivity'] = scans.slice(0, 5).map((s) => ({
      id: `act-${s.id}`,
      type: s.type,
      title: s.title,
      time: new Date(s.createdAt).toLocaleDateString(),
      result: (s.result as any) || 'UNVERIFIED',
      scanId: s.id
    }));

    setProfileData((prev) => ({
      ...prev,
      stats: {
        totalScans: stats.total,
        savedEvidence: stats.saved,
        thisWeek: scans.length,
      },
      activity: {
        rumor: stats.rumor,
        scam: stats.scam,
        image: stats.image,
      },
      recentActivity: mappedActivity,
      ...(authUser ? {
        user: {
          ...prev.user,
          name: authUser.full_name || prev.user.name,
          email: authUser.email || prev.user.email,
          accountType: authUser.role ? authUser.role.replace('ROLE_', '') + ' Investigator' : prev.user.accountType,
          initials: (authUser.full_name || prev.user.name)
            .trim()
            .split(/\s+/)
            .map((p) => p[0])
            .join('')
            .substring(0, 2)
            .toUpperCase(),
        }
      } : {})
    }));

    getProfileApi().then((remote) => {
      if (!isMounted || !remote) return;
      setProfileData((prev) => ({
        ...prev,
        user: {
          ...prev.user,
          name: remote.full_name || prev.user.name,
          email: remote.email || prev.user.email,
          phone: remote.phone || prev.user.phone,
          location: remote.location || prev.user.location,
          bio: remote.bio || prev.user.bio,
          avatarUrl: remote.avatar_url || prev.user.avatarUrl,
          accountType: remote.role ? remote.role.replace('ROLE_', '') + ' Investigator' : prev.user.accountType,
        }
      }));
    });

    return () => { isMounted = false; };
  }, [authUser]);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleUpdateUser = async (updatedFields: Partial<UserProfileData['user']>) => {
    SystemStorage.updateUserProfile({
      name: updatedFields.name,
      email: updatedFields.email,
      phone: updatedFields.phone,
      location: updatedFields.location,
    });

    setProfileData((prev) => ({
      ...prev,
      user: {
        ...prev.user,
        ...updatedFields
      }
    }));

    try {
      await updateProfileApi({
        full_name: updatedFields.name,
        phone: updatedFields.phone,
        location: updatedFields.location,
        bio: updatedFields.bio,
      });
    } catch (e) {
      console.warn('[Profile] Remote sync failed, saved locally:', e);
    }

    triggerToast(isBn ? 'প্রোফাইল তথ্য সফলভাবে সংরক্ষিত হয়েছে' : 'Profile updated successfully');
  };

  const handleAvatarSuccess = (msg: string, avatarUrl?: string) => {
    if (avatarUrl) {
      setProfileData((prev) => ({
        ...prev,
        user: {
          ...prev.user,
          avatarUrl,
        }
      }));
    }
    triggerToast(msg);
  };

  const handleConfirmDeleteAccount = () => {
    triggerToast(isBn ? 'অ্যাকাউন্ট ডিলিটের অনুরোধ গ্রহণ করা হয়েছে' : 'Account deletion request submitted');
  };

  return (
    <div className={`min-h-screen relative pb-28 ${isLight ? 'bg-[#F7F9FC]' : 'bg-slate-950 text-white'}`}>
      {/* Background Quiet Glows (Section 29) */}
      <div className="absolute top-0 right-10 w-[450px] h-[450px] bg-blue-500/5 dark:bg-blue-600/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[400px] h-[400px] bg-indigo-500/5 dark:bg-indigo-600/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-[1240px] mx-auto px-4 md:px-6 py-4 md:py-6 space-y-8 relative z-10">

        {/* 1. Breadcrumb (0ms) */}
        <Breadcrumb isBn={isBn} />

        {/* 2. Page Header (100ms) */}
        <ProfileHeader
          isEditing={isHeaderEditing}
          onToggleEdit={() => setIsHeaderEditing(!isHeaderEditing)}
          isBn={isBn}
        />

        {/* 3. Profile Hero Card (200ms) */}
        <ProfileHero
          user={profileData.user}
          stats={profileData.stats}
          onOpenUploadPhoto={() => setShowPhotoModal(true)}
          isBn={isBn}
        />

        {/* Optional Profile Completion Subtle Progress (Section 24) */}
        <ProfileCompletion
          completenessPct={profileData.user.completenessPct}
          onOpenUpload={() => setShowPhotoModal(true)}
          isBn={isBn}
        />

        {/* Desktop 2-Column Section Layout (Section 30) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Personal Information Card (350ms) */}
            <PersonalInformation
              user={profileData.user}
              onUpdateUser={handleUpdateUser}
              onTriggerToast={triggerToast}
              isBn={isBn}
            />

            {/* Recent Activity Card (650ms) */}
            <RecentActivity
              items={profileData.recentActivity}
              isBn={isBn}
            />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Verification Activity Card & Chart (500ms) */}
            <VerificationActivity
              activity={profileData.activity}
              weeklyActivity={profileData.weeklyActivity}
              isBn={isBn}
            />

            {/* Usage Summary Card (650ms) */}
            <UsageSummary
              usage={profileData.usage}
              savedCount={profileData.stats.savedEvidence}
              isBn={isBn}
            />

            {/* Account Information Card */}
            <AccountInformation
              user={profileData.user}
              onTriggerToast={triggerToast}
              isBn={isBn}
            />
          </div>
        </div>

        {/* 4. Account Security Card (800ms) */}
        <SecurityCard
          security={profileData.security}
          isBn={isBn}
        />

        {/* 5. Danger Zone (950ms) */}
        <DangerZone
          onConfirmDeleteAccount={handleConfirmDeleteAccount}
          isBn={isBn}
        />

        {/* Modals & Toasts */}
        <PhotoUploadModal
          isOpen={showPhotoModal}
          onClose={() => setShowPhotoModal(false)}
          onUploadSuccess={handleAvatarSuccess}
          isBn={isBn}
        />

        <SaveToast message={toastMessage} />
      </div>
    </div>
  );
};

export default Profile;

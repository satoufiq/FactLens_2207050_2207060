import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Edit2, Save } from 'lucide-react';
import type { UserProfileData } from '../../../data/profileMockData';

interface PersonalInformationProps {
  user: UserProfileData['user'];
  onUpdateUser: (updatedUser: Partial<UserProfileData['user']>) => void;
  onTriggerToast: (msg: string) => void;
  isBn?: boolean;
}

export const PersonalInformation: React.FC<PersonalInformationProps> = ({
  user,
  onUpdateUser,
  onTriggerToast,
  isBn
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email,
    phone: user.phone,
    language: user.language,
    location: user.location,
    timeZone: user.timeZone
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    setTimeout(() => {
      onUpdateUser(formData);
      setIsSaving(false);
      setIsEditing(false);
      onTriggerToast(isBn ? 'প্রোফাইল তথ্য সফলভাবে আপডেট করা হয়েছে' : 'Profile updated successfully.');
    }, 600);
  };

  const handleCancel = () => {
    setFormData({
      name: user.name,
      email: user.email,
      phone: user.phone,
      language: user.language,
      location: user.location,
      timeZone: user.timeZone
    });
    setIsEditing(false);
  };

  const fields = [
    { key: 'name', label: isBn ? 'পূর্ণ নাম' : 'FULL NAME', value: user.name },
    { key: 'email', label: isBn ? 'ইমেইল ঠিকানা' : 'EMAIL ADDRESS', value: user.email },
    { key: 'phone', label: isBn ? 'ফোন নম্বর' : 'PHONE NUMBER', value: user.phone },
    { key: 'language', label: isBn ? 'পছন্দের ভাষা' : 'PREFERRED LANGUAGE', value: user.language },
    { key: 'location', label: isBn ? 'অবস্থান / দেশ' : 'LOCATION', value: user.location },
    { key: 'timeZone', label: isBn ? 'টাইম জোন' : 'TIME ZONE', value: user.timeZone }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.25 }}
      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 md:p-8 shadow-sm space-y-6"
    >
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {isBn ? 'ব্যক্তিগত তথ্য' : 'PERSONAL INFORMATION'}
          </h3>
        </div>

        <button
          onClick={() => setIsEditing(!isEditing)}
          className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 inline-flex items-center gap-1 transition-colors"
        >
          <Edit2 className="w-3.5 h-3.5" />
          <span>{isEditing ? (isBn ? 'বাতিল' : 'Cancel') : (isBn ? 'সম্পাদনা' : 'Edit')}</span>
        </button>
      </div>

      {!isEditing ? (
        // View Mode: 2-Column Desktop Grid
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {fields.map((field) => (
            <div key={field.key} className="space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                {field.label}
              </span>
              <span className="text-base font-semibold text-slate-900 dark:text-white block">
                {field.value}
              </span>
            </div>
          ))}
        </div>
      ) : (
        // Edit Mode Form (Section 13 & 14)
        <form onSubmit={handleSave} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                {isBn ? 'পূর্ণ নাম' : 'FULL NAME'}
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full h-12 px-3.5 rounded-[10px] bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                {isBn ? 'ইমেইল ঠিকানা' : 'EMAIL ADDRESS'}
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full h-12 px-3.5 rounded-[10px] bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                {isBn ? 'ফোন নম্বর' : 'PHONE NUMBER'}
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full h-12 px-3.5 rounded-[10px] bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                {isBn ? 'পছন্দের ভাষা' : 'PREFERRED LANGUAGE'}
              </label>
              <input
                type="text"
                value={formData.language}
                onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                className="w-full h-12 px-3.5 rounded-[10px] bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                {isBn ? 'অবস্থান' : 'LOCATION'}
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full h-12 px-3.5 rounded-[10px] bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                {isBn ? 'টাইম জোন' : 'TIME ZONE'}
              </label>
              <input
                type="text"
                value={formData.timeZone}
                onChange={(e) => setFormData({ ...formData, timeZone: e.target.value })}
                className="w-full h-12 px-3.5 rounded-[10px] bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition-colors"
            >
              {isBn ? 'বাতিল' : 'Cancel'}
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs md:text-sm shadow-md shadow-blue-600/20 transition-all active:scale-95 disabled:opacity-50"
            >
              {isSaving ? (
                <span>{isBn ? 'সংরক্ষণ হচ্ছে...' : 'Saving...'}</span>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{isBn ? 'পরিবর্তন সংরক্ষণ করুন' : 'Save Changes'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </motion.div>
  );
};

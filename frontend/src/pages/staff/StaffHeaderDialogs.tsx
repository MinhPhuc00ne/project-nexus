import type { ChangeEvent, Dispatch, FormEvent, RefObject, SetStateAction } from 'react';
import type { JSX } from 'react';
import type { TFunction } from 'i18next';
import { createPortal } from 'react-dom';
import LogoutConfirmDialog from '../../components/auth/LogoutConfirmDialog';
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  KeyRound,
  Link2,
  Loader2,
  Lock,
  Phone,
  Upload,
  User,
  X,
} from 'lucide-react';

type StaffHeaderDialogsProps = {
  t: TFunction<'staff'>;
  initials: string;
  accountName: string;
  onConfirmLogout: () => void;
  isProfileEditorOpen: boolean;
  setIsProfileEditorOpen: Dispatch<SetStateAction<boolean>>;
  profileSaving: boolean;
  isUploadingAvatar: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  avatarPreview: string;
  setAvatarPreview: Dispatch<SetStateAction<string>>;
  handleFileSelect: (event: ChangeEvent<HTMLInputElement>) => void;
  avatarFile: File | null;
  showManualUrl: boolean;
  setShowManualUrl: Dispatch<SetStateAction<boolean>>;
  profileAvatar: string;
  setProfileAvatar: Dispatch<SetStateAction<string>>;
  profileName: string;
  setProfileName: Dispatch<SetStateAction<string>>;
  profilePhone: string;
  setProfilePhone: Dispatch<SetStateAction<string>>;
  profileFormError: string;
  saveProfile: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  isPasswordEditorOpen: boolean;
  setIsPasswordEditorOpen: Dispatch<SetStateAction<boolean>>;
  passwordSaving: boolean;
  currentPassword: string;
  setCurrentPassword: Dispatch<SetStateAction<string>>;
  newPassword: string;
  setNewPassword: Dispatch<SetStateAction<string>>;
  passwordFormError: string;
  savePassword: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  isLogoutConfirmOpen: boolean;
  setIsLogoutConfirmOpen: Dispatch<SetStateAction<boolean>>;
};

export default function StaffHeaderDialogs({
  t,
  initials,
  accountName,
  onConfirmLogout,
  isProfileEditorOpen,
  setIsProfileEditorOpen,
  profileSaving,
  isUploadingAvatar,
  fileInputRef,
  avatarPreview,
  setAvatarPreview,
  handleFileSelect,
  avatarFile,
  showManualUrl,
  setShowManualUrl,
  profileAvatar,
  setProfileAvatar,
  profileName,
  setProfileName,
  profilePhone,
  setProfilePhone,
  profileFormError,
  saveProfile,
  isPasswordEditorOpen,
  setIsPasswordEditorOpen,
  passwordSaving,
  currentPassword,
  setCurrentPassword,
  newPassword,
  setNewPassword,
  passwordFormError,
  savePassword,
  isLogoutConfirmOpen,
  setIsLogoutConfirmOpen,
}: StaffHeaderDialogsProps): JSX.Element {
  return (
    <>
      {' '}
      {isProfileEditorOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
            onClick={(e) => {
              if (e.target === e.currentTarget && !profileSaving && !isUploadingAvatar) {
                setIsProfileEditorOpen(false);
              }
            }}
          >
            <div className="w-full max-w-md max-h-[92vh] flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-100">
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 shrink-0">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    {t('header.profileModalTitle')}
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {t('header.profileModalSubtitle')}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={t('header.closeAria')}
                  disabled={profileSaving || isUploadingAvatar}
                  onClick={() => setIsProfileEditorOpen(false)}
                  className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer disabled:opacity-50"
                >
                  <X size={18} />
                </button>
              </div>

              <form
                onSubmit={saveProfile}
                className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1"
              >
                {/* Avatar Selector Card */}
                <div className="flex flex-col items-center gap-3 rounded-xl bg-slate-50/70 p-4 border border-slate-100">
                  <div className="relative group">
                    <div className="h-20 w-20 overflow-hidden rounded-full border-2 border-white shadow-md ring-2 ring-blue-500/20 bg-slate-200">
                      {avatarPreview ? (
                        <img
                          src={avatarPreview}
                          alt={t('header.avatarPreviewAlt')}
                          className="h-full w-full object-cover"
                          onError={() => setAvatarPreview('')}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-tr from-blue-600 to-indigo-600 text-xl font-bold text-white">
                          {initials || <User size={30} />}
                        </div>
                      )}
                    </div>

                    {/* Hover Camera Overlay */}
                    <button
                      type="button"
                      disabled={profileSaving || isUploadingAvatar}
                      onClick={() => fileInputRef.current?.click()}
                      title={t('header.choosePhotoTitle')}
                      className="absolute inset-0 flex flex-col items-center justify-center rounded-full bg-slate-950/50 text-white opacity-0 transition-opacity group-hover:opacity-100 cursor-pointer disabled:cursor-not-allowed"
                    >
                      <Camera size={20} />
                      <span className="mt-0.5 text-[10px] font-medium">
                        {t('header.changePhoto')}
                      </span>
                    </button>
                  </div>

                  {/* Hidden File Input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={handleFileSelect}
                  />

                  <div className="flex flex-col items-center gap-1.5 text-center">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={profileSaving || isUploadingAvatar}
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 cursor-pointer disabled:opacity-50"
                      >
                        <Upload size={13} />
                        <span>
                          {avatarFile ? t('header.chooseOtherPhoto') : t('header.uploadFromDevice')}
                        </span>
                      </button>

                      <button
                        type="button"
                        disabled={profileSaving || isUploadingAvatar}
                        onClick={() => setShowManualUrl(!showManualUrl)}
                        className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                      >
                        <Link2 size={13} className="inline mr-1" />
                        {showManualUrl ? t('header.hideUrl') : t('header.pasteUrl')}
                      </button>
                    </div>

                    <p className="text-[11px] text-slate-400">
                      {avatarFile
                        ? t('header.selectedFile', { name: avatarFile.name })
                        : t('header.photoHint')}
                    </p>
                  </div>

                  {/* Optional manual URL input if toggled */}
                  {showManualUrl && (
                    <div className="w-full mt-2 pt-2 border-t border-slate-200/60 animate-in fade-in duration-150">
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        {t('header.avatarUrlLabel')}
                      </label>
                      <input
                        type="url"
                        value={profileAvatar}
                        onChange={(e) => {
                          setProfileAvatar(e.target.value);
                          if (!avatarFile) setAvatarPreview(e.target.value);
                        }}
                        placeholder="https://images.unsplash.com/..."
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  )}
                </div>

                {/* Form Input: Họ tên */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    {t('header.fullNameLabel')} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    />
                    <input
                      required
                      minLength={2}
                      maxLength={100}
                      value={profileName}
                      onChange={(event) => setProfileName(event.target.value)}
                      placeholder={t('header.fullNamePlaceholder')}
                      className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 transition placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>

                {/* Form Input: Số điện thoại */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    {t('header.phoneLabel')}
                  </label>
                  <div className="relative">
                    <Phone
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    />
                    <input
                      value={profilePhone}
                      onChange={(event) => setProfilePhone(event.target.value)}
                      placeholder="0901234567"
                      className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 transition placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>

                {/* Error Message */}
                {profileFormError && (
                  <div
                    role="alert"
                    className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700 border border-red-100 animate-in fade-in"
                  >
                    <AlertCircle size={15} className="shrink-0 text-red-500" />
                    <span>{profileFormError}</span>
                  </div>
                )}

                {/* Modal Actions */}
                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    disabled={profileSaving || isUploadingAvatar}
                    onClick={() => setIsProfileEditorOpen(false)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 cursor-pointer disabled:opacity-50"
                  >
                    {t('header.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={profileSaving || isUploadingAvatar}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 cursor-pointer disabled:opacity-50"
                  >
                    {isUploadingAvatar ? (
                      <>
                        <Loader2 size={13} className="animate-spin" />
                        <span>{t('header.uploadingPhoto')}</span>
                      </>
                    ) : profileSaving ? (
                      <>
                        <Loader2 size={13} className="animate-spin" />
                        <span>{t('header.saving')}</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={13} />
                        <span>{t('header.saveProfile')}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}
      {/* Modal Đổi Mật Khẩu Staff */}
      {isPasswordEditorOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
            onClick={(e) => {
              if (e.target === e.currentTarget && !passwordSaving) {
                setIsPasswordEditorOpen(false);
              }
            }}
          >
            <div className="w-full max-w-md max-h-[92vh] flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-100">
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 shrink-0">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    {t('header.passwordModalTitle')}
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {t('header.passwordModalSubtitle')}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={t('header.closeAria')}
                  disabled={passwordSaving}
                  onClick={() => setIsPasswordEditorOpen(false)}
                  className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer disabled:opacity-50"
                >
                  <X size={18} />
                </button>
              </div>

              <form
                onSubmit={savePassword}
                className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1"
              >
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    {t('header.currentPasswordLabel')} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <KeyRound
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    />
                    <input
                      required
                      type="password"
                      autoComplete="current-password"
                      value={currentPassword}
                      onChange={(event) => setCurrentPassword(event.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 transition placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    {t('header.newPasswordLabel')} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    />
                    <input
                      required
                      minLength={6}
                      type="password"
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      placeholder={t('header.newPasswordPlaceholder')}
                      className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 transition placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>

                {passwordFormError && (
                  <div
                    role="alert"
                    className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700 border border-red-100 animate-in fade-in"
                  >
                    <AlertCircle size={15} className="shrink-0 text-red-500" />
                    <span>{passwordFormError}</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    disabled={passwordSaving}
                    onClick={() => setIsPasswordEditorOpen(false)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 cursor-pointer disabled:opacity-50"
                  >
                    {t('header.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={passwordSaving}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 cursor-pointer disabled:opacity-50"
                  >
                    {passwordSaving ? (
                      <>
                        <Loader2 size={13} className="animate-spin" />
                        <span>{t('header.saving')}</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={13} />
                        <span>{t('header.changePasswordSubmit')}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}
      <LogoutConfirmDialog
        open={isLogoutConfirmOpen}
        accountName={accountName}
        onCancel={() => setIsLogoutConfirmOpen(false)}
        onConfirm={onConfirmLogout}
      />
    </>
  );
}

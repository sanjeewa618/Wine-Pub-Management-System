import React, { useEffect, useState } from "react";
import { KeyRound, Save, UserCircle2 } from "lucide-react";
import { useApp } from "../context/AppContext";

export const CustomerSettingsPage = () => {
  const { state, updateProfile, changePassword } = useApp();

  const [profileForm, setProfileForm] = useState({
    name: "",
    email: "",
    phone: "",
    avatar: "",
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    setProfileForm({
      name: state.user?.name ?? "",
      email: state.user?.email ?? "",
      phone: state.user?.phone ?? "",
      avatar: state.user?.avatar ?? "",
    });
  }, [state.user]);

  const handleProfileSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setProfileMessage("");
    setProfileError("");
    setSavingProfile(true);

    try {
      await updateProfile({
        name: profileForm.name,
        email: profileForm.email,
        phone: profileForm.phone,
        avatar: profileForm.avatar,
      });
      setProfileMessage("Profile updated successfully.");
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Unable to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPasswordMessage("");
    setPasswordError("");

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("New password and confirm password do not match");
      return;
    }

    setSavingPassword(true);
    try {
      await changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordMessage("Password changed successfully.");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : "Unable to change password");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#333] bg-[#111] p-6">
        <h1 className="text-3xl font-serif text-white">Settings</h1>
        <p className="mt-2 text-sm text-gray-400">Edit your profile details, update avatar, and change password securely.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-[#333] bg-[#111] p-6">
          <h2 className="inline-flex items-center gap-2 text-xl font-semibold text-white">
            <UserCircle2 size={20} className="text-[#D4AF37]" /> Profile Settings
          </h2>

          <form className="mt-5 space-y-4" onSubmit={handleProfileSubmit}>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">Full Name</label>
              <input
                value={profileForm.name}
                onChange={(event) => setProfileForm((prev) => ({ ...prev, name: event.target.value }))}
                className="w-full rounded-lg border border-[#333] bg-[#171717] px-3 py-2.5 text-sm text-white focus:border-[#D4AF37] focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">Email</label>
              <input
                type="email"
                value={profileForm.email}
                onChange={(event) => setProfileForm((prev) => ({ ...prev, email: event.target.value }))}
                className="w-full rounded-lg border border-[#333] bg-[#171717] px-3 py-2.5 text-sm text-white focus:border-[#D4AF37] focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">Phone</label>
              <input
                value={profileForm.phone}
                onChange={(event) => setProfileForm((prev) => ({ ...prev, phone: event.target.value }))}
                className="w-full rounded-lg border border-[#333] bg-[#171717] px-3 py-2.5 text-sm text-white focus:border-[#D4AF37] focus:outline-none"
                placeholder="+9477xxxxxxx"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">Profile Image URL</label>
              <input
                value={profileForm.avatar}
                onChange={(event) => setProfileForm((prev) => ({ ...prev, avatar: event.target.value }))}
                className="w-full rounded-lg border border-[#333] bg-[#171717] px-3 py-2.5 text-sm text-white focus:border-[#D4AF37] focus:outline-none"
                placeholder="https://..."
              />
              <div className="mt-3 flex items-center gap-3 rounded-lg border border-[#2f2f2f] bg-[#171717] p-3">
                <img
                  src={
                    profileForm.avatar ||
                    "https://images.unsplash.com/photo-1554151228-14d9def656e4?auto=format&fit=crop&q=80&w=300"
                  }
                  alt="Profile preview"
                  className="h-14 w-14 rounded-full object-cover"
                />
                <p className="text-xs text-gray-400">Preview image shown in dashboard avatar if URL is valid.</p>
              </div>
            </div>

            {profileMessage && <p className="rounded-lg border border-emerald-500/40 bg-emerald-700/10 p-3 text-sm text-emerald-200">{profileMessage}</p>}
            {profileError && <p className="rounded-lg border border-red-500/40 bg-red-700/10 p-3 text-sm text-red-200">{profileError}</p>}

            <button
              type="submit"
              disabled={savingProfile}
              className="inline-flex items-center gap-2 rounded-lg bg-[#D4AF37] px-4 py-2.5 text-sm font-bold text-black transition-colors hover:bg-[#b6952f] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save size={16} /> {savingProfile ? "Saving..." : "Save Profile"}
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-[#333] bg-[#111] p-6">
          <h2 className="inline-flex items-center gap-2 text-xl font-semibold text-white">
            <KeyRound size={20} className="text-[#D4AF37]" /> Change Password
          </h2>
          <p className="mt-2 text-xs text-gray-400">Password must be 8-16 chars with uppercase, number, and special character.</p>

          <form className="mt-5 space-y-4" onSubmit={handlePasswordSubmit}>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">Current Password</label>
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(event) => setPasswordForm((prev) => ({ ...prev, currentPassword: event.target.value }))}
                className="w-full rounded-lg border border-[#333] bg-[#171717] px-3 py-2.5 text-sm text-white focus:border-[#D4AF37] focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">New Password</label>
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={(event) => setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))}
                className="w-full rounded-lg border border-[#333] bg-[#171717] px-3 py-2.5 text-sm text-white focus:border-[#D4AF37] focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">Confirm New Password</label>
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(event) => setPasswordForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
                className="w-full rounded-lg border border-[#333] bg-[#171717] px-3 py-2.5 text-sm text-white focus:border-[#D4AF37] focus:outline-none"
                required
              />
            </div>

            {passwordMessage && <p className="rounded-lg border border-emerald-500/40 bg-emerald-700/10 p-3 text-sm text-emerald-200">{passwordMessage}</p>}
            {passwordError && <p className="rounded-lg border border-red-500/40 bg-red-700/10 p-3 text-sm text-red-200">{passwordError}</p>}

            <button
              type="submit"
              disabled={savingPassword}
              className="inline-flex items-center gap-2 rounded-lg border border-[#D4AF37] bg-[#171717] px-4 py-2.5 text-sm font-bold text-[#D4AF37] transition-colors hover:bg-[#252018] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <KeyRound size={16} /> {savingPassword ? "Updating..." : "Change Password"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
};

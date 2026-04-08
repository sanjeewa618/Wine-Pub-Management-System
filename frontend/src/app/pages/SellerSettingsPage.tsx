import React, { useEffect, useRef, useState } from "react";
import { Building2, ImageUp, KeyRound, Save, Trash2 } from "lucide-react";
import { useApp } from "../context/AppContext";

export const SellerSettingsPage = () => {
  const { state, updateProfile, changePassword } = useApp();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
      name: state.user?.name || "",
      email: state.user?.email || "",
      phone: state.user?.phone || "",
      avatar: state.user?.avatar || "",
    });
  }, [state.user]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setProfileError("Image must be less than 5MB");
      return;
    }

    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!validTypes.includes(file.type)) {
      setProfileError("Only JPG, PNG, WebP and GIF images are supported");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setProfileForm((prev) => ({
        ...prev,
        avatar: String(reader.result || ""),
      }));
      setProfileError("");
    };
    reader.readAsDataURL(file);
  };

  const handleProfileSave = async (event: React.FormEvent) => {
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
      setProfileMessage("Seller profile updated successfully.");
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Unable to update seller profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSave = async (event: React.FormEvent) => {
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
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="rounded-2xl border border-[#333] bg-[#111] p-6">
        <h1 className="text-3xl font-serif font-bold text-white">Seller Settings</h1>
        <p className="mt-2 text-sm text-gray-400">Update your seller business details, profile image, and account security settings.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-[#333] bg-[#111] p-6">
          <h2 className="inline-flex items-center gap-2 text-xl font-semibold text-white">
            <Building2 size={20} className="text-[#E3C06A]" /> Seller Profile
          </h2>

          <form className="mt-5 space-y-4" onSubmit={handleProfileSave}>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">Profile Image</label>
              <div className="flex items-center gap-4">
                <img
                  src={
                    profileForm.avatar ||
                    "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&q=80&w=300"
                  }
                  alt="Seller avatar"
                  className="h-20 w-20 rounded-full border border-[#444] object-cover"
                />
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 rounded-lg border border-[#E3C06A] bg-[#1a1a1a] px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[#E3C06A] transition-colors hover:bg-[#302515]"
                  >
                    <ImageUp size={14} /> Upload Image
                  </button>
                  {profileForm.avatar && (
                    <button
                      type="button"
                      onClick={() => setProfileForm((prev) => ({ ...prev, avatar: "" }))}
                      className="inline-flex items-center gap-2 rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-red-300 transition-colors hover:bg-red-500/20"
                    >
                      <Trash2 size={14} /> Remove
                    </button>
                  )}
                </div>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">Seller Name</label>
              <input
                value={profileForm.name}
                onChange={(event) => setProfileForm((prev) => ({ ...prev, name: event.target.value }))}
                className="w-full rounded-lg border border-[#333] bg-[#171717] px-3 py-2.5 text-sm text-white focus:border-[#E3C06A] focus:outline-none"
                placeholder="Business / Supplier Name"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">Email</label>
              <input
                type="email"
                value={profileForm.email}
                onChange={(event) => setProfileForm((prev) => ({ ...prev, email: event.target.value }))}
                className="w-full rounded-lg border border-[#333] bg-[#171717] px-3 py-2.5 text-sm text-white focus:border-[#E3C06A] focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">Phone</label>
              <input
                value={profileForm.phone}
                onChange={(event) => setProfileForm((prev) => ({ ...prev, phone: event.target.value }))}
                className="w-full rounded-lg border border-[#333] bg-[#171717] px-3 py-2.5 text-sm text-white focus:border-[#E3C06A] focus:outline-none"
                placeholder="+9477xxxxxxx"
              />
            </div>

            {profileMessage && <p className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-300">{profileMessage}</p>}
            {profileError && <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">{profileError}</p>}

            <button
              type="submit"
              disabled={savingProfile}
              className="inline-flex items-center gap-2 rounded-lg bg-[#E3C06A] px-4 py-2.5 text-sm font-bold text-black transition-colors hover:bg-[#CDA74C] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save size={16} /> {savingProfile ? "Saving..." : "Save Seller Profile"}
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-[#333] bg-[#111] p-6">
          <h2 className="inline-flex items-center gap-2 text-xl font-semibold text-white">
            <KeyRound size={20} className="text-[#E3C06A]" /> Security Settings
          </h2>
          <p className="mt-2 text-xs text-gray-400">Use a strong password with uppercase, number, and a special character.</p>

          <form className="mt-5 space-y-4" onSubmit={handlePasswordSave}>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">Current Password</label>
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(event) => setPasswordForm((prev) => ({ ...prev, currentPassword: event.target.value }))}
                className="w-full rounded-lg border border-[#333] bg-[#171717] px-3 py-2.5 text-sm text-white focus:border-[#E3C06A] focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">New Password</label>
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={(event) => setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))}
                className="w-full rounded-lg border border-[#333] bg-[#171717] px-3 py-2.5 text-sm text-white focus:border-[#E3C06A] focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">Confirm New Password</label>
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(event) => setPasswordForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
                className="w-full rounded-lg border border-[#333] bg-[#171717] px-3 py-2.5 text-sm text-white focus:border-[#E3C06A] focus:outline-none"
                required
              />
            </div>

            {passwordMessage && <p className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-300">{passwordMessage}</p>}
            {passwordError && <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">{passwordError}</p>}

            <button
              type="submit"
              disabled={savingPassword}
              className="inline-flex items-center gap-2 rounded-lg border border-[#E3C06A] bg-[#1a1a1a] px-4 py-2.5 text-sm font-bold text-[#E3C06A] transition-colors hover:bg-[#302515] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <KeyRound size={16} /> {savingPassword ? "Updating..." : "Change Password"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
};

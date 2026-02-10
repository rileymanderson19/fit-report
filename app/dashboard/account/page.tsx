"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/libs/supabase/client";
import { toast } from "sonner";

export default function AccountPage() {
  const supabase = createClient();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Broadcast name changes to other components for real-time preview
  const broadcastNameChange = useCallback((first: string, last: string) => {
    const fullName = `${first.trim()} ${last.trim()}`.trim();
    window.dispatchEvent(new CustomEvent("profile-updated", { detail: { fullName } }));
  }, []);

  const handleFirstNameChange = (value: string) => {
    setFirstName(value);
    broadcastNameChange(value, lastName);
  };

  const handleLastNameChange = (value: string) => {
    setLastName(value);
    broadcastNameChange(firstName, value);
  };

  useEffect(() => {
    const loadProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      setEmail(user.email || "");

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      if (profile?.full_name) {
        const nameParts = profile.full_name.split(" ");
        setFirstName(nameParts[0] || "");
        setLastName(nameParts.slice(1).join(" ") || "");
      }

      setIsLoading(false);
    };

    loadProfile();
  }, [supabase]);

  const handleSave = async () => {
    if (!firstName.trim()) {
      toast.error("Please enter your first name");
      return;
    }

    setIsSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error("You must be logged in");
        return;
      }

      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

      // Use upsert in case profile doesn't exist yet
      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          full_name: fullName,
        });

      if (error) throw error;

      // Notify other components (like ButtonAccount) to refresh
      window.dispatchEvent(new CustomEvent("profile-updated"));

      toast.success("Profile updated!");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-gray-900">Account</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your profile and account settings</p>
      </div>

      <div className="card p-6 max-w-xl">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Profile Information</h2>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              className="input-field opacity-60 cursor-not-allowed"
              disabled
            />
            <p className="text-xs text-gray-400 mt-1.5">
              Email cannot be changed
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              First Name
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => handleFirstNameChange(e.target.value)}
              placeholder="John"
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Last Name
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => handleLastNameChange(e.target.value)}
              placeholder="Doe"
              className="input-field"
            />
          </div>

          <div className="pt-2">
            <button
              onClick={handleSave}
              className="btn-primary px-6 py-2.5 rounded-lg"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

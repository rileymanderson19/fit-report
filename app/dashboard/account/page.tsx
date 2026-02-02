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
      <div className="p-8">
        <div className="flex justify-center">
          <span className="loading loading-spinner loading-lg text-primary"></span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-display font-bold gradient-text">Account</h1>
      </div>

      <div className="card-elevated p-6 rounded-lg max-w-xl">
        <h2 className="text-xl font-semibold text-white mb-6">Profile Information</h2>

        <div className="space-y-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text">Email</span>
            </label>
            <input
              type="email"
              value={email}
              className="input input-bordered w-full bg-base-200"
              disabled
            />
            <label className="label">
              <span className="label-text-alt text-gray-500">
                Email cannot be changed
              </span>
            </label>
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">First Name</span>
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => handleFirstNameChange(e.target.value)}
              placeholder="John"
              className="input input-bordered w-full"
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Last Name</span>
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => handleLastNameChange(e.target.value)}
              placeholder="Doe"
              className="input input-bordered w-full"
            />
          </div>

          <div className="pt-4">
            <button
              onClick={handleSave}
              className="btn btn-primary"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
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

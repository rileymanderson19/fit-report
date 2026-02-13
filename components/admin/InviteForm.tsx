"use client";

import React, { useState } from "react";
import { toast } from "sonner";

interface InviteFormProps {
  onSuccess: (_inviteUrl: string) => void;
}

export function InviteForm({ onSuccess }: InviteFormProps) {
  const [email, setEmail] = useState("");
  const [coachName, setCoachName] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast.error("Email is required");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/admin/invites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          metadata: {
            coachName: coachName || undefined,
            notes: notes || undefined,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create invite");
      }

      toast.success(`Invite sent to ${email}`);
      onSuccess(data.inviteUrl);

      // Reset form
      setEmail("");
      setCoachName("");
      setNotes("");
    } catch (error) {
      console.error("Error creating invite:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create invite"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium text-gray-700 mb-1.5 block">
          Email Address *
        </label>
        <input
          type="email"
          placeholder="coach@example.com"
          className="input-field"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={isSubmitting}
        />
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700 mb-1.5 block">
          Coach Name
        </label>
        <input
          type="text"
          placeholder="John Smith"
          className="input-field"
          value={coachName}
          onChange={(e) => setCoachName(e.target.value)}
          disabled={isSubmitting}
        />
        <p className="text-xs text-gray-400 mt-1.5">
          Optional - helps identify the invite
        </p>
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700 mb-1.5 block">
          Notes
        </label>
        <textarea
          placeholder="Any additional notes..."
          className="input-field"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={isSubmitting}
        />
      </div>

      <button
        type="submit"
        className="btn-primary w-full px-6 py-2.5 rounded-lg font-medium inline-flex items-center justify-center gap-2"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Creating Invite...
          </>
        ) : (
          "Send Invite"
        )}
      </button>
    </form>
  );
}

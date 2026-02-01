"use client";

import React, { useState } from "react";
import { toast } from "sonner";

interface InviteFormProps {
  onSuccess: (inviteUrl: string) => void;
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
      <div className="form-control">
        <label className="label">
          <span className="label-text">Email Address *</span>
        </label>
        <input
          type="email"
          placeholder="coach@example.com"
          className="input input-bordered w-full"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={isSubmitting}
        />
      </div>

      <div className="form-control">
        <label className="label">
          <span className="label-text">Coach Name</span>
        </label>
        <input
          type="text"
          placeholder="John Smith"
          className="input input-bordered w-full"
          value={coachName}
          onChange={(e) => setCoachName(e.target.value)}
          disabled={isSubmitting}
        />
        <label className="label">
          <span className="label-text-alt text-gray-500">
            Optional - helps identify the invite
          </span>
        </label>
      </div>

      <div className="form-control">
        <label className="label">
          <span className="label-text">Notes</span>
        </label>
        <textarea
          placeholder="Any additional notes..."
          className="textarea textarea-bordered w-full"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={isSubmitting}
        />
      </div>

      <button
        type="submit"
        className="btn btn-primary w-full"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <span className="loading loading-spinner loading-sm"></span>
            Creating Invite...
          </>
        ) : (
          "Send Invite"
        )}
      </button>
    </form>
  );
}

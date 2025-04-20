'use client';

import { useState } from 'react';

interface ExerciseNotesProps {
  exerciseId: number;
  initialNotes?: string;
  onSave: (notes: string) => void;
}

export function ExerciseNotes({ exerciseId, initialNotes = '', onSave }: ExerciseNotesProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [notes, setNotes] = useState(initialNotes);

  const handleSave = () => {
    onSave(notes);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="input input-bordered input-sm flex-1"
          placeholder="Add trainer notes..."
        />
        <button onClick={handleSave} className="btn btn-sm btn-primary">
          Save
        </button>
        <button onClick={() => setIsEditing(false)} className="btn btn-sm btn-ghost">
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm italic">{notes || 'No notes'}</span>
      <button
        onClick={() => setIsEditing(true)}
        className="btn btn-xs btn-ghost"
      >
        Edit
      </button>
    </div>
  );
} 
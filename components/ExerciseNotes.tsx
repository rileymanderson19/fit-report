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
      <div className="flex items-start gap-3 min-w-[300px]">
        <div className="flex-1">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="textarea textarea-bordered w-full min-h-[80px] text-sm font-normal resize-none"
            placeholder="Add trainer notes (e.g., increase weight next session)"
            autoFocus
          />
        </div>
        <div className="flex flex-col gap-2 pt-1">
          <button onClick={handleSave} className="btn btn-xs btn-success gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
              <path d="M12.207 4.793a1 1 0 0 1 0 1.414l-5 5a1 1 0 0 1-1.414 0l-2-2a1 1 0 0 1 1.414-1.414L6.5 9.086l4.293-4.293a1 1 0 0 1 1.414 0z"/>
            </svg>
            Save
          </button>
          <button onClick={() => setIsEditing(false)} className="btn btn-xs btn-ghost gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
              <path d="M3.28 2.22a.75.75 0 0 0-1.06 1.06L7.94 9l-5.72 5.72a.75.75 0 1 0 1.06 1.06L9 10.06l5.72 5.72a.75.75 0 1 0 1.06-1.06L10.06 9l5.72-5.72a.75.75 0 0 0-1.06-1.06L9 7.94 3.28 2.22Z" />
            </svg>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start justify-between gap-3 min-w-[300px] group">
      {notes ? (
        <p className="text-sm text-base-content/80 whitespace-pre-wrap leading-relaxed py-1">{notes}</p>
      ) : (
        <p className="text-sm text-base-content/50 italic py-1">No notes</p>
      )}
      <button
        onClick={() => setIsEditing(true)}
        className="btn btn-xs btn-outline btn-primary opacity-0 group-hover:opacity-100 transition-opacity"
        title="Edit notes"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
          <path d="M13.488 2.513a1.75 1.75 0 0 0-2.475 0L6.75 6.774a2.75 2.75 0 0 0-.596.892l-.848 2.047a.75.75 0 0 0 .98.98l2.047-.848a2.75 2.75 0 0 0 .892-.596l4.261-4.262a1.75 1.75 0 0 0 0-2.474Z" />
          <path d="M4.75 3.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h6.5c.69 0 1.25-.56 1.25-1.25V9A.75.75 0 0 1 14 9v2.25A2.75 2.75 0 0 1 11.25 14h-6.5A2.75 2.75 0 0 1 2 11.25v-6.5A2.75 2.75 0 0 1 4.75 2H7a.75.75 0 0 1 0 1.5H4.75Z" />
        </svg>
        Edit
      </button>
    </div>
  );
}
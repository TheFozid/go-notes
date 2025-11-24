const LAST_NOTE_KEY = 'go-notes-last-selected-note';

export const getInitialSelectedNote = (): number | null => {
  const saved = localStorage.getItem(LAST_NOTE_KEY);
  return saved ? parseInt(saved, 10) : null;
};

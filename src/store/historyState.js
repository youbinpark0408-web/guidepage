import { atom } from 'recoil';

// Session-only undo/redo stacks (not persisted to localStorage)
export const undoStackAtom = atom({
  key: 'undoStackAtom',
  default: [], // array of opinionsMap snapshots
});

export const redoStackAtom = atom({
  key: 'redoStackAtom',
  default: [],
});

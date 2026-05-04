import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';
import { opinionsAtom } from '../store/opinionState';
import { undoStackAtom, redoStackAtom } from '../store/historyState';
import { generateId } from '../utils/uuid';

const MAX_HISTORY = 50;

const makeSnapshot = (op) => ({
  opinionType: op.opinionType || '',
  revisedDraft: op.revisedDraft || '',
  modificationOpinion: op.modificationOpinion || '',
  basis: op.basis || '',
  opinionAgreement: op.opinionAgreement || '',
  issueItem: op.issueItem || '',
  kaitOpinion: op.kaitOpinion || '',
  kisaOpinion: op.kisaOpinion || '',
});

const makeVersion = (op, section, label) => ({
  id: generateId(),
  versionNum: (op.versions?.length || 0) + 1,
  timestamp: new Date().toISOString(),
  label,
  section,
  snapshot: makeSnapshot(op),
});

export const useOpinionActions = () => {
  const [opinions, setOpinions] = useRecoilState(opinionsAtom);
  const setUndoStack = useSetRecoilState(undoStackAtom);
  const setRedoStack = useSetRecoilState(redoStackAtom);
  const undoStack = useRecoilValue(undoStackAtom);
  const redoStack = useRecoilValue(redoStackAtom);

  // 현재 상태를 history에 저장
  const saveHistory = () => {
    setUndoStack((s) => [...s.slice(-(MAX_HISTORY - 1)), opinions]);
    setRedoStack([]);
  };

  const addOpinion = (guideId, basicData) => {
    saveHistory();
    const id = generateId();
    const now = new Date().toISOString();
    const newOp = {
      id,
      guideId,
      opinionType: basicData.opinionType || '',
      revisedDraft: basicData.revisedDraft || '',
      modificationOpinion: basicData.modificationOpinion || '',
      basis: basicData.basis || '',
      opinionAgreement: '',
      issueItem: '',
      kaitOpinion: '',
      kisaOpinion: '',
      isNew: true,
      createdAt: now,
      versions: [
        {
          id: generateId(),
          versionNum: 1,
          timestamp: now,
          label: 'v1: 기본 의견 등록',
          section: 'created',
          snapshot: { ...basicData, opinionAgreement: '', issueItem: '', kaitOpinion: '', kisaOpinion: '' },
        },
      ],
    };
    setOpinions((prev) => ({
      ...prev,
      [guideId]: [...(prev[guideId] || []), newOp],
    }));
  };

  const updateBasicSection = (guideId, opId, basicData) => {
    saveHistory();
    setOpinions((prev) => {
      const ops = prev[guideId] || [];
      return {
        ...prev,
        [guideId]: ops.map((op) => {
          if (op.id !== opId) return op;
          const vNum = (op.versions?.length || 0) + 1;
          return {
            ...op,
            ...basicData,
            versions: [
              ...(op.versions || []),
              makeVersion(op, 'basic', `v${vNum}: 기본 의견 수정`),
            ],
          };
        }),
      };
    });
  };

  const updateReviewSection = (guideId, opId, reviewData) => {
    saveHistory();
    setOpinions((prev) => {
      const ops = prev[guideId] || [];
      return {
        ...prev,
        [guideId]: ops.map((op) => {
          if (op.id !== opId) return op;
          const vNum = (op.versions?.length || 0) + 1;
          return {
            ...op,
            ...reviewData,
            versions: [
              ...(op.versions || []),
              makeVersion(op, 'review', `v${vNum}: 검토 의견 수정`),
            ],
          };
        }),
      };
    });
  };

  const deleteOpinion = (guideId, opId) => {
    saveHistory();
    setOpinions((prev) => ({
      ...prev,
      [guideId]: (prev[guideId] || []).filter((op) => op.id !== opId),
    }));
  };

  const restoreVersion = (guideId, opId, snapshot) => {
    saveHistory();
    setOpinions((prev) => {
      const ops = prev[guideId] || [];
      return {
        ...prev,
        [guideId]: ops.map((op) => {
          if (op.id !== opId) return op;
          const vNum = (op.versions?.length || 0) + 1;
          return {
            ...op,
            ...snapshot,
            versions: [
              ...(op.versions || []),
              makeVersion(op, 'restore', `v${vNum}: 버전 복원`),
            ],
          };
        }),
      };
    });
  };

  const undo = () => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setUndoStack((s) => s.slice(0, -1));
    setRedoStack((s) => [...s, opinions]);
    setOpinions(prev);
  };

  const redo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((s) => s.slice(0, -1));
    setUndoStack((s) => [...s, opinions]);
    setOpinions(next);
  };

  return {
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    undoCount: undoStack.length,
    redoCount: redoStack.length,
    addOpinion,
    updateBasicSection,
    updateReviewSection,
    deleteOpinion,
    restoreVersion,
    undo,
    redo,
  };
};

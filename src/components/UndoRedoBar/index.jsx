import React from 'react';
import { useOpinionActions } from '../../hooks/useOpinionActions';
import './UndoRedoBar.css';

const UndoRedoBar = () => {
  const { canUndo, canRedo, undoCount, redoCount, undo, redo } = useOpinionActions();

  if (!canUndo && !canRedo) return null;

  return (
    <div className="undo-redo-bar">
      <button
        className={`undo-btn ${!canUndo ? 'disabled' : ''}`}
        onClick={undo}
        disabled={!canUndo}
        title={`실행취소 (${undoCount}단계)`}
      >
        ↩ 실행취소
        {canUndo && <span className="history-count">{undoCount}</span>}
      </button>
      <button
        className={`undo-btn ${!canRedo ? 'disabled' : ''}`}
        onClick={redo}
        disabled={!canRedo}
        title={`다시실행 (${redoCount}단계)`}
      >
        ↪ 다시실행
        {canRedo && <span className="history-count">{redoCount}</span>}
      </button>
    </div>
  );
};

export default UndoRedoBar;

import React, { useEffect } from 'react';
import { useRecoilValue, useSetRecoilState, useRecoilState } from 'recoil';
import {
  selectedGuideSelector,
  selectedGuideIdAtom,
} from '../../store/guideState';
import { opinionsAtom, opinionFormVisibleAtom, hasOpinionContent } from '../../store/opinionState';
import OpinionList from '../OpinionList';
import OpinionForm from '../OpinionForm';
import UndoRedoBar from '../UndoRedoBar';
import './OpinionModal.css';

const OpinionModal = () => {
  const selectedGuide    = useRecoilValue(selectedGuideSelector);
  const setSelectedId    = useSetRecoilState(selectedGuideIdAtom);
  const opinionsMap      = useRecoilValue(opinionsAtom);
  const [formVisible, setFormVisible] = useRecoilState(opinionFormVisibleAtom);

  // ESC 키로 닫기
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleClose = () => {
    setSelectedId(null);
    setFormVisible(false);
  };

  if (!selectedGuide) return null;

  const opinions = (opinionsMap[selectedGuide.guideId] || []).filter(hasOpinionContent);
  const newCount = opinions.filter((o) => o.isNew).length;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>

        {/* ── 모달 헤더 ── */}
        <div className="modal-header">
          <div className="modal-header-left">
            <span className="modal-guide-badge">{selectedGuide.guideId}</span>
            {selectedGuide.majorCategory && (
              <span className="modal-breadcrumb">{selectedGuide.majorCategory}</span>
            )}
            {selectedGuide.midCategory && (
              <>
                <span className="modal-sep">›</span>
                <span className="modal-breadcrumb">{selectedGuide.midCategory}</span>
              </>
            )}
            {selectedGuide.subCategory && (
              <>
                <span className="modal-sep">›</span>
                <span className="modal-breadcrumb sub">{selectedGuide.subCategory}</span>
              </>
            )}
          </div>

          <div className="modal-header-right">
            <UndoRedoBar />
            {newCount > 0 && (
              <span className="modal-new-badge">{newCount}개 신규</span>
            )}
            <button className="modal-close-btn" onClick={handleClose} title="닫기 (ESC)">
              ✕
            </button>
          </div>
        </div>

        {/* ── 모달 바디 (스크롤) ── */}
        <div className="modal-body">
          {/* 가이드 내용 */}
          <div className="modal-content-section">
            <div className="modal-section-label">
              <span>📄</span> 가이드 내용
            </div>
            {selectedGuide.content ? (
              <div className="modal-content-body">{selectedGuide.content}</div>
            ) : (
              <div className="modal-content-body modal-content-empty">
                이 항목에는 별도의 내용이 없습니다.
              </div>
            )}
          </div>

          {/* 검토 의견 */}
          <div className="modal-opinions-section">
            <div className="modal-opinions-header">
              <div className="modal-section-label">
                <span>💬</span> 검토 의견
                {opinions.length > 0 && (
                  <span className="modal-opinion-count">{opinions.length}건</span>
                )}
              </div>
              <button className="btn-add-opinion" onClick={() => setFormVisible(true)}>
                + 의견 추가
              </button>
            </div>
            <OpinionList guideId={selectedGuide.guideId} />
          </div>
        </div>

        {/* 의견 입력 폼 */}
        {formVisible && <OpinionForm />}
      </div>
    </div>
  );
};

export default OpinionModal;

import React from 'react';
import { useRecoilValue, useSetRecoilState, useRecoilState } from 'recoil';
import {
  selectedGuideSelector,
  selectedGuideIdAtom,
  rawExcelDataAtom,
  guideListAtom,
} from '../../store/guideState';
import { opinionsAtom, opinionFormVisibleAtom } from '../../store/opinionState';
import { exportToExcel } from '../../utils/excelExporter';
import { hasOpinionContent } from '../../store/opinionState';
import OpinionList from '../OpinionList';
import OpinionForm from '../OpinionForm';
import UndoRedoBar from '../UndoRedoBar';
import './GuideDetailPanel.css';

const GuideDetailPanel = () => {
  const selectedGuide = useRecoilValue(selectedGuideSelector);
  const setSelectedGuideId = useSetRecoilState(selectedGuideIdAtom);
  const opinionsMap = useRecoilValue(opinionsAtom);
  const rawData = useRecoilValue(rawExcelDataAtom);
  const guideList = useRecoilValue(guideListAtom);
  const [formVisible, setFormVisible] = useRecoilState(opinionFormVisibleAtom);

  const handleExport = () => {
    if (!rawData) {
      alert('다운로드할 데이터가 없습니다. 먼저 엑셀 파일을 업로드하세요.');
      return;
    }
    exportToExcel(
      rawData.rawWorkbook,
      rawData.sheetName,
      opinionsMap,
      guideList,
      '암호자산_식별가이드_검토의견_수정본.xlsx'
    );
  };

  if (!selectedGuide) {
    return (
      <div className="detail-panel detail-panel--empty">
        <div className="detail-panel-empty-state">
          <span className="detail-empty-icon">📋</span>
          <p>가이드 항목을 클릭하면<br />상세 내용과 의견이 표시됩니다.</p>
        </div>
      </div>
    );
  }

  // 실제 내용이 있는 의견만 카운트
  const opinions = (opinionsMap[selectedGuide.guideId] || []).filter(hasOpinionContent);
  const newCount = opinions.filter((o) => o.isNew).length;

  return (
    <div className="detail-panel">
      {/* 헤더 */}
      <div className="detail-panel-header">
        <div className="detail-panel-header-top">
          <button className="detail-back-btn" onClick={() => setSelectedGuideId(null)}>
            ← 목록
          </button>
          <div className="detail-panel-actions">
            <UndoRedoBar />
            {newCount > 0 && (
              <span className="new-opinion-hint">{newCount}개 신규</span>
            )}
            <button className="btn-download" onClick={handleExport}>
              ⬇ 엑셀 다운로드
            </button>
          </div>
        </div>

        <div className="detail-guide-meta">
          <span className="guide-id-badge">{selectedGuide.guideId}</span>
          {selectedGuide.majorCategory && (
            <span className="detail-breadcrumb">{selectedGuide.majorCategory}</span>
          )}
          {selectedGuide.midCategory && (
            <>
              <span className="breadcrumb-sep">›</span>
              <span className="detail-breadcrumb">{selectedGuide.midCategory}</span>
            </>
          )}
          {selectedGuide.subCategory && (
            <>
              <span className="breadcrumb-sep">›</span>
              <span className="detail-breadcrumb sub">{selectedGuide.subCategory}</span>
            </>
          )}
        </div>
      </div>

      {/* 가이드 내용 (읽기 전용) */}
      {selectedGuide.content && (
        <div className="detail-content-section">
          <div className="detail-section-label">
            <span className="section-icon">📄</span> 가이드 내용
          </div>
          <div className="detail-content-body">{selectedGuide.content}</div>
        </div>
      )}

      {/* 검토 의견 */}
      <div className="detail-opinions-section">
        <div className="detail-opinions-header">
          <div className="detail-section-label">
            <span className="section-icon">💬</span> 검토 의견
            {opinions.length > 0 && (
              <span className="opinion-total-badge">{opinions.length}건</span>
            )}
          </div>
          <button className="btn-add-opinion" onClick={() => setFormVisible(true)}>
            + 의견 추가
          </button>
        </div>

        <OpinionList guideId={selectedGuide.guideId} />
      </div>

      {formVisible && <OpinionForm />}
    </div>
  );
};

export default GuideDetailPanel;

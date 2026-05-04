import React, { useEffect } from 'react';
import { useRecoilValue, useSetRecoilState } from 'recoil';
import * as XLSX from 'xlsx';
import { selectedGuideIdAtom, uploadStatusAtom, guideListAtom, rawExcelDataAtom } from '../../store/guideState';
import { dbGet, STORES } from '../../utils/db';
import FileUpload from '../../components/FileUpload';
import GuideTable from '../../components/GuideTable';
import GuideDetailPanel from '../../components/GuideDetailPanel';
import './MainPage.css';

// Restore Excel workbook from IDB ArrayBuffer after page refresh
const AppInitializer = () => {
  const uploadStatus = useRecoilValue(uploadStatusAtom);
  const setRawData = useSetRecoilState(rawExcelDataAtom);

  useEffect(() => {
    if (uploadStatus !== 'success') return;

    (async () => {
      try {
        const arrayBuffer = await dbGet(STORES.EXCEL, 'excelBuffer');
        const sheetName = await dbGet(STORES.EXCEL, 'excelSheetName');
        if (!arrayBuffer || !sheetName) return;

        const rawWorkbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
        setRawData({ rawWorkbook, sheetName });
      } catch (err) {
        console.error('workbook 복원 실패:', err);
      }
    })();
  }, []); // run once on mount

  return null;
};

const MainPage = () => {
  const selectedGuideId = useRecoilValue(selectedGuideIdAtom);
  const guideList = useRecoilValue(guideListAtom);

  const hasData = guideList.length > 0;

  return (
    <div className="main-layout">
      <aside className="main-sidebar">
        <div className="sidebar-brand">
          <div className="brand-logo">🔐</div>
          <div className="brand-text">
            <span className="brand-title">암호자산 식별가이드</span>
            <span className="brand-sub">전문가 검토 시스템</span>
          </div>
        </div>

        <div className="sidebar-upload-section">
          <p className="sidebar-section-title">파일 업로드</p>
          <FileUpload />
        </div>

        {hasData && (
          <div className="sidebar-stats">
            <div className="stat-item">
              <span className="stat-value">{guideList.length}</span>
              <span className="stat-label">가이드 항목</span>
            </div>
          </div>
        )}
      </aside>

      <main className="main-content">
        <AppInitializer />

        {!hasData ? (
          <div className="main-welcome">
            <div className="welcome-card">
              <div className="welcome-icon">📊</div>
              <h1 className="welcome-title">암호자산 식별가이드<br />전문가 검토 시스템</h1>
              <p className="welcome-desc">
                좌측 패널에서 엑셀 파일을 업로드하면<br />
                가이드 문서와 검토 의견을 관리할 수 있습니다.
              </p>
              <div className="welcome-features">
                {[
                  ['📂', '엑셀 파일 업로드 · 새로고침 후에도 유지'],
                  ['📄', '가이드 계층형 문서 뷰 (읽기 전용)'],
                  ['💬', '기본 의견 · 검토 의견 분리 입력'],
                  ['↩', '실행취소 · 다시실행 (Undo/Redo)'],
                  ['📋', '수정 이력 버전 관리 · 버전 복원'],
                  ['⬇', '수정 데이터 포함 엑셀 다운로드'],
                ].map(([icon, text]) => (
                  <div key={text} className="feature-item">
                    <span>{icon}</span>
                    <span>{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="main-split">
            <div className={`split-guide-list ${selectedGuideId ? 'split-collapsed' : ''}`}>
              <div className="panel-header">
                <h2 className="panel-title">가이드 목록</h2>
              </div>
              <GuideTable />
            </div>

            {selectedGuideId && (
              <div className="split-detail-panel">
                <GuideDetailPanel />
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default MainPage;

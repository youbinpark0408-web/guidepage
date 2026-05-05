import React, { useEffect } from 'react';
import { useRecoilValue, useSetRecoilState, useRecoilState } from 'recoil';
import {
  uploadStatusAtom,
  guideListAtom,
  rawExcelDataAtom,
} from '../../store/guideState';
import { opinionsAtom } from '../../store/opinionState';
import { dbGet, STORES } from '../../utils/db';
import { parseExcelFile } from '../../utils/excelParser';
import { darkModeAtom } from '../../store/uiState';
import FileUpload from '../../components/FileUpload';
import ExcelReadView from '../../components/ExcelReadView';
import OpinionModal from '../../components/OpinionModal';
import './MainPage.css';
import { useState } from 'react';

/**
 * 새로고침 후 IDB ArrayBuffer에서 전체 재파싱
 * - 최신 파서로 guideList + 다중 의견 세트 복원
 * - isNew:true 의견은 병합 보존
 */
const AppInitializer = () => {
  const uploadStatus = useRecoilValue(uploadStatusAtom);
  const setRawData   = useSetRecoilState(rawExcelDataAtom);
  const setGuideList = useSetRecoilState(guideListAtom);
  const setOpinions  = useSetRecoilState(opinionsAtom);

  useEffect(() => {
    if (uploadStatus !== 'success') return;
    (async () => {
      try {
        const arrayBuffer = await dbGet(STORES.EXCEL, 'excelBuffer');
        if (!arrayBuffer) return;

        const parsed = parseExcelFile(new Uint8Array(arrayBuffer));

        setRawData({ rawWorkbook: parsed.rawWorkbook, sheetName: parsed.sheetName });
        setGuideList(parsed.guideList);

        // isNew 의견(사용자 추가)은 재파싱 결과에 병합
        const storedOps = await dbGet(STORES.OPINIONS, 'opinions') || {};
        const merged = { ...parsed.opinions };
        for (const [gid, ops] of Object.entries(storedOps)) {
          const newOps = ops.filter((op) => op.isNew === true);
          if (newOps.length > 0) {
            merged[gid] = [...(merged[gid] || []), ...newOps];
          }
        }
        setOpinions(merged);
      } catch (err) {
        console.error('workbook 복원 실패:', err);
      }
    })();
  }, [uploadStatus]);

  return null;
};

const MainPage = () => {
  const guideList             = useRecoilValue(guideListAtom);
  const [darkMode, setDarkMode] = useRecoilState(darkModeAtom);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const hasData = guideList.length > 0;

  return (
    <div className="main-layout">
      {/* ── 사이드바 ── */}
      <aside className={`main-sidebar ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <button
          className="sidebar-toggle-btn"
          onClick={() => setSidebarCollapsed((v) => !v)}
          title={sidebarCollapsed ? '사이드바 열기' : '사이드바 닫기'}
        >
          {sidebarCollapsed ? '›' : '‹'}
        </button>

        <div className="sidebar-content">
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

          <div className="sidebar-footer">
            <button
              className="btn-theme-toggle"
              onClick={() => setDarkMode((v) => !v)}
              title={darkMode ? '라이트 모드로 전환' : '다크 모드로 전환'}
            >
              {darkMode ? '☀ 라이트 모드' : '🌙 다크 모드'}
            </button>
          </div>
        </div>
      </aside>

      {/* ── 메인 콘텐츠 ── */}
      <main className="main-content">
        <AppInitializer />

        {!hasData ? (
          <div className="main-welcome">
            <div className="welcome-card">
              <div className="welcome-icon">📊</div>
              <h1 className="welcome-title">
                암호자산 식별가이드<br />전문가 검토 시스템
              </h1>
              <p className="welcome-desc">
                좌측 패널에서 엑셀 파일을 업로드하면<br />
                가이드 문서와 검토 의견을 관리할 수 있습니다.
              </p>
              <div className="welcome-features">
                {[
                  ['📂', '엑셀 파일 업로드 · 새로고침 후에도 유지'],
                  ['📊', '엑셀 원본 형식 그대로 표시'],
                  ['🔍', '가이드 ID 클릭 → 검토 의견 팝업'],
                  ['💬', '기본 의견 · 검토 의견 분리 입력'],
                  ['↩', '실행취소 · 다시실행 (Undo/Redo)'],
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
          <ExcelReadView />
        )}

        {/* 의견 팝업 모달 — selectedGuideId가 있을 때 자동 표시 */}
        <OpinionModal />
      </main>
    </div>
  );
};

export default MainPage;

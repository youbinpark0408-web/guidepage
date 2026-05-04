import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useRecoilValue, useSetRecoilState, useRecoilState } from 'recoil';
import {
  selectedGuideIdAtom,
  uploadStatusAtom,
  guideListAtom,
  rawExcelDataAtom,
} from '../../store/guideState';
import { opinionsAtom } from '../../store/opinionState';
import { dbGet, STORES } from '../../utils/db';
import { parseExcelFile } from '../../utils/excelParser';
import { darkModeAtom } from '../../store/uiState';
import FileUpload from '../../components/FileUpload';
import GuideTable from '../../components/GuideTable';
import GuideDetailPanel from '../../components/GuideDetailPanel';
import ExcelReadView from '../../components/ExcelReadView';
import './MainPage.css';

/**
 * 새로고침 후 IDB ArrayBuffer에서 전체 재파싱
 * - 항상 최신 파서로 가이드 목록 + 의견 복원
 * - isNew:true 의견(사용자 추가분)은 재파싱 결과에 병합하여 보존
 */
const AppInitializer = () => {
  const uploadStatus  = useRecoilValue(uploadStatusAtom);
  const setRawData    = useSetRecoilState(rawExcelDataAtom);
  const setGuideList  = useSetRecoilState(guideListAtom);
  const setOpinions   = useSetRecoilState(opinionsAtom);

  useEffect(() => {
    if (uploadStatus !== 'success') return;
    (async () => {
      try {
        const arrayBuffer = await dbGet(STORES.EXCEL, 'excelBuffer');
        if (!arrayBuffer) return;

        // 최신 파서로 재파싱 (가로 방향 다중 의견 세트 포함)
        const parsed = parseExcelFile(new Uint8Array(arrayBuffer));

        setRawData({ rawWorkbook: parsed.rawWorkbook, sheetName: parsed.sheetName });
        setGuideList(parsed.guideList);

        // isNew:true 의견(사용자가 UI에서 직접 추가한 것)은 재파싱 결과에 병합
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
  }, [uploadStatus]); // uploadStatus가 IDB에서 복원된 후 재실행

  return null;
};

const MainPage = () => {
  const selectedGuideId = useRecoilValue(selectedGuideIdAtom);
  const guideList = useRecoilValue(guideListAtom);
  const [darkMode, setDarkMode] = useRecoilState(darkModeAtom);

  const hasData = guideList.length > 0;

  // ── 사이드바 토글 ──
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // ── 탭: 'original' | 'review' ──
  const [activeTab, setActiveTab] = useState('original');

  // ── 분할 패널 너비 (검토 편집 탭, 상세 패널 열렸을 때) ──
  const [listWidth, setListWidth] = useState(340);
  const resizeRef = useRef({ active: false, startX: 0, startW: 0 });

  useEffect(() => {
    const onMove = (e) => {
      if (!resizeRef.current.active) return;
      const delta = e.clientX - resizeRef.current.startX;
      setListWidth(Math.max(220, Math.min(700, resizeRef.current.startW + delta)));
    };
    const onUp = () => { resizeRef.current.active = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  const startResize = useCallback((e) => {
    resizeRef.current = { active: true, startX: e.clientX, startW: listWidth };
    e.preventDefault();
  }, [listWidth]);

  return (
    <div className="main-layout">
      {/* ── 사이드바 ── */}
      <aside className={`main-sidebar ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        {/* 토글 버튼 (항상 표시) */}
        <button
          className="sidebar-toggle-btn"
          onClick={() => setSidebarCollapsed((v) => !v)}
          title={sidebarCollapsed ? '사이드바 열기' : '사이드바 닫기'}
        >
          {sidebarCollapsed ? '›' : '‹'}
        </button>

        {/* 접혔을 때 숨겨지는 콘텐츠 */}
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

          {/* 다크모드 토글 */}
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
                  ['📊', '원본 보기 탭 — 엑셀 형식 읽기 전용 뷰'],
                  ['✏️', '검토 편집 탭 — 의견 추가 · 수정 · 버전관리'],
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
          <>
            {/* ── 탭 바 ── */}
            <div className="main-tab-bar">
              <button
                className={`main-tab ${activeTab === 'original' ? 'tab-active' : ''}`}
                onClick={() => setActiveTab('original')}
              >
                📊 엑셀 원본 보기
              </button>
              <button
                className={`main-tab ${activeTab === 'review' ? 'tab-active' : ''}`}
                onClick={() => setActiveTab('review')}
              >
                ✏️ 가이드 목록 / 수정
              </button>
            </div>

            {/* ── 탭 콘텐츠 ── */}
            {/* display:none 방식으로 마운트 유지 → 탭 전환 시 상태 보존 */}
            <div
              className="tab-panel"
              style={{ display: activeTab === 'original' ? 'flex' : 'none' }}
            >
              <ExcelReadView />
            </div>

            <div
              className="tab-panel"
              style={{ display: activeTab === 'review' ? 'flex' : 'none' }}
            >
              <div className="main-split">
                {/* 가이드 목록 패널 */}
                <div
                  className="split-guide-list"
                  style={
                    selectedGuideId
                      ? { flex: 'none', width: listWidth, minWidth: 220 }
                      : {}
                  }
                >
                  <div className="panel-header">
                    <h2 className="panel-title">가이드 목록</h2>
                  </div>
                  <GuideTable />
                </div>

                {/* 리사이즈 핸들 */}
                {selectedGuideId && (
                  <>
                    <div className="resize-handle" onMouseDown={startResize}>
                      <button
                        className="resize-arrow-btn"
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={() =>
                          setListWidth((w) => Math.max(220, w - 60))
                        }
                        title="목록 좁히기"
                      >
                        ‹
                      </button>
                      <div className="resize-grip" />
                      <button
                        className="resize-arrow-btn"
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={() =>
                          setListWidth((w) => Math.min(700, w + 60))
                        }
                        title="목록 넓히기"
                      >
                        ›
                      </button>
                    </div>

                    {/* 상세 패널 */}
                    <div className="split-detail-panel">
                      <GuideDetailPanel />
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default MainPage;

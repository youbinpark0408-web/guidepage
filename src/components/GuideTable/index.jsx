import React, { useState, useMemo, useEffect } from 'react';
import { useRecoilValue, useSetRecoilState } from 'recoil';
import { guideListAtom, selectedGuideIdAtom } from '../../store/guideState';
import { opinionsAtom, hasOpinionContent } from '../../store/opinionState';
import './GuideTable.css';

const getLevel = (id) => {
  if (!id) return 0;
  const digits = id.replace(/^CAIG/i, '').length;
  if (digits <= 2) return 1;
  if (digits <= 4) return 2;
  if (digits <= 6) return 3;
  return 4;
};

const OPINION_TYPE_BADGE = {
  이의없음: 'badge-ok',
  내용오류: 'badge-error',
  추가필요: 'badge-add',
  삭제권고: 'badge-del',
  표현수정: 'badge-mod',
};

const PAGE_SIZES = [10, 30, 50, 100];

const getPageNums = (cur, total) => {
  const delta = 2;
  const nums = [];
  for (let i = Math.max(1, cur - delta); i <= Math.min(total, cur + delta); i++) {
    nums.push(i);
  }
  return nums;
};

const GuideTable = () => {
  const guideList = useRecoilValue(guideListAtom);
  const opinionsMap = useRecoilValue(opinionsAtom);
  const setSelectedGuideId = useSetRecoilState(selectedGuideIdAtom);

  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('paged');  // 'list' | 'paged'
  const [pageSize, setPageSize] = useState(30);
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return guideList;
    const lower = searchTerm.toLowerCase();
    return guideList.filter(
      (g) =>
        g.guideId.toLowerCase().includes(lower) ||
        (g.majorCategory || '').toLowerCase().includes(lower) ||
        (g.midCategory || '').toLowerCase().includes(lower) ||
        (g.subCategory || '').toLowerCase().includes(lower) ||
        (g.content || '').toLowerCase().includes(lower)
    );
  }, [guideList, searchTerm]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, viewMode, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const displayed = viewMode === 'paged'
    ? filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : filtered;

  if (guideList.length === 0) {
    return (
      <div className="guide-table-empty">
        <p>엑셀 파일을 업로드하면 가이드 목록이 표시됩니다.</p>
      </div>
    );
  }

  return (
    <div className="guide-table-wrapper">
      {/* 툴바 */}
      <div className="guide-table-toolbar">
        <span className="guide-table-count">
          총 <strong>{filtered.length}</strong>개
        </span>
        <input
          className="guide-search-input"
          type="text"
          placeholder="ID, 목차, 내용 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <div className="view-mode-btns">
          <button
            className={`view-mode-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
            title="전체 스크롤 목록"
          >☰ 목록</button>
          <button
            className={`view-mode-btn ${viewMode === 'paged' ? 'active' : ''}`}
            onClick={() => setViewMode('paged')}
            title="페이지 단위 보기"
          >📄 페이지</button>
        </div>
      </div>

      {/* 페이지 크기 선택 */}
      {viewMode === 'paged' && (
        <div className="page-size-bar">
          <span className="page-size-label">페이지당</span>
          {PAGE_SIZES.map((n) => (
            <button
              key={n}
              className={`page-size-btn ${pageSize === n ? 'active' : ''}`}
              onClick={() => setPageSize(n)}
            >{n}</button>
          ))}
          <span className="page-size-label">개</span>
        </div>
      )}

      {/* 목록 */}
      <div className="guide-doc-list">
        {displayed.map((guide) => {
          const level = getLevel(guide.guideId);
          const opinions = (opinionsMap[guide.guideId] || []).filter(hasOpinionContent);

          return (
            <div
              key={guide.guideId}
              className={`guide-doc-row level-${level}`}
              onClick={() => setSelectedGuideId(guide.guideId)}
            >
              <div className="guide-doc-header">
                <span className="guide-id-badge">{guide.guideId}</span>
                {guide.majorCategory && level === 1 && (
                  <span className="guide-category major">{guide.majorCategory}</span>
                )}
                {guide.midCategory && level === 2 && (
                  <span className="guide-category mid">{guide.midCategory}</span>
                )}
                {guide.subCategory && level >= 3 && (
                  <span className="guide-category sub">{guide.subCategory}</span>
                )}
                {opinions.length > 0 && (
                  <span className="opinion-count-badge">의견 {opinions.length}</span>
                )}
              </div>

              {guide.content && (
                <p className="guide-doc-content">{guide.content}</p>
              )}

              {opinions.length > 0 && (
                <div className="guide-opinion-preview">
                  {opinions.slice(0, 2).map((op) => (
                    <span
                      key={op.id}
                      className={`opinion-type-badge ${OPINION_TYPE_BADGE[op.opinionType] || 'badge-default'}`}
                    >
                      {op.opinionType || '의견'}
                    </span>
                  ))}
                  {opinions.length > 2 && (
                    <span className="opinion-more">+{opinions.length - 2}건</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 페이지네이션 — paged 모드에서는 항상 표시 */}
      {viewMode === 'paged' && (() => {
        const pageNums = getPageNums(currentPage, totalPages);
        return (
          <div className="pagination-bar">
            <button className="page-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(1)} title="첫 페이지">«</button>
            <button className="page-btn" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}>이전</button>
            {pageNums[0] > 1 && <span className="page-ellipsis">…</span>}
            {pageNums.map((n) => (
              <button
                key={n}
                className={`page-btn ${n === currentPage ? 'page-btn-active' : ''}`}
                onClick={() => setCurrentPage(n)}
              >{n}</button>
            ))}
            {pageNums[pageNums.length - 1] < totalPages && <span className="page-ellipsis">…</span>}
            <button className="page-btn" disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)}>다음</button>
            <button className="page-btn" disabled={currentPage === totalPages} onClick={() => setCurrentPage(totalPages)} title="마지막 페이지">»</button>
            <span className="page-info">{currentPage} / {totalPages}</span>
          </div>
        );
      })()}
    </div>
  );
};

export default GuideTable;

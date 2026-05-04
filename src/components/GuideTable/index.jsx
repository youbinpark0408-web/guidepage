import React, { useState, useMemo } from 'react';
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

const GuideTable = () => {
  const guideList = useRecoilValue(guideListAtom);
  const opinionsMap = useRecoilValue(opinionsAtom);
  const setSelectedGuideId = useSetRecoilState(selectedGuideIdAtom);
  const [searchTerm, setSearchTerm] = useState('');

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

  if (guideList.length === 0) {
    return (
      <div className="guide-table-empty">
        <p>엑셀 파일을 업로드하면 가이드 목록이 표시됩니다.</p>
      </div>
    );
  }

  return (
    <div className="guide-table-wrapper">
      <div className="guide-table-toolbar">
        <span className="guide-table-count">
          총 <strong>{guideList.length}</strong>개
        </span>
        <input
          className="guide-search-input"
          type="text"
          placeholder="ID, 목차, 내용 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="guide-doc-list">
        {filtered.map((guide) => {
          const level = getLevel(guide.guideId);
          // 실제 내용이 있는 의견만 카운트
          const opinions = (opinionsMap[guide.guideId] || []).filter(hasOpinionContent);
          const opinionCount = opinions.length;

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

                {opinionCount > 0 && (
                  <span className="opinion-count-badge">의견 {opinionCount}</span>
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
    </div>
  );
};

export default GuideTable;

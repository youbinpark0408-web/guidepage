import React from 'react';
import './VersionHistory.css';

const SECTION_LABEL = {
  created: '최초 등록',
  basic: '기본 의견 수정',
  review: '검토 의견 수정',
  restore: '버전 복원',
};

const formatDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const VersionHistory = ({ versions, onRestore }) => {
  if (!versions || versions.length === 0) {
    return (
      <div className="version-history-empty">이력이 없습니다.</div>
    );
  }

  // 최신순 정렬
  const sorted = [...versions].sort((a, b) => b.versionNum - a.versionNum);

  return (
    <div className="version-history">
      <div className="version-history-title">수정 이력</div>
      <div className="version-list">
        {sorted.map((ver, idx) => (
          <div key={ver.id} className={`version-item ${idx === 0 ? 'version-item--current' : ''}`}>
            <div className="version-item-left">
              <span className="version-badge">v{ver.versionNum}</span>
              <div className="version-meta">
                <span className="version-label">{ver.label || SECTION_LABEL[ver.section] || ver.section}</span>
                <span className="version-date">{formatDate(ver.timestamp)}</span>
              </div>
            </div>
            {idx !== 0 && (
              <button
                className="btn-restore"
                onClick={() => onRestore(ver.snapshot)}
              >
                복원
              </button>
            )}
            {idx === 0 && (
              <span className="version-current-tag">현재</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default VersionHistory;

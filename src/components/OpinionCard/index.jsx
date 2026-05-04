import React, { useState } from 'react';
import { useOpinionActions } from '../../hooks/useOpinionActions';
import { hasBasicContent } from '../../store/opinionState';
import VersionHistory from '../VersionHistory';
import './OpinionCard.css';

const OPINION_TYPE_BADGE = {
  이의없음: 'badge-ok',
  내용오류: 'badge-error',
  추가필요: 'badge-add',
  삭제권고: 'badge-del',
  표현수정: 'badge-mod',
};

const AGREEMENT_BADGE = { 일치: 'agree-yes', 불일치: 'agree-no', 보류: 'agree-pending' };
const OPINION_TYPES = ['이의없음', '내용오류', '추가필요', '삭제권고', '표현수정'];
const AGREEMENT_OPTIONS = ['일치', '불일치', '보류'];

// 기본 의견 섹션 인라인 폼
const BasicEditForm = ({ opinion, onSave, onCancel }) => {
  const [form, setForm] = useState({
    opinionType: opinion.opinionType || '',
    revisedDraft: opinion.revisedDraft || '',
    modificationOpinion: opinion.modificationOpinion || '',
    basis: opinion.basis || '',
  });

  return (
    <div className="inline-edit-form">
      <div className="form-row-radio">
        <span className="form-label">의견 유형</span>
        <div className="radio-group">
          {OPINION_TYPES.map((t) => (
            <label key={t} className={`radio-pill ${form.opinionType === t ? 'selected' : ''}`}>
              <input
                type="radio"
                name="opinionType_edit"
                value={t}
                checked={form.opinionType === t}
                onChange={(e) => setForm((p) => ({ ...p, opinionType: e.target.value }))}
              />
              {t}
            </label>
          ))}
        </div>
      </div>

      {[
        { id: 'revisedDraft', label: '개정(안)', placeholder: '개정(안) 내용을 입력하세요' },
        { id: 'modificationOpinion', label: '수정의견', placeholder: '수정 의견을 입력하세요' },
        { id: 'basis', label: '근거', placeholder: '표준, ISO, 가이드 등 근거를 명시하세요' },
      ].map(({ id, label, placeholder }) => (
        <div key={id} className="form-row">
          <span className="form-label">{label}</span>
          <textarea
            className="form-textarea"
            placeholder={placeholder}
            value={form[id]}
            onChange={(e) => setForm((p) => ({ ...p, [id]: e.target.value }))}
            rows={2}
          />
        </div>
      ))}

      <div className="inline-form-actions">
        <button className="btn-cancel-sm" onClick={onCancel}>취소</button>
        <button className="btn-save-sm" onClick={() => onSave(form)}>저장</button>
      </div>
    </div>
  );
};

// 검토 의견 섹션 인라인 폼
const ReviewEditForm = ({ opinion, onSave, onCancel }) => {
  const [form, setForm] = useState({
    opinionAgreement: opinion.opinionAgreement || '',
    issueItem: opinion.issueItem || '',
    kaitOpinion: opinion.kaitOpinion || '',
    kisaOpinion: opinion.kisaOpinion || '',
  });

  return (
    <div className="inline-edit-form">
      <div className="form-row-radio">
        <span className="form-label">의견 일치여부</span>
        <div className="radio-group">
          {AGREEMENT_OPTIONS.map((t) => (
            <label key={t} className={`radio-pill ${form.opinionAgreement === t ? 'selected' : ''}`}>
              <input
                type="radio"
                name="agreement_edit"
                value={t}
                checked={form.opinionAgreement === t}
                onChange={(e) => setForm((p) => ({ ...p, opinionAgreement: e.target.value }))}
              />
              {t}
            </label>
          ))}
        </div>
      </div>

      <div className="form-row">
        <span className="form-label">이슈 사항</span>
        <textarea
          className="form-textarea"
          placeholder="이슈 사항을 입력하세요"
          value={form.issueItem}
          onChange={(e) => setForm((p) => ({ ...p, issueItem: e.target.value }))}
          rows={2}
        />
      </div>

      <div className="form-row-split">
        <div className="form-row">
          <span className="form-label">KAIT 의견</span>
          <textarea
            className="form-textarea"
            placeholder="KAIT 의견"
            value={form.kaitOpinion}
            onChange={(e) => setForm((p) => ({ ...p, kaitOpinion: e.target.value }))}
            rows={2}
          />
        </div>
        <div className="form-row">
          <span className="form-label">KISA 의견</span>
          <textarea
            className="form-textarea"
            placeholder="KISA 의견"
            value={form.kisaOpinion}
            onChange={(e) => setForm((p) => ({ ...p, kisaOpinion: e.target.value }))}
            rows={2}
          />
        </div>
      </div>

      <div className="inline-form-actions">
        <button className="btn-cancel-sm" onClick={onCancel}>취소</button>
        <button className="btn-save-sm" onClick={() => onSave(form)}>저장</button>
      </div>
    </div>
  );
};

const FieldRow = ({ label, value }) => {
  if (!value?.trim()) return null;
  return (
    <div className="opinion-field">
      <span className="opinion-field-label">{label}</span>
      <span className="opinion-field-value">{value}</span>
    </div>
  );
};

const OpinionCard = ({ opinion, index }) => {
  const [editingBasic, setEditingBasic] = useState(false);
  const [editingReview, setEditingReview] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const { updateBasicSection, updateReviewSection, deleteOpinion, restoreVersion } = useOpinionActions();

  const badgeClass = OPINION_TYPE_BADGE[opinion.opinionType] || 'badge-default';
  const agreeBadge = AGREEMENT_BADGE[opinion.opinionAgreement] || '';
  const basicFilled = hasBasicContent(opinion);

  const handleSaveBasic = (data) => {
    updateBasicSection(opinion.guideId, opinion.id, data);
    setEditingBasic(false);
  };

  const handleSaveReview = (data) => {
    updateReviewSection(opinion.guideId, opinion.id, data);
    setEditingReview(false);
  };

  const handleDelete = () => {
    if (!window.confirm('이 의견을 삭제하시겠습니까?')) return;
    deleteOpinion(opinion.guideId, opinion.id);
  };

  const handleRestore = (snapshot) => {
    restoreVersion(opinion.guideId, opinion.id, snapshot);
    setShowHistory(false);
  };

  return (
    <div className={`opinion-card ${opinion.isNew ? 'opinion-card--new' : ''}`}>
      {/* 카드 헤더 */}
      <div className="opinion-card-header">
        <span className="opinion-card-index">#{index + 1}</span>
        {opinion.opinionType && (
          <span className={`opinion-type-badge ${badgeClass}`}>{opinion.opinionType}</span>
        )}
        {opinion.opinionAgreement && (
          <span className={`agree-badge ${agreeBadge}`}>{opinion.opinionAgreement}</span>
        )}
        {opinion.isNew && <span className="new-badge">NEW</span>}
        <div className="card-header-actions">
          <button
            className="btn-icon-sm"
            title="수정 이력"
            onClick={() => setShowHistory((v) => !v)}
          >
            📋 이력 {opinion.versions?.length > 0 && `(${opinion.versions.length})`}
          </button>
          <button className="btn-icon-sm btn-danger" title="삭제" onClick={handleDelete}>
            삭제
          </button>
        </div>
      </div>

      {/* 섹션 1: 기본 의견 */}
      <div className="opinion-section">
        <div className="section-label-row">
          <span className="section-label">기본 의견</span>
          {!editingBasic && (
            <button
              className="btn-edit-section"
              onClick={() => { setEditingBasic(true); setEditingReview(false); }}
            >
              편집
            </button>
          )}
        </div>

        {editingBasic ? (
          <BasicEditForm
            opinion={opinion}
            onSave={handleSaveBasic}
            onCancel={() => setEditingBasic(false)}
          />
        ) : (
          <div className="opinion-fields">
            <FieldRow label="의견 유형" value={opinion.opinionType} />
            <FieldRow label="개정(안)" value={opinion.revisedDraft} />
            <FieldRow label="수정의견" value={opinion.modificationOpinion} />
            <FieldRow label="근거" value={opinion.basis} />
            {!basicFilled && (
              <p className="section-empty-hint">기본 의견을 입력해주세요.</p>
            )}
          </div>
        )}
      </div>

      {/* 섹션 2: 검토 의견 — 기본 의견이 있어야 활성화 */}
      <div className={`opinion-section ${!basicFilled ? 'section-disabled' : ''}`}>
        <div className="section-label-row">
          <span className="section-label">검토 의견</span>
          {!editingReview && basicFilled && (
            <button
              className="btn-edit-section"
              onClick={() => { setEditingReview(true); setEditingBasic(false); }}
            >
              편집
            </button>
          )}
        </div>

        {editingReview && basicFilled ? (
          <ReviewEditForm
            opinion={opinion}
            onSave={handleSaveReview}
            onCancel={() => setEditingReview(false)}
          />
        ) : (
          <div className="opinion-fields">
            <FieldRow label="일치여부" value={opinion.opinionAgreement} />
            <FieldRow label="이슈 사항" value={opinion.issueItem} />
            <FieldRow label="KAIT 의견" value={opinion.kaitOpinion} />
            <FieldRow label="KISA 의견" value={opinion.kisaOpinion} />
            {basicFilled && !opinion.opinionAgreement && !opinion.issueItem && !opinion.kaitOpinion && !opinion.kisaOpinion && (
              <p className="section-empty-hint">검토 의견을 입력해주세요.</p>
            )}
            {!basicFilled && (
              <p className="section-locked-hint">🔒 기본 의견 작성 후 입력 가능합니다.</p>
            )}
          </div>
        )}
      </div>

      {/* 버전 이력 */}
      {showHistory && (
        <VersionHistory
          versions={opinion.versions || []}
          onRestore={handleRestore}
        />
      )}
    </div>
  );
};

export default OpinionCard;

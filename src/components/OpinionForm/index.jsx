import React, { useState } from 'react';
import { useRecoilValue, useSetRecoilState } from 'recoil';
import { selectedGuideIdAtom } from '../../store/guideState';
import { opinionFormVisibleAtom } from '../../store/opinionState';
import { useOpinionActions } from '../../hooks/useOpinionActions';
import './OpinionForm.css';

const OPINION_TYPES = ['이의없음', '내용오류', '추가필요', '삭제권고', '표현수정'];

const EMPTY = {
  opinionType: '',
  revisedDraft: '',
  modificationOpinion: '',
  basis: '',
};

// Step 1: 기본 의견 입력 모달 (opinionType, 개정안, 수정의견, 근거)
const OpinionForm = () => {
  const [form, setForm] = useState(EMPTY);
  const selectedGuideId = useRecoilValue(selectedGuideIdAtom);
  const setFormVisible = useSetRecoilState(opinionFormVisibleAtom);
  const { addOpinion } = useOpinionActions();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedGuideId) return;
    addOpinion(selectedGuideId, form);
    setForm(EMPTY);
    setFormVisible(false);
  };

  const handleCancel = () => {
    setForm(EMPTY);
    setFormVisible(false);
  };

  return (
    <div
      className="opinion-form-overlay"
      onClick={(e) => e.target === e.currentTarget && handleCancel()}
    >
      <div className="opinion-form-panel">
        <div className="opinion-form-header">
          <div className="form-header-left">
            <h3>의견 추가</h3>
            <span className="form-step-badge">Step 1 · 기본 의견</span>
          </div>
          <span className="form-guide-id">{selectedGuideId}</span>
          <button className="form-close-btn" onClick={handleCancel}>×</button>
        </div>

        <div className="form-step-hint">
          기본 의견을 저장하면 카드에서 <strong>검토 의견</strong>을 추가로 입력할 수 있습니다.
        </div>

        <form className="opinion-form-body" onSubmit={handleSubmit}>
          <div className="form-row">
            <label className="form-label">의견 유형</label>
            <div className="form-radio-group">
              {OPINION_TYPES.map((type) => (
                <label
                  key={type}
                  className={`form-radio-label ${form.opinionType === type ? 'selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="opinionType"
                    value={type}
                    checked={form.opinionType === type}
                    onChange={(e) => setForm((p) => ({ ...p, opinionType: e.target.value }))}
                  />
                  {type}
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
              <label className="form-label" htmlFor={id}>{label}</label>
              <textarea
                id={id}
                className="form-textarea"
                placeholder={placeholder}
                value={form[id]}
                onChange={(e) => setForm((p) => ({ ...p, [id]: e.target.value }))}
                rows={3}
              />
            </div>
          ))}

          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={handleCancel}>취소</button>
            <button type="submit" className="btn-submit">기본 의견 저장 →</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OpinionForm;

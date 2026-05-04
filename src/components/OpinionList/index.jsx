import React from 'react';
import { useRecoilValue } from 'recoil';
import { opinionsByGuideIdSelector } from '../../store/opinionState';
import OpinionCard from '../OpinionCard';
import './OpinionList.css';

const OpinionList = ({ guideId }) => {
  const opinions = useRecoilValue(opinionsByGuideIdSelector(guideId));

  if (!opinions || opinions.length === 0) {
    return (
      <div className="opinion-list-empty">
        <p>등록된 의견이 없습니다.</p>
        <p className="opinion-list-empty-sub">
          "+ 의견 추가" 버튼으로 기본 의견을 먼저 작성하세요.
        </p>
      </div>
    );
  }

  return (
    <div className="opinion-list">
      {opinions.map((op, idx) => (
        <OpinionCard key={op.id} opinion={op} index={idx} />
      ))}
    </div>
  );
};

export default OpinionList;

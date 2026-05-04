import { atom, selectorFamily } from 'recoil';
import { idbEffect, STORES } from '../utils/db';

export const hasOpinionContent = (op) =>
  !!(
    op.opinionType?.trim() ||
    op.revisedDraft?.trim() ||
    op.modificationOpinion?.trim() ||
    op.basis?.trim() ||
    op.opinionAgreement?.trim() ||
    op.issueItem?.trim() ||
    op.kaitOpinion?.trim() ||
    op.kisaOpinion?.trim()
  );

export const hasBasicContent = (op) =>
  !!(
    op.opinionType?.trim() ||
    op.revisedDraft?.trim() ||
    op.modificationOpinion?.trim() ||
    op.basis?.trim()
  );

export const opinionsAtom = atom({
  key: 'opinionsAtom',
  default: {},
  effects: [idbEffect(STORES.OPINIONS, 'opinions')],
});

export const opinionsByGuideIdSelector = selectorFamily({
  key: 'opinionsByGuideIdSelector',
  get:
    (guideId) =>
    ({ get }) => {
      const all = get(opinionsAtom);
      return (all[guideId] || []).filter(hasOpinionContent);
    },
});

export const opinionFormVisibleAtom = atom({
  key: 'opinionFormVisibleAtom',
  default: false,
});

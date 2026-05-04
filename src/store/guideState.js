import { atom, selector } from 'recoil';
import { idbEffect, STORES } from '../utils/db';

export const guideListAtom = atom({
  key: 'guideListAtom',
  default: [],
  effects: [idbEffect(STORES.GUIDE_LIST, 'guideList')],
});

export const selectedGuideIdAtom = atom({
  key: 'selectedGuideIdAtom',
  default: null,
});

export const selectedGuideSelector = selector({
  key: 'selectedGuideSelector',
  get: ({ get }) => {
    const id = get(selectedGuideIdAtom);
    const list = get(guideListAtom);
    return list.find((g) => g.guideId === id) || null;
  },
});

export const rawExcelDataAtom = atom({
  key: 'rawExcelDataAtom',
  default: null,
});

export const uploadStatusAtom = atom({
  key: 'uploadStatusAtom',
  default: 'idle',
  effects: [idbEffect(STORES.STATE, 'uploadStatus')],
});

export const uploadedFileNameAtom = atom({
  key: 'uploadedFileNameAtom',
  default: '',
  effects: [idbEffect(STORES.STATE, 'uploadedFileName')],
});

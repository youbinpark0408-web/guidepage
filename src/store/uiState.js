import { atom } from 'recoil';

// localStorage 동기 읽기 (IDB 비동기보다 빠름 → FOUC 방지)
const themeEffect = ({ setSelf, onSet }) => {
  try {
    const saved = localStorage.getItem('guidepage_dark');
    if (saved !== null) setSelf(saved === 'true');
  } catch {}
  onSet((val, _, isReset) => {
    try {
      if (isReset) localStorage.removeItem('guidepage_dark');
      else localStorage.setItem('guidepage_dark', String(val));
    } catch {}
  });
};

export const darkModeAtom = atom({
  key: 'darkModeAtom',
  default: false,
  effects: [themeEffect],
});

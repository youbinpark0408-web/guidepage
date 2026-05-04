import React, { useEffect } from 'react';
import { RecoilRoot, useRecoilValue } from 'recoil';
import { darkModeAtom } from './store/uiState';
import MainPage from './pages/MainPage';

// html[data-theme] 을 darkModeAtom 과 동기화
const ThemeApplicator = () => {
  const darkMode = useRecoilValue(darkModeAtom);
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);
  return null;
};

const App = () => (
  <RecoilRoot>
    <ThemeApplicator />
    <MainPage />
  </RecoilRoot>
);

export default App;

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/global.css';
import App from './App.jsx';

// 다크모드 FOUC 방지: React 렌더 전 테마 적용
try {
  const dark = localStorage.getItem('guidepage_dark') === 'true';
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
} catch {}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import CompanionBridge from './components/companion/CompanionBridge';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <CompanionBridge />
  </StrictMode>
);

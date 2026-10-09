import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import './styles.css';
import './styles/ui.css';
import './styles/tags.css';

const root = document.getElementById('root');
if (root === null) {
  throw new Error('#root is missing');
}
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

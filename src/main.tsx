import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { migrateWorkspaceSchema } from './utils/storage';
import favicon from './assets/favicon.svg?inline';

migrateWorkspaceSchema();

document.getElementById('app-favicon')?.setAttribute('href', favicon);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

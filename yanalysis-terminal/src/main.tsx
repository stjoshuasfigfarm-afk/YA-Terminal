import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

import { TerminalProvider } from './context/TerminalContext.tsx';
import { CompaniesProvider } from './context/CompaniesContext.tsx';

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <CompaniesProvider>
        <TerminalProvider>
          <App />
        </TerminalProvider>
      </CompaniesProvider>
    </StrictMode>,
  );
}


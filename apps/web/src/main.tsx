import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Locally bundled fonts for 100% reliable offline/online rendering
import '@fontsource/caveat/400.css';
import '@fontsource/caveat/600.css';
import '@fontsource/caveat/700.css';
import '@fontsource/inter/300.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';

import { registerServiceWorker } from './pwa/registerServiceWorker';

// Register PWA Service Worker
registerServiceWorker();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Failed to find root element');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

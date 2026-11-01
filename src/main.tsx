import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './routes';
import { bootstrapMeta } from './db/settings';
import { folderSyncSupported, startAutoSync } from './db/folderSync';
import { persistOnFirstAction, registerSW } from './pwa';
import './theme/tokens.css';
import './theme/global.css';

void bootstrapMeta();
registerSW();
persistOnFirstAction();
if (folderSyncSupported()) startAutoSync();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { MantineProvider, DirectionProvider } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';
import { SpotlightProvider } from './components/GlobalSearch';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/spotlight/styles.css';
import 'mantine-datatable/styles.css';
import './global.css';
import rallyTheme from './theme/rallyTheme';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <DirectionProvider initialDirection="rtl">
      <MantineProvider theme={rallyTheme} defaultColorScheme="dark">
        <ModalsProvider>
          <Notifications position="bottom-right" />
          <BrowserRouter>
            <SpotlightProvider>
              <App />
            </SpotlightProvider>
          </BrowserRouter>
        </ModalsProvider>
      </MantineProvider>
    </DirectionProvider>
  </React.StrictMode>
);

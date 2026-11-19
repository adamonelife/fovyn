import React from 'react';
import { createRoot } from 'react-dom/client';
import { AdamApp } from './AdamApp';
import './adam.css';
// Separate loopback review entry. Uses the existing SDK with a disposable
// local database harness; never imports hosted configuration or AI providers.
createRoot(document.getElementById('root')!).render(<React.StrictMode><AdamApp /></React.StrictMode>);

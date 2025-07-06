/* filepath: /home/seif/Desktop/personal_projects/autonomous_snake/snake-rl-agent/src/index.tsx */
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './App.css';

const container = document.getElementById('root');
const root = createRoot(container!);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
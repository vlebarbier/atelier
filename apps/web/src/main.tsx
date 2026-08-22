import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';
import './da-v3.css';

const root = document.getElementById('root');
if (!root) throw new Error('Element racine introuvable');

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

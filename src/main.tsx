import { createRoot } from 'react-dom/client';
import { App } from './App';
import './ui/hud.css';

// StrictMode is omitted on purpose: it would boot the Phaser game twice in development.
createRoot(document.getElementById('root')!).render(<App />);

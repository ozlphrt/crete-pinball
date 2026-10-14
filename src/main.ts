import './style.css';
import { GameApp } from './app/gameApp';

window.addEventListener('DOMContentLoaded', async () => {
  const app = new GameApp();
  (window as unknown as { __gameApp?: GameApp }).__gameApp = app;
  try {
    await app.start('game-container');
  } catch (error) {
    console.error('Failed to start Crete Pinball:', error);
  }
});

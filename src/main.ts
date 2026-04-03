/**
 * Solitaire Photos — Entry point.
 *
 * Bootstraps the UIShell which manages the entire application lifecycle:
 * menu screen → game screen → end screen.
 */
import './styles/global.css';
import { UIShell } from './ui/ui-shell';

const app = document.querySelector<HTMLDivElement>('#app');
if (app) {
  const shell = new UIShell(app);
  shell.init();
}

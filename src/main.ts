/**
 * Solitaire Photos — Entry point.
 *
 * Bootstraps the application: initializes the UI shell, game engine,
 * and wires up services. Renders into the #app container.
 */
import './styles/global.css';

function createAppShell(container: HTMLDivElement): void {
  const header = document.createElement('header');

  const title = document.createElement('h1');
  title.textContent = '\u2660 Solitaire Photos';
  header.appendChild(title);

  const subtitle = document.createElement('p');
  subtitle.textContent = 'Klondike solitaire with your Google Photos as card backs.';
  header.appendChild(subtitle);

  const main = document.createElement('main');
  main.id = 'board';

  const placeholder = document.createElement('p');
  placeholder.className = 'placeholder';
  placeholder.textContent = 'Game board will render here.';
  main.appendChild(placeholder);

  container.appendChild(header);
  container.appendChild(main);
}

const app = document.querySelector<HTMLDivElement>('#app');
if (app) {
  createAppShell(app);
}

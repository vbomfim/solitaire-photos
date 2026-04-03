/**
 * Solitaire Photos — Entry point.
 *
 * Bootstraps the application: initializes the UI shell, game engine,
 * and wires up services. Renders into the #app container.
 */
import './style.css';

const app = document.querySelector<HTMLDivElement>('#app');
if (app) {
  app.innerHTML = `
    <header>
      <h1>♠ Solitaire Photos</h1>
      <p>Klondike solitaire with your Google Photos as card backs.</p>
    </header>
    <main id="board">
      <p class="placeholder">Game board will render here.</p>
    </main>
  `;
}

import { PhaserGame } from './game/PhaserGame';
import { Hud } from './ui/Hud';

export function App() {
  return (
    <div className="app">
      <PhaserGame />
      <Hud />
    </div>
  );
}

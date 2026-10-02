import { GameButton, Panel } from './kit';

export function HelpPanel({ onClose }: { onClose: () => void }) {
  return (
    <div className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center bg-ink/60 p-4" onClick={onClose}>
      <Panel className="animate-pop max-h-full w-full max-w-lg overflow-y-auto">
        <div onClick={(e) => e.stopPropagation()}>
          <h2 className="mb-3 text-3xl font-black">Cómo se juega</h2>
          <p className="mb-3 font-bold text-white/85">
            Todos jugáis el mismo hoyo a la vez. Gana quien emboque con <b>menos golpes</b>; a igualdad, quien tarde <b>menos tiempo</b>.
          </p>
          <ul className="mb-4 list-disc space-y-1 pl-5 text-sm font-bold text-white/85">
            <li>Arrastra hacia atrás desde cualquier punto y suelta: cuanto más arrastres, más fuerte. La flecha se pone roja con demasiada potencia.</li>
            <li>La línea de puntos muestra el recorrido previsto, los rebotes y dónde se parará la bola.</li>
            <li>Agua o fuera del campo: +1 golpe y la bola vuelve a su última posición.</li>
            <li>La arena frena, los aceleradores naranjas impulsan y las rampas exigen fuerza para subir.</li>
            <li>Molinos y barreras se mueven siempre igual: aprende el ritmo.</li>
            <li>Al embocar pasas a modo espectador para ver al resto.</li>
          </ul>
          <table className="mb-4 w-full text-sm">
            <tbody className="[&_td]:py-1">
              <tr><td className="font-black">Apuntar y golpear</td><td>Arrastrar y soltar (ratón o dedo)</td></tr>
              <tr><td className="font-black">Cancelar</td><td>Esc · segundo dedo</td></tr>
              <tr><td className="font-black">Cámara</td><td>Clic derecho, Q/E, flechas · dos dedos</td></tr>
              <tr><td className="font-black">Zoom</td><td>Rueda, + / − · pellizcar</td></tr>
              <tr><td className="font-black">Vista general</td><td>V · botón 🗺</td></tr>
              <tr><td className="font-black">Espectador</td><td>Tab / Mayús+Tab · botones ◀ ▶</td></tr>
              <tr><td className="font-black">Reiniciar bola</td><td>R (vuelve a la última posición)</td></tr>
            </tbody>
          </table>
          <GameButton onClick={onClose} className="w-full">
            ¡Entendido!
          </GameButton>
        </div>
      </Panel>
    </div>
  );
}

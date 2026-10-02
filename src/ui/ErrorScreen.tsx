interface Props {
  message: string;
  onRetry: () => void;
  /** Si se indica, botón para jugar sin conexión (errores del servidor online). */
  onPractice?: () => void;
}

export function ErrorScreen({ message, onRetry, onPractice }: Props) {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-ink/90 p-4">
      <div className="max-w-md rounded-3xl border-4 border-white/20 bg-ink p-6 text-center shadow-2xl">
        <h2 className="mb-2 text-3xl font-black text-danger">¡Ups!</h2>
        <p className="mb-6 text-lg">{message}</p>
        <div className="flex flex-wrap justify-center gap-3">
          {onPractice && (
            <button
              onClick={onPractice}
              className="rounded-2xl bg-grass px-6 py-3 text-xl font-black text-ink shadow-[0_5px_0_#3d7a2a] active:translate-y-1 active:shadow-none"
            >
              ⛳ Jugar práctica local
            </button>
          )}
          <button
            onClick={onRetry}
            className={`rounded-2xl px-6 py-3 text-xl font-black active:translate-y-1 active:shadow-none ${onPractice ? 'bg-white/15 text-white shadow-[0_5px_0_rgba(0,0,0,0.35)]' : 'bg-sun text-ink shadow-[0_5px_0_#b8901a]'}`}
          >
            Volver al menú
          </button>
        </div>
      </div>
    </div>
  );
}

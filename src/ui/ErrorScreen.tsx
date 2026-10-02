interface Props {
  message: string;
  onRetry: () => void;
}

export function ErrorScreen({ message, onRetry }: Props) {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-ink/90 p-4">
      <div className="max-w-md rounded-3xl border-4 border-white/20 bg-ink p-6 text-center shadow-2xl">
        <h2 className="mb-2 text-3xl font-black text-danger">¡Ups!</h2>
        <p className="mb-6 text-lg">{message}</p>
        <button
          onClick={onRetry}
          className="rounded-2xl bg-sun px-6 py-3 text-xl font-black text-ink shadow-[0_5px_0_#b8901a] active:translate-y-1 active:shadow-none"
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}

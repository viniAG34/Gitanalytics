export function AvisoDeAnaliseIndisponivel() {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-yellow-800 bg-yellow-900/20 p-4">
      <svg className="mt-0.5 h-5 w-5 shrink-0 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
      </svg>
      <p className="text-sm text-yellow-300">
        Análise temporariamente indisponível. Os dados brutos do GitHub estão disponíveis abaixo.
      </p>
    </div>
  );
}

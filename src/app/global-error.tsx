"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body className="min-h-screen bg-[#0A0A0B] text-white antialiased flex items-center justify-center px-4">
        <div className="text-center max-w-md p-8 rounded-2xl bg-[#141416] border border-[#1F1F22]">
          <div className="text-4xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold mb-2">Something went wrong</h1>
          <p className="text-sm text-[#A1A1AA] mb-6">
            {error.message || "An unexpected error occurred."}
          </p>
          <button
            onClick={reset}
            className="px-6 py-2.5 rounded-xl bg-[#4A9EFF] text-white font-semibold text-sm hover:bg-[#3A7FD4] transition-colors"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}

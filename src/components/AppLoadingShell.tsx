type AppLoadingShellProps = {
  title: string;
  description?: string;
  blocks?: number;
};

export default function AppLoadingShell({
  title,
  description,
  blocks = 3,
}: AppLoadingShellProps) {
  return (
    <div className="mx-auto max-w-3xl animate-pulse px-4 py-10">
      <div className="mb-8">
        <div className="mb-3 h-8 w-48 rounded-xl bg-white/8" aria-hidden="true" />
        <span className="sr-only">{title}</span>
        {description ? <div className="h-4 w-full max-w-xl rounded bg-white/6" /> : null}
      </div>

      <div className="mb-6 rounded-2xl border border-white/8 bg-white/[0.03] p-5">
        <div className="mb-3 h-4 w-28 rounded bg-white/8" />
        <div className="mb-2 h-5 w-full max-w-lg rounded bg-white/6" />
        <div className="h-4 w-full max-w-xl rounded bg-white/5" />
        <div className="mt-4 flex flex-wrap gap-2">
          <div className="h-8 w-36 rounded-full bg-white/6" />
          <div className="h-8 w-40 rounded-full bg-white/5" />
          <div className="h-8 w-32 rounded-full bg-white/5" />
        </div>
      </div>

      <div className="space-y-3">
        {Array.from({ length: blocks }, (_, index) => (
          <div
            key={index}
            className="rounded-2xl border border-white/8 bg-white/[0.02] p-4"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="w-full max-w-md">
                <div className="mb-2 h-5 w-2/3 rounded bg-white/8" />
                <div className="mb-2 h-4 w-full rounded bg-white/6" />
                <div className="h-4 w-5/6 rounded bg-white/5" />
              </div>
              <div className="h-6 w-24 rounded-full bg-white/6" />
            </div>
            <div className="flex gap-2">
              <div className="h-8 w-28 rounded-xl bg-white/6" />
              <div className="h-8 w-24 rounded-xl bg-white/5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

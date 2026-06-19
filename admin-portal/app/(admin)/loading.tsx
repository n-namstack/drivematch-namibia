export default function Loading() {
  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto animate-pulse">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-slate-200" />
        <div className="space-y-2">
          <div className="h-5 w-36 bg-slate-200 rounded-md" />
          <div className="h-3 w-24 bg-slate-100 rounded-md" />
        </div>
      </div>

      {/* Table card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Column headers */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-3.5 flex gap-10">
          <div className="h-2.5 w-24 bg-slate-200 rounded" />
          <div className="h-2.5 w-32 bg-slate-200 rounded" />
          <div className="h-2.5 w-16 bg-slate-200 rounded" />
          <div className="h-2.5 w-16 bg-slate-200 rounded" />
          <div className="h-2.5 w-20 bg-slate-200 rounded" />
          <div className="h-2.5 w-20 bg-slate-200 rounded" />
        </div>

        {/* Skeleton rows */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-10 px-5 py-4 border-b border-slate-100"
            style={{ opacity: 1 - i * 0.08 }}
          >
            <div className="flex items-center gap-2.5 w-36">
              <div className="w-8 h-8 rounded-full bg-slate-200 flex-shrink-0" />
              <div className="h-3.5 w-24 bg-slate-200 rounded" />
            </div>
            <div className="h-3 w-36 bg-slate-100 rounded" />
            <div className="h-5 w-14 bg-slate-100 rounded-full" />
            <div className="h-5 w-14 bg-slate-100 rounded-full" />
            <div className="h-3 w-20 bg-slate-100 rounded" />
            <div className="h-3 w-20 bg-slate-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}

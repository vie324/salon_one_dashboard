export default function Loading() {
  return (
    <div className="animate-fade-in">
      <div className="mb-6 space-y-2">
        <div className="skeleton h-7 w-56" />
        <div className="skeleton h-4 w-96 max-w-full" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card p-5">
            <div className="skeleton h-4 w-20" />
            <div className="skeleton mt-3 h-7 w-28" />
            <div className="skeleton mt-3 h-9 w-full" />
          </div>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="card p-5 xl:col-span-8">
          <div className="skeleton h-5 w-32" />
          <div className="skeleton mt-4 h-64 w-full" />
        </div>
        <div className="card p-5 xl:col-span-4">
          <div className="skeleton h-5 w-28" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton h-10 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

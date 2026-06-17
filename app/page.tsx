export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-gray-900">
          CodeLens AI
        </h1>
        <p className="text-lg text-gray-500">
          AI-powered code review for every pull request
        </p>
        <span className="inline-block rounded-full bg-purple-100 px-4 py-1 text-sm font-medium text-purple-700">
          Week 1 — Foundation ✓
        </span>
      </div>
    </main>
  );
}
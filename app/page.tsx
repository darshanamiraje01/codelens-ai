// app/page.tsx
import { auth, signOut } from "@/lib/auth/config-actions";

export default async function HomePage() {
  const session = await auth();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-gray-900">CodeLens AI</h1>
        <p className="text-lg text-gray-500">
          AI-powered code review for every pull request
        </p>
        <span className="inline-block rounded-full bg-purple-100 px-4 py-1 text-sm font-medium text-purple-700">
          Week 2 — Authentication ✓
        </span>

        {session?.user && (
          <div className="pt-6 space-y-3">
            <p className="text-sm text-gray-600">
              Logged in as{" "}
              <span className="font-medium">{session.user.githubLogin}</span>
            </p>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button
                type="submit"
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
              >
                Sign out
              </button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
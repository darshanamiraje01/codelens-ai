// app/(dashboard)/layout.tsx
// Root layout for all dashboard pages.
// Handles auth check — redirects to /login if not authenticated.
// Renders sidebar + navbar + page content side by side.

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config-actions";
import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side auth check — redirect if not logged in
  // This is a second layer of protection beyond the proxy
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar — fixed left column */}
      <Sidebar />

      {/* Main content — scrollable right column */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar session={session} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
// components/layout/Navbar.tsx
// Top navigation bar showing current user and sign out button.
// Receives session data as props from the Server Component layout.

import { signOut } from "@/lib/auth/config-actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import type { Session } from "next-auth";

interface NavbarProps {
  session: Session;
}

export function Navbar({ session }: NavbarProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
      <div />

      {/* User section */}
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-medium leading-none">
            {session.user.githubLogin}
          </p>
          <p className="text-xs text-muted-foreground">
            {session.user.email ?? "GitHub User"}
          </p>
        </div>

        <Avatar className="h-8 w-8">
          <AvatarImage
            src={session.user.avatarUrl}
            alt={session.user.githubLogin}
          />
          <AvatarFallback>
            {session.user.githubLogin?.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <Button variant="ghost" size="icon" type="submit">
            <LogOut className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </header>
  );
}
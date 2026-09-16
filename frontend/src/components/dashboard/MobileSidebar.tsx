import { useState } from "react";
import { Link } from "react-router-dom";
import { useUser, useClerk } from "@clerk/react";
import {
  LogOut,
  Menu,
  Settings,
  User,
} from "lucide-react";

import { Logo } from "@/components/brand/logo";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import { DashboardNavigation } from "./DashboardNavigation";

export function MobileSidebar() {
  const [open, setOpen] = useState(false);
  const { user } = useUser();
  const { signOut } = useClerk();

  // Build initials: "Sagar Bist" → "SB"
  const initials =
    (user?.firstName?.[0] ?? "") + (user?.lastName?.[0] ?? "") ||
    user?.username?.[0]?.toUpperCase() ||
    "?";

  const displayName =
    user?.fullName ||
    user?.username ||
    "User";

  const displayEmail =
    user?.primaryEmailAddress?.emailAddress || "";

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur lg:hidden">
      <Link to="/">
        <Logo />
      </Link>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          aria-label="Open navigation"
          className="-mr-2 p-2"
        >
          <Menu className="h-5 w-5" />
        </SheetTrigger>

        <SheetContent
          side="left"
          className="w-64 bg-card p-4"
        >
          <SheetTitle className="px-1 pb-6 text-left">
            <Logo />
          </SheetTitle>

          <DashboardNavigation
            onNavigate={() => setOpen(false)}
          />

          <div className="mt-8 border-t border-border pt-4">
            <div className="flex items-center gap-3 px-1">
              {user?.imageUrl ? (
                <img
                  src={user.imageUrl}
                  alt={displayName}
                  className="h-8 w-8 rounded-md object-cover"
                />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary font-mono text-[11px] text-primary-foreground">
                  {initials.toUpperCase()}
                </span>
              )}

              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium">
                  {displayName}
                </p>

                <p className="truncate font-mono text-[10px] text-muted-foreground">
                  {displayEmail}
                </p>
              </div>
            </div>

            <div className="mt-3 flex flex-col gap-0.5">
              <Link
                to="/profile"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
              >
                <User className="h-4 w-4" />
                Profile
              </Link>

              <Link
                to="/profile"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
              >
                <Settings className="h-4 w-4" />
                Settings
              </Link>

              <button
                onClick={() => {
                  setOpen(false);
                  signOut({ redirectUrl: "/" });
                }}
                className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-[13px] text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
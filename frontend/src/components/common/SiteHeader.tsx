import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
      <div className="shell flex h-14 items-center justify-between">
        <Link
          to="/"
          className="flex items-center"
          onClick={() => setOpen(false)}
        >
          <Logo />
        </Link>

        {/* Desktop navigation */}
        <div className="hidden items-center gap-2 md:flex">
          <Button asChild variant="ghost" size="sm">
            <Link to="/login">Sign in</Link>
          </Button>

          <Button asChild size="sm">
            <Link to="/new-interview">Start Interview</Link>
          </Button>
        </div>

        {/* Mobile menu button */}
        <button
          className="-mr-2 p-2 md:hidden"
          aria-label="Toggle menu"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Mobile navigation */}
      {open && (
        <div className="border-t border-border bg-background md:hidden">
          <div className="shell flex gap-2 py-4">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="flex-1"
            >
              <Link to="/login" onClick={() => setOpen(false)}>
                Sign in
              </Link>
            </Button>

            <Button asChild size="sm" className="flex-1">
              <Link
                to="/new-interview"
                onClick={() => setOpen(false)}
              >
                Start Interview
              </Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
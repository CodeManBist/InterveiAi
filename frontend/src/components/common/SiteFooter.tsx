import { Link } from "react-router-dom";

import { Logo } from "@/components/brand/logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="shell flex flex-col gap-6 py-10 sm:flex-row sm:items-center sm:justify-between">
        <Logo />

        <nav className="flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-muted-foreground">
          <Link
            to="/interview/new"
            className="transition-colors hover:text-foreground"
          >
            Product
          </Link>

          <Link
            to="/login"
            className="transition-colors hover:text-foreground"
          >
            Privacy
          </Link>

          <Link
            to="/login"
            className="transition-colors hover:text-foreground"
          >
            Terms
          </Link>

          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="transition-colors hover:text-foreground"
          >
            GitHub
          </a>
        </nav>

        <p className="font-mono text-xs text-muted-foreground">
          © 2026 Intervue
        </p>
      </div>
    </footer>
  );
}
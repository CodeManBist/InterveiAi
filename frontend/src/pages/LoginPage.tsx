import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSignIn } from "@clerk/react";

import { AuthLayout } from "../components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function GoogleIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="M21.35 12.27c0-.71-.06-1.39-.18-2.05H12v3.88h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.69 2.91-4.18 2.91-7.22Z"
      />
      <path
        fill="currentColor"
        d="M12 21.75c2.63 0 4.84-.87 6.45-2.36l-3.14-2.45c-.87.58-1.98.92-3.31.92-2.54 0-4.69-1.72-5.46-4.03H3.3v2.53A9.74 9.74 0 0 0 12 21.75Z"
      />
      <path
        fill="currentColor"
        d="M6.54 13.83A5.86 5.86 0 0 1 6.23 12c0-.64.11-1.26.31-1.83V7.64H3.3A9.75 9.75 0 0 0 2.25 12c0 1.57.38 3.05 1.05 4.36l3.24-2.53Z"
      />
      <path
        fill="currentColor"
        d="M12 6.14c1.43 0 2.72.49 3.73 1.45l2.8-2.8C16.84 3.14 14.63 2.25 12 2.25a9.74 9.74 0 0 0-8.7 5.39l3.24 2.53c.77-2.31 2.92-1.05 2.75-1.05Z"
      />
    </svg>
  );
}

function GithubIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 2C6.48 2 2 6.58 2 12.24c0 4.52 2.87 8.35 6.84 9.7.5.1.68-.22.68-.49 0-.24-.01-.88-.01-1.73-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.5-1.11-1.5-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.38.1-2.72 0 0 .84-.28 2.75 1.05A9.3 9.3 0 0 1 12 8.24c.85 0 1.71.12 2.51.36 1.91-1.33 2.75-1.05 2.75-1.05.55 1.34.2 2.46.1 2.72.64.72 1.03 1.63 1.03 2.75 0 3.93-2.34 4.8-4.57 5.06.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.8 0 .27.18.59.69.49A10.25 10.25 0 0 0 22 12.24C22 6.58 17.52 2 12 2Z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M18.244 2H21.5l-7.11 8.13L22.75 22h-6.7l-5.25-6.86L4.8 22H1.54l7.61-8.7L1.25 2H8.1l4.74 6.26L18.244 2Zm-1.14 17.8h1.8L6.98 4.08H5.05L17.1 19.8Z" />
    </svg>
  );
}

function LoginPage() {
  const navigate = useNavigate();
  const { signIn, errors, fetchStatus } = useSignIn();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");

  const loading = fetchStatus === "fetching";

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    setError("");

    const { error: signInError } = await signIn.password({
      emailAddress: email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      return;
    }

    if (signIn.status === "complete") {
      await signIn.finalize({
        navigate: async ({ decorateUrl }) => {
          const url = decorateUrl("/dashboard");

          if (url.startsWith("http")) {
            window.location.href = url;
          } else {
            navigate(url);
          }
        },
      });

      return;
    }

    if (signIn.status === "needs_second_factor") {
      setError(
        "Additional verification is required. Please complete your second-factor verification."
      );
      return;
    }

    if (signIn.status === "needs_client_trust") {
      setError(
        "Additional device verification is required."
      );
      return;
    }

    setError("Unable to complete sign in.");
  };

  const handleOAuth = async (
    strategy: "oauth_google" | "oauth_github" | "oauth_x"
  ) => {
    setError("");

    const { error: oauthError } = await signIn.sso({
      strategy,
      redirectCallbackUrl: "/sso-callback",
      redirectUrl: "/dashboard",
    });

    if (oauthError) {
      setError(oauthError.message);
    }
  };

  return (
    <AuthLayout>
      <h1 className="text-2xl font-semibold tracking-tight">
        Welcome back
      </h1>

      <p className="mt-2 text-sm text-muted-foreground">
        Sign in to continue your practice.
      </p>

      <form
        className="mt-8 space-y-4"
        onSubmit={handleSubmit}
      >
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>

          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="alex.morgan@hey.com"
            autoComplete="email"
            required
          />

          {errors?.fields?.identifier && (
            <p className="text-sm text-destructive">
              {errors.fields.identifier.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>

            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() => navigate("/forgot-password")}
            >
              Forgot password?
            </button>
          </div>

          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />

          {errors?.fields?.password && (
            <p className="text-sm text-destructive">
              {errors.fields.password.message}
            </p>
          )}
        </div>

        {error && (
          <p className="text-sm text-destructive">
            {error}
          </p>
        )}

        <Button
          type="submit"
          className="w-full"
          disabled={loading}
        >
          {loading ? "Signing in..." : "Sign in"}
        </Button>
      </form>

      <div className="my-6 flex items-center gap-4">
        <span className="h-px flex-1 bg-border" />

        <span className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
          or
        </span>

        <span className="h-px flex-1 bg-border" />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => handleOAuth("oauth_google")}
          disabled={loading}
          aria-label="Continue with Google"
        >
          <GoogleIcon />
          <span className="sr-only">
            Continue with Google
          </span>
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={() => handleOAuth("oauth_github")}
          disabled={loading}
          aria-label="Continue with GitHub"
        >
          <GithubIcon />
          <span className="sr-only">
            Continue with GitHub
          </span>
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={() => handleOAuth("oauth_x")}
          disabled={loading}
          aria-label="Continue with X"
        >
          <XIcon />
          <span className="sr-only">
            Continue with X
          </span>
        </Button>
      </div>

      <p className="mt-8 text-sm text-muted-foreground">
        New here?{" "}
        <Link
          to="/signup"
          className="font-medium text-primary hover:underline"
        >
          Create account
        </Link>
      </p>
    </AuthLayout>
  );
}

export default LoginPage;
// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import LoginPage from "./LoginPage";
import SignupPage from "./SignupPage";

const clerk = vi.hoisted(() => ({
  useSignIn: vi.fn(),
  useSignUp: vi.fn(),
}));

vi.mock("@clerk/react", () => ({
  useSignIn: clerk.useSignIn,
  useSignUp: clerk.useSignUp,
}));

function renderRoute(element: React.ReactNode) {
  return render(
    <MemoryRouter initialEntries={["/auth"]}>
      <Routes>
        <Route path="/auth" element={element} />
        <Route path="/dashboard" element={<div>Dashboard destination</div>} />
        <Route path="/forgot-password" element={<div>Reset destination</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

function signInMock(status = "complete") {
  const signIn = {
    status,
    password: vi.fn().mockResolvedValue({ error: null }),
    sso: vi.fn().mockResolvedValue({ error: null }),
    finalize: vi.fn().mockImplementation(async ({ navigate }) => {
      await navigate({ decorateUrl: (url: string) => url });
    }),
  };
  clerk.useSignIn.mockReturnValue({ signIn, errors: null, fetchStatus: "idle" });
  return signIn;
}

function signUpMock(status = "missing_requirements") {
  const signUp = {
    status,
    password: vi.fn().mockResolvedValue({ error: null }),
    sso: vi.fn().mockResolvedValue({ error: null }),
    verifications: {
      sendEmailCode: vi.fn().mockResolvedValue({ error: null }),
      verifyEmailCode: vi.fn().mockResolvedValue({ error: null }),
    },
    finalize: vi.fn().mockImplementation(async ({ navigate }) => {
      await navigate({ decorateUrl: (url: string) => url });
    }),
  };
  clerk.useSignUp.mockReturnValue({ signUp, errors: null, fetchStatus: "idle" });
  return signUp;
}

async function fillLogin(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Email"), "ada@example.test");
  await user.type(screen.getByLabelText("Password"), "correct horse battery staple");
  await user.click(screen.getByRole("button", { name: "Sign in" }));
}

async function fillSignup(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("First name"), "Ada");
  await user.type(screen.getByLabelText("Last name"), "Lovelace");
  await user.type(screen.getByLabelText("Username"), "ada");
  await user.type(screen.getByLabelText("Email"), "ada@example.test");
  await user.type(screen.getByLabelText("Password"), "correct horse battery staple");
  await user.click(screen.getByRole("button", { name: "Create account" }));
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe("LoginPage", () => {
  it("submits credentials and finalizes a completed sign-in", async () => {
    const user = userEvent.setup();
    const signIn = signInMock();
    renderRoute(<LoginPage />);

    await fillLogin(user);

    expect(signIn.password).toHaveBeenCalledWith({
      emailAddress: "ada@example.test",
      password: "correct horse battery staple",
    });
    expect(signIn.finalize).toHaveBeenCalledOnce();
    expect(await screen.findByText("Dashboard destination")).toBeTruthy();
  });

  it("shows a Clerk password error without finalizing", async () => {
    const user = userEvent.setup();
    const signIn = signInMock();
    signIn.password.mockResolvedValue({ error: { message: "Invalid credentials" } });
    renderRoute(<LoginPage />);

    await fillLogin(user);

    expect(await screen.findByText("Invalid credentials")).toBeTruthy();
    expect(signIn.finalize).not.toHaveBeenCalled();
  });

  it.each([
    ["needs_second_factor", "Additional verification is required"],
    ["needs_client_trust", "Additional device verification is required"],
    ["missing_requirements", "Unable to complete sign in"],
  ])("handles the %s boundary", async (status, message) => {
    const user = userEvent.setup();
    const signIn = signInMock(status);
    renderRoute(<LoginPage />);

    await fillLogin(user);

    expect(await screen.findByText(new RegExp(message))).toBeTruthy();
    expect(signIn.finalize).not.toHaveBeenCalled();
  });

  it("starts each configured social sign-in with the shared callback", async () => {
    const user = userEvent.setup();
    const signIn = signInMock();
    renderRoute(<LoginPage />);

    for (const provider of ["Google", "GitHub", "X"]) {
      await user.click(screen.getByRole("button", { name: `Continue with ${provider}` }));
    }

    expect(signIn.sso.mock.calls).toEqual([
      [{ strategy: "oauth_google", redirectCallbackUrl: "/sso-callback", redirectUrl: "/dashboard" }],
      [{ strategy: "oauth_github", redirectCallbackUrl: "/sso-callback", redirectUrl: "/dashboard" }],
      [{ strategy: "oauth_x", redirectCallbackUrl: "/sso-callback", redirectUrl: "/dashboard" }],
    ]);
  });

  it("routes the forgot-password control to the reset flow", async () => {
    signInMock();
    renderRoute(<LoginPage />);

    await userEvent.click(screen.getByRole("button", { name: "Forgot password?" }));

    expect(screen.getByText("Reset destination")).toBeTruthy();
  });
});

describe("SignupPage", () => {
  it("creates credentials, sends a code, verifies it, and finalizes", async () => {
    const user = userEvent.setup();
    const signUp = signUpMock();
    renderRoute(<SignupPage />);

    await fillSignup(user);

    expect(signUp.password).toHaveBeenCalledWith({
      emailAddress: "ada@example.test",
      password: "correct horse battery staple",
      firstName: "Ada",
      lastName: "Lovelace",
      username: "ada",
    });
    expect(signUp.verifications.sendEmailCode).toHaveBeenCalledOnce();
    expect(await screen.findByText("Verify your email")).toBeTruthy();

    signUp.status = "complete";
    await user.type(screen.getByLabelText("Verification code"), "123456");
    await user.click(screen.getByRole("button", { name: "Verify email" }));

    expect(signUp.verifications.verifyEmailCode).toHaveBeenCalledWith({ code: "123456" });
    expect(signUp.finalize).toHaveBeenCalledOnce();
    expect(await screen.findByText("Dashboard destination")).toBeTruthy();
  });

  it("stops before verification when credential creation fails", async () => {
    const user = userEvent.setup();
    const signUp = signUpMock();
    signUp.password.mockResolvedValue({ error: { message: "Username is taken" } });
    renderRoute(<SignupPage />);

    await fillSignup(user);

    expect(await screen.findByText("Username is taken")).toBeTruthy();
    expect(signUp.verifications.sendEmailCode).not.toHaveBeenCalled();
  });

  it("keeps the form available when sending the verification code fails", async () => {
    const user = userEvent.setup();
    const signUp = signUpMock();
    signUp.verifications.sendEmailCode.mockResolvedValue({
      error: { message: "Email delivery failed" },
    });
    renderRoute(<SignupPage />);

    await fillSignup(user);

    expect(await screen.findByText("Email delivery failed")).toBeTruthy();
    expect(screen.queryByText("Verify your email")).toBeNull();
  });

  it("surfaces verification errors without finalizing", async () => {
    const user = userEvent.setup();
    const signUp = signUpMock();
    signUp.verifications.verifyEmailCode.mockResolvedValue({
      error: { message: "Code expired" },
    });
    renderRoute(<SignupPage />);
    await fillSignup(user);
    await user.type(await screen.findByLabelText("Verification code"), "000000");
    await user.click(screen.getByRole("button", { name: "Verify email" }));

    expect(await screen.findByText("Code expired")).toBeTruthy();
    expect(signUp.finalize).not.toHaveBeenCalled();
  });

  it("reports an incomplete sign-up after a valid verification code", async () => {
    const user = userEvent.setup();
    const signUp = signUpMock("missing_requirements");
    renderRoute(<SignupPage />);
    await fillSignup(user);
    await user.type(await screen.findByLabelText("Verification code"), "123456");
    await user.click(screen.getByRole("button", { name: "Verify email" }));

    expect(await screen.findByText("Unable to complete account creation.")).toBeTruthy();
    expect(signUp.finalize).not.toHaveBeenCalled();
  });

  it("starts each configured social sign-up with the shared callback", async () => {
    const user = userEvent.setup();
    const signUp = signUpMock();
    renderRoute(<SignupPage />);

    for (const provider of ["Google", "GitHub", "X"]) {
      await user.click(screen.getByRole("button", { name: `Continue with ${provider}` }));
    }

    expect(signUp.sso.mock.calls).toEqual([
      [{ strategy: "oauth_google", redirectCallbackUrl: "/sso-callback", redirectUrl: "/dashboard" }],
      [{ strategy: "oauth_github", redirectCallbackUrl: "/sso-callback", redirectUrl: "/dashboard" }],
      [{ strategy: "oauth_x", redirectCallbackUrl: "/sso-callback", redirectUrl: "/dashboard" }],
    ]);
  });
});

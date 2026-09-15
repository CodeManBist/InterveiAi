import assert from "node:assert/strict";
import { beforeEach, mock, test } from "node:test";

let stateCursor;
let stateValues;
let stateUpdates;
let navigationCalls;
let signIn;
let signUp;

globalThis.React = {
  createElement(type, props, ...children) {
    return {
      type,
      props: {
        ...(props ?? {}),
        children:
          children.length === 0
            ? undefined
            : children.length === 1
              ? children[0]
              : children,
      },
    };
  },
};

const AuthLayout = () => null;
const Button = () => null;
const Input = () => null;
const Label = () => null;
const Link = () => null;

mock.module("react", {
  namedExports: {
    useState(initialValue) {
      const index = stateCursor;
      stateCursor += 1;
      const value = index < stateValues.length ? stateValues[index] : initialValue;
      return [value, (nextValue) => stateUpdates.push([index, nextValue])];
    },
  },
});
mock.module("react-router-dom", {
  namedExports: {
    Link,
    useNavigate: () => (url) => navigationCalls.push(url),
  },
});
mock.module("@clerk/react", {
  namedExports: {
    useSignIn: () => ({ signIn, errors: undefined, fetchStatus: "idle" }),
    useSignUp: () => ({ signUp, errors: undefined, fetchStatus: "idle" }),
  },
});
mock.module(
  new URL("../src/components/auth/AuthLayout.tsx", import.meta.url),
  { namedExports: { AuthLayout }, defaultExport: AuthLayout },
);
mock.module(new URL("../src/components/ui/button.tsx", import.meta.url), {
  namedExports: { Button },
});
mock.module(new URL("../src/components/ui/input.tsx", import.meta.url), {
  namedExports: { Input },
});
mock.module(new URL("../src/components/ui/label.tsx", import.meta.url), {
  namedExports: { Label },
});

const { default: LoginPage } = await import("../src/pages/LoginPage.tsx");
const { default: SignupPage } = await import("../src/pages/SignupPage.tsx");

function visit(node, predicate) {
  if (node == null || typeof node === "boolean") return undefined;
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = visit(child, predicate);
      if (found) return found;
    }
    return undefined;
  }
  if (typeof node !== "object") return undefined;
  if (predicate(node)) return node;
  return visit(node.props?.children, predicate);
}

function findForm(tree) {
  const form = visit(tree, (node) => node.type === "form");
  assert.ok(form, "form not rendered");
  return form;
}

function findButton(tree, label) {
  const button = visit(
    tree,
    (node) => node.type === Button && node.props["aria-label"] === label,
  );
  assert.ok(button, `${label} button not rendered`);
  return button;
}

function event() {
  return { preventDefaultCalls: 0, preventDefault() { this.preventDefaultCalls += 1; } };
}

beforeEach(() => {
  stateCursor = 0;
  stateValues = [];
  stateUpdates = [];
  navigationCalls = [];
  signIn = {
    status: "complete",
    async password() {
      return { error: null };
    },
    async sso() {
      return { error: null };
    },
    async finalize({ navigate }) {
      await navigate({ decorateUrl: (url) => url });
    },
  };
  signUp = {
    status: "complete",
    async password() {
      return { error: null };
    },
    verifications: {
      async sendEmailCode() {
        return { error: null };
      },
      async verifyEmailCode() {
        return { error: null };
      },
    },
    async sso() {
      return { error: null };
    },
    async finalize({ navigate }) {
      await navigate({ decorateUrl: (url) => url });
    },
  };
});

test("login submits credentials, finalizes the Clerk session, and navigates internally", async () => {
  stateValues = ["ada@example.test", "correct horse", ""];
  const passwordCalls = [];
  const finalizeCalls = [];
  signIn.password = async (value) => {
    passwordCalls.push(value);
    return { error: null };
  };
  signIn.finalize = async (options) => {
    finalizeCalls.push(options);
    await options.navigate({ decorateUrl: (url) => url });
  };
  const submitEvent = event();

  await findForm(LoginPage()).props.onSubmit(submitEvent);

  assert.equal(submitEvent.preventDefaultCalls, 1);
  assert.deepEqual(passwordCalls, [
    { emailAddress: "ada@example.test", password: "correct horse" },
  ]);
  assert.equal(finalizeCalls.length, 1);
  assert.deepEqual(navigationCalls, ["/dashboard"]);
});

test("login displays a password error without finalizing a session", async () => {
  stateValues = ["ada@example.test", "wrong", ""];
  let finalized = false;
  signIn.password = async () => ({ error: { message: "Invalid credentials" } });
  signIn.finalize = async () => {
    finalized = true;
  };

  await findForm(LoginPage()).props.onSubmit(event());

  assert.equal(finalized, false);
  assert.deepEqual(stateUpdates.at(-1), [2, "Invalid credentials"]);
});

test("login gives a specific response when a second factor is required", async () => {
  stateValues = ["ada@example.test", "correct horse", ""];
  signIn.status = "needs_second_factor";

  await findForm(LoginPage()).props.onSubmit(event());

  assert.deepEqual(stateUpdates.at(-1), [
    2,
    "Additional verification is required. Please complete your second-factor verification.",
  ]);
});

test("login starts GitHub SSO with the configured callback and destination", async () => {
  stateValues = ["", "", ""];
  const ssoCalls = [];
  signIn.sso = async (options) => {
    ssoCalls.push(options);
    return { error: null };
  };

  await findButton(LoginPage(), "Continue with GitHub").props.onClick();

  assert.deepEqual(ssoCalls, [
    {
      strategy: "oauth_github",
      redirectCallbackUrl: "/sso-callback",
      redirectUrl: "/dashboard",
    },
  ]);
});

test("signup creates the account and requests an email verification code", async () => {
  stateValues = [
    "Ada",
    "Lovelace",
    "ada",
    "ada@example.test",
    "correct horse",
    "",
    false,
    "",
  ];
  const passwordCalls = [];
  let emailCodeCalls = 0;
  signUp.password = async (value) => {
    passwordCalls.push(value);
    return { error: null };
  };
  signUp.verifications.sendEmailCode = async () => {
    emailCodeCalls += 1;
    return { error: null };
  };

  await findForm(SignupPage()).props.onSubmit(event());

  assert.deepEqual(passwordCalls, [
    {
      emailAddress: "ada@example.test",
      password: "correct horse",
      firstName: "Ada",
      lastName: "Lovelace",
      username: "ada",
    },
  ]);
  assert.equal(emailCodeCalls, 1);
  assert.deepEqual(stateUpdates.at(-1), [6, true]);
});

test("signup does not request a verification code after account creation fails", async () => {
  stateValues = ["Ada", "Lovelace", "ada", "ada@example.test", "weak", "", false, ""];
  let emailCodeCalls = 0;
  signUp.password = async () => ({ error: { message: "Password is too weak" } });
  signUp.verifications.sendEmailCode = async () => {
    emailCodeCalls += 1;
    return { error: null };
  };

  await findForm(SignupPage()).props.onSubmit(event());

  assert.equal(emailCodeCalls, 0);
  assert.deepEqual(stateUpdates.at(-1), [7, "Password is too weak"]);
});

test("email verification uses the entered code and finalizes a completed signup", async () => {
  stateValues = [
    "Ada",
    "Lovelace",
    "ada",
    "ada@example.test",
    "correct horse",
    "123456",
    true,
    "",
  ];
  const verificationCalls = [];
  let finalizeCalls = 0;
  signUp.verifications.verifyEmailCode = async (value) => {
    verificationCalls.push(value);
    return { error: null };
  };
  signUp.finalize = async ({ navigate }) => {
    finalizeCalls += 1;
    await navigate({ decorateUrl: (url) => url });
  };

  await findForm(SignupPage()).props.onSubmit(event());

  assert.deepEqual(verificationCalls, [{ code: "123456" }]);
  assert.equal(finalizeCalls, 1);
  assert.deepEqual(navigationCalls, ["/dashboard"]);
});

test("signup starts X SSO with the shared callback route", async () => {
  stateValues = ["", "", "", "", "", "", false, ""];
  const ssoCalls = [];
  signUp.sso = async (options) => {
    ssoCalls.push(options);
    return { error: null };
  };

  await findButton(SignupPage(), "Continue with X").props.onClick();

  assert.deepEqual(ssoCalls, [
    {
      strategy: "oauth_x",
      redirectCallbackUrl: "/sso-callback",
      redirectUrl: "/dashboard",
    },
  ]);
});

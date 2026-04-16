// @vitest-environment node
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SignJWT, type JWTPayload } from "jose";

// Mock "server-only" so it doesn't throw in the test environment
vi.mock("server-only", () => ({}));

// Mock next/headers cookies
const mockGet = vi.fn();
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve({ get: mockGet })),
}));

const JWT_SECRET = Buffer.from("development-secret-key");

async function makeToken(payload: JWTPayload, expiresIn = "7d") {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expiresIn)
    .setIssuedAt()
    .sign(JWT_SECRET);
}

describe("getSession", () => {
  beforeEach(() => {
    vi.resetModules();
    mockGet.mockReset();
  });

  it("returns null when no auth cookie is present", async () => {
    mockGet.mockReturnValue(undefined);
    const { getSession } = await import("@/lib/auth");
    const session = await getSession();
    expect(session).toBeNull();
  });

  it("returns null when the token is malformed", async () => {
    mockGet.mockReturnValue({ value: "not-a-valid-jwt" });
    const { getSession } = await import("@/lib/auth");
    const session = await getSession();
    expect(session).toBeNull();
  });

  it("returns null when the token is expired", async () => {
    const token = await makeToken(
      { userId: "1", email: "test@example.com", expiresAt: new Date() },
      "-1s"
    );
    mockGet.mockReturnValue({ value: token });
    const { getSession } = await import("@/lib/auth");
    const session = await getSession();
    expect(session).toBeNull();
  });

  it("returns the session payload for a valid token", async () => {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const token = await makeToken({
      userId: "user-123",
      email: "alice@example.com",
      expiresAt,
    });
    mockGet.mockReturnValue({ value: token });
    const { getSession } = await import("@/lib/auth");
    const session = await getSession();
    expect(session).not.toBeNull();
    expect(session?.userId).toBe("user-123");
    expect(session?.email).toBe("alice@example.com");
  });

  it("returns null when the token was signed with a different secret", async () => {
    const wrongSecret = Buffer.from("wrong-secret");
    const token = await new SignJWT({ userId: "1", email: "x@x.com" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("7d")
      .setIssuedAt()
      .sign(wrongSecret);
    mockGet.mockReturnValue({ value: token });
    const { getSession } = await import("@/lib/auth");
    const session = await getSession();
    expect(session).toBeNull();
  });
});

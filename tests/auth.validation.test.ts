import { describe, expect, it } from "vitest";
import { authSchemas } from "@/lib/validation";
import { validatePassword } from "@/lib/password";

describe("auth validation", () => {
  it("accepts valid register data", () => {
    const result = authSchemas.register.safeParse({
      name: "Jane Doe",
      email: "jane@example.com",
      password: "mypassword",
    });
    expect(result.success).toBe(true);
  });

  it("rejects short passwords", () => {
    expect(validatePassword("12345")).toBe(false);
    const parsed = authSchemas.register.safeParse({
      name: "A",
      email: "a@example.com",
      password: "12345",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects overlong passwords", () => {
    const long = "a".repeat(101);
    expect(validatePassword(long)).toBe(false);
  });

  it("requires valid email", () => {
    const parsed = authSchemas.login.safeParse({
      email: "not-an-email",
      password: "123456",
    });
    expect(parsed.success).toBe(false);
  });
});

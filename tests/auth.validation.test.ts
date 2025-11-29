import { describe, expect, it } from "vitest";
import { authSchemas, profileSchemas } from "@/lib/validation";
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

describe("profile validation", () => {
  it("accepts profile update with optional image", () => {
    const parsed = profileSchemas.updateProfile.safeParse({ name: "Jane", image: "https://img.com/a.png" });
    expect(parsed.success).toBe(true);
  });

  it("rejects overly long names", () => {
    const parsed = profileSchemas.updateProfile.safeParse({ name: "a".repeat(51), image: "" });
    expect(parsed.success).toBe(false);
  });

  it("requires strong enough password change inputs", () => {
    const parsed = profileSchemas.changePassword.safeParse({ currentPassword: "12345", newPassword: "12345" });
    expect(parsed.success).toBe(false);
  });
});

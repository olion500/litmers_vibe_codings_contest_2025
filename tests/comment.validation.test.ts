import { describe, expect, it } from "vitest";
import { commentSchemas } from "@/lib/validation";

describe("comment validation", () => {
  it("accepts valid create", () => {
    const parsed = commentSchemas.create.safeParse({ issueId: "i1", content: "Nice" });
    expect(parsed.success).toBe(true);
  });

  it("rejects empty content", () => {
    const parsed = commentSchemas.create.safeParse({ issueId: "i1", content: "" });
    expect(parsed.success).toBe(false);
  });

  it("rejects overly long content", () => {
    const long = "a".repeat(2001);
    const parsed = commentSchemas.create.safeParse({ issueId: "i1", content: long });
    expect(parsed.success).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { issueSchemas } from "@/lib/validation";

describe("issue validation", () => {
  it("accepts valid create payload", () => {
    const parsed = issueSchemas.create.safeParse({
      projectId: "p1",
      title: "Fix login",
      description: "Broken flow",
      priority: "HIGH",
      labels: ["l1", "l2"],
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects too many labels", () => {
    const parsed = issueSchemas.create.safeParse({
      projectId: "p1",
      title: "Fix",
      labels: ["1", "2", "3", "4", "5", "6"],
    });
    expect(parsed.success).toBe(false);
  });

  it("requires title", () => {
    const parsed = issueSchemas.create.safeParse({ projectId: "p1", title: "" });
    expect(parsed.success).toBe(false);
  });
});

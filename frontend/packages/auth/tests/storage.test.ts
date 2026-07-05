import { describe, expect, it } from "vitest";
import { MemoryStorage } from "../src/storage";

describe("MemoryStorage", () => {
  it("guarda, lee y elimina claves", () => {
    const s = new MemoryStorage();
    expect(s.get("k")).toBeNull();
    s.set("k", "v");
    expect(s.get("k")).toBe("v");
    s.remove("k");
    expect(s.get("k")).toBeNull();
  });
});

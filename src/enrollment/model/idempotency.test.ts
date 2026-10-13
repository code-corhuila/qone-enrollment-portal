import { act, renderHook } from "@testing-library/react";
import { newIdempotencyKey, useIdempotencyKey } from "./idempotency";

// Norm 5.4.2 / 5.3.8: one Idempotency-Key per intention (8 to 128 characters), reused while the
// same data is retried, renewed only after the creation succeeded.
describe("newIdempotencyKey", () => {
  it("builds a key between 8 and 128 characters with the intention prefix", () => {
    const key = newIdempotencyKey("subject");
    expect(key.startsWith("subject-")).toBe(true);
    expect(key.length).toBeGreaterThanOrEqual(8);
    expect(key.length).toBeLessThanOrEqual(128);
  });

  it("never repeats", () => {
    const keys = new Set(Array.from({ length: 50 }, () => newIdempotencyKey("s")));
    expect(keys.size).toBe(50);
  });
});

describe("useIdempotencyKey", () => {
  it("keeps the same key across re-renders and retries, and renews it only on reset", () => {
    const { result, rerender } = renderHook(() => useIdempotencyKey("subject"));
    const first = result.current.key;

    rerender();
    expect(result.current.key).toBe(first);

    act(() => result.current.reset());
    expect(result.current.key).not.toBe(first);
    expect(result.current.key.startsWith("subject-")).toBe(true);
  });
});

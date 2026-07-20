import { hashUserIdToInt, getDeterministicBranchIndex } from "./deterministicBranchAssignment";

describe("hashUserIdToInt", () => {
  it("is deterministic -- the same id always produces the same hash", () => {
    const id = "fc688b1f7cce22d6d4a758c59a4577b6f39aea1d";
    const first = hashUserIdToInt(id);
    const second = hashUserIdToInt(id);
    const third = hashUserIdToInt(id);
    expect(first).toBe(second);
    expect(second).toBe(third);
  });

  it("produces known values for real lms_user_ids (regression check)", () => {
    // These are real lms_user_id values pulled from actual Canvas test sessions.
    // If this test ever fails, the hash function itself changed -- which would mean
    // every already-assigned student could get reassigned to a different branch.
    expect(hashUserIdToInt("fc688b1f7cce22d6d4a758c59a4577b6f39aea1d")).toBe(884175782);
    expect(hashUserIdToInt("fe192d2320949d5563df02dcab147bd3766d38ce")).toBe(731834736);
    expect(hashUserIdToInt("43fb6a8e742cc4222e9cee222840cef12135e7c1")).toBe(1652165345);
    expect(hashUserIdToInt("965617195d11954d6b32a67d191dddcba8db7133")).toBe(1561961757);
    expect(hashUserIdToInt("b21a7c2795adce6080bf0e3486ab8cf820d0b44f")).toBe(599579400);
  });

  it("never returns a negative number", () => {
    const ids = [
      "fc688b1f7cce22d6d4a758c59a4577b6f39aea1d",
      "fe192d2320949d5563df02dcab147bd3766d38ce",
      "a",
      "z",
      "0",
      "some-other-format-id-123",
    ];
    for (const id of ids) {
      expect(hashUserIdToInt(id)).toBeGreaterThanOrEqual(0);
    }
  });

  it("handles an empty string without throwing", () => {
    expect(() => hashUserIdToInt("")).not.toThrow();
    expect(hashUserIdToInt("")).toBe(0);
  });

  it("produces different hashes for different ids (not a constant function)", () => {
    const hashes = new Set([
      hashUserIdToInt("fc688b1f7cce22d6d4a758c59a4577b6f39aea1d"),
      hashUserIdToInt("fe192d2320949d5563df02dcab147bd3766d38ce"),
      hashUserIdToInt("43fb6a8e742cc4222e9cee222840cef12135e7c1"),
      hashUserIdToInt("965617195d11954d6b32a67d191dddcba8db7133"),
      hashUserIdToInt("b21a7c2795adce6080bf0e3486ab8cf820d0b44f"),
    ]);
    expect(hashes.size).toBe(5);
  });
});

describe("getDeterministicBranchIndex", () => {
  const realIds = [
    "fc688b1f7cce22d6d4a758c59a4577b6f39aea1d",
    "fe192d2320949d5563df02dcab147bd3766d38ce",
    "43fb6a8e742cc4222e9cee222840cef12135e7c1",
    "965617195d11954d6b32a67d191dddcba8db7133",
    "b21a7c2795adce6080bf0e3486ab8cf820d0b44f",
  ];

  it("is deterministic -- same id and choice count always gives the same index", () => {
    const id = realIds[0];
    expect(getDeterministicBranchIndex(id, 2)).toBe(getDeterministicBranchIndex(id, 2));
    expect(getDeterministicBranchIndex(id, 3)).toBe(getDeterministicBranchIndex(id, 3));
  });

  it("always returns an index within [0, numberOfChoices) for a 2-way split", () => {
    for (const id of realIds) {
      const index = getDeterministicBranchIndex(id, 2);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(2);
    }
  });

  it("always returns an index within [0, numberOfChoices) for a 3-way split", () => {
    for (const id of realIds) {
      const index = getDeterministicBranchIndex(id, 3);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(3);
    }
  });

  it("actually spreads real ids across both branches in a 2-way split (not clustering onto one)", () => {
    const indices = realIds.map((id) => getDeterministicBranchIndex(id, 2));
    const usedBranches = new Set(indices);
    // Not a strict 50/50 requirement (that's a statistical property over many more
    // users, not a guarantee for any specific handful of ids) -- just confirming
    // the function doesn't degenerately send everyone to the same branch.
    expect(usedBranches.size).toBeGreaterThan(1);
  });

  it("matches known regression values for real ids", () => {
    expect(getDeterministicBranchIndex(realIds[0], 2)).toBe(0);
    expect(getDeterministicBranchIndex(realIds[0], 3)).toBe(2);
    expect(getDeterministicBranchIndex(realIds[1], 2)).toBe(0);
    expect(getDeterministicBranchIndex(realIds[1], 3)).toBe(0);
    expect(getDeterministicBranchIndex(realIds[2], 2)).toBe(1);
    expect(getDeterministicBranchIndex(realIds[2], 3)).toBe(2);
  });

  it("throws a clear error for an invalid numberOfChoices", () => {
    expect(() => getDeterministicBranchIndex(realIds[0], 0)).toThrow();
    expect(() => getDeterministicBranchIndex(realIds[0], -1)).toThrow();
    expect(() => getDeterministicBranchIndex(realIds[0], 1.5)).toThrow();
  });
});

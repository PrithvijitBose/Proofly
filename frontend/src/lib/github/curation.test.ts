/**
 * Regression test suite for account-switch hydration and storage isolation.
 */

import {
  loadCuratedProjects,
  saveCuratedProjects,
  getCuratedStorageKey,
  CuratedProject,
} from "./curation";

// Mock localStorage in Node environment if window is undefined
if (typeof window === "undefined") {
  const store: Record<string, string> = {};
  (global as unknown as { localStorage: Storage }).localStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      Object.keys(store).forEach((k) => delete store[k]);
    },
    length: 0,
    key: () => null,
  };
  (global as unknown as { window: unknown }).window = {};
}

const mockProjectA: CuratedProject = {
  repoId: 101,
  name: "repo-a",
  fullName: "userA/repo-a",
  htmlUrl: "https://github.com/userA/repo-a",
  description: "User A project",
  language: "TypeScript",
  stargazersCount: 42,
  forksCount: 5,
  pushedAt: "2026-01-01T00:00:00Z",
  customNote: "Main project",
  priority: 1,
};

export function runAccountSwitchRegressionTest(): boolean {
  localStorage.clear();

  // 1. Populate User A with saved curation entries
  saveCuratedProjects("userA", [mockProjectA]);
  const userAData = loadCuratedProjects("userA");

  if (userAData.length !== 1 || userAData[0].repoId !== 101) {
    throw new Error("Regression test failed: User A failed to load saved curation data.");
  }

  // 2. Account switch to User B who has NO saved entry
  const userBData = loadCuratedProjects("userB");

  if (!Array.isArray(userBData) || userBData.length !== 0) {
    throw new Error(
      "Regression test failed: User B (new account) did not return an empty array [] to replace previous curation."
    );
  }

  // 3. Verify that User A's data remains isolated and untouched after User B hydration
  const reloadedUserA = loadCuratedProjects("userA");
  if (reloadedUserA.length !== 1 || reloadedUserA[0].repoId !== 101) {
    throw new Error("Regression test failed: User A data was modified during User B account switch.");
  }

  console.log("✅ Account-switch hydration regression test passed cleanly!");
  return true;
}

// Execute test on import in test environments
try {
  runAccountSwitchRegressionTest();
} catch (err) {
  console.error(err);
}

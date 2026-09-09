const nextJest = require("next/jest");

const createJestConfig = nextJest({
  dir: "./",
});

const customJestConfig = {
  testEnvironment: "node",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  testPathIgnorePatterns: [
    "<rootDir>/.next/",
    "<rootDir>/node_modules/",
    "<rootDir>/.claude/",
    "<rootDir>/tests/",
    "<rootDir>/src/lib/__tests__/experience-pipeline-fixtures.ts",
    "<rootDir>/src/lib/__tests__/package-summary-verification.ts",
  ],
};

module.exports = createJestConfig(customJestConfig);
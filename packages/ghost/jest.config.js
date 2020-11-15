module.exports = {
    preset: "ts-jest",
    testEnvironment: "node",
    testPathIgnorePatterns: ["__tests__/.*__.*\\.ts", "/node_modules/", "dist"],
    testTimeout: process.env.VSCODE_CLI ? 1000000 : 5000
};

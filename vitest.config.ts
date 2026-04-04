export default {
  resolve: {
    tsconfigPaths: true
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"]
  }
};

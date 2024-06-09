export default {
  testEnvironment: 'node',
  testTimeout: 300000,
  collectCoverage: false,
  transform: {
    '^.+\\.(t|j)sx?$': '@swc/jest',
  },
};
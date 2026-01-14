module.exports = {
  displayName: 'API',
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.spec.ts'],
  collectCoverageFrom: [
    'src/**/*.(t|j)s',
    '!src/main.ts',
    '!src/**/*.module.ts',
    '!src/**/*.dto.ts',
    '!src/**/*.entity.ts',
    '!src/**/*.interceptor.ts',
    '!src/**/*.guard.ts',
    '!src/**/*.filter.ts',
    '!src/**/*.pipe.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
    '^bcrypt$': '<rootDir>/test/mocks/bcrypt.ts',
  },
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  testTimeout: 10000,
  // Optimized ts-jest configuration (using transform syntax instead of deprecated globals)
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: {
          ...require('./tsconfig.json').compilerOptions,
          // Faster compilation for tests
          isolatedModules: false,
        },
      },
    ],
  },
  cacheDirectory: '<rootDir>/.jest-cache',
  // Increase max workers for parallel execution
  maxWorkers: '50%',
};

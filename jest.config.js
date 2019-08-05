module.exports = {
  globals: {
    'ts-jest': {
      tsConfig: 'tsconfig.json',
    },
  },
  moduleFileExtensions: [
    'js',
    'ts',
  ],
  transform: {
    '^.+\\.ts?$': 'ts-jest',
  },
  testRegex: '/test/\\w+.test.ts',
  testEnvironment: 'node',
  preset: 'ts-jest',
  testMatch: null,
}
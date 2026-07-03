/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  testEnvironment: 'node',
  collectCoverageFrom: ['**/*.(t|j)s', '!**/*.module.ts', '!main.ts'],
  coverageDirectory: '../coverage',
};

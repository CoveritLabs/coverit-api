// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src'],
    testMatch: ['**/__tests__/**/*.test.ts'],
    moduleFileExtensions: ['ts', 'js', 'json'],
    moduleNameMapper: {
        '^@api/(.*)$': '<rootDir>/src/api/$1',
        '^@config/(.*)$': '<rootDir>/src/config/$1',
        '^@lib/(.*)$': '<rootDir>/src/lib/$1',
        '^@services/(.*)$': '<rootDir>/src/services/$1',
        '^@utils/(.*)$': '<rootDir>/src/utils/$1',
        '^@generated/(.*)$': '<rootDir>/src/generated/$1',
        '^@types/(.*)$': '<rootDir>/src/types/$1',
    },
    clearMocks: true,
    collectCoverageFrom: [
        'src/**/*.ts',
        '!src/generated/**',
        '!src/index.ts',
    ],
};

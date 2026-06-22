// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

const prisma: Record<string, any> = {
    user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
    },
    account: {
        findFirst: jest.fn(),
        create: jest.fn(),
    },
    projectIntegration: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
        deleteMany: jest.fn(),
    },
    targetApplication: {
        findUnique: jest.fn(),
    },
    targetApplicationVersion: {
        findFirst: jest.fn(),
    },
    crawlSession: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
    },
    crawlSchedule: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    },
    regressionRun: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
    },
    regressionCodebase: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findMany: jest.fn(),
    },
    regressionScenario: {
        findFirst: jest.fn(),
        upsert: jest.fn(),
    },
    regressionArtifact: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
    },
    scenarioIntegrationReport: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
    },
    testFlow: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        updateMany: jest.fn(),
    },
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $transaction: jest.fn(),
};

prisma.$transaction.mockImplementation((fn: Function) => fn(prisma));

export default prisma;

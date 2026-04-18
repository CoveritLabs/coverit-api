// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import { Request, Response } from 'express';
import * as crawlService from '@services/crawlSession.service';
import { StatusCodes } from 'http-status-codes';
import { ZodError } from 'zod';
import {
    AppVersionParamsSchema,
    CrawlSessionParamsSchema,
    CreateCrawlSessionRequestSchema,
    GetSessionsQuerySchema,
} from '@models/crawlSession';

function handleControllerError(res: Response, error: unknown): void {
    if (error instanceof ZodError) {
        res.status(StatusCodes.BAD_REQUEST).json({
            message: 'Validation failed',
            details: error.issues,
        });
        return;
    }
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2025') {
        res.status(StatusCodes.NOT_FOUND).json({ message: 'Resource not found' });
        return;
    }
    if (error instanceof Error) {
        res.status(StatusCodes.CONFLICT).json({ message: error.message });
        return;
    }

    console.error('[Crawl Controller Error]:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: 'An unexpected internal server error occurred',
    });
}


export const getSessions = async (req: Request, res: Response) => {
    try {
        const { versionId } = AppVersionParamsSchema.parse(req.params);
        const query = GetSessionsQuerySchema.parse(req.query);
        const result = await crawlService.getSessions(versionId, query);
        res.json(result);
    } catch (e) {
        handleControllerError(res, e);
    }
};

export const createSession = async (req: Request, res: Response) => {
    try {
        const { versionId } = AppVersionParamsSchema.parse(req.params);
        const body = CreateCrawlSessionRequestSchema.parse(req.body);
        const result = await crawlService.createSession(versionId, body.triggerType, body.crawlConfig);
        res.status(StatusCodes.CREATED).json(result);
    } catch (e) {
        handleControllerError(res, e);
    }
};

export const getSessionDetails = async (req: Request, res: Response) => {
    try {
        const { crawlSessionId } = CrawlSessionParamsSchema.parse(req.params);
        const result = await crawlService.getSessionDetails(crawlSessionId);
        res.json(result);
    } catch (e) {
        handleControllerError(res, e);
    }
};

export const deleteSession = async (req: Request, res: Response) => {
    try {
        const { crawlSessionId } = CrawlSessionParamsSchema.parse(req.params);
        await crawlService.deleteSession(crawlSessionId);
        res.status(StatusCodes.OK).json({ message: 'Crawl session deleted successfully' });
    } catch (e) {
        handleControllerError(res, e);
    }
};

export const startSession = async (req: Request, res: Response) => {
    try {
        const { crawlSessionId } = CrawlSessionParamsSchema.parse(req.params);
        await crawlService.startSession(crawlSessionId);
        res.status(StatusCodes.OK).json({ message: 'Crawl session started successfully' });
    } catch (e) {
        handleControllerError(res, e);
    }
};

export const abortSession = async (req: Request, res: Response) => {
    try {
        const { crawlSessionId } = CrawlSessionParamsSchema.parse(req.params);
        await crawlService.abortSession(crawlSessionId);
        res.status(StatusCodes.OK).json({ message: 'Crawl session aborted successfully' });
    } catch (e) {
        handleControllerError(res, e);
    }
};

export const pauseSession = async (req: Request, res: Response) => {
    try {
        const { crawlSessionId } = CrawlSessionParamsSchema.parse(req.params);
        await crawlService.pauseSession(crawlSessionId);
        res.status(StatusCodes.OK).json({ message: 'Crawl session paused successfully' });
    } catch (e) {
        handleControllerError(res, e);
    }
};
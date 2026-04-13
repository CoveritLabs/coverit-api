// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import { Router, type RequestHandler } from 'express';
import * as crawlerController from '../controllers/crawlSession.controller';
import { requireAuth } from '../middlewares/requireAuth';
import { validateBody } from '../middlewares/validate';
import { CreateCrawlSessionRequestSchema } from '@models/crawlSession';

const router = Router();

router.get('/versions/:app_version_id/crawl-sessions', requireAuth, crawlerController.getSessions);

router.post(
    '/versions/:app_version_id/crawl-sessions',
    requireAuth,
    validateBody(CreateCrawlSessionRequestSchema),
    crawlerController.createSession
);


router.get('/crawl-sessions/:crawl_session_id', requireAuth, crawlerController.getSessionDetails);

router.delete('/crawl-sessions/:crawl_session_id', requireAuth, crawlerController.deleteSession);

router.put('/crawl-sessions/:crawl_session_id/abort', requireAuth, crawlerController.abortSession);

router.put('/crawl-sessions/:crawl_session_id/start', requireAuth, crawlerController.startSession);

router.put('/crawl-sessions/:crawl_session_id/pause', requireAuth, crawlerController.pauseSession);

export default router;
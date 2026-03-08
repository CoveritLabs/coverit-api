// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';

import { env } from '@config/env';
import { swaggerSpec } from '@config/swagger';
import authRoutes from '@api/routes/auth.routes';
import { errorHandler } from '@api/middlewares/errorHandler';

const app: Application = express();

app.use(helmet());
app.use(
    cors({
        origin: env.CORS_ORIGINS,
        credentials: true,
    }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/docs.json', (_req: Request, res: Response) => {
    res.json(swaggerSpec);
});

const apiBase = env.API_PREFIX;
app.use(`${apiBase}/auth`, authRoutes);

app.use(errorHandler);

export default app;

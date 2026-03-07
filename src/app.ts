// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app: Application = express();

app.use(helmet());
app.use(
    cors({
        origin: (process.env.CORS_ORIGINS ?? 'http://localhost:5173').split(','),
    }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default app;

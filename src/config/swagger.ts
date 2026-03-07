// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import swaggerJsdoc from 'swagger-jsdoc';
import { env } from '@config/env';

const options: swaggerJsdoc.Options = {
    definition: {
        openapi: '3.0.3',
        info: {
            title: 'CoverIt API',
            version: '0.1.0',
            description: 'CoverIt REST API — authentication and platform services',
        },
        servers: [
            {
                url: `http://localhost:${env.PORT}`,
                description: 'Local development',
            },
        ],
        components: {
            schemas: {
                UserInfo: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        email: { type: 'string', format: 'email' },
                        name: { type: 'string' },
                    },
                },
                MessageResponse: {
                    type: 'object',
                    properties: {
                        message: { type: 'string' },
                    },
                },
                ErrorResponse: {
                    type: 'object',
                    properties: {
                        message: { type: 'string' },
                    },
                },
            },
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'Access token returned by login/refresh — send as `Authorization: Bearer <token>`',
                },
            },
        },
    },
    apis: ['./src/api/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);

// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import { z } from "@utils/zod";
import type { infer as ZodInfer } from "zod";

export type GenerateUserGuidesBody = ZodInfer<typeof GenerateUserGuidesBodySchema>;
export type UserGuideState = ZodInfer<typeof UserGuideStateSchema>;
export type UserGuideStatesResponse = ZodInfer<typeof UserGuideStatesResponseSchema>;

export interface GenerateUserGuidesResponse {
  message: string;
  userGuide: string;
  error?: string;
}

export interface GenerateUserGuidesJobResponse {
  status: string;
  userGuide?: string;
  lastError?: string;
}

const StateHashSchema = z.string().regex(/^[a-f0-9]{64}$/i, "State hash must be a 64-character hex string");

export const UserGuideStateSchema = z.object({
  stateHash: StateHashSchema,
  label: z.string().min(1),
  url: z.string().optional(),
  path: z.string().optional(),
  title: z.string().optional(),
});

export const UserGuideStatesResponseSchema = z.object({
  states: z.array(UserGuideStateSchema),
});

export const GenerateUserGuidesBodySchema = z
  .object({
    startStateHash: StateHashSchema,
    endStateHash: StateHashSchema,
  })
  .refine((value) => value.startStateHash.toLowerCase() !== value.endStateHash.toLowerCase(), {
    message: "Start and end states must be different",
    path: ["endStateHash"],
  });

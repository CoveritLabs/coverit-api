// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

// Integrations domain DTOs

import type {
  IntegrationStatusResponse as ContractIntegrationStatusResponse,
  JiraIntegrationDetails as ContractJiraIntegrationDetails,
  StartIntegrationOAuthResponse as ContractStartIntegrationOAuthResponse,
} from "@coveritlabs/contracts";
import type { IntegrationProvider } from "types/integrations";
import type { Plain } from "./common";

export type StartIntegrationOAuthResponse = Plain<ContractStartIntegrationOAuthResponse>;
export type JiraIntegrationDetails = Plain<ContractJiraIntegrationDetails>;
export type IntegrationDetails = { case: "jira"; value: JiraIntegrationDetails } | { case: undefined; value?: undefined };
export type IntegrationStatusResponse = Omit<Plain<ContractIntegrationStatusResponse>, "provider" | "details"> & {
  provider: IntegrationProvider;
  details: IntegrationDetails;
};

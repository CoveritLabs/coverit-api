// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import { INTEGRATIONS_MESSAGES } from "@constants/messages";
import { BadRequestError } from "@utils/errors";
import { JIRA_API_PROVIDER, type IntegrationProviderAdapter } from "types/integrations";
import { jiraIntegrationProvider } from "./jira.adapter";

export function getIntegrationProvider(provider: string): IntegrationProviderAdapter {
  switch (provider) {
    case JIRA_API_PROVIDER:
      return jiraIntegrationProvider;
    default:
      throw new BadRequestError(INTEGRATIONS_MESSAGES.UNSUPPORTED_PROVIDER);
  }
}

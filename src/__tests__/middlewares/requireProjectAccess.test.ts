// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

jest.mock("@services/project.service", () => ({ getMemberRole: jest.fn() }));
jest.mock("@api/middlewares/requireAuth", () => ({ getCurrentUserId: jest.fn() }));

import { requireProjectMembership, requireProjectMember, requireProjectAdmin } from "@api/middlewares/requireProjectAccess";
import * as projectService from "@services/project.service";
import { getCurrentUserId } from "@api/middlewares/requireAuth";
import { ProjectRole } from "@models/project";
import { PROJECT_MESSAGES } from "@constants/messages/project";

describe("requireProjectAccess middleware", () => {
  beforeEach(() => jest.resetAllMocks());

  test("requireProjectMembership -> when not a member calls next with Forbidden", async () => {
    (getCurrentUserId as jest.Mock).mockReturnValue("u1");
    (projectService.getMemberRole as jest.Mock).mockResolvedValue(null);

    const next = jest.fn();
    await requireProjectMembership({ params: { projectId: "p1" } } as any, {} as any, next);

    expect(next).toHaveBeenCalled();
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe(PROJECT_MESSAGES.MEMBER_REQUIRED);
  });

  test("requireProjectAdmin -> when role insufficient calls next with Admin required", async () => {
    (getCurrentUserId as jest.Mock).mockReturnValue("u1");
    (projectService.getMemberRole as jest.Mock).mockResolvedValue(ProjectRole.MEMBER);

    const next = jest.fn();
    await requireProjectAdmin({ params: { projectId: "p1" } } as any, {} as any, next);

    expect(next).toHaveBeenCalled();
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe(PROJECT_MESSAGES.ADMIN_REQUIRED);
  });

  test("requireProjectAdmin -> when role sufficient calls next without error", async () => {
    (getCurrentUserId as jest.Mock).mockReturnValue("u1");
    (projectService.getMemberRole as jest.Mock).mockResolvedValue(ProjectRole.ADMIN);

    const next = jest.fn();
    await requireProjectAdmin({ params: { projectId: "p1" } } as any, {} as any, next);

    expect(next).toHaveBeenCalled();
    // ensure next was called with no error (no args)
    expect(next.mock.calls[0].length).toBe(0);
  });
});

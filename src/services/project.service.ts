// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import prisma from "@lib/prisma";
import { ProjectRole } from "@models/project";
import redis, { refreshKey, refreshPattern, resetKey, scanKeys } from "@lib/redis";
import { PROJECT_MESSAGES } from "@constants/messages";
import type {
  CreateProjectRequest,
  UpdateProjectRequest,
  AddMembersRequest,
  RemoveMembersRequest,
  CreateProjectResponse,
  ProjectResponse,
} from "@models/project";
import type { UserInfo } from "@models/user";
import { BadRequestError, NotFoundError, ConflictError } from "@utils/errors";
import type { MessageResponse } from "@models/common";
import * as userService from "@services/user.service";

function resolveMissingEmailsMessage(notFoundEmails: string[]): string {
  return `${PROJECT_MESSAGES.MEMBERS_NOT_FOUND}: ${notFoundEmails.join(", ")}`;
}

async function resolveUserIdsByEmails(emails: string[]): Promise<string[]> {
  return userService.getUsersByEmails(emails).then((users: UserInfo[]) => {
    const foundEmails = users.map((u) => u.email);
    const notFoundEmails = emails.filter((email) => !foundEmails.includes(email));

    if (notFoundEmails.length > 0) {
      throw new BadRequestError(resolveMissingEmailsMessage(notFoundEmails));
    }

    return users.map((u) => u.id);
  });
}

async function assertProjectExists(projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    throw new NotFoundError(PROJECT_MESSAGES.NOT_FOUND);
  }

  return project;
}

export async function getMemberRole(projectId: string, userId: string): Promise<ProjectRole | null> {
  await assertProjectExists(projectId);

  const membership = await prisma.projectMember.findUnique({ where: { projectId_userId: { projectId, userId } } });
  return membership ? membership.role : null;
}

export async function createProject(userId: string, input: CreateProjectRequest): Promise<CreateProjectResponse> {
  const existing = await prisma.project.findFirst({ where: { name: input.name } });
  if (existing) {
    throw new ConflictError(PROJECT_MESSAGES.EXISTING_PROJECT);
  }

  const project = await prisma.project.create({
    data: {
      name: input.name,
      description: input.description,
      members: {
        create: { userId, role: ProjectRole.ADMIN },
      },
    },
    include: { members: true },
  });

  return { id: project.id };
}

export async function updateProject(projectId: string, input: UpdateProjectRequest): Promise<MessageResponse> {
  const project = await assertProjectExists(projectId);

  const data: { name?: string; description?: string | null } = {
    name: input.name ?? project.name,
  };

  if (Object.prototype.hasOwnProperty.call(input, "description")) {
    data.description = (input as any).description;
  } else {
    data.description = project.description;
  }

  if (input.name && input.name !== project.name) {
    const other = await prisma.project.findFirst({ where: { name: input.name } });
    if (other && other.id !== projectId) {
      throw new ConflictError(PROJECT_MESSAGES.EXISTING_PROJECT);
    }
  }

  await prisma.project.update({ where: { id: projectId }, data });

  return { message: PROJECT_MESSAGES.UPDATE_SUCCESS };
}

export async function deleteProject(projectId: string): Promise<MessageResponse> {
  await assertProjectExists(projectId);

  await prisma.project.delete({ where: { id: projectId } });

  return { message: PROJECT_MESSAGES.DELETE_SUCCESS };
}

export async function getProjects(userId: string): Promise<ProjectResponse[]> {
  const projects = await prisma.project.findMany({
    where: { members: { some: { userId } } },
    include: { members: { select: { role: true, user: { select: { id: true, name: true, email: true } } } } },
  });

  return projects.map((project) => ({
    id: project.id,
    name: project.name,
    description: project.description ?? "",
    members: project.members.map((m) => ({ role: m.role, user: m.user ? { id: m.user.id, name: m.user.name, email: m.user.email } : undefined })),
  }));
}

export async function getProject(projectId: string): Promise<ProjectResponse> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { members: { select: { role: true, user: { select: { id: true, name: true, email: true } } } } },
  });
  if (!project) {
    throw new NotFoundError(PROJECT_MESSAGES.NOT_FOUND);
  }

  return {
    id: project.id,
    name: project.name,
    description: project.description ?? "",
    members: project.members.map((m) => ({ role: m.role, user: m.user ? { id: m.user.id, name: m.user.name, email: m.user.email } : undefined })),
  };
}

export async function addMembers(projectId: string, input: AddMembersRequest): Promise<MessageResponse> {
  await assertProjectExists(projectId);

  const userIds = await resolveUserIdsByEmails(input.emails);

  const existingMembers = await prisma.projectMember
    .findMany({
      where: { projectId, userId: { in: userIds } },
      select: { userId: true },
    })
    .then((members) => members.map((m) => m.userId));

  const newMembers = userIds.filter((id) => !existingMembers.includes(id)).map((userId) => ({ projectId, userId, role: ProjectRole.MEMBER }));

  if (newMembers.length > 0) {
    await prisma.projectMember.createMany({ data: newMembers });
  }

  return { message: PROJECT_MESSAGES.ADD_MEMBERS_SUCCESS };
}

export async function removeMembers(projectId: string, input: RemoveMembersRequest): Promise<MessageResponse> {
  await assertProjectExists(projectId);

  const userIds = await resolveUserIdsByEmails(input.emails);

  await prisma.projectMember.deleteMany({ where: { projectId, userId: { in: userIds } } });

  return { message: PROJECT_MESSAGES.REMOVE_MEMBERS_SUCCESS };
}

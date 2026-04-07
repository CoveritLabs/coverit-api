// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import prisma from "@lib/prisma";
import { BadRequestError, NotFoundError, ForbiddenError } from "@utils/errors";
import { USER_MESSAGES } from "@constants/messages";
import type { UserInfo } from "@models/user";
import type { MessageResponse } from "@models/common";

export async function getUser(userId: string): Promise<UserInfo> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new NotFoundError(USER_MESSAGES.NOT_FOUND);
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
  };
}

export async function updateUser(userId: string, input: { name?: string; email?: string }): Promise<MessageResponse> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new NotFoundError(USER_MESSAGES.NOT_FOUND);
  }

  const data: { name?: string; email?: string } = {};
  if (input.name) {
    data.name = input.name;
  }
  if (input.email) {
    const existingUser = await prisma.user.findUnique({ where: { email: input.email } });
    if (existingUser && existingUser.id !== userId) {
      throw new BadRequestError(USER_MESSAGES.EMAIL_IN_USE);
    }
    data.email = input.email;
  }

  await prisma.user.update({ where: { id: userId }, data });

  return { message: USER_MESSAGES.UPDATE_SUCCESS };
}

export async function deleteUser(userId: string): Promise<MessageResponse> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new NotFoundError(USER_MESSAGES.NOT_FOUND);
  }

  await prisma.user.delete({ where: { id: userId } });

  return { message: USER_MESSAGES.DELETE_SUCCESS };
}

export async function getUsersByEmails(emails: string[]): Promise<UserInfo[]> {
  const users = await prisma.user.findMany({ where: { email: { in: emails } } });
  return users.map((user) => ({
    id: user.id,
    email: user.email,
    name: user.name,
  }));
}

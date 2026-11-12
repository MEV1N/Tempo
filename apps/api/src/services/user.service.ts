import { prisma } from '../db';
import { UserDTO, UserPreferenceDTO, UpdateProfileInput } from '@tempo/shared';
import { toUserDTO, toUserPreferenceDTO } from './auth.service';

export interface ProfileResult {
  user: UserDTO;
  preference: UserPreferenceDTO | null;
}

export async function getProfile(userId: string): Promise<ProfileResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { preference: true },
  });

  if (!user) {
    const error: any = new Error('User not found');
    error.code = 'USER_NOT_FOUND';
    error.status = 404;
    throw error;
  }

  return {
    user: toUserDTO(user),
    preference: user.preference ? toUserPreferenceDTO(user.preference) : null,
  };
}

export async function updateProfile(
  userId: string,
  input: UpdateProfileInput
): Promise<ProfileResult> {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl } : {}),
    },
    include: { preference: true, oauthConnections: true },
  });

  return {
    user: toUserDTO(user),
    preference: user.preference ? toUserPreferenceDTO(user.preference) : null,
  };
}

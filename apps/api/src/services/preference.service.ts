import { prisma } from '../db';
import { UserPreferenceDTO, UpdatePreferencesInput } from '@tempo/shared';
import { toUserPreferenceDTO } from './auth.service';

export async function getPreferences(userId: string): Promise<UserPreferenceDTO> {
  let preference = await prisma.userPreference.findUnique({
    where: { userId },
  });

  if (!preference) {
    preference = await prisma.userPreference.create({
      data: {
        userId,
        timezone: 'Asia/Kolkata',
        onboardingCompleted: false,
      },
    });
  }

  return toUserPreferenceDTO(preference);
}

export async function updatePreferences(
  userId: string,
  input: UpdatePreferencesInput
): Promise<UserPreferenceDTO> {
  const updated = await prisma.userPreference.upsert({
    where: { userId },
    create: {
      userId,
      timezone: input.timezone ?? 'Asia/Kolkata',
      wakeTime: input.wakeTime ?? '07:00',
      sleepTime: input.sleepTime ?? '23:00',
      preferredWorkStart: input.preferredWorkStart ?? '09:00',
      preferredWorkEnd: input.preferredWorkEnd ?? '18:00',
      breakfastTime: input.breakfastTime ?? '08:30',
      lunchTime: input.lunchTime ?? '13:00',
      dinnerTime: input.dinnerTime ?? '20:30',
      preferredBreakDuration: input.preferredBreakDuration ?? 15,
      maxContinuousWorkDuration: input.maxContinuousWorkDuration ?? 90,
      dailyLeisureTarget: input.dailyLeisureTarget ?? 120,
      onboardingCompleted: input.onboardingCompleted ?? false,
      themePreference: input.themePreference ?? 'AUTO',
    },
    update: {
      ...input,
    },
  });

  return toUserPreferenceDTO(updated);
}

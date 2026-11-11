import bcrypt from 'bcryptjs';
import { PrismaClient, Priority } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = 'demo@tempo.app';
  const rawPassword = 'Password123!';
  const passwordHash = await bcrypt.hash(rawPassword, 12);

  console.log(`Seeding demo user: ${email}...`);

  // Upsert user
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      name: 'Demo Student',
    },
    create: {
      email,
      passwordHash,
      name: 'Demo Student',
    },
  });

  // Upsert preferences
  await prisma.userPreference.upsert({
    where: { userId: user.id },
    update: {
      onboardingCompleted: true,
      timezone: 'Asia/Kolkata',
      wakeTime: '07:00',
      sleepTime: '23:00',
      preferredWorkStart: '09:00',
      preferredWorkEnd: '18:00',
      breakfastTime: '08:00',
      lunchTime: '13:00',
      dinnerTime: '20:00',
      preferredBreakDuration: 15,
      pushNotificationsEnabled: true,
      autoNightlyPlanningEnabled: true,
      preferredPlanningTime: '22:00',
      notifyTomorrowPlanReady: true,
      notifyTaskReminders: true,
      notifyScheduleReminders: true,
    },
    create: {
      userId: user.id,
      onboardingCompleted: true,
      timezone: 'Asia/Kolkata',
      wakeTime: '07:00',
      sleepTime: '23:00',
      preferredWorkStart: '09:00',
      preferredWorkEnd: '18:00',
      breakfastTime: '08:00',
      lunchTime: '13:00',
      dinnerTime: '20:00',
      preferredBreakDuration: 15,
      pushNotificationsEnabled: true,
      autoNightlyPlanningEnabled: true,
      preferredPlanningTime: '22:00',
      notifyTomorrowPlanReady: true,
      notifyTaskReminders: true,
      notifyScheduleReminders: true,
    },
  });

  // Sample tasks
  const sampleTasks = [
    {
      title: 'Operating Systems — Virtual Memory Assignment',
      description: 'Implement paging simulation and page replacement algorithms in C++',
      priority: Priority.HIGH,
      estimatedMinutes: 90,
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
    },
    {
      title: 'Database Systems — Normalization & Indexing Review',
      description: 'Review 3NF, BCNF, and B-Tree index properties for upcoming test',
      priority: Priority.URGENT,
      estimatedMinutes: 60,
      dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // tomorrow
    },
    {
      title: 'Algorithms — Dynamic Programming Practice',
      description: 'Solve 3 medium DP problems on shortest paths and interval scheduling',
      priority: Priority.MEDIUM,
      estimatedMinutes: 75,
    },
    {
      title: 'Fitness — Evening Cardio & Mobility',
      description: '30-minute run followed by stretching',
      priority: Priority.LOW,
      estimatedMinutes: 45,
    },
  ];

  for (const t of sampleTasks) {
    const existing = await prisma.task.findFirst({
      where: { userId: user.id, title: t.title },
    });
    if (!existing) {
      await prisma.task.create({
        data: {
          ...t,
          userId: user.id,
        },
      });
    }
  }

  // Sample timetable
  let timetable = await prisma.timetable.findFirst({
    where: { userId: user.id },
  });

  if (!timetable) {
    timetable = await prisma.timetable.create({
      data: {
        userId: user.id,
        name: 'Spring Semester Timetable',
        isActive: true,
      },
    });
  }

  const sampleSessions = [
    {
      title: 'CS301: Distributed Systems',
      dayOfWeek: 1, // Monday
      startTime: '10:00',
      endTime: '11:30',
      location: 'Hall B-204',
    },
    {
      title: 'CS304: Database Engineering Lab',
      dayOfWeek: 1, // Monday
      startTime: '14:00',
      endTime: '16:00',
      location: 'Computing Lab 3',
    },
    {
      title: 'CS301: Distributed Systems',
      dayOfWeek: 3, // Wednesday
      startTime: '10:00',
      endTime: '11:30',
      location: 'Hall B-204',
    },
    {
      title: 'CS306: Computer Networks',
      dayOfWeek: 4, // Thursday
      startTime: '11:30',
      endTime: '13:00',
      location: 'Hall A-102',
    },
  ];

  for (const session of sampleSessions) {
    const existing = await prisma.timetableSession.findFirst({
      where: {
        timetableId: timetable.id,
        dayOfWeek: session.dayOfWeek,
        startTime: session.startTime,
        title: session.title,
      },
    });
    if (!existing) {
      await prisma.timetableSession.create({
        data: {
          ...session,
          timetableId: timetable.id,
          userId: user.id,
        },
      });
    }
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

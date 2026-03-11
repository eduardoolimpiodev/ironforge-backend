import dayjs from "dayjs";

import { NotFoundError } from "../errors/index.js";
import { prisma } from "../lib/db.js";

const WEEKDAY_MAP: Record<number, string> = {
  0: "SUNDAY",
  1: "MONDAY",
  2: "TUESDAY",
  3: "WEDNESDAY",
  4: "THURSDAY",
  5: "FRIDAY",
  6: "SATURDAY",
};

interface InputDto {
  userId: string;
  from: string;
  to: string;
}

interface OutputDto {
  workoutStreak: number;
  consistencyByDay: Record<
    string,
    {
      workoutDayCompleted: boolean;
      workoutDayStarted: boolean;
    }
  >;
  completedWorkoutsCount: number;
  conclusionRate: number;
  totalTimeInSeconds: number;
}

export class GetStats {
  async execute(dto: InputDto): Promise<OutputDto> {
    const fromDate = dayjs(`${dto.from}T00:00:00`).startOf("day");
    const toDate = dayjs(`${dto.to}T23:59:59`).endOf("day");

    const workoutPlan = await prisma.workoutPlan.findFirst({
      where: { userId: dto.userId, isActive: true },
      include: {
        workoutDays: {
          include: { sessions: true },
        },
      },
    });

    if (!workoutPlan) {
      throw new NotFoundError("Active workout plan not found");
    }

    const sessions = await prisma.workoutSession.findMany({
      where: {
        workoutDay: {
          workoutPlanId: workoutPlan.id,
        },
        startedAt: {
          gte: fromDate.toDate(),
          lte: toDate.toDate(),
        },
      },
    });

    const consistencyByDay: Record<
      string,
      { workoutDayCompleted: boolean; workoutDayStarted: boolean }
    > = {};

    sessions.forEach((session) => {
      const dateKey = dayjs(session.startedAt).format("YYYY-MM-DD");

      if (!consistencyByDay[dateKey]) {
        consistencyByDay[dateKey] = {
          workoutDayCompleted: false,
          workoutDayStarted: false,
        };
      }

      consistencyByDay[dateKey].workoutDayStarted = true;

      if (session.completedAt !== null) {
        consistencyByDay[dateKey].workoutDayCompleted = true;
      }
    });

    const completedSessions = sessions.filter((s) => s.completedAt !== null);
    const completedWorkoutsCount = completedSessions.length;
    const conclusionRate =
      sessions.length > 0 ? completedWorkoutsCount / sessions.length : 0;

    const totalTimeInSeconds = completedSessions.reduce((total, session) => {
      const start = dayjs(session.startedAt);
      const end = dayjs(session.completedAt!);
      const diff = end.diff(start, "second");
      console.log(`[GetStats] Session ${session.id}: ${start.format()} -> ${end.format()} = ${diff}s`);
      return total + diff;
    }, 0);

    console.log(`[GetStats] Total sessions: ${sessions.length}, Completed: ${completedWorkoutsCount}, Total time: ${totalTimeInSeconds}s`);

    const workoutStreak = await this.calculateStreak(
      workoutPlan.id,
      workoutPlan.workoutDays,
      toDate
    );

    console.log(`[GetStats] Calculated streak: ${workoutStreak}`);

    return {
      workoutStreak,
      consistencyByDay,
      completedWorkoutsCount,
      conclusionRate,
      totalTimeInSeconds,
    };
  }

  private async calculateStreak(
    workoutPlanId: string,
    workoutDays: Array<{
      weekDay: string;
      isRest: boolean;
    }>,
    currentDate: dayjs.Dayjs
  ): Promise<number> {
    const planWeekDays = new Set(workoutDays.map((d) => d.weekDay));
    const restWeekDays = new Set(
      workoutDays.filter((d) => d.isRest).map((d) => d.weekDay)
    );

    const allSessions = await prisma.workoutSession.findMany({
      where: {
        workoutDay: { workoutPlanId },
        completedAt: { not: null },
      },
      select: { startedAt: true },
    });

    const completedDates = new Set(
      allSessions.map((s) => dayjs(s.startedAt).format("YYYY-MM-DD"))
    );

    let streak = 0;
    let day = currentDate.startOf("day");
    let foundFirstWorkout = false;

    for (let i = 0; i < 365; i++) {
      const weekDay = WEEKDAY_MAP[day.day()];
      const dateKey = day.format("YYYY-MM-DD");

      if (!planWeekDays.has(weekDay)) {
        day = day.subtract(1, "day");
        continue;
      }

      if (restWeekDays.has(weekDay)) {
        if (foundFirstWorkout) {
          streak++;
        }
        day = day.subtract(1, "day");
        continue;
      }

      if (completedDates.has(dateKey)) {
        streak++;
        foundFirstWorkout = true;
        day = day.subtract(1, "day");
        continue;
      }

      if (foundFirstWorkout) {
        break;
      }
      
      day = day.subtract(1, "day");
    }

    return streak;
  }
}

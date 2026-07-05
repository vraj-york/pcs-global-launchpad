import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ActivityKind,
  Prisma,
  RequestStatus,
  SessionStatus,
  SessionType,
} from '@prisma/client';
import { PrismaService } from '../prisma';
import { S3Service } from '../s3/s3.service';
import {
  CancelSessionDto,
  CoachCalendarQueryDto,
  CoachSessionsQueryDto,
  CoachSessionRequestsQueryDto,
  RescheduleSessionDto,
  ScheduleSessionDto,
  SessionRequestCancelDto,
  SessionRequestSlotsDto,
  UpdateCoachAvailabilityDto,
  UpdateSessionNotesDto,
} from './dto/coach-dashboard.dto';

type CoachUser = {
  cognitoSub: string;
  firstName: string | null;
  lastName: string | null;
  nickname: string | null;
  email: string | null;
  avatar: string | null;
  timezone: string | null;
  companyAccess: Array<{ companyId: string }>;
};

type SessionWithClient = Prisma.CoachingSessionGetPayload<{
  include: {
    client: {
      select: {
        cognitoSub: true;
        firstName: true;
        lastName: true;
        nickname: true;
        email: true;
        avatar: true;
      };
    };
    note: {
      select: {
        body: true;
      };
    };
  };
}>;

const SESSION_TYPE_LABELS: Record<SessionType, string> = {
  communication_conflict: 'Communication Conflict',
  goal_review: 'Goal Review',
  one_on_one_coaching: '1:1 Coaching',
  leadership_coaching: 'Leadership Coaching',
  strategic_thinking: 'Strategic Thinking',
  stress_management: 'Stress Management',
  communication_skills: 'Communication Skills',
};

const WEEKDAY_LABELS = [
  { id: 'monday', label: 'Monday', short: 'Mon', dayOfWeek: 1 },
  { id: 'tuesday', label: 'Tuesday', short: 'Tue', dayOfWeek: 2 },
  { id: 'wednesday', label: 'Wednesday', short: 'Wed', dayOfWeek: 3 },
  { id: 'thursday', label: 'Thursday', short: 'Thu', dayOfWeek: 4 },
  { id: 'friday', label: 'Friday', short: 'Fri', dayOfWeek: 5 },
  { id: 'saturday', label: 'Saturday', short: 'Sat', dayOfWeek: 6 },
  { id: 'sunday', label: 'Sunday', short: 'Sun', dayOfWeek: 7 },
] as const;

const DEFAULT_AVAILABILITY = {
  timezone: 'EST (Eastern Time)',
  defaultSessionLengthMins: 60,
  bufferMins: 15,
  windows: [
    { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' },
    { dayOfWeek: 2, startTime: '09:00', endTime: '17:00' },
    { dayOfWeek: 3, startTime: '09:00', endTime: '17:00' },
    { dayOfWeek: 4, startTime: '09:00', endTime: '17:00' },
    { dayOfWeek: 5, startTime: '09:00', endTime: '17:00' },
  ],
} as const;

function startOfDay(date: Date): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    0,
    0,
    0,
    0,
  );
}

function endOfDay(date: Date): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    23,
    59,
    59,
    999,
  );
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

function parseIsoDate(value?: string): Date | null {
  if (!value?.trim()) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const [, y, m, d] = match;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseTimeValue(value: string): string {
  const trimmed = value.trim();
  if (/^\d{2}:\d{2}$/.test(trimmed)) return trimmed;

  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(trimmed);
  if (!match) {
    throw new BadRequestException(`Invalid time value "${value}"`);
  }

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const period = match[3].toUpperCase();
  if (period === 'AM' && hours === 12) hours = 0;
  if (period === 'PM' && hours !== 12) hours += 12;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function timeToMinutes(value: string): number {
  const [hours, minutes] = parseTimeValue(value).split(':').map(Number);
  return hours * 60 + minutes;
}

function to12Hour(value: string): string {
  const normalized = parseTimeValue(value);
  const [hStr, mStr] = normalized.split(':');
  const hours = Number(hStr);
  const minutes = Number(mStr);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${String(minutes).padStart(2, '0')} ${period}`;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function formatLongDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

function formatTimeRange(start: Date, durationMins: number): string {
  const end = addMinutes(start, durationMins);
  return `${formatTime(start)} - ${formatTime(end)}`;
}

function formatDateTime(date: Date): string {
  return `${formatDate(date)}, ${formatTime(date)}`;
}

function durationLabel(minutes: number): string {
  return `${minutes} min`;
}

function relativeTime(date: Date): string {
  const diffMs = date.getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / 60_000);
  const absMinutes = Math.abs(diffMinutes);
  const hours = Math.floor(absMinutes / 60);
  const minutes = absMinutes % 60;

  let base = '';
  if (hours > 0 && minutes > 0) {
    base = `${hours}h ${minutes}min`;
  } else if (hours > 0) {
    base = `${hours}h`;
  } else {
    base = `${Math.max(absMinutes, 1)}min`;
  }

  return diffMinutes >= 0 ? `In ${base}` : `${base} ago`;
}

function startOfWeekMonday(date: Date): Date {
  const start = startOfDay(date);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  return start;
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function initialsFromName(name: string): string {
  const parts = name
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2);
  if (parts.length === 0) return 'NA';
  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('');
}

function dayIdToWeekday(id: string): number {
  const match = WEEKDAY_LABELS.find((day) => day.id === id);
  if (!match) throw new BadRequestException(`Unsupported weekday "${id}"`);
  return match.dayOfWeek;
}

function sessionTypeFromTitle(title: string): SessionType {
  const normalized = title.trim().toLowerCase();
  if (normalized.includes('communication') && normalized.includes('conflict')) {
    return SessionType.communication_conflict;
  }
  if (normalized.includes('goal')) return SessionType.goal_review;
  if (normalized.includes('strategic')) return SessionType.strategic_thinking;
  if (normalized.includes('stress')) return SessionType.stress_management;
  if (normalized.includes('communication')) return SessionType.communication_skills;
  if (normalized.includes('leadership')) return SessionType.leadership_coaching;
  return SessionType.one_on_one_coaching;
}

@Injectable()
export class CoachDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
  ) {}

  private displayName(user: CoachUser | SessionWithClient['client']): string {
    const fullName = [user.firstName, user.lastName]
      .map((value) => value?.trim())
      .filter(Boolean)
      .join(' ');
    return user.nickname?.trim() || fullName || user.email?.trim() || 'Unknown User';
  }

  private avatarUrl(avatar: string | null | undefined): string | undefined {
    if (!avatar?.trim()) return undefined;
    if (/^https?:\/\//i.test(avatar)) return avatar;
    return this.s3.getPublicUrl(avatar);
  }

  private buildClientSummary(user: CoachUser | SessionWithClient['client']) {
    const name = this.displayName(user);
    return {
      id: user.cognitoSub,
      name,
      email: user.email ?? '',
      avatarUrl: this.avatarUrl(user.avatar),
      initials: initialsFromName(name),
    };
  }

  private async getCoachUser(coachId: string): Promise<CoachUser> {
    const coach = await this.prisma.appUser.findUnique({
      where: { cognitoSub: coachId },
      select: {
        cognitoSub: true,
        firstName: true,
        lastName: true,
        nickname: true,
        email: true,
        avatar: true,
        timezone: true,
        companyAccess: {
          orderBy: { createdAt: 'asc' },
          take: 1,
          select: { companyId: true },
        },
      },
    });
    if (!coach) {
      throw new NotFoundException('Coach user not found');
    }
    return coach;
  }

  private async getSessionForCoach(
    coachId: string,
    sessionId: string,
  ): Promise<SessionWithClient> {
    const session = await this.prisma.coachingSession.findFirst({
      where: { id: sessionId, coachId },
      include: {
        client: {
          select: {
            cognitoSub: true,
            firstName: true,
            lastName: true,
            nickname: true,
            email: true,
            avatar: true,
          },
        },
        note: {
          select: {
            body: true,
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    return session;
  }

  private async ensureAvailability(coachId: string, timezone?: string | null) {
    const existing = await this.prisma.coachAvailability.findUnique({
      where: { coachId },
      include: { windows: { orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }] } },
    });
    if (existing) return existing;

    return this.prisma.coachAvailability.create({
      data: {
        coachId,
        timezone: timezone?.trim() || DEFAULT_AVAILABILITY.timezone,
        defaultSessionLengthMins: DEFAULT_AVAILABILITY.defaultSessionLengthMins,
        bufferMins: DEFAULT_AVAILABILITY.bufferMins,
        windows: {
          create: DEFAULT_AVAILABILITY.windows.map((window) => ({
            dayOfWeek: window.dayOfWeek,
            startTime: window.startTime,
            endTime: window.endTime,
          })),
        },
      },
      include: { windows: { orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }] } },
    });
  }

  private async ensureCoachBootstrapData(coachId: string): Promise<void> {
    const coach = await this.getCoachUser(coachId);
    await this.ensureAvailability(coachId, coach.timezone);

    const [sessionCount, requestCount] = await this.prisma.$transaction([
      this.prisma.coachingSession.count({ where: { coachId } }),
      this.prisma.sessionRequest.count({ where: { coachId } }),
    ]);

    if (sessionCount > 0 || requestCount > 0) return;

    const clients = await this.prisma.appUser.findMany({
      where: {
        cognitoSub: { not: coachId },
        deletedAt: null,
      },
      orderBy: [{ createdAt: 'asc' }],
      take: 4,
      select: {
        cognitoSub: true,
        firstName: true,
        lastName: true,
        nickname: true,
        email: true,
        avatar: true,
        companyAccess: {
          orderBy: { createdAt: 'asc' },
          take: 1,
          select: { companyId: true },
        },
      },
    });

    if (clients.length === 0) return;

    const now = new Date();
    const nextQuarterHour = new Date(now);
    nextQuarterHour.setSeconds(0, 0);
    const minutes = nextQuarterHour.getMinutes();
    nextQuarterHour.setMinutes(minutes + ((15 - (minutes % 15)) % 15 || 15));

    const upcomingDates = [
      addMinutes(nextQuarterHour, 60),
      addMinutes(nextQuarterHour, 240),
      addMinutes(nextQuarterHour, 400),
    ];
    const pastDate = new Date(now);
    pastDate.setDate(pastDate.getDate() - 3);
    pastDate.setHours(14, 30, 0, 0);

    const titles = [
      'Communication Conflict',
      'Goal Review',
      '1:1 Coaching',
      'Strategic Thinking',
    ] as const;

    const createdSessions = await this.prisma.$transaction(async (tx) => {
      const sessions = await Promise.all(
        [
          {
            client: clients[0],
            title: titles[0],
            startsAt: upcomingDates[0],
            durationMins: 40,
            status: SessionStatus.scheduled,
            description:
              'Weekly coaching session focused on communication patterns and team alignment.',
          },
          {
            client: clients[Math.min(1, clients.length - 1)],
            title: titles[1],
            startsAt: upcomingDates[1],
            durationMins: 60,
            status: SessionStatus.scheduled,
            description:
              'Goal review session covering progress, blockers, and next-quarter priorities.',
          },
          {
            client: clients[Math.min(2, clients.length - 1)],
            title: titles[2],
            startsAt: upcomingDates[2],
            durationMins: 45,
            status: SessionStatus.scheduled,
            description:
              'One-on-one coaching session for leadership development and decision-making support.',
          },
          {
            client: clients[Math.min(3, clients.length - 1)],
            title: titles[3],
            startsAt: pastDate,
            durationMins: 45,
            status: SessionStatus.completed,
            description:
              'Reviewed strategic planning frameworks and agreed on action items for the next sprint.',
          },
        ].map((seed) =>
          tx.coachingSession.create({
            data: {
              coachId,
              clientId: seed.client.cognitoSub,
              companyId: seed.client.companyAccess[0]?.companyId,
              title: seed.title,
              description: seed.description,
              type: sessionTypeFromTitle(seed.title),
              status: seed.status,
              startsAt: seed.startsAt,
              durationMins: seed.durationMins,
            },
          }),
        ),
      );

      await tx.sessionNote.create({
        data: {
          sessionId: sessions[3].id,
          coachId,
          body:
            'Great progress on delegation skills. The client identified two team decisions to hand off this week and committed to a Friday reflection check-in.',
        },
      });

      await tx.sessionRequest.createMany({
        data: [
          {
            coachId,
            clientId: clients[0].cognitoSub,
            title: 'Strategic Thinking',
            preferredAt: addMinutes(nextQuarterHour, 720),
            status: RequestStatus.pending,
            message: 'Would like to work through an upcoming planning presentation.',
          },
          {
            coachId,
            clientId: clients[Math.min(1, clients.length - 1)].cognitoSub,
            title: 'Leadership Coaching',
            status: RequestStatus.proposed,
            proposedSlots: [
              'Mon 10:00 AM - 10:15 AM',
              'Wed 2:30 PM - 2:45 PM',
            ],
            message: 'Client shared a few alternate windows for the follow-up.',
          },
          {
            coachId,
            clientId: clients[Math.min(2, clients.length - 1)].cognitoSub,
            title: 'Stress Management',
            status: RequestStatus.cancelled,
            preferredAt: addMinutes(nextQuarterHour, 900),
            cancelReason:
              'Due to an unexpected scheduling conflict, I am unable to attend at the planned time.',
          },
          {
            coachId,
            clientId: clients[Math.min(3, clients.length - 1)].cognitoSub,
            title: 'Communication Skills',
            status: RequestStatus.cancelled,
            preferredAt: addMinutes(nextQuarterHour, 1020),
            cancelReason:
              'Due to an unexpected scheduling conflict, I am unable to attend at the planned time.',
          },
        ],
      });

      await tx.coachClientActivity.createMany({
        data: [
          {
            coachId,
            clientId: clients[0].cognitoSub,
            sessionId: sessions[0].id,
            kind: ActivityKind.session_requested,
            message: `${this.displayName(clients[0])} requested a session on ${formatDateTime(addMinutes(nextQuarterHour, 720))}`,
          },
          {
            coachId,
            clientId: clients[Math.min(1, clients.length - 1)].cognitoSub,
            sessionId: sessions[1].id,
            kind: ActivityKind.session_cancelled,
            message: `${this.displayName(clients[Math.min(1, clients.length - 1)])} cancelled a previous session.`,
          },
          {
            coachId,
            clientId: clients[Math.min(3, clients.length - 1)].cognitoSub,
            sessionId: sessions[3].id,
            kind: ActivityKind.notes_added,
            message: 'Notes added.',
          },
        ],
      });

      return sessions;
    });

    void createdSessions;
  }

  private mapDashboardSession(session: SessionWithClient) {
    const client = this.buildClientSummary(session.client);
    return {
      id: session.id,
      name: client.name,
      badge: SESSION_TYPE_LABELS[session.type],
      badgeVariant:
        session.type === SessionType.communication_conflict ||
        session.type === SessionType.goal_review
          ? 'blue'
          : 'green',
      time: formatTime(session.startsAt),
      relativeTime: relativeTime(session.startsAt),
      avatar: client.avatarUrl,
      initials: client.initials,
    };
  }

  private mapActivity(
    activity: Prisma.CoachClientActivityGetPayload<{
      include: {
        client: {
          select: {
            cognitoSub: true;
            firstName: true;
            lastName: true;
            nickname: true;
            email: true;
            avatar: true;
          };
        };
      };
    }>,
  ) {
    const client = this.buildClientSummary(activity.client);
    return {
      id: activity.id,
      name: client.name,
      detail: activity.message,
      timestamp: relativeTime(activity.createdAt),
      avatar: client.avatarUrl,
      initials: client.initials,
    };
  }

  private availabilitySummary(availability: {
    timezone: string;
    defaultSessionLengthMins: number;
    bufferMins: number;
    windows: Array<{ dayOfWeek: number; startTime: string; endTime: string }>;
  }) {
    const activeDays = WEEKDAY_LABELS.filter((day) =>
      availability.windows.some((window) => window.dayOfWeek === day.dayOfWeek),
    );
    const groupedRanges = activeDays.flatMap((day) =>
      availability.windows.filter((window) => window.dayOfWeek === day.dayOfWeek),
    );
    const firstRange = groupedRanges[0];
    const dayLabel =
      activeDays.length === 5 &&
      activeDays.every((day, index) => day.dayOfWeek === index + 1)
        ? 'Monday - Friday'
        : activeDays.map((day) => day.short).join(', ');

    return [
      {
        id: 'days',
        label: dayLabel || 'Unavailable',
        value: firstRange
          ? `${to12Hour(firstRange.startTime)} - ${to12Hour(firstRange.endTime)}`
          : 'Unavailable',
      },
      {
        id: 'timezone',
        label: 'Time Zone',
        value: availability.timezone,
      },
      {
        id: 'session-length',
        label: 'Session Length',
        value: `${availability.defaultSessionLengthMins} min`,
      },
      {
        id: 'buffer-time',
        label: 'Buffer Time (In-between Sessions)',
        value: `${availability.bufferMins} min`,
      },
    ];
  }

  private availabilityDays(availability: {
    windows: Array<{ dayOfWeek: number; startTime: string; endTime: string }>;
  }) {
    return WEEKDAY_LABELS.map((day) => {
      const ranges = availability.windows
        .filter((window) => window.dayOfWeek === day.dayOfWeek)
        .map((window) => ({
          start: to12Hour(window.startTime),
          end: to12Hour(window.endTime),
        }));
      return {
        id: day.id,
        label: day.label,
        enabled: ranges.length > 0,
        ranges,
      };
    });
  }

  private async getAvailabilityRecord(coachId: string) {
    const coach = await this.getCoachUser(coachId);
    return this.ensureAvailability(coachId, coach.timezone);
  }

  private async validateSessionTiming(
    coachId: string,
    startsAt: Date,
    durationMins: number,
    bufferMins: number,
    excludeSessionId?: string,
  ) {
    const availability = await this.getAvailabilityRecord(coachId);
    const day = startsAt.getDay() === 0 ? 7 : startsAt.getDay();
    const dayWindows = availability.windows.filter((window) => window.dayOfWeek === day);
    if (dayWindows.length === 0) {
      throw new BadRequestException('Coach is unavailable on the selected day');
    }

    const startMinutes = startsAt.getHours() * 60 + startsAt.getMinutes();
    const endMinutes = startMinutes + durationMins;
    const fitsWindow = dayWindows.some((window) => {
      const windowStart = timeToMinutes(window.startTime);
      const windowEnd = timeToMinutes(window.endTime);
      return startMinutes >= windowStart && endMinutes <= windowEnd;
    });
    if (!fitsWindow) {
      throw new BadRequestException('Selected time is outside coach availability');
    }

    const existing = await this.prisma.coachingSession.findMany({
      where: {
        coachId,
        id: excludeSessionId ? { not: excludeSessionId } : undefined,
        status: { not: SessionStatus.cancelled },
        startsAt: {
          gte: startOfDay(startsAt),
          lte: endOfDay(startsAt),
        },
      },
      select: {
        id: true,
        startsAt: true,
        durationMins: true,
      },
    });

    const conflict = existing.find((session) => {
      const existingStart = session.startsAt.getTime();
      const existingEnd =
        session.startsAt.getTime() +
        (session.durationMins + bufferMins) * 60_000;
      const nextStart = startsAt.getTime();
      const nextEnd = startsAt.getTime() + (durationMins + bufferMins) * 60_000;
      return nextStart < existingEnd && existingStart < nextEnd;
    });

    if (conflict) {
      throw new BadRequestException('Selected time overlaps an existing session');
    }
  }

  private async createActivity(
    coachId: string,
    clientId: string,
    kind: ActivityKind,
    message: string,
    sessionId?: string,
  ) {
    await this.prisma.coachClientActivity.create({
      data: {
        coachId,
        clientId,
        kind,
        message,
        sessionId,
      },
    });
  }

  async getSummary(coachId: string) {
    await this.ensureCoachBootstrapData(coachId);
    const [sessions, activity, insight, availability] = await Promise.all([
      this.getDashboardSessions(coachId),
      this.getActivity(coachId, 10),
      this.getInsight(coachId),
      this.getAvailability(coachId),
    ]);

    return {
      sessions,
      activity,
      insight,
      availability,
    };
  }

  async getDashboardSessions(coachId: string, date?: string) {
    await this.ensureCoachBootstrapData(coachId);

    let where: Prisma.CoachingSessionWhereInput = {
      coachId,
      status: { in: [SessionStatus.scheduled, SessionStatus.rescheduled] },
    };

    if (date) {
      const parsed = parseIsoDate(date);
      if (!parsed) {
        throw new BadRequestException('date must be a valid yyyy-MM-dd value');
      }
      where = {
        ...where,
        startsAt: {
          gte: startOfDay(parsed),
          lte: endOfDay(parsed),
        },
      };
    } else {
      where = {
        ...where,
        startsAt: { gte: new Date() },
      };
    }

    const sessions = await this.prisma.coachingSession.findMany({
      where,
      orderBy: { startsAt: 'asc' },
      take: 3,
      include: {
        client: {
          select: {
            cognitoSub: true,
            firstName: true,
            lastName: true,
            nickname: true,
            email: true,
            avatar: true,
          },
        },
        note: { select: { body: true } },
      },
    });

    return sessions.map((session) => this.mapDashboardSession(session));
  }

  async createSession(coachId: string, dto: ScheduleSessionDto) {
    const availability = await this.getAvailabilityRecord(coachId);
    const date = parseIsoDate(dto.date);
    if (!date) {
      throw new BadRequestException('date must be a valid yyyy-MM-dd value');
    }

    const start = parseTimeValue(dto.startTime);
    const end = parseTimeValue(dto.endTime);
    const [startHour, startMinute] = start.split(':').map(Number);
    const [endHour, endMinute] = end.split(':').map(Number);
    const startsAt = new Date(date);
    startsAt.setHours(startHour, startMinute, 0, 0);
    const endsAt = new Date(date);
    endsAt.setHours(endHour, endMinute, 0, 0);
    const durationMins = Math.max(
      Math.round((endsAt.getTime() - startsAt.getTime()) / 60_000),
      15,
    );

    await this.validateSessionTiming(
      coachId,
      startsAt,
      durationMins,
      availability.bufferMins,
    );

    const client = await this.prisma.appUser.findUnique({
      where: { cognitoSub: dto.clientId },
      select: {
        cognitoSub: true,
        companyAccess: {
          orderBy: { createdAt: 'asc' },
          take: 1,
          select: { companyId: true },
        },
      },
    });
    if (!client) {
      throw new NotFoundException('Client not found');
    }

    const session = await this.prisma.coachingSession.create({
      data: {
        coachId,
        clientId: client.cognitoSub,
        companyId: client.companyAccess[0]?.companyId,
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        type: sessionTypeFromTitle(dto.title),
        status: SessionStatus.scheduled,
        startsAt,
        durationMins,
      },
    });

    await this.createActivity(
      coachId,
      client.cognitoSub,
      ActivityKind.session_created,
      `Scheduled ${dto.title.trim()} for ${formatDateTime(startsAt)}`,
      session.id,
    );

    return session;
  }

  async rescheduleSession(
    coachId: string,
    sessionId: string,
    dto: RescheduleSessionDto,
  ) {
    const session = await this.getSessionForCoach(coachId, sessionId);
    const availability = await this.getAvailabilityRecord(coachId);
    const date = parseIsoDate(dto.date);
    if (!date) {
      throw new BadRequestException('date must be a valid yyyy-MM-dd value');
    }
    const start = parseTimeValue(dto.startTime);
    const end = parseTimeValue(dto.endTime);
    const [startHour, startMinute] = start.split(':').map(Number);
    const [endHour, endMinute] = end.split(':').map(Number);
    const startsAt = new Date(date);
    startsAt.setHours(startHour, startMinute, 0, 0);
    const endsAt = new Date(date);
    endsAt.setHours(endHour, endMinute, 0, 0);
    const durationMins = Math.max(
      Math.round((endsAt.getTime() - startsAt.getTime()) / 60_000),
      15,
    );

    await this.validateSessionTiming(
      coachId,
      startsAt,
      durationMins,
      availability.bufferMins,
      sessionId,
    );

    const updated = await this.prisma.coachingSession.update({
      where: { id: sessionId },
      data: {
        startsAt,
        durationMins,
        description: dto.notes?.trim() || session.description,
        status: SessionStatus.rescheduled,
      },
    });

    await this.createActivity(
      coachId,
      session.clientId,
      ActivityKind.session_rescheduled,
      `Rescheduled ${session.title} to ${formatDateTime(startsAt)}`,
      sessionId,
    );

    return updated;
  }

  async joinSession(coachId: string, sessionId: string) {
    const session = await this.getSessionForCoach(coachId, sessionId);
    if (session.meetingUrl) {
      return { meetingUrl: session.meetingUrl };
    }
    const meetingUrl = `https://meet.bspblueprint.local/session/${session.id}`;
    await this.prisma.coachingSession.update({
      where: { id: session.id },
      data: { meetingUrl },
    });
    return { meetingUrl };
  }

  async getQuickPrep(coachId: string, sessionId: string) {
    const session = await this.getSessionForCoach(coachId, sessionId);
    const lastSession = await this.prisma.coachingSession.findFirst({
      where: {
        coachId,
        clientId: session.clientId,
        startsAt: { lt: session.startsAt },
      },
      orderBy: { startsAt: 'desc' },
      include: { note: { select: { body: true } } },
    });
    const client = this.buildClientSummary(session.client);
    return {
      lastSessionOn: lastSession ? formatDateTime(lastSession.startsAt) : 'N/A',
      sessionType: SESSION_TYPE_LABELS[session.type],
      clientName: client.name,
      clientEmail: client.email,
      clientInitials: client.initials,
      clientAvatar: client.avatarUrl,
      lastSessionNotes:
        lastSession?.note?.body ||
        'No previous notes were recorded for this client.',
    };
  }

  async cancelSession(coachId: string, sessionId: string, dto: CancelSessionDto) {
    const session = await this.getSessionForCoach(coachId, sessionId);
    const updated = await this.prisma.coachingSession.update({
      where: { id: sessionId },
      data: {
        status: SessionStatus.cancelled,
        description:
          `${session.description?.trim() || ''}\n\nCancellation reason: ${dto.reason.trim()}`.trim(),
      },
    });

    await this.createActivity(
      coachId,
      session.clientId,
      ActivityKind.session_cancelled,
      `${this.buildClientSummary(session.client).name} cancelled a session on ${formatDate(session.startsAt)}.`,
      sessionId,
    );

    return updated;
  }

  async getActivity(coachId: string, limit = 10) {
    await this.ensureCoachBootstrapData(coachId);
    const rows = await this.prisma.coachClientActivity.findMany({
      where: { coachId },
      orderBy: { createdAt: 'desc' },
      take: Math.max(limit, 1),
      include: {
        client: {
          select: {
            cognitoSub: true,
            firstName: true,
            lastName: true,
            nickname: true,
            email: true,
            avatar: true,
          },
        },
      },
    });
    return rows.map((row) => this.mapActivity(row));
  }

  async getInsight(coachId: string) {
    await this.ensureCoachBootstrapData(coachId);
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const nextMonthStart = new Date(
      monthStart.getFullYear(),
      monthStart.getMonth() + 1,
      1,
      0,
      0,
      0,
      0,
    );

    const sessions = await this.prisma.coachingSession.findMany({
      where: {
        coachId,
        startsAt: { gte: monthStart, lt: nextMonthStart },
        status: { not: SessionStatus.cancelled },
      },
      select: {
        clientId: true,
        durationMins: true,
      },
    });

    const totalMinutes = sessions.reduce(
      (sum, session) => sum + session.durationMins,
      0,
    );

    return [
      {
        id: 'total-sessions',
        value: String(sessions.length),
        label: 'Total Sessions',
        icon: 'calendar-fold',
      },
      {
        id: 'active-clients',
        value: String(new Set(sessions.map((session) => session.clientId)).size),
        label: 'Active Clients',
        icon: 'users',
      },
      {
        id: 'overall-coaching-time',
        value:
          totalMinutes >= 60
            ? `${Math.round((totalMinutes / 60) * 10) / 10} h`
            : `${totalMinutes} min`,
        label: 'Overall Coaching Time',
        icon: 'hourglass',
        wide: true,
      },
    ];
  }

  async getAvailability(coachId: string) {
    const availability = await this.getAvailabilityRecord(coachId);
    return {
      timezone: availability.timezone,
      defaultSessionLengthMins: availability.defaultSessionLengthMins,
      bufferMins: availability.bufferMins,
      summary: this.availabilitySummary(availability),
      days: this.availabilityDays(availability),
    };
  }

  async updateAvailability(coachId: string, dto: UpdateCoachAvailabilityDto) {
    const availability = await this.getAvailabilityRecord(coachId);
    await this.prisma.$transaction(async (tx) => {
      await tx.coachAvailability.update({
        where: { id: availability.id },
        data: {
          timezone: dto.timezone.trim(),
          defaultSessionLengthMins: dto.defaultSessionLengthMins,
          bufferMins: dto.bufferMins,
        },
      });
      await tx.coachAvailabilityWindow.deleteMany({
        where: { availabilityId: availability.id },
      });
      const windows = dto.days.flatMap((day) =>
        day.enabled
          ? day.ranges.map((range) => ({
              availabilityId: availability.id,
              dayOfWeek: dayIdToWeekday(day.id),
              startTime: parseTimeValue(range.start),
              endTime: parseTimeValue(range.end),
            }))
          : [],
      );
      if (windows.length > 0) {
        await tx.coachAvailabilityWindow.createMany({
          data: windows,
        });
      }
    });

    return this.getAvailability(coachId);
  }

  async getClients(coachId: string) {
    await this.ensureCoachBootstrapData(coachId);
    const users = await this.prisma.appUser.findMany({
      where: {
        cognitoSub: { not: coachId },
        deletedAt: null,
      },
      orderBy: [{ firstName: 'asc' }, { createdAt: 'asc' }],
      select: {
        cognitoSub: true,
        firstName: true,
        lastName: true,
        nickname: true,
        email: true,
        avatar: true,
        timezone: true,
        companyAccess: {
          orderBy: { createdAt: 'asc' },
          take: 1,
          select: { companyId: true },
        },
      },
    });

    return users.map((user) => this.buildClientSummary(user));
  }

  private mapScheduledSession(session: SessionWithClient) {
    const client = this.buildClientSummary(session.client);
    return {
      id: session.id,
      title: session.title,
      clientName: client.name,
      clientEmail: client.email,
      clientAvatar: client.avatarUrl,
      clientInitials: client.initials,
      date: formatDate(session.startsAt),
      timeRange: formatTimeRange(session.startsAt, session.durationMins),
      duration: durationLabel(session.durationMins),
      description: session.description || '',
      scope:
        session.startsAt.getTime() >= Date.now() &&
        session.status !== SessionStatus.completed
          ? 'upcoming'
          : 'past',
      notes: session.note?.body,
    };
  }

  async getSessionsPageSessions(coachId: string, query: CoachSessionsQueryDto) {
    await this.ensureCoachBootstrapData(coachId);
    const scope = query.scope ?? 'upcoming';
    const now = new Date();
    const sessions = await this.prisma.coachingSession.findMany({
      where: {
        coachId,
        status: { not: SessionStatus.cancelled },
        ...(scope === 'upcoming'
          ? { startsAt: { gte: now } }
          : { OR: [{ startsAt: { lt: now } }, { status: SessionStatus.completed }] }),
      },
      orderBy: { startsAt: scope === 'upcoming' ? 'asc' : 'desc' },
      include: {
        client: {
          select: {
            cognitoSub: true,
            firstName: true,
            lastName: true,
            nickname: true,
            email: true,
            avatar: true,
          },
        },
        note: { select: { body: true } },
      },
    });
    return sessions.map((session) => this.mapScheduledSession(session));
  }

  async getSessionDetail(coachId: string, sessionId: string) {
    const session = await this.getSessionForCoach(coachId, sessionId);
    return this.mapScheduledSession(session);
  }

  async getSessionNotes(coachId: string, sessionId: string) {
    const session = await this.getSessionForCoach(coachId, sessionId);
    return {
      sessionId,
      notes: session.note?.body || '',
    };
  }

  async updateSessionNotes(
    coachId: string,
    sessionId: string,
    dto: UpdateSessionNotesDto,
  ) {
    const session = await this.getSessionForCoach(coachId, sessionId);
    const note = await this.prisma.sessionNote.upsert({
      where: { sessionId },
      update: { body: dto.notes.trim() },
      create: {
        sessionId,
        coachId,
        body: dto.notes.trim(),
      },
    });
    await this.createActivity(
      coachId,
      session.clientId,
      ActivityKind.notes_added,
      'Notes Added.',
      sessionId,
    );
    return note;
  }

  async getSessionRequests(
    coachId: string,
    query: CoachSessionRequestsQueryDto,
  ) {
    await this.ensureCoachBootstrapData(coachId);
    const rows = await this.prisma.sessionRequest.findMany({
      where: {
        coachId,
        ...(query.employeeId ? { clientId: query.employeeId } : {}),
        ...(query.status && query.status !== 'all'
          ? { status: query.status as RequestStatus }
          : {
              status: {
                in: [
                  RequestStatus.pending,
                  RequestStatus.proposed,
                  RequestStatus.cancelled,
                ],
              },
            }),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        client: {
          select: {
            cognitoSub: true,
            firstName: true,
            lastName: true,
            nickname: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    return rows.map((row) => {
      const client = this.buildClientSummary(row.client);
      if (row.status === RequestStatus.pending) {
        return {
          id: row.id,
          title: row.title,
          status: 'new',
          statusLabel: 'New Request',
          clientName: client.name,
          clientAvatar: client.avatarUrl,
          clientInitials: client.initials,
          metaText: `has requested a session on ${row.preferredAt ? formatDateTime(row.preferredAt) : 'a requested time'}`,
          actions: ['cancelRequest', 'proposeSlots', 'accept'],
        };
      }
      if (row.status === RequestStatus.proposed) {
        return {
          id: row.id,
          title: row.title,
          status: 'proposed',
          statusLabel: 'Proposed',
          clientName: client.name,
          clientAvatar: client.avatarUrl,
          clientInitials: client.initials,
          metaText: 'has proposed ',
          linkLabel: 'new time slots',
          tooltipLines: Array.isArray(row.proposedSlots)
            ? row.proposedSlots.map((value) => String(value))
            : [],
          actions: ['cancelRequest', 'editSlots', 'remind'],
        };
      }
      return {
        id: row.id,
        title: row.title,
        status: 'cancelled',
        statusLabel: 'Cancelled',
        clientName: client.name,
        clientAvatar: client.avatarUrl,
        clientInitials: client.initials,
        metaText: row.preferredAt
          ? `has cancelled a session request of ${formatDateTime(row.preferredAt)}`
          : `You’ve cancelled the session request`,
        reason: row.cancelReason || 'No reason provided.',
        actions: ['viewReason'],
      };
    });
  }

  async acceptSessionRequest(coachId: string, requestId: string) {
    const request = await this.prisma.sessionRequest.findFirst({
      where: { id: requestId, coachId },
      include: {
        client: {
          select: {
            cognitoSub: true,
            companyAccess: {
              orderBy: { createdAt: 'asc' },
              take: 1,
              select: { companyId: true },
            },
          },
        },
      },
    });
    if (!request) throw new NotFoundException('Session request not found');

    const availability = await this.getAvailabilityRecord(coachId);
    const startsAt =
      request.preferredAt ||
      addMinutes(
        new Date(),
        availability.defaultSessionLengthMins + availability.bufferMins,
      );

    await this.validateSessionTiming(
      coachId,
      startsAt,
      availability.defaultSessionLengthMins,
      availability.bufferMins,
    );

    const session = await this.prisma.coachingSession.create({
      data: {
        coachId,
        clientId: request.clientId,
        companyId: request.client.companyAccess[0]?.companyId,
        title: request.title,
        description: request.message,
        type: sessionTypeFromTitle(request.title),
        status: SessionStatus.scheduled,
        startsAt,
        durationMins: availability.defaultSessionLengthMins,
      },
    });

    await this.prisma.sessionRequest.update({
      where: { id: requestId },
      data: { status: RequestStatus.accepted },
    });

    await this.createActivity(
      coachId,
      request.clientId,
      ActivityKind.request_accepted,
      `Accepted ${request.title} and scheduled it for ${formatDateTime(startsAt)}`,
      session.id,
    );

    return session;
  }

  async declineSessionRequest(
    coachId: string,
    requestId: string,
    dto?: SessionRequestCancelDto,
  ) {
    const request = await this.prisma.sessionRequest.findFirst({
      where: { id: requestId, coachId },
    });
    if (!request) throw new NotFoundException('Session request not found');
    const updated = await this.prisma.sessionRequest.update({
      where: { id: requestId },
      data: {
        status: RequestStatus.declined,
        cancelReason: dto?.reason?.trim() || request.cancelReason,
      },
    });
    await this.createActivity(
      coachId,
      request.clientId,
      ActivityKind.request_declined,
      `Declined ${request.title} request.`,
    );
    return updated;
  }

  async proposeSlots(
    coachId: string,
    requestId: string,
    dto: SessionRequestSlotsDto,
  ) {
    const request = await this.prisma.sessionRequest.findFirst({
      where: { id: requestId, coachId },
    });
    if (!request) throw new NotFoundException('Session request not found');
    const updated = await this.prisma.sessionRequest.update({
      where: { id: requestId },
      data: {
        status: RequestStatus.proposed,
        proposedSlots: dto.proposedSlots,
      },
    });
    await this.createActivity(
      coachId,
      request.clientId,
      ActivityKind.request_proposed,
      `Proposed new time slots for ${request.title}.`,
    );
    return updated;
  }

  async editProposedSlots(
    coachId: string,
    requestId: string,
    dto: SessionRequestSlotsDto,
  ) {
    return this.proposeSlots(coachId, requestId, dto);
  }

  async remindSessionRequest(coachId: string, requestId: string) {
    const request = await this.prisma.sessionRequest.findFirst({
      where: { id: requestId, coachId },
    });
    if (!request) throw new NotFoundException('Session request not found');
    await this.createActivity(
      coachId,
      request.clientId,
      ActivityKind.request_reminded,
      `Sent a reminder for ${request.title}.`,
    );
    return { reminded: true };
  }

  async cancelSessionRequest(
    coachId: string,
    requestId: string,
    dto: SessionRequestCancelDto,
  ) {
    const request = await this.prisma.sessionRequest.findFirst({
      where: { id: requestId, coachId },
    });
    if (!request) throw new NotFoundException('Session request not found');
    const updated = await this.prisma.sessionRequest.update({
      where: { id: requestId },
      data: {
        status: RequestStatus.cancelled,
        cancelReason: dto.reason?.trim() || request.cancelReason,
        cancelledBy: coachId,
      },
    });
    await this.createActivity(
      coachId,
      request.clientId,
      ActivityKind.request_cancelled,
      `Cancelled ${request.title} request.`,
    );
    return updated;
  }

  async getSessionRequestReason(coachId: string, requestId: string) {
    const request = await this.prisma.sessionRequest.findFirst({
      where: { id: requestId, coachId },
      select: { cancelReason: true },
    });
    if (!request) throw new NotFoundException('Session request not found');
    return { reason: request.cancelReason || 'No reason provided.' };
  }

  async getClientSessions(
    coachId: string,
    clientId: string,
    query: CoachSessionsQueryDto,
  ) {
    const scope = query.scope ?? 'upcoming';
    const now = new Date();
    const sessions = await this.prisma.coachingSession.findMany({
      where: {
        coachId,
        clientId,
        status: { not: SessionStatus.cancelled },
        ...(scope === 'upcoming'
          ? { startsAt: { gte: now } }
          : { OR: [{ startsAt: { lt: now } }, { status: SessionStatus.completed }] }),
      },
      orderBy: { startsAt: scope === 'upcoming' ? 'asc' : 'desc' },
      include: { note: { select: { body: true } } },
    });

    return sessions.map((session) => ({
      id: session.id,
      title: session.title,
      dateTime: `${formatDate(session.startsAt)} • ${formatTimeRange(session.startsAt, session.durationMins)}`,
      notes: session.note?.body,
    }));
  }

  async getCalendar(coachId: string, query: CoachCalendarQueryDto) {
    await this.ensureCoachBootstrapData(coachId);
    const start = parseIsoDate(query.start);
    if (!start) {
      throw new BadRequestException('start must be a valid yyyy-MM-dd value');
    }

    if (query.view === 'week') {
      const weekStart = startOfWeekMonday(start);
      const weekEnd = endOfDay(addMinutes(weekStart, 4 * 24 * 60));
      const sessions = await this.prisma.coachingSession.findMany({
        where: {
          coachId,
          status: { not: SessionStatus.cancelled },
          startsAt: { gte: weekStart, lte: weekEnd },
        },
        orderBy: { startsAt: 'asc' },
        include: {
          client: {
            select: {
              cognitoSub: true,
              firstName: true,
              lastName: true,
              nickname: true,
              email: true,
              avatar: true,
            },
          },
          note: { select: { body: true } },
        },
      });

      const days = WEEKDAY_LABELS.slice(0, 5).map((day, index) => {
        const current = new Date(weekStart);
        current.setDate(weekStart.getDate() + index);
        return {
          id: day.id,
          label: day.short,
          date: String(current.getDate()),
          highlighted: index === 1,
        };
      });

      return {
        view: 'week',
        days,
        events: sessions.map((session) => {
          const client = this.buildClientSummary(session.client);
          const jsDay = session.startsAt.getDay();
          const dayIndex = jsDay === 0 ? 6 : jsDay - 1;
          const startMinutes =
            session.startsAt.getHours() * 60 + session.startsAt.getMinutes();
          return {
            id: session.id,
            title: session.title,
            dayIndex,
            startMinutes,
            endMinutes: startMinutes + session.durationMins,
            accent:
              session.type === SessionType.communication_conflict
                ? 'warning'
                : session.type === SessionType.goal_review
                  ? 'success'
                  : 'blue',
            dateLabel: formatLongDate(session.startsAt),
            timeRange: formatTimeRange(session.startsAt, session.durationMins),
            duration: durationLabel(session.durationMins),
            clientName: client.name,
            clientEmail: client.email,
            clientAvatar: client.avatarUrl,
            clientInitials: client.initials,
            description: session.description || '',
          };
        }),
      };
    }

    const monthStart = new Date(start.getFullYear(), start.getMonth(), 1);
    const monthEnd = endOfMonth(start);
    const sessions = await this.prisma.coachingSession.findMany({
      where: {
        coachId,
        status: { not: SessionStatus.cancelled },
        startsAt: { gte: monthStart, lte: monthEnd },
      },
      orderBy: { startsAt: 'asc' },
      include: {
        client: {
          select: {
            cognitoSub: true,
            firstName: true,
            lastName: true,
            nickname: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    const gridStart = startOfWeekMonday(monthStart);
    const weeks: Array<
      Array<{
        date: number;
        inMonth: boolean;
        events?: Array<{
          id: string;
          title: string;
          accent: 'error' | 'success' | 'warning';
          clientName: string;
          clientInitials?: string;
          clientAvatar?: string;
          timeRange: string;
        }>;
      }>
    > = [];

    let pointer = new Date(gridStart);
    for (let week = 0; week < 6; week += 1) {
      const days: (typeof weeks)[number] = [];
      for (let day = 0; day < 7; day += 1) {
        const daySessions = sessions.filter(
          (session) =>
            session.startsAt.getFullYear() === pointer.getFullYear() &&
            session.startsAt.getMonth() === pointer.getMonth() &&
            session.startsAt.getDate() === pointer.getDate(),
        );
        days.push({
          date: pointer.getDate(),
          inMonth: pointer.getMonth() === monthStart.getMonth(),
          events: daySessions.map((session) => {
            const client = this.buildClientSummary(session.client);
            return {
              id: session.id,
              title: session.title,
              accent:
                session.status === SessionStatus.completed
                  ? 'success'
                  : session.type === SessionType.communication_conflict
                    ? 'error'
                    : 'warning',
              clientName: client.name,
              clientInitials: client.initials,
              clientAvatar: client.avatarUrl,
              timeRange: formatTimeRange(session.startsAt, session.durationMins),
            };
          }),
        });
        pointer.setDate(pointer.getDate() + 1);
      }
      weeks.push(days);
    }

    const selectedDate =
      sessions[0]?.startsAt.getDate() ?? Math.min(new Date().getDate(), 28);

    return {
      view: 'month',
      monthLabel: new Intl.DateTimeFormat('en-US', {
        month: 'long',
        year: 'numeric',
      }).format(monthStart),
      weeks,
      selectedDate,
    };
  }
}

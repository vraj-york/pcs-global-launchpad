import {
  bootstrapCoachPersonaTests,
  firstDayOfMonthIso,
  mondayOfWeekIso,
  nextWeekdayIso,
  teardownCoachPersonaTests,
  type CoachPersonaTestContext,
} from './helpers/coach-persona-e2e.helpers';

describe('Coach Persona (e2e)', () => {
  let ctx: CoachPersonaTestContext;
  let scheduleDate: string;
  let createdSessionId: string;
  let pendingRequestId: string;
  let proposedRequestId: string;
  let cancelledRequestId: string;

  beforeAll(async () => {
    ctx = await bootstrapCoachPersonaTests();
    scheduleDate = nextWeekdayIso(2);
  }, 60_000);

  afterAll(async () => {
    await teardownCoachPersonaTests(ctx);
  }, 30_000);

  describe('Coach Dashboard API (/coach-dashboard)', () => {
    it('GET /coach-dashboard/summary returns dashboard payload', async () => {
      const response = await ctx.http.get('/coach-dashboard/summary').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(
        expect.objectContaining({
          sessions: expect.any(Array),
          activity: expect.any(Array),
          insight: expect.any(Array),
          availability: expect.objectContaining({
            summary: expect.any(Array),
            days: expect.any(Array),
          }),
        }),
      );
    });

    it('GET /coach-dashboard/sessions returns upcoming sessions', async () => {
      const response = await ctx.http.get('/coach-dashboard/sessions').expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('GET /coach-dashboard/sessions?date filters by date', async () => {
      const response = await ctx.http
        .get(`/coach-dashboard/sessions?date=${encodeURIComponent(scheduleDate)}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('GET /coach-dashboard/activity returns recent activity', async () => {
      const response = await ctx.http
        .get('/coach-dashboard/activity?limit=5')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('GET /coach-dashboard/insight returns monthly insight stats', async () => {
      const response = await ctx.http
        .get('/coach-dashboard/insight?period=month')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('GET /coach-dashboard/availability returns availability settings', async () => {
      const response = await ctx.http.get('/coach-dashboard/availability').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(
        expect.objectContaining({
          timezone: expect.any(String),
          defaultSessionLengthMins: expect.any(Number),
          bufferMins: expect.any(Number),
          days: expect.any(Array),
        }),
      );
    });

    it('PUT /coach-dashboard/availability updates availability', async () => {
      const current = await ctx.http.get('/coach-dashboard/availability').expect(200);
      const days = (current.body.data.days as Array<{
        id: string;
        enabled: boolean;
        ranges: Array<{ start: string; end: string }>;
      }>).map(({ id, enabled, ranges }) => ({ id, enabled, ranges }));

      const response = await ctx.http
        .put('/coach-dashboard/availability')
        .send({
          timezone: 'EST (Eastern Time)',
          defaultSessionLengthMins: 60,
          bufferMins: 15,
          days,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.defaultSessionLengthMins).toBe(60);
    });

    it('GET /coach-dashboard/clients returns coach clients', async () => {
      const response = await ctx.http.get('/coach-dashboard/clients').expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0]).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          name: expect.any(String),
          email: expect.any(String),
        }),
      );
    });

    it('POST /coach-dashboard/sessions schedules a new session', async () => {
      const response = await ctx.http
        .post('/coach-dashboard/sessions')
        .send({
          title: 'Leadership Coaching',
          date: scheduleDate,
          startTime: '10:00 AM',
          endTime: '11:00 AM',
          clientId: ctx.clientId,
          description: 'E2E scheduled session',
          notify: false,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toEqual(expect.any(String));
      createdSessionId = response.body.data.id;
    });

    it('PATCH /coach-dashboard/sessions/:id/reschedule reschedules a session', async () => {
      const response = await ctx.http
        .patch(`/coach-dashboard/sessions/${createdSessionId}/reschedule`)
        .send({
          date: scheduleDate,
          startTime: '02:00 PM',
          endTime: '03:00 PM',
          notes: 'Moved to afternoon',
          notify: false,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(createdSessionId);
    });

    it('POST /coach-dashboard/sessions/:id/join returns a meeting link', async () => {
      const response = await ctx.http
        .post(`/coach-dashboard/sessions/${createdSessionId}/join`)
        .send({})
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.meetingUrl).toMatch(/^https?:\/\//);
    });

    it('GET /coach-dashboard/sessions/:id/quick-prep returns prep data', async () => {
      const response = await ctx.http
        .get(`/coach-dashboard/sessions/${createdSessionId}/quick-prep`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(
        expect.objectContaining({
          clientName: expect.any(String),
          clientEmail: expect.any(String),
          sessionType: expect.any(String),
        }),
      );
    });

    it('DELETE /coach-dashboard/sessions/:id cancels a session', async () => {
      const cancelTarget = await ctx.http
        .post('/coach-dashboard/sessions')
        .send({
          title: 'Goal Review',
          date: scheduleDate,
          startTime: '03:30 PM',
          endTime: '04:30 PM',
          clientId: ctx.clientId,
          notify: false,
        })
        .expect(201);

      const response = await ctx.http
        .delete(`/coach-dashboard/sessions/${cancelTarget.body.data.id}`)
        .send({ reason: 'Client unavailable', notify: false })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('cancelled');
    });
  });

  describe('Coach Sessions & Calendar API (/coach)', () => {
    beforeAll(async () => {
      const requests = await ctx.http.get('/coach/session-requests').expect(200);
      const items = requests.body.data as Array<{ id: string; status: string }>;
      pendingRequestId = items.find((item) => item.status === 'new')?.id ?? '';
      proposedRequestId =
        items.find((item) => item.status === 'proposed')?.id ?? '';
      cancelledRequestId =
        items.find((item) => item.status === 'cancelled')?.id ?? '';
    });

    it('GET /coach/sessions returns upcoming sessions', async () => {
      const response = await ctx.http
        .get('/coach/sessions?scope=upcoming')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('GET /coach/sessions?scope=past returns past sessions', async () => {
      const response = await ctx.http.get('/coach/sessions?scope=past').expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('GET /coach/sessions/:id returns session detail', async () => {
      const response = await ctx.http
        .get(`/coach/sessions/${createdSessionId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(
        expect.objectContaining({
          id: createdSessionId,
          title: expect.any(String),
          clientName: expect.any(String),
        }),
      );
    });

    it('GET /coach/sessions/:id/notes returns session notes', async () => {
      const response = await ctx.http
        .get(`/coach/sessions/${createdSessionId}/notes`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(
        expect.objectContaining({
          sessionId: createdSessionId,
          notes: expect.any(String),
        }),
      );
    });

    it('PUT /coach/sessions/:id/notes updates session notes', async () => {
      const response = await ctx.http
        .put(`/coach/sessions/${createdSessionId}/notes`)
        .send({ notes: 'E2E coaching notes saved successfully.' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.body).toContain('E2E coaching notes');
    });

    it('GET /coach/session-requests returns session requests', async () => {
      const response = await ctx.http.get('/coach/session-requests').expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(3);
    });

    it('POST /coach/session-requests/:id/remind queues a reminder', async () => {
      expect(pendingRequestId).toBeTruthy();

      const response = await ctx.http
        .post(`/coach/session-requests/${pendingRequestId}/remind`)
        .send({})
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(
        expect.objectContaining({ reminded: true }),
      );
    });

    it('POST /coach/session-requests/:id/propose-slots proposes alternate slots', async () => {
      expect(pendingRequestId).toBeTruthy();

      const response = await ctx.http
        .post(`/coach/session-requests/${pendingRequestId}/propose-slots`)
        .send({
          proposedSlots: ['Mon 11:00 AM - 12:00 PM', 'Wed 3:00 PM - 4:00 PM'],
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('proposed');
    });

    it('PATCH /coach/session-requests/:id/slots edits proposed slots', async () => {
      expect(proposedRequestId).toBeTruthy();

      const response = await ctx.http
        .patch(`/coach/session-requests/${proposedRequestId}/slots`)
        .send({
          proposedSlots: ['Thu 9:00 AM - 10:00 AM', 'Fri 1:00 PM - 2:00 PM'],
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.proposedSlots).toHaveLength(2);
    });

    it('POST /coach/session-requests/:id/accept accepts a pending request', async () => {
      const acceptDate = nextWeekdayIso(3);
      const [year, month, day] = acceptDate.split('-').map(Number);
      const declineTarget = await ctx.prisma.sessionRequest.create({
        data: {
          coachId: ctx.coach.sub,
          clientId: ctx.clientId,
          title: 'Stress Management',
          status: 'pending',
          message: 'E2E accept flow request',
          preferredAt: new Date(year, month - 1, day, 9, 0, 0),
        },
      });

      const response = await ctx.http
        .post(`/coach/session-requests/${declineTarget.id}/accept`)
        .send({})
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toEqual(expect.any(String));
      expect(response.body.data.status).toBe('scheduled');
    });

    it('POST /coach/session-requests/:id/decline declines a pending request', async () => {
      const declineTarget = await ctx.prisma.sessionRequest.create({
        data: {
          coachId: ctx.coach.sub,
          clientId: ctx.clientId,
          title: 'Communication Skills',
          status: 'pending',
          message: 'E2E decline flow request',
        },
      });

      const response = await ctx.http
        .post(`/coach/session-requests/${declineTarget.id}/decline`)
        .send({ reason: 'Schedule conflict' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('declined');
    });

    it('GET /coach/session-requests/:id/reason returns cancellation reason', async () => {
      expect(cancelledRequestId).toBeTruthy();

      const response = await ctx.http
        .get(`/coach/session-requests/${cancelledRequestId}/reason`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(
        expect.objectContaining({
          reason: expect.any(String),
        }),
      );
    });

    it('GET /coach/calendar?view=week returns week calendar', async () => {
      const response = await ctx.http
        .get(
          `/coach/calendar?view=week&start=${encodeURIComponent(mondayOfWeekIso())}`,
        )
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(
        expect.objectContaining({
          view: 'week',
          days: expect.any(Array),
          events: expect.any(Array),
        }),
      );
    });

    it('GET /coach/calendar?view=month returns month calendar', async () => {
      const response = await ctx.http
        .get(
          `/coach/calendar?view=month&start=${encodeURIComponent(firstDayOfMonthIso())}`,
        )
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(
        expect.objectContaining({
          view: 'month',
          weeks: expect.any(Array),
        }),
      );
    });

    it('GET /coach/clients/:clientId/sessions returns client sessions', async () => {
      const response = await ctx.http
        .get(`/coach/clients/${ctx.clientId}/sessions?scope=upcoming`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('Coach Resources API (/coach-resources)', () => {
    it('GET /coach-resources returns published coach resources', async () => {
      const response = await ctx.http
        .get('/coach-resources?audience=COACH')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0]).toEqual(
        expect.objectContaining({
          lead: expect.any(String),
          linkLabel: expect.any(String),
          href: expect.any(String),
        }),
      );
    });
  });

  describe('Coach Integrations API (/coach-integrations)', () => {
    it('GET /coach-integrations returns integration statuses', async () => {
      const response = await ctx.http.get('/coach-integrations').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ provider: 'outlook' }),
          expect.objectContaining({ provider: 'zoom' }),
        ]),
      );
    });

    it('POST /coach-integrations/:provider/connect returns stub connect status', async () => {
      const response = await ctx.http
        .post('/coach-integrations/outlook/connect')
        .send({})
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.provider).toBe('outlook');
      expect(response.body.data.oauthConfigured).toBe(false);
    });

    it('DELETE /coach-integrations/:provider disconnects integration stub', async () => {
      const response = await ctx.http
        .delete('/coach-integrations/zoom')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.disconnected).toBe(true);
    });
  });

  describe('Early Access API (/early-access)', () => {
    it('GET /early-access/features returns coach early-access features', async () => {
      const response = await ctx.http.get('/early-access/features').expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('POST /early-access/waitlist joins the waitlist', async () => {
      const response = await ctx.http
        .post('/early-access/waitlist')
        .send({ featureKey: 'ai-session-summaries' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('ACTIVE');
    });

    it('DELETE /early-access/waitlist/:featureKey leaves the waitlist', async () => {
      const response = await ctx.http
        .delete('/early-access/waitlist/ai-session-summaries')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.removed).toBe(true);
    });
  });

  describe('Product Updates API (/product-updates)', () => {
    it('GET /product-updates returns coach product updates', async () => {
      const response = await ctx.http
        .get('/product-updates?audience=COACH&status=RELEASED')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('Validation & error handling', () => {
    it('POST /coach-dashboard/sessions rejects invalid payloads', async () => {
      const response = await ctx.http
        .post('/coach-dashboard/sessions')
        .send({ title: 'Missing required fields' })
        .expect(422);

      expect(response.body.success).toBe(false);
    });

    it('GET /coach/calendar rejects invalid view parameters', async () => {
      const response = await ctx.http
        .get('/coach/calendar?view=invalid&start=2026-07-01')
        .expect(422);

      expect(response.body.success).toBe(false);
    });

    it('GET /coach/sessions/:id returns 404 for unknown session', async () => {
      const response = await ctx.http
        .get('/coach/sessions/non-existent-session-id')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });
});

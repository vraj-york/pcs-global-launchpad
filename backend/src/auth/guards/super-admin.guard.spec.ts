import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { SuperAdminGuard } from './super-admin.guard';

describe('SuperAdminGuard', () => {
  let guard: SuperAdminGuard;

  const createMockContext = (
    user: { sub: string; email?: string; groups: string[] } | undefined,
  ) => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    guard = new SuperAdminGuard();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should throw ForbiddenException when user is not on request', () => {
      const context = createMockContext(undefined);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow(
        'User not authenticated',
      );
    });

    it('should throw ForbiddenException when user has no SuperAdmin group', () => {
      const context = createMockContext({
        sub: 'user-123',
        email: 'user@example.com',
        groups: ['CorpAdmin', 'CompanyUser'],
      });

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow(
        'Access denied. SuperAdmin role required.',
      );
    });

    it('should throw when user.groups is undefined', () => {
      const context = createMockContext({
        sub: 'user-123',
        email: 'user@example.com',
        groups: undefined as unknown as string[],
      });

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should return true when user has SuperAdmin group', () => {
      const context = createMockContext({
        sub: 'user-123',
        email: 'admin@example.com',
        groups: ['SuperAdmin', 'CorpAdmin'],
      });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return true when user has only SuperAdmin group', () => {
      const context = createMockContext({
        sub: 'user-456',
        groups: ['SuperAdmin'],
      });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });
  });
});

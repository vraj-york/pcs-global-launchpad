import type { MfaMethod } from '../constants';

export type SecurityStatusData = {
  mfaEnabled: boolean;
  mfaMethod: MfaMethod | null;
  email: string | null;
};

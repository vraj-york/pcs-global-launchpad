import { SetMetadata } from '@nestjs/common';
import { SKIP_AUTHORIZATION_CHECK_KEY } from './rbac.constants';

/** Skips submodule enforcement on a handler (auth context is still resolved when guard runs). */
export const SkipAuthorizationCheck = () =>
  SetMetadata(SKIP_AUTHORIZATION_CHECK_KEY, true);

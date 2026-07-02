import { SetMetadata } from '@nestjs/common';
import { REQUIRE_SUBMODULE_KEY } from './rbac.constants';
import type { SubmoduleKey } from './submodule.registry';

/** Requires the caller to have the given submodule enabled. Use with AuthorizationGuard. */
export const RequireSubmodule = (submoduleKey: SubmoduleKey) =>
  SetMetadata(REQUIRE_SUBMODULE_KEY, submoduleKey);

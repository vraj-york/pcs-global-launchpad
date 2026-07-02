import { SetMetadata } from '@nestjs/common';
import { REQUIRE_ANY_SUBMODULE_KEY } from './rbac.constants';
import type { SubmoduleKey } from './submodule.registry';

/** Requires the caller to have at least one of the given submodules enabled. */
export const RequireAnySubmodule = (...submoduleKeys: SubmoduleKey[]) =>
  SetMetadata(REQUIRE_ANY_SUBMODULE_KEY, submoduleKeys);

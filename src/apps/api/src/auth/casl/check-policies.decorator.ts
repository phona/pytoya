import { SetMetadata } from '@nestjs/common';

import type { AppAbility } from './casl.types';

export const CHECK_POLICIES_KEY = 'check_policies';

export type PolicyHandler = (ability: AppAbility) => boolean | Promise<boolean>;

export const CheckPolicies = (...handlers: PolicyHandler[]) =>
  SetMetadata(CHECK_POLICIES_KEY, handlers);


import { AbilityBuilder, createMongoAbility, subject } from '@casl/ability';
import { Injectable } from '@nestjs/common';

import { UserRole } from '../../entities/user.entity';
import { type AppAbility, type AppAction, type AppSubject, APP_ACTIONS, APP_SUBJECTS } from './casl.types';

type UserLike = {
  id: number;
  role: UserRole;
};

@Injectable()
export class AbilityFactory {
  createForUser(user: UserLike): AppAbility {
    const { can, cannot, build } = new AbilityBuilder<AppAbility>(createMongoAbility as any);

    if (user.role === UserRole.ADMIN) {
      can(APP_ACTIONS.MANAGE, APP_SUBJECTS.ALL);
    } else {
      can(APP_ACTIONS.READ, APP_SUBJECTS.EXTRACTOR);
      can(APP_ACTIONS.READ, APP_SUBJECTS.SCHEMA, { projectOwnerId: user.id });
      can(APP_ACTIONS.MANAGE, APP_SUBJECTS.SCHEMA, { projectOwnerId: user.id });
      can(APP_ACTIONS.READ, APP_SUBJECTS.VALIDATION_SCRIPT, { projectOwnerId: user.id });
      can(APP_ACTIONS.MANAGE, APP_SUBJECTS.VALIDATION_SCRIPT, { projectOwnerId: user.id });

      cannot(APP_ACTIONS.MANAGE, APP_SUBJECTS.QUEUE);
      cannot(APP_ACTIONS.MANAGE, APP_SUBJECTS.JOB);
      cannot(APP_ACTIONS.MANAGE, APP_SUBJECTS.EXTRACTOR);
    }

    return build({
      detectSubjectType: (value: any) => {
        if (typeof value === 'string') {
          return value;
        }
        return (value as { __caslSubjectType__?: string }).__caslSubjectType__ ?? APP_SUBJECTS.ALL;
      },
    } as any);
  }

  subject(subjectType: AppSubject, payload?: Record<string, unknown>) {
    return subject(subjectType, payload ?? {}) as any;
  }
}

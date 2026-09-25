import { BaseEntity } from '@/modules/_shared/entity/base.entity';

import { type IProblem } from './interface';

export const collectionName = 'problems';

export class ProblemEntity extends BaseEntity<IProblem> {
  constructor(public data: IProblem) {
    super();

    this.data = this.normalize(this.data);
  }
}

import { BaseEntity } from '@/modules/_shared/entity/base.entity';

import { type IPromo } from './interface';

export const collectionName = 'promos';

export class PromoEntity extends BaseEntity<IPromo> {
  constructor(public data: IPromo) {
    super();

    this.data = this.normalize(this.data);
  }
}

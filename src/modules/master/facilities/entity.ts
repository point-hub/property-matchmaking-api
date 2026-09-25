import { BaseEntity } from '@/modules/_shared/entity/base.entity';

import { type IFacility } from './interface';

export const collectionName = 'facilities';

export class FacilityEntity extends BaseEntity<IFacility> {
  constructor(public data: IFacility) {
    super();

    this.data = this.normalize(this.data);
  }
}

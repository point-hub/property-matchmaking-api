import { BaseEntity } from '@/modules/_shared/entity/base.entity';

import { type IProperty } from './interface';

export const collectionName = 'properties';

export class PropertyEntity extends BaseEntity<IProperty> {
  constructor(public data: IProperty) {
    super();

    this.data = this.normalize(this.data);
  }
}

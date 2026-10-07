import { BaseEntity } from '@/modules/_shared/entity/base.entity';

import { type ICustomerPreference } from './interface';

export const collectionName = 'customer_preferences';

export class CustomerPreferenceEntity extends BaseEntity<ICustomerPreference> {
  constructor(public data: ICustomerPreference) {
    super();

    this.data = this.normalize(this.data);
  }
}

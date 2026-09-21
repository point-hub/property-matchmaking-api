import { BaseEntity } from '@/modules/_shared/entity/base.entity';

import { type ILandTitle } from './interface';

export const collectionName = 'land_titles';

export class LandTitleEntity extends BaseEntity<ILandTitle> {
  constructor(public data: ILandTitle) {
    super();

    this.data = this.normalize(this.data);
  }
}

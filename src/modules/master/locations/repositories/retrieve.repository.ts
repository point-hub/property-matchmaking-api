import type { IDatabase, IPipeline } from '@point-hub/papi';

import type { IAuthUser } from '@/modules/master/users/interface';

import { collectionName } from '../entity';
import type { IFacility } from '../interface';

export interface IRetrieveRepository {
  handle(_id: string): Promise<IRetrieveOutput | null>
  raw(_id: string): Promise<IFacility | null>
}

export interface IRetrieveOutput {
  _id: string
  village_type: string
  village_code: string
  village_name: string
  district_code: string
  district_name: string
  city_code: string
  city_name: string
  province_code: string
  province_name: string
  notes: string
  is_archived: boolean
  created_at: Date
  created_by: IAuthUser
}

export class RetrieveRepository implements IRetrieveRepository {
  constructor(
    public database: IDatabase,
    public options?: Record<string, unknown>,
  ) { }

  async handle(_id: string): Promise<IRetrieveOutput | null> {
    const pipeline: IPipeline[] = [];

    pipeline.push(...this.pipeFilter(_id));
    pipeline.push(...this.pipeJoinCreatedById());
    pipeline.push(...this.pipeProject());

    const response = await this.database.collection(collectionName).aggregate<IRetrieveOutput>(pipeline, {}, this.options);
    if (!response || response.data.length === 0) {
      return null;
    }

    return {
      _id: response.data[0]._id,
      village_type: response.data[0].village_type,
      village_code: response.data[0].village_code,
      village_name: response.data[0].village_name,
      district_code: response.data[0].district_code,
      district_name: response.data[0].district_name,
      city_code: response.data[0].city_code,
      city_name: response.data[0].city_name,
      province_code: response.data[0].province_code,
      province_name: response.data[0].province_name,
      notes: response.data[0].notes,
      is_archived: response.data[0].is_archived,
      created_at: response.data[0].created_at,
      created_by: response.data[0].created_by,
    };
  }

  async raw(_id: string): Promise<IFacility | null> {
    const response = await this.database.collection(collectionName).retrieve<IFacility>(_id, this.options);
    if (!response) {
      return null;
    }

    return response;
  }

  private pipeFilter(_id: string): IPipeline[] {
    return [{ $match: { _id } }];
  }

  private pipeJoinCreatedById(): IPipeline[] {
    return [
      {
        $lookup: {
          from: 'users',
          let: { userId: '$created_by_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$_id', '$$userId'] } } },
            {
              $project: {
                _id: 1,
                name: 1,
                username: 1,
                email: 1,
              },
            },
          ],
          as: 'created_by',
        },
      },
      {
        $unwind: {
          path: '$created_by',
          preserveNullAndEmptyArrays: true,
        },
      },
    ];
  }

  private pipeProject(): IPipeline[] {
    return [
      {
        $project: {
          _id: 1,
          village_type: 1,
          village_code: 1,
          village_name: 1,
          district_code: 1,
          district_name: 1,
          city_code: 1,
          city_name: 1,
          province_code: 1,
          province_name: 1,
          notes: 1,
          is_archived: 1,
          created_at: 1,
          created_by: 1,
        },
      },
    ];
  }
}

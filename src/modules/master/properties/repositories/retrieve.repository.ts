import type { IDatabase, IPipeline } from '@point-hub/papi';

import type { IAuthUser } from '@/modules/master/users/interface';

import { collectionName } from '../entity';
import type { IProperty } from '../interface';

export interface IRetrieveRepository {
  handle(_id: string): Promise<IRetrieveOutput | null>
  raw(_id: string): Promise<IProperty | null>
}

export interface IRetrieveOutput {
  _id: string
  code: string
  name: string
  address: string
  subdistrict: string
  district: string
  city: string
  google_map_link: string
  instagram: string
  pricelists: string[]
  land_titles: string[]
  facilities: string[]
  promos: string[]
  developer_name: string[]
  whatsapp: string[]
  mou: string[]
  photos_gate: string[]
  photos_building: string[]
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
      code: response.data[0].code,
      name: response.data[0].name,
      address: response.data[0].address,
      subdistrict: response.data[0].subdistrict,
      district: response.data[0].district,
      city: response.data[0].city,
      google_map_link: response.data[0].google_map_link,
      instagram: response.data[0].instagram,
      pricelists: response.data[0].pricelists,
      land_titles: response.data[0].land_titles,
      facilities: response.data[0].facilities,
      promos: response.data[0].promos,
      developer_name: response.data[0].developer_name,
      whatsapp: response.data[0].whatsapp,
      mou: response.data[0].mou,
      photos_gate: response.data[0].photos_gate,
      photos_building: response.data[0].photos_building,
      notes: response.data[0].notes,
      is_archived: response.data[0].is_archived,
      created_at: response.data[0].created_at,
      created_by: response.data[0].created_by,
    };
  }

  async raw(_id: string): Promise<IProperty | null> {
    const response = await this.database.collection(collectionName).retrieve<IProperty>(_id, this.options);
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
          code: 1,
          name: 1,
          address: 1,
          subdistrict: 1,
          district: 1,
          city: 1,
          google_map_link: 1,
          instagram: 1,
          pricelists: 1,
          land_titles: 1,
          facilities: 1,
          promos: 1,
          developer_name: 1,
          whatsapp: 1,
          mou: 1,
          photos_gate: 1,
          photos_building: 1,
          notes: 1,
          is_archived: 1,
          created_at: 1,
          created_by: 1,
        },
      },
    ];
  }
}

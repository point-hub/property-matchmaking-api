import type { IDatabase, IPagination, IPipeline, IQuery } from '@point-hub/papi';
import { BaseMongoDBQueryFilters } from '@point-hub/papi';

import { collectionName } from '../entity';
import type { IProperty } from '../interface';
import type { IRetrieveOutput } from './retrieve.repository';

export interface IRetrieveManyRepository {
  handle(query: IQuery): Promise<IRetrieveManyOutput>
  raw(query: IQuery): Promise<IRetrieveManyRawOutput>
}

export interface IRetrieveManyOutput {
  data: IRetrieveOutput[]
  pagination: IPagination
}

export interface IRetrieveManyRawOutput {
  data: IProperty[]
  pagination: IPagination
}

export class RetrieveManyRepository implements IRetrieveManyRepository {
  constructor(
    public database: IDatabase,
    public options?: Record<string, unknown>,
  ) { }

  async handle(query: IQuery): Promise<IRetrieveManyOutput> {
    const pipeline: IPipeline[] = [];

    pipeline.push(...this.pipeQueryFilter(query));
    if (this.hasPreferences(query)) {
      pipeline.push(...this.pipeMatchmaking(query));
    }
    pipeline.push(...this.pipeJoinCreatedById());
    pipeline.push(...this.pipeProject());

    const response = await this.database.collection(collectionName).aggregate<IRetrieveOutput>(pipeline, query, this.options);

    return {
      data: response.data.map(item => {
        return {
          _id: item._id,
          code: item.code,
          name: item.name,
          address: item.address,
          village: item.village,
          district: item.district,
          city: item.city,
          google_map_link: item.google_map_link,
          instagram: item.instagram,
          pricelists: item.pricelists,
          land_titles: item.land_titles,
          facilities: item.facilities,
          promos: item.promos,
          developer_name: item.developer_name,
          whatsapp: item.whatsapp,
          mou: item.mou,
          photos_gate: item.photos_gate,
          photos_building: item.photos_building,
          notes: item.notes,
          is_archived: item.is_archived,
          created_at: item.created_at,
          created_by: item.created_by,
          match_score: item.match_score,
        };
      }),
      pagination: response.pagination,
    };
  }

  async raw(query: IQuery): Promise<IRetrieveManyRawOutput> {
    return await this.database.collection(collectionName).retrieveMany<IProperty>(query, this.options);
  }

  private hasPreferences(query: IQuery): boolean {
    return Object.keys(query).some(key => key.startsWith('preferences.'));
  }

  private getBudget(value: unknown): number | undefined {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    const budget = Number(value);

    return Number.isFinite(budget) ? budget : undefined;
  }

  private pipeMatchmaking(query: IQuery): IPipeline[] {
    const locations = this.getPreferenceLocations(query);
    const budgetMin = this.getBudget(query['preferences.budget_min']);
    const budgetMax = this.getBudget(query['preferences.budget_max']);

    const pipeline: IPipeline[] = [
      {
        $addFields: {
          location_matched: locations.length > 0
            ? { $in: ['$city', locations] }
            : false,

          price_matched: budgetMin !== undefined && budgetMax !== undefined
            ? {
              $gt: [
                {
                  $size: {
                    $filter: {
                      input: { $ifNull: ['$pricelists', []] },
                      as: 'pricelist',
                      cond: {
                        $and: [
                          { $gte: ['$$pricelist.price', budgetMin] },
                          { $lte: ['$$pricelist.price', budgetMax] },
                        ],
                      },
                    },
                  },
                },
                0,
              ],
            }
            : false,
        },
      },
      {
        $addFields: {
          match_score: {
            $add: [
              { $cond: ['$location_matched', 1, 0] },
              { $cond: ['$price_matched', 1, 0] },
            ],
          },
        },
      },
      {
        $match: {
          match_score: { $gt: 0 },
        },
      },
      {
        $sort: {
          match_score: -1,
          _id: 1,
        },
      },
    ];

    return pipeline;
  }

  private getPreferenceLocations(query: IQuery): string[] {
    return Object.entries(query)
      .filter(([key]) => /^preferences\.locations\[\d+\]$/.test(key))
      .sort(([keyA], [keyB]) => {
        const indexA = Number(keyA.match(/\[(\d+)\]$/)?.[1] ?? 0);
        const indexB = Number(keyB.match(/\[(\d+)\]$/)?.[1] ?? 0);

        return indexA - indexB;
      })
      .map(([, value]) => String(value).trim())
      .filter(Boolean);
  }

  private pipeQueryFilter(query: IQuery): IPipeline[] {
    const filters: Record<string, unknown>[] = [];

    // General search across multiple fields
    if (query?.['search.all']) {
      const searchRegex = { $regex: query?.['search.all'], $options: 'i' };
      const fields = ['code', 'name', 'address', 'village', 'district', 'city', 'instagram', 'land_titles', 'facilities', 'promos.name', 'developer_name', 'whatsapp'];
      filters.push({
        $or: fields.map((field) => ({ [field]: searchRegex })),
      });
    }

    // Filter specific field
    BaseMongoDBQueryFilters.addRegexFilter(filters, 'code', query?.['search.code']);
    BaseMongoDBQueryFilters.addRegexFilter(filters, 'name', query?.['search.name']);
    BaseMongoDBQueryFilters.addRegexFilter(filters, 'address', query?.['search.address']);
    BaseMongoDBQueryFilters.addRegexFilter(filters, 'village', query?.['search.village']);
    BaseMongoDBQueryFilters.addRegexFilter(filters, 'district', query?.['search.district']);
    BaseMongoDBQueryFilters.addRegexFilter(filters, 'city', query?.['search.city']);
    BaseMongoDBQueryFilters.addRegexFilter(filters, 'instagram', query?.['search.instagram']);
    BaseMongoDBQueryFilters.addRegexFilter(filters, 'land_titles', query?.['search.land_titles']);
    BaseMongoDBQueryFilters.addRegexFilter(filters, 'facilities', query?.['search.facilities']);
    if (query?.['search.promos']) {
      filters.push({
        $or: [
          {
            'promos.name': {
              $regex: query?.['search.promos'],
              $options: 'i',
            },
          },
          // {
          //   'promos.description': {
          //     $regex: query?.['search.promos'],
          //     $options: 'i',
          //   },
          // },
        ],
      });
    }
    BaseMongoDBQueryFilters.addRegexFilter(filters, 'developer_name', query?.['search.developer_name']);
    BaseMongoDBQueryFilters.addRegexFilter(filters, 'whatsapp', query?.['search.whatsapp']);
    BaseMongoDBQueryFilters.addRegexFilter(filters, 'notes', query?.['search.notes']);

    // Filter boolean
    BaseMongoDBQueryFilters.addBooleanFilter(filters, 'is_archived', query?.['search.is_archived']);

    return filters.length > 0 ? [{ $match: { $and: filters } }] : [];
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
          village: 1,
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
          match_score: 1,
        },
      },
    ];
  }
}

import type { IDatabase, IPagination, IPipeline, IQuery } from '@point-hub/papi';
import { BaseMongoDBQueryFilters, BaseMongoDBQuerystring } from '@point-hub/papi';

import { collectionName } from '../entity';
import type { IFacility } from '../interface';
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
  data: IFacility[]
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
    if (query?.['distinct'] == 'city') {
      pipeline.push(...this.pipeDistinctCity());
    }
    if (query?.['distinct'] == 'district') {
      pipeline.push(...this.pipeDistinctDistrict());
    }
    if (query?.['distinct'] == 'village') {
      pipeline.push(...this.pipeDistinctVillage());
    }
    pipeline.push(
      { $skip: (BaseMongoDBQuerystring.page(query?.page) - 1) * BaseMongoDBQuerystring.limit(query?.page_size) },
      { $limit: BaseMongoDBQuerystring.limit(query?.page_size) },
    );
    pipeline.push(...this.pipeJoinCreatedById());
    pipeline.push(...this.pipeProject());

    const response = await this.database.collection(collectionName).aggregate<IRetrieveOutput>(pipeline, query, this.options);

    return {
      data: response.data.map(item => {
        return {
          _id: item._id,
          village_type: item.village_type,
          village_code: item.village_code,
          village_name: item.village_name,
          district_code: item.district_code,
          district_name: item.district_name,
          city_code: item.city_code,
          city_name: item.city_name,
          province_code: item.province_code,
          province_name: item.province_name,
          notes: item.notes,
          is_archived: item.is_archived,
          created_at: item.created_at,
          created_by: item.created_by,
        };
      }),
      pagination: response.pagination,
    };
  }

  async raw(query: IQuery): Promise<IRetrieveManyRawOutput> {
    return await this.database.collection(collectionName).retrieveMany<IFacility>(query, this.options);
  }

  private pipeQueryFilter(query: IQuery): IPipeline[] {
    const filters: Record<string, unknown>[] = [];

    // General search across multiple fields
    if (query?.['search.all']) {
      const searchRegex = { $regex: query?.['search.all'], $options: 'i' };
      const fields = ['village_name', 'district_name', 'city_name'];
      filters.push({
        $or: fields.map((field) => ({ [field]: searchRegex })),
      });
    }

    // Filter specific field
    BaseMongoDBQueryFilters.addRegexFilter(filters, 'village_type', query?.['search.village_type']);
    BaseMongoDBQueryFilters.addRegexFilter(filters, 'village_code', query?.['search.village_code']);
    BaseMongoDBQueryFilters.addRegexFilter(filters, 'village_name', query?.['search.village_name']);
    BaseMongoDBQueryFilters.addRegexFilter(filters, 'district_code', query?.['search.district_code']);
    BaseMongoDBQueryFilters.addRegexFilter(filters, 'district_name', query?.['search.district_name']);
    BaseMongoDBQueryFilters.addRegexFilter(filters, 'city_code', query?.['search.city_code']);
    BaseMongoDBQueryFilters.addRegexFilter(filters, 'city_name', query?.['search.city_name']);
    BaseMongoDBQueryFilters.addRegexFilter(filters, 'province_code', query?.['search.province_code']);
    BaseMongoDBQueryFilters.addRegexFilter(filters, 'province_name', query?.['search.province_name']);
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

  private pipeDistinctCity(): IPipeline[] {
    return [
      {
        $group: {
          _id: '$city_code',
          city_code: { $first: '$city_code' },
          city_name: { $first: '$city_name' },
          province_code: { $first: '$province_code' },
          province_name: { $first: '$province_name' },
        },
      },
    ];
  }

  private pipeDistinctDistrict(): IPipeline[] {
    return [
      {
        $group: {
          _id: '$district_code',
          district_code: { $first: '$district_code' },
          district_name: { $first: '$district_name' },
          city_code: { $first: '$city_code' },
          city_name: { $first: '$city_name' },
          province_code: { $first: '$province_code' },
          province_name: { $first: '$province_name' },
        },
      },
    ];
  }

  private pipeDistinctVillage(): IPipeline[] {
    return [
      {
        $group: {
          _id: '$village_code',
          village_code: { $first: '$village_code' },
          village_name: { $first: '$village_name' },
          district_code: { $first: '$district_code' },
          district_name: { $first: '$district_name' },
          city_code: { $first: '$city_code' },
          city_name: { $first: '$city_name' },
          province_code: { $first: '$province_code' },
          province_name: { $first: '$province_name' },
        },
      },
    ];
  }
}

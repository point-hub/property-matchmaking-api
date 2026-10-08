import { BaseUseCase, type IQuery, type IUseCaseOutputFailed, type IUseCaseOutputSuccess } from '@point-hub/papi';

import type { IAuthUser } from '@/modules/master/users/interface';

import type { IRetrieveManyRepository } from '../repositories/retrieve-many.repository';

export interface IInput {
  query: IQuery
}

export interface IDeps {
  retrieveManyRepository: IRetrieveManyRepository
}

export interface ISuccessData {
  data: {
    _id?: string
    name?: string
    description?: string
    notes?: string
    is_archived?: boolean
    created_at?: Date
    created_by?: IAuthUser
  }[]
  pagination: {
    page: number
    page_count: number
    page_size: number
    total_document: number
  }
}

/**
 * Use case: Retrieve Promos.
 *
 * Responsibilities:
 * - Retrieve all data from the database.
 * - Optionally filter response fields using `query.fields`.
 * - Return a success response.
 */
export class RetrieveManyPublicUseCase extends BaseUseCase<IInput, IDeps, ISuccessData> {
  async handle(input: IInput): Promise<IUseCaseOutputSuccess<ISuccessData> | IUseCaseOutputFailed> {
    // Retrieve all data from the database.
    const response = await this.deps.retrieveManyRepository.handle(input.query);

    // Optionally filter response fields using `query.fields`.
    const fields = typeof input.query.fields === 'string'
      ? input.query.fields.split(',').map(f => f.trim())
      : null;

    // Return a success response.
    return this.success({
      data: response.data.map(item => {
        const mapped = {
          _id: item._id,
          name: item.name,
          description: item.description,
          notes: item.notes,
          is_archived: item.is_archived,
          created_at: item.created_at,
          created_by: {
            _id: item.created_by?._id,
            username: item.created_by?.username,
            name: item.created_by?.name,
            email: item.created_by?.email,
          },
        };

        // If no fields requested → return full object
        if (!fields) return mapped;

        // Otherwise → return only requested fields
        return Object.fromEntries(
          Object.entries(mapped).filter(([key]) => fields.includes(key)),
        );
      }),
      pagination: response.pagination,
    });
  }
}

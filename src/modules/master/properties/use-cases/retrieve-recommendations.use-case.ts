import { BaseUseCase, type IQuery, type IUseCaseOutputFailed, type IUseCaseOutputSuccess } from '@point-hub/papi';

import type { IAuthorizationService } from '@/modules/_shared/services/authorization.service';
import type { IAuthUser } from '@/modules/master/users/interface';

import type { IRetrieveManyRepository } from '../repositories/retrieve-many.repository';

export interface IInput {
  authUser: IAuthUser
  query: IQuery
}

export interface IDeps {
  retrieveManyRepository: IRetrieveManyRepository
  authorizationService: IAuthorizationService
}

export interface ISuccessData {
  data: {
    _id?: string
    code?: string
    name?: string
    address?: string
    village?: string
    district?: string
    city?: string
    pricelists?: { building_area: number, land_area: number, price: number }[]
    land_titles?: string[]
    facilities?: string[]
    promos?: string[]
    photos_gate?: string[]
    photos_building?: string[]
    notes?: string
    is_archived?: boolean
    created_at?: Date
  }[]
  pagination: {
    page: number
    page_count: number
    page_size: number
    total_document: number
  }
}

/**
 * Use case: Retrieve Properties.
 *
 * Responsibilities:
 * - Check whether the user is authorized to perform this action
 * - Retrieve all data from the database.
 * - Optionally filter response fields using `query.fields`.
 * - Return a success response.
 */
export class RetrieveRecommendationsUseCase extends BaseUseCase<IInput, IDeps, ISuccessData> {
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
          code: item.code,
          name: item.name,
          address: item.address,
          village: item.village,
          district: item.district,
          city: item.city,
          pricelists: item.pricelists,
          land_titles: item.land_titles,
          facilities: item.facilities,
          promos: item.promos,
          photos_gate: item.photos_gate,
          photos_building: item.photos_building,
          notes: item.notes,
          is_archived: item.is_archived,
          created_at: item.created_at,
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

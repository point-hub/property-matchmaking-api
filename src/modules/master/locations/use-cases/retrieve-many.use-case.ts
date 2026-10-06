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
    village_type?: string
    village_code?: string
    village_name?: string
    district_code?: string
    district_name?: string
    city_code?: string
    city_name?: string
    province_code?: string
    province_name?: string
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
 * Use case: Retrieve Locations.
 *
 * Responsibilities:
 * - Check whether the user is authorized to perform this action
 * - Retrieve all data from the database.
 * - Optionally filter response fields using `query.fields`.
 * - Return a success response.
 */
export class RetrieveManyUseCase extends BaseUseCase<IInput, IDeps, ISuccessData> {
  async handle(input: IInput): Promise<IUseCaseOutputSuccess<ISuccessData> | IUseCaseOutputFailed> {
    // Check whether the user is authorized to perform this action
    const isAuthorized = this.deps.authorizationService.hasAccess(input.authUser.role?.permissions, 'locations:read');
    if (!isAuthorized) {
      return this.fail({ code: 403, message: 'You do not have permission to perform this action.' });
    }

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

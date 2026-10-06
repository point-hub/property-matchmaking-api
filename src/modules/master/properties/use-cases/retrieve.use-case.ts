import { BaseUseCase, type IUseCaseOutputFailed, type IUseCaseOutputSuccess } from '@point-hub/papi';

import type { IAuthorizationService } from '@/modules/_shared/services/authorization.service';
import type { IAuthUser } from '@/modules/master/users/interface';

import type { IRetrieveRepository } from '../repositories/retrieve.repository';

export interface IInput {
  authUser: IAuthUser
  filter: {
    _id: string
  }
}

export interface IDeps {
  retrieveRepository: IRetrieveRepository
  authorizationService: IAuthorizationService
}

export interface ISuccessData {
  _id: string
  code?: string
  name?: string
  address?: string
  village?: string
  district?: string
  city?: string
  google_map_link?: string
  instagram?: string
  pricelists?: string[]
  land_titles?: string[]
  facilities?: string[]
  promos?: string[]
  developer_name?: string[]
  whatsapp?: string[]
  mou?: string[]
  photos_gate?: string[]
  photos_building?: string[]
  notes?: string
  is_archived: boolean
  created_at: Date
  created_by: IAuthUser
}

/**
 * Use case: Retrieve Property.
 *
 * Responsibilities:
 * - Check whether the user is authorized to perform this action
 * - Retrieve a single data record from the database.
 * - Return a success response.
 */
export class RetrieveUseCase extends BaseUseCase<IInput, IDeps, ISuccessData> {
  async handle(input: IInput): Promise<IUseCaseOutputSuccess<ISuccessData> | IUseCaseOutputFailed> {
    // Check whether the user is authorized to perform this action
    const isAuthorized = this.deps.authorizationService.hasAccess(input.authUser.role?.permissions, 'properties:read');
    if (!isAuthorized) {
      return this.fail({ code: 403, message: 'You do not have permission to perform this action.' });
    }

    // Retrieve a single data record from the database.
    const response = await this.deps.retrieveRepository.handle(input.filter._id);
    if (!response) {
      return this.fail({
        code: 404,
        message: 'The requested data does not exist.',
      });
    }

    // Return a success response.
    return this.success({
      _id: response._id,
      code: response.code,
      name: response.name,
      address: response.address,
      village: response.village,
      district: response.district,
      city: response.city,
      google_map_link: response.google_map_link,
      instagram: response.instagram,
      pricelists: response.pricelists,
      land_titles: response.land_titles,
      facilities: response.facilities,
      promos: response.promos,
      developer_name: response.developer_name,
      whatsapp: response.whatsapp,
      mou: response.mou,
      photos_gate: response.photos_gate,
      photos_building: response.photos_building,
      notes: response.notes,
      is_archived: response.is_archived,
      created_at: response.created_at,
      created_by: {
        _id: response.created_by?._id,
        username: response.created_by?.username,
        name: response.created_by?.name,
        email: response.created_by?.email,
      },
    });
  }
}

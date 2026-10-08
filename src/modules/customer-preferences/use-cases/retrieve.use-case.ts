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
  _id: string;
  locations: string[];
  budget_min: number;
  budget_max: number;
  down_payment_min: number;
  down_payment_max: number;
  monthly_payment_min: number;
  monthly_payment_max: number;
  age: number;
  marital_status: string;
  dependents: number;
  problems: string[];
  promos: string[];
  name: string;
  whatsapp: number;
  notes?: string;
  is_archived: boolean;
  created_at: Date;
}

/**
 * Use case: Retrieve CustomerPreference.
 *
 * Responsibilities:
 * - Retrieve a single data record from the database.
 * - Return a success response.
 */
export class RetrieveUseCase extends BaseUseCase<IInput, IDeps, ISuccessData> {
  async handle(input: IInput): Promise<IUseCaseOutputSuccess<ISuccessData> | IUseCaseOutputFailed> {
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
      locations: response.locations,
      budget_min: response.budget_min,
      budget_max: response.budget_max,
      down_payment_min: response.down_payment_min,
      down_payment_max: response.down_payment_max,
      monthly_payment_min: response.monthly_payment_min,
      monthly_payment_max: response.monthly_payment_max,
      age: response.age,
      marital_status: response.marital_status,
      dependents: response.dependents,
      problems: response.problems,
      promos: response.promos,
      name: response.name,
      whatsapp: response.whatsapp,
      notes: response.notes,
      is_archived: response.is_archived,
      created_at: response.created_at,
    });
  }
}

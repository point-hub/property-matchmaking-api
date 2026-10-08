import { BaseUseCase, type IUseCaseOutputFailed, type IUseCaseOutputSuccess } from '@point-hub/papi';

import type { IUniqueValidationService } from '@/modules/_shared/services/unique-validation.service';
import type { IUserAgent } from '@/modules/_shared/types/user-agent.type';

import { CustomerPreferenceEntity } from '../entity';
import type { ICreateRepository } from '../repositories/create.repository';

export interface IInput {
  ip: string;
  userAgent: IUserAgent;
  data: {
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
    notes: string;
  }
}

export interface IDeps {
  createRepository: ICreateRepository
  uniqueValidationService: IUniqueValidationService
}

export interface ISuccessData {
  inserted_id: string
}

/**
 * Use case: Create CustomerPreference.
 *
 * Responsibilities:
 * - Normalizes data (trim).
 * - Validate uniqueness: single unique name field.
 * - Save the data to the database.
 * - Return a success response.
 */
export class CreateUseCase extends BaseUseCase<IInput, IDeps, ISuccessData> {
  async handle(input: IInput): Promise<IUseCaseOutputSuccess<ISuccessData> | IUseCaseOutputFailed> {
    // Normalizes data (trim).
    const customerPreferenceEntity = new CustomerPreferenceEntity({
      locations: input.data.locations,
      budget_min: input.data.budget_min,
      budget_max: input.data.budget_max,
      down_payment_min: input.data.down_payment_min,
      down_payment_max: input.data.down_payment_max,
      monthly_payment_min: input.data.monthly_payment_min,
      monthly_payment_max: input.data.monthly_payment_max,
      age: input.data.age,
      marital_status: input.data.marital_status,
      dependents: input.data.dependents,
      problems: input.data.problems,
      promos: input.data.promos,
      name: input.data.name,
      whatsapp: input.data.whatsapp,
      notes: input.data.notes,
      is_archived: false,
      created_at: new Date(),
    });

    // Save the data to the database.
    const createResponse = await this.deps.createRepository.handle(customerPreferenceEntity.data);

    // Return a success response.
    return this.success({
      inserted_id: createResponse.inserted_id,
    });
  }
}

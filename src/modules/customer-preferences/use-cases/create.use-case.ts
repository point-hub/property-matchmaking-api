import { BaseUseCase, type IUseCaseOutputFailed, type IUseCaseOutputSuccess } from '@point-hub/papi';

import type { IAuthorizationService } from '@/modules/_shared/services/authorization.service';
import type { IUniqueValidationService } from '@/modules/_shared/services/unique-validation.service';
import type { IUserAgent } from '@/modules/_shared/types/user-agent.type';
import type { IAblyService } from '@/modules/ably/services/ably.service';
import type { IAuditLogService } from '@/modules/audit-logs/services/audit-log.service';
import type { ICodeGeneratorService } from '@/modules/counters/services/code-generator.service';
import type { IAuthUser } from '@/modules/master/users/interface';

import { collectionName, CustomerPreferenceEntity } from '../entity';
import type { ICreateRepository } from '../repositories/create.repository';

export interface IInput {
  ip: string
  authUser: IAuthUser
  userAgent: IUserAgent
  data: {
    location: string;
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
    notes: string
  }
}

export interface IDeps {
  createRepository: ICreateRepository
  ablyService: IAblyService
  auditLogService: IAuditLogService
  authorizationService: IAuthorizationService
  codeGeneratorService: ICodeGeneratorService
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
 * - Create an audit log entry for this operation.
 * - Publish realtime notification event to the recipient’s channel.
 * - Return a success response.
 */
export class CreateUseCase extends BaseUseCase<IInput, IDeps, ISuccessData> {
  async handle(input: IInput): Promise<IUseCaseOutputSuccess<ISuccessData> | IUseCaseOutputFailed> {
    // Normalizes data (trim).
    const customerPreferenceEntity = new CustomerPreferenceEntity({
      location: input.data.location,
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
      created_by_id: input.authUser._id,
    });

    // Validate uniqueness: single unique name field.
    const uniqueNameErrors = await this.deps.uniqueValidationService.validate(collectionName, { name: input.data.name });
    if (uniqueNameErrors) {
      return this.fail({ code: 422, message: 'Validation failed due to duplicate values.', errors: uniqueNameErrors });
    }

    // Save the data to the database.
    const createResponse = await this.deps.createRepository.handle(customerPreferenceEntity.data);

    // Create an audit log entry for this operation.
    const changes = this.deps.auditLogService.buildChanges({}, customerPreferenceEntity.data);
    const dataLog = {
      operation_id: this.deps.auditLogService.generateOperationId(),
      entity_type: collectionName,
      entity_id: createResponse.inserted_id,
      entity_ref: input.data.name,
      actor_type: 'user',
      actor_id: input.authUser._id,
      actor_name: input.authUser.username,
      action: 'create',
      module: 'customer_preferences',
      system_reason: 'insert data',
      changes: changes,
      metadata: {
        ip: input.ip,
        device: input.userAgent.device,
        browser: input.userAgent.browser,
        os: input.userAgent.os,
      },
      created_at: new Date(),
    };
    await this.deps.auditLogService.log(dataLog);

    // Publish realtime notification event to the recipient’s channel.
    this.deps.ablyService.publish(`notifications:${input.authUser._id} `, 'logs:new', {
      type: 'customer_preferences',
      actor_id: input.authUser._id,
      recipient_id: input.authUser._id,
      is_read: false,
      created_at: new Date(),
      entities: {
        customer_preferences: createResponse.inserted_id,
      },
      data: dataLog,
    });

    // Return a success response.
    return this.success({
      inserted_id: createResponse.inserted_id,
    });
  }
}

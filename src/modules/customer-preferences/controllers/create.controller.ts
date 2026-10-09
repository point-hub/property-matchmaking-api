import type { IController, IControllerInput } from '@point-hub/papi';

import { EmailService } from '@/modules/_shared/services/email.service';
import { SchemaUniqueValidationService } from '@/modules/_shared/services/schema-validation.service';
import { UniqueValidationService } from '@/modules/_shared/services/unique-validation.service';

import { CreateRepository } from '../repositories/create.repository';
import { createRules } from '../rules/create.rules';
import { CreateUseCase } from '../use-cases/create.use-case';

export const createController: IController = async (controllerInput: IControllerInput) => {
  let session;
  try {
    // Start database session for transaction
    session = controllerInput.dbConnection.startSession();
    session.startTransaction();

    // Validate request body against schema
    SchemaUniqueValidationService.validate(controllerInput.req['body'], createRules);

    // Initialize repositories and utilities
    const createRepository = new CreateRepository(controllerInput.dbConnection, { session });
    const uniqueValidationService = new UniqueValidationService(controllerInput.dbConnection, { session });

    // Initialize use case with dependencies
    const createUseCase = new CreateUseCase({
      createRepository,
      emailService: EmailService,
      uniqueValidationService,
    });

    // Execute business logic
    const response = await createUseCase.handle({
      userAgent: JSON.parse(
        Array.isArray(controllerInput.req.headers['client-user-agent'])
          ? controllerInput.req.headers['client-user-agent'][0]
          : controllerInput.req.headers['client-user-agent'] ?? '{}',
      ),
      ip: controllerInput.req.ip ?? '',
      data: controllerInput.req['body'],
    });

    // Handle failed response
    if (response.status === 'failed') {
      controllerInput.res.status(response.error.code);
      controllerInput.res.statusMessage = response.error.message;
      controllerInput.res.json(response.error);
      return;
    }

    // Commit transaction and send response
    await session.commitTransaction();
    controllerInput.res.status(201);
    controllerInput.res.json(response.data);
  } catch (error) {
    await session?.abortTransaction();
    throw error;
  } finally {
    await session?.endSession();
  }
};

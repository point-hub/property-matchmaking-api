import type { IController, IMiddleware } from '@point-hub/papi';
import express, { type Express, type Request, type Response } from 'express';

import type { IBaseAppInput } from './app';
import { EmailService } from './modules/_shared/services/email.service';
import ablyRouter from './modules/ably/router';
import auditLogRouter from './modules/audit-logs/router';
import counterRouter from './modules/counters/router';
import healthRouter from './modules/health/router';
import masterFacilityRouter from './modules/master/facilities/router';
import masterLandTitleRouter from './modules/master/land-titles/router';
import masterLocationRouter from './modules/master/locations/router';
import masterPermissionRouter from './modules/master/permissions/router';
import masterProblemRouter from './modules/master/problems/router';
import masterPromoRouter from './modules/master/promos/router';
import masterPropertyRouter from './modules/master/properties/router';
import masterRoleRouter from './modules/master/roles/router';
import masterUserRouter from './modules/master/users/router';
import authRouter from './modules/master/users/router-auth';
import storageRouter from './modules/storages/router';

export interface IRoute {
  method: 'get' | 'post' | 'patch' | 'put' | 'delete'
  path: string
  controller: IController
  middlewares?: IMiddleware[]
}

export default async function (baseRouterInput: IBaseAppInput) {
  const app: Express = express();

  /**
   * Register all available modules
   * <modules>/router.ts
   */
  app.use('/v1/ably', await ablyRouter(baseRouterInput));
  app.use('/v1/audit-logs', await auditLogRouter(baseRouterInput));
  app.use('/v1/auth', await authRouter(baseRouterInput));
  app.use('/v1/health', await healthRouter(baseRouterInput));
  app.use('/v1/counters', await counterRouter(baseRouterInput));
  app.use('/v1/storages', await storageRouter(baseRouterInput));
  app.use('/v1/master/users', await masterUserRouter(baseRouterInput));
  app.use('/v1/master/permissions', await masterPermissionRouter(baseRouterInput));
  app.use('/v1/master/roles', await masterRoleRouter(baseRouterInput));
  app.use('/v1/master/locations', await masterLocationRouter(baseRouterInput));
  app.use('/v1/master/land-titles', await masterLandTitleRouter(baseRouterInput));
  app.use('/v1/master/facilities', await masterFacilityRouter(baseRouterInput));
  app.use('/v1/master/problems', await masterProblemRouter(baseRouterInput));
  app.use('/v1/master/promos', await masterPromoRouter(baseRouterInput));
  app.use('/v1/master/properties', await masterPropertyRouter(baseRouterInput));

  /**
   * Rendered email templates
   *
   * @example
   * Access this in your browser using the following path:
   * /templates/modules/examples/emails/example
   */
  app.get('/templates/*param', async (req: Request, res: Response) => {
    const params = Array.isArray(req.params['param']) ? req.params['param'].join('/') : req.params['param'];
    const html = await EmailService.renderTemplate(`${params}.hbs`);
    res.send(html);
  });

  return app;
}

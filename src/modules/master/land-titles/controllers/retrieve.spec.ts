import { isValidDate } from '@point-hub/express-utils';
import { DatabaseTestUtil } from '@point-hub/papi';
import { beforeAll, beforeEach, describe, expect, it } from 'bun:test';
import type { Express } from 'express';
import request from 'supertest';

import { createApp } from '@/app';
import { type IAuthUserWithTokenResponse, TestService } from '@/modules/_shared/services/test.service';
import UserFactory from '@/modules/master/users/factory';

import LandTitleFactory from '../factory';
import type { ILandTitle } from '../interface';

describe('retrieve an land title', async () => {
  let app: Express;
  let authorizedUser: IAuthUserWithTokenResponse;
  let unauthorizedUser: IAuthUserWithTokenResponse;

  beforeAll(async () => {
    app = await createApp({ dbConnection: DatabaseTestUtil.dbConnection });
  });

  beforeEach(async () => {
    await DatabaseTestUtil.reset();

    const testService = new TestService(DatabaseTestUtil.dbConnection);
    authorizedUser = await testService.createAuthUserAndGetAccessToken({
      permissions: ['land-titles:read'],
    });
    unauthorizedUser = await testService.createAuthUserAndGetAccessToken({
      permissions: [],
    });
  });

  it('E.1. fails when the user is not authenticated', async () => {
    const userFactory = new UserFactory(DatabaseTestUtil.dbConnection);
    const resultUserFactory = await userFactory.create();

    const landTitleFactory = new LandTitleFactory(DatabaseTestUtil.dbConnection);
    landTitleFactory.state({ created_by_id: resultUserFactory.inserted_id });
    const resultLandTitleFactory = await landTitleFactory.create();

    const response = await request(app)
      .get(`/v1/master/land-titles/${resultLandTitleFactory.inserted_id}`)
      .set('Authorization', 'Bearer');

    // expect http response
    expect(response.statusCode).toEqual(401);

    // expect response json
    expect(response.body.code).toStrictEqual(401);
    expect(response.body.message).toStrictEqual('Authentication credentials is invalid.');
  });

  it('E.2. fails when the user is not authorized', async () => {
    const userFactory = new UserFactory(DatabaseTestUtil.dbConnection);
    const resultUserFactory = await userFactory.create();

    const landTitleFactory = new LandTitleFactory(DatabaseTestUtil.dbConnection);
    landTitleFactory.state({ created_by_id: resultUserFactory.inserted_id });
    const resultLandTitleFactory = await landTitleFactory.create();

    const response = await request(app)
      .get(`/v1/master/land-titles/${resultLandTitleFactory.inserted_id}`)
      .set('Authorization', `Bearer ${unauthorizedUser.accessToken}`);

    // expect http response
    expect(response.statusCode).toEqual(403);

    // expect response json
    expect(response.body.code).toStrictEqual(403);
    expect(response.body.message).toStrictEqual('You do not have permission to perform this action.');
  });

  it('S.1. succeeds', async () => {
    const userFactory = new UserFactory(DatabaseTestUtil.dbConnection);
    const resultUserFactory = await userFactory.create();

    const landTitleFactory = new LandTitleFactory(DatabaseTestUtil.dbConnection);
    landTitleFactory.state({ created_by_id: resultUserFactory.inserted_id });
    const resultLandTitleFactory = await landTitleFactory.createMany(3);

    const landTitles = await DatabaseTestUtil.retrieveMany<ILandTitle>('land_titles');

    const response = await request(app)
      .get(`/v1/master/land-titles/${resultLandTitleFactory.inserted_ids[1]}`)
      .set('Authorization', `Bearer ${authorizedUser.accessToken}`);

    // expect http response
    expect(response.statusCode).toEqual(200);

    // expect response json
    expect(response.body._id).toBeDefined();
    expect(response.body.name).toStrictEqual(landTitles.data[1].name);
    expect(response.body.age).toStrictEqual(landTitles.data[1].age);
    expect(response.body.gender).toStrictEqual(landTitles.data[1].gender);
    expect(isValidDate(response.body.created_at)).toBeTruthy();
  });
});

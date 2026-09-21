import { DatabaseTestUtil } from '@point-hub/papi';
import { beforeAll, beforeEach, describe, expect, it } from 'bun:test';
import type { Express } from 'express';
import request from 'supertest';

import { createApp } from '@/app';
import { type IAuthUserWithTokenResponse, TestService } from '@/modules/_shared/services/test.service';

import LandTitleFactory from '../factory';
import type { ILandTitle } from '../interface';

describe('delete an land title', async () => {
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
      permissions: ['land-titles:delete'],
    });
    unauthorizedUser = await testService.createAuthUserAndGetAccessToken({
      permissions: [],
    });
  });

  it('E.1. fails when the user is not authenticated', async () => {
    const landTitleFactory = new LandTitleFactory(DatabaseTestUtil.dbConnection);
    const resultLandTitleFactory = await landTitleFactory.createMany(3);

    const response = await request(app)
      .delete(`/v1/master/land-titles/${resultLandTitleFactory.inserted_ids[0]}`)
      .set('Authorization', 'Bearer');

    // expect http response
    expect(response.statusCode).toEqual(401);

    // expect response json
    expect(response.body.code).toStrictEqual(401);
    expect(response.body.message).toStrictEqual('Authentication credentials is invalid.');

    // expect recorded data
    const landTitleRecords = await DatabaseTestUtil.retrieveMany<ILandTitle>('land_titles');
    expect(landTitleRecords.data.length).toStrictEqual(3);
  });

  it('E.2. fails when the user is not authorized', async () => {
    const landTitleFactory = new LandTitleFactory(DatabaseTestUtil.dbConnection);
    const resultLandTitleFactory = await landTitleFactory.createMany(3);

    const response = await request(app)
      .delete(`/v1/master/land-titles/${resultLandTitleFactory.inserted_ids[0]}`)
      .set('Authorization', `Bearer ${unauthorizedUser.accessToken}`)
      .send();

    // expect http response
    expect(response.statusCode).toEqual(403);

    // expect response json
    expect(response.body.code).toStrictEqual(403);
    expect(response.body.message).toStrictEqual('You do not have permission to perform this action.');

    // expect recorded data
    const landTitleRecords = await DatabaseTestUtil.retrieveMany<ILandTitle>('land_titles');
    expect(landTitleRecords.data.length).toStrictEqual(3);
  });

  it('S.1. succeeds', async () => {
    const landTitleFactory = new LandTitleFactory(DatabaseTestUtil.dbConnection);
    const resultLandTitleFactory = await landTitleFactory.createMany(3);

    const response = await request(app)
      .delete(`/v1/master/land-titles/${resultLandTitleFactory.inserted_ids[1]}`)
      .set('Authorization', `Bearer ${authorizedUser.accessToken}`);

    // expect http response
    expect(response.statusCode).toEqual(200);

    // expect response json
    expect(response.body).toStrictEqual({ deleted_count: 1 });

    // expect recorded data
    const landTitleRecord = await DatabaseTestUtil.retrieve<ILandTitle>('land_titles', resultLandTitleFactory.inserted_ids[1]);
    expect(landTitleRecord).toBeNull();

    const landTitleRecords = await DatabaseTestUtil.retrieveMany<ILandTitle>('land_titles');
    expect(landTitleRecords.data.length).toStrictEqual(2);
  });
});

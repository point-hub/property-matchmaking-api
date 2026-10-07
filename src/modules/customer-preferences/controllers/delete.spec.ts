import { DatabaseTestUtil } from '@point-hub/papi';
import { beforeAll, beforeEach, describe, expect, it } from 'bun:test';
import type { Express } from 'express';
import request from 'supertest';

import { createApp } from '@/app';
import { type IAuthUserWithTokenResponse, TestService } from '@/modules/_shared/services/test.service';

import CustomerPreferenceFactory from '../factory';
import type { ICustomerPreference } from '../interface';

describe('delete an customer preference', async () => {
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
      permissions: ['customer-preferences:delete'],
    });
    unauthorizedUser = await testService.createAuthUserAndGetAccessToken({
      permissions: [],
    });
  });

  it('E.1. fails when the user is not authenticated', async () => {
    const customerPreferenceFactory = new CustomerPreferenceFactory(DatabaseTestUtil.dbConnection);
    const resultCustomerPreferenceFactory = await customerPreferenceFactory.createMany(3);

    const response = await request(app)
      .delete(`/v1/customer-preferences/${resultCustomerPreferenceFactory.inserted_ids[0]}`)
      .set('Authorization', 'Bearer');

    // expect http response
    expect(response.statusCode).toEqual(401);

    // expect response json
    expect(response.body.code).toStrictEqual(401);
    expect(response.body.message).toStrictEqual('Authentication credentials is invalid.');

    // expect recorded data
    const customerPreferenceRecords = await DatabaseTestUtil.retrieveMany<ICustomerPreference>('customer_preferences');
    expect(customerPreferenceRecords.data.length).toStrictEqual(3);
  });

  it('E.2. fails when the user is not authorized', async () => {
    const customerPreferenceFactory = new CustomerPreferenceFactory(DatabaseTestUtil.dbConnection);
    const resultCustomerPreferenceFactory = await customerPreferenceFactory.createMany(3);

    const response = await request(app)
      .delete(`/v1/customer-preferences/${resultCustomerPreferenceFactory.inserted_ids[0]}`)
      .set('Authorization', `Bearer ${unauthorizedUser.accessToken}`)
      .send();

    // expect http response
    expect(response.statusCode).toEqual(403);

    // expect response json
    expect(response.body.code).toStrictEqual(403);
    expect(response.body.message).toStrictEqual('You do not have permission to perform this action.');

    // expect recorded data
    const customerPreferenceRecords = await DatabaseTestUtil.retrieveMany<ICustomerPreference>('customer_preferences');
    expect(customerPreferenceRecords.data.length).toStrictEqual(3);
  });

  it('S.1. succeeds', async () => {
    const customerPreferenceFactory = new CustomerPreferenceFactory(DatabaseTestUtil.dbConnection);
    const resultCustomerPreferenceFactory = await customerPreferenceFactory.createMany(3);

    const response = await request(app)
      .delete(`/v1/customer-preferences/${resultCustomerPreferenceFactory.inserted_ids[1]}`)
      .set('Authorization', `Bearer ${authorizedUser.accessToken}`);

    // expect http response
    expect(response.statusCode).toEqual(200);

    // expect response json
    expect(response.body).toStrictEqual({ deleted_count: 1 });

    // expect recorded data
    const customerPreferenceRecord = await DatabaseTestUtil.retrieve<ICustomerPreference>('customer_preferences', resultCustomerPreferenceFactory.inserted_ids[1]);
    expect(customerPreferenceRecord).toBeNull();

    const customerPreferenceRecords = await DatabaseTestUtil.retrieveMany<ICustomerPreference>('customer_preferences');
    expect(customerPreferenceRecords.data.length).toStrictEqual(2);
  });
});

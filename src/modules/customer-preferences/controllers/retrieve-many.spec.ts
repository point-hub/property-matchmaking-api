import { isValidDate } from '@point-hub/express-utils';
import { DatabaseTestUtil } from '@point-hub/papi';
import { beforeAll, beforeEach, describe, expect, it } from 'bun:test';
import type { Express } from 'express';
import request from 'supertest';

import { createApp } from '@/app';
import { type IAuthUserWithTokenResponse, TestService } from '@/modules/_shared/services/test.service';

import CustomerPreferenceFactory from '../factory';
import type { ICustomerPreference } from '../interface';

describe('retrieve all customer preferences', async () => {
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
      permissions: ['customer-preferences:read'],
    });
    unauthorizedUser = await testService.createAuthUserAndGetAccessToken({
      permissions: [],
    });
  });

  it('E.1. fails when the user is not authenticated', async () => {
    const response = await request(app)
      .get('/v1/customer-preferences')
      .set('Authorization', 'Bearer');

    // expect http response
    expect(response.statusCode).toEqual(401);

    // expect response json
    expect(response.body.code).toStrictEqual(401);
    expect(response.body.message).toStrictEqual('Authentication credentials is invalid.');
  });

  it('E.2. fails when the user is not authorized', async () => {
    const response = await request(app)
      .get('/v1/customer-preferences')
      .set('Authorization', `Bearer ${unauthorizedUser.accessToken}`);

    // expect http response
    expect(response.statusCode).toEqual(403);

    // expect response json
    expect(response.body.code).toStrictEqual(403);
    expect(response.body.message).toStrictEqual('You do not have permission to perform this action.');
  });

  it('S.1. succeeds', async () => {
    const customerPreferenceFactory = new CustomerPreferenceFactory(DatabaseTestUtil.dbConnection);
    await customerPreferenceFactory.createMany(3);

    const customerPreferences = await DatabaseTestUtil.retrieveMany<ICustomerPreference>('customer_preferences');

    const response = await request(app)
      .get('/v1/customer-preferences')
      .set('Authorization', `Bearer ${authorizedUser.accessToken}`);

    // expect http response
    expect(response.statusCode).toEqual(200);

    // expect response json
    expect(response.body.data.length).toStrictEqual(3);
    expect(response.body.data[0]._id).toBeDefined();
    expect(response.body.data[0].name).toStrictEqual(customerPreferences.data[0].name);
    expect(isValidDate(response.body.data[0].created_at)).toBeTruthy();
    expect(response.body.data[1].name).toStrictEqual(customerPreferences.data[1].name);
    expect(response.body.data[2].name).toStrictEqual(customerPreferences.data[2].name);

    expect(response.body.pagination.page).toStrictEqual(1);
    expect(response.body.pagination.page_size).toStrictEqual(10);
    expect(response.body.pagination.page_count).toStrictEqual(1);
    expect(response.body.pagination.total_document).toStrictEqual(3);
  });

  it('S.2. succeeds in sorting data in ascending order', async () => {
    const customerPreferenceFactory = new CustomerPreferenceFactory(DatabaseTestUtil.dbConnection);
    const data = [
      { name: 'John Doe' },
      { name: 'Charles' },
      { name: 'Jane' },
    ];
    customerPreferenceFactory.sequence(data);
    await customerPreferenceFactory.createMany(3);

    const response = await request(app)
      .get('/v1/customer-preferences')
      .set('Authorization', `Bearer ${authorizedUser.accessToken}`)
      .query({
        sort: 'name',
      });

    // expect http response
    expect(response.statusCode).toEqual(200);

    // expect response json
    expect(response.body.data.length).toStrictEqual(3);
    expect(response.body.data[0].name).toStrictEqual(data[1].name); // Charles
    expect(response.body.data[1].name).toStrictEqual(data[2].name); // Jane
    expect(response.body.data[2].name).toStrictEqual(data[0].name); // John Doe

    expect(response.body.pagination.page).toStrictEqual(1);
    expect(response.body.pagination.page_size).toStrictEqual(10);
    expect(response.body.pagination.page_count).toStrictEqual(1);
    expect(response.body.pagination.total_document).toStrictEqual(3);
  });

  it('S.3. succeeds in sorting data in descending order', async () => {
    const customerPreferenceFactory = new CustomerPreferenceFactory(DatabaseTestUtil.dbConnection);
    const data = [
      { name: 'John Doe' },
      { name: 'Charles' },
      { name: 'Jane' },
    ];
    customerPreferenceFactory.sequence(data);
    await customerPreferenceFactory.createMany(3);

    const response = await request(app)
      .get('/v1/customer-preferences')
      .set('Authorization', `Bearer ${authorizedUser.accessToken}`)
      .query({
        sort: '-name',
      });

    // expect http response
    expect(response.statusCode).toEqual(200);

    // expect response json
    expect(response.body.data.length).toStrictEqual(3);
    expect(response.body.data[0].name).toStrictEqual(data[0].name); // John Doe
    expect(response.body.data[1].name).toStrictEqual(data[2].name); // Jane
    expect(response.body.data[2].name).toStrictEqual(data[1].name); // Charles

    expect(response.body.pagination.page).toStrictEqual(1);
    expect(response.body.pagination.page_size).toStrictEqual(10);
    expect(response.body.pagination.page_count).toStrictEqual(1);
    expect(response.body.pagination.total_document).toStrictEqual(3);
  });

  it('S.4. succeeds in navigating pagination', async () => {
    const customerPreferenceFactory = new CustomerPreferenceFactory(DatabaseTestUtil.dbConnection);
    await customerPreferenceFactory.createMany(3);

    const customerPreferences = await DatabaseTestUtil.retrieveMany<ICustomerPreference>('customer_preferences');

    const response = await request(app)
      .get('/v1/customer-preferences')
      .set('Authorization', `Bearer ${authorizedUser.accessToken}`)
      .query({
        page: 2,
        page_size: 2,
      });

    // expect http response
    expect(response.statusCode).toEqual(200);

    // expect response json
    expect(response.body.data.length).toStrictEqual(1);
    expect(response.body.data[0].name).toStrictEqual(customerPreferences.data[2].name);

    expect(response.body.pagination.page).toStrictEqual(2);
    expect(response.body.pagination.page_size).toStrictEqual(2);
    expect(response.body.pagination.page_count).toStrictEqual(2);
    expect(response.body.pagination.total_document).toStrictEqual(3);
  });

  it('S.5. succeeds in choosing fields', async () => {
    const customerPreferenceFactory = new CustomerPreferenceFactory(DatabaseTestUtil.dbConnection);
    await customerPreferenceFactory.createMany(3);

    const customerPreferences = await DatabaseTestUtil.retrieveMany<ICustomerPreference>('customer_preferences');

    const response = await request(app)
      .get('/v1/customer-preferences')
      .set('Authorization', `Bearer ${authorizedUser.accessToken}`)
      .query({
        fields: '_id,name',
      });

    // expect http response
    expect(response.statusCode).toEqual(200);

    // expect response json
    expect(response.body.data.length).toStrictEqual(3);
    expect(response.body.data[0]._id).toBeDefined();
    expect(response.body.data[1]._id).toBeDefined();
    expect(response.body.data[2]._id).toBeDefined();
    expect(response.body.data[0].name).toStrictEqual(customerPreferences.data[0].name);
    expect(response.body.data[1].name).toStrictEqual(customerPreferences.data[1].name);
    expect(response.body.data[2].name).toStrictEqual(customerPreferences.data[2].name);
    expect(response.body.data[0].age).toBeUndefined();
    expect(response.body.data[1].age).toBeUndefined();
    expect(response.body.data[2].age).toBeUndefined();
    expect(response.body.data[0].created_at).toBeUndefined();
    expect(response.body.data[1].created_at).toBeUndefined();
    expect(response.body.data[2].created_at).toBeUndefined();

    expect(response.body.pagination.page).toStrictEqual(1);
    expect(response.body.pagination.page_size).toStrictEqual(10);
    expect(response.body.pagination.page_count).toStrictEqual(1);
    expect(response.body.pagination.total_document).toStrictEqual(3);
  });
});

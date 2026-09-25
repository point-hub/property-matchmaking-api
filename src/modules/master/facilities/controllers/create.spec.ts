import { faker } from '@faker-js/faker';
import { isValidDate } from '@point-hub/express-utils';
import { DatabaseTestUtil } from '@point-hub/papi';
import { beforeAll, beforeEach, describe, expect, it } from 'bun:test';
import type { Express } from 'express';
import request from 'supertest';

import { createApp } from '@/app';
import { type IAuthUserWithTokenResponse, TestService } from '@/modules/_shared/services/test.service';
import type { IRetrieveOutput as ICounterRetrieveOutput } from '@/modules/counters/repositories/retrieve.repository';

import { collectionName } from '../entity';
import FacilityFactory from '../factory';
import type { IFacility } from '../interface';
import type { IRetrieveOutput } from '../repositories/retrieve.repository';

describe('create an facility', async () => {
  let app: Express;
  let authorizedUser: IAuthUserWithTokenResponse;
  let unauthorizedUser: IAuthUserWithTokenResponse;

  beforeAll(async () => {
    app = await createApp({ dbConnection: DatabaseTestUtil.dbConnection });
  });

  beforeEach(async () => {
    await DatabaseTestUtil.reset();

    const testService = new TestService(DatabaseTestUtil.dbConnection);
    await testService.seedCounters();

    authorizedUser = await testService.createAuthUserAndGetAccessToken({
      permissions: ['facilities:create'],
    });
    unauthorizedUser = await testService.createAuthUserAndGetAccessToken({
      permissions: [],
    });
  });

  it('E.1. fails when the user is not authenticated', async () => {
    const response = await request(app)
      .post('/v1/master/facilities')
      .set('Authorization', 'Bearer')
      .send();

    // expect http response
    expect(response.statusCode).toEqual(401);

    // expect response json
    expect(response.body.code).toStrictEqual(401);
    expect(response.body.message).toStrictEqual('Authentication credentials is invalid.');
  });

  it('E.2. fails when the user is not authorized', async () => {
    const data: IFacility = {
      name: faker.person.fullName(),
    };

    const response = await request(app)
      .post('/v1/master/facilities')
      .set('Authorization', `Bearer ${unauthorizedUser.accessToken}`)
      .send(data);

    // expect http response
    expect(response.statusCode).toEqual(403);

    // expect response json
    expect(response.body.code).toStrictEqual(403);
    expect(response.body.message).toStrictEqual('You do not have permission to perform this action.');
  });

  it('E.3. fails when required field are missing ', async () => {
    const data = {};

    const response = await request(app)
      .post('/v1/master/facilities')
      .set('Authorization', `Bearer ${authorizedUser.accessToken}`)
      .send(data);

    // expect http response
    expect(response.statusCode).toEqual(422);

    // expect response json
    expect(response.body.code).toStrictEqual(422);
    expect(response.body.status).toStrictEqual('Unprocessable Entity');
    expect(response.body.message).toStrictEqual('Validation failed, Please check the highlighted fields.');
    expect(response.body.errors).toStrictEqual({
      name: ['The name field is required.'],
    });
  });

  it('E.4.1. fails when a unique database field already exists', async () => {
    const nameDuplicate = faker.person.fullName();

    const facilityFactory = new FacilityFactory(DatabaseTestUtil.dbConnection);
    facilityFactory.state({ name: nameDuplicate });
    await facilityFactory.create();

    const data: IFacility = {
      name: nameDuplicate,
    };

    const response = await request(app)
      .post('/v1/master/facilities')
      .set('Authorization', `Bearer ${authorizedUser.accessToken}`)
      .send(data);

    // expect http response
    expect(response.statusCode).toEqual(422);

    // expect response json
    expect(response.body.code).toStrictEqual(422);
    expect(response.body.message).toStrictEqual('Validation failed due to duplicate values.');
    expect(response.body.errors).toStrictEqual({
      'name': ['The name field must be unique.'],
    });
  });

  it('S.1. succeeds', async () => {
    const data = {
      name: faker.person.fullName(),
    };

    const response = await request(app)
      .post('/v1/master/facilities')
      .set('Authorization', `Bearer ${authorizedUser.accessToken}`)
      .send(data);

    // expect http response
    expect(response.statusCode).toEqual(201);

    // expect response json
    expect(response.body.inserted_id).toBeDefined();

    // expect recorded data
    const facilityRecord = await DatabaseTestUtil.retrieve<IRetrieveOutput>('facilities', response.body.inserted_id);

    expect(facilityRecord?._id).toStrictEqual(response.body.inserted_id);
    expect(facilityRecord?.name).toStrictEqual(data.name);
    expect(isValidDate(facilityRecord?.created_at)).toBeTruthy();

    // expect recorded data - the counter value to be incremented
    const counterRecord = await DatabaseTestUtil.retrieveMany<ICounterRetrieveOutput>('counters', {
      filter: { name: collectionName },
    });
    expect(counterRecord.data[0].seq).toStrictEqual(1);
  });

  it('S.2. succeeds with only required fields', async () => {
    const data = {
      name: faker.person.fullName(),
    };

    const response = await request(app)
      .post('/v1/master/facilities')
      .set('Authorization', `Bearer ${authorizedUser.accessToken}`)
      .send(data);

    // expect http response
    expect(response.statusCode).toEqual(201);

    // expect response json
    expect(response.body.inserted_id).toBeDefined();

    // expect recorded data
    const facilityRecord = await DatabaseTestUtil.retrieve<IRetrieveOutput>('facilities', response.body.inserted_id);

    expect(facilityRecord?._id).toStrictEqual(response.body.inserted_id);
    expect(facilityRecord?.name).toStrictEqual(data.name);
    expect(isValidDate(facilityRecord?.created_at)).toBeTruthy();

    // expect recorded data - the counter value to be incremented
    const counterRecord = await DatabaseTestUtil.retrieveMany<ICounterRetrieveOutput>('counters', {
      filter: { name: collectionName },
    });
    expect(counterRecord.data[0].seq).toStrictEqual(1);
  });
});
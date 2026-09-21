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
import LandTitleFactory from '../factory';
import type { ILandTitle } from '../interface';
import type { IRetrieveOutput } from '../repositories/retrieve.repository';

describe('create an land title', async () => {
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
      permissions: ['land-titles:create'],
    });
    unauthorizedUser = await testService.createAuthUserAndGetAccessToken({
      permissions: [],
    });
  });

  it('E.1. fails when the user is not authenticated', async () => {
    const response = await request(app)
      .post('/v1/master/land-titles')
      .set('Authorization', 'Bearer')
      .send();

    // expect http response
    expect(response.statusCode).toEqual(401);

    // expect response json
    expect(response.body.code).toStrictEqual(401);
    expect(response.body.message).toStrictEqual('Authentication credentials is invalid.');
  });

  it('E.2. fails when the user is not authorized', async () => {
    const data: ILandTitle = {
      code: 'EXAMPLE/' + faker.number.int({ min: 1, max: 99999 }).toString().padStart(5, '0'),
      name: faker.person.fullName(),
      gender: faker.person.sex(),
      composite_unique_1: faker.person.fullName(),
      composite_unique_2: faker.person.fullName(),
    };

    const response = await request(app)
      .post('/v1/master/land-titles')
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
      .post('/v1/master/land-titles')
      .set('Authorization', `Bearer ${authorizedUser.accessToken}`)
      .send(data);

    // expect http response
    expect(response.statusCode).toEqual(422);

    // expect response json
    expect(response.body.code).toStrictEqual(422);
    expect(response.body.status).toStrictEqual('Unprocessable Entity');
    expect(response.body.message).toStrictEqual('Validation failed, Please check the highlighted fields.');
    expect(response.body.errors).toStrictEqual({
      code: ['The code field is required.'],
      name: ['The name field is required.'],
      gender: ['The gender field is required.'],
      composite_unique_1: ['The composite_unique_1 field is required.'],
      composite_unique_2: ['The composite_unique_2 field is required.'],
    });
  });

  it('E.4.1. fails when a unique database field already exists', async () => {
    const nameDuplicate = faker.person.fullName();

    const landTitleFactory = new LandTitleFactory(DatabaseTestUtil.dbConnection);
    landTitleFactory.state({ name: nameDuplicate });
    await landTitleFactory.create();

    const data: ILandTitle = {
      code: 'EXAMPLE/' + faker.number.int({ min: 1, max: 99999 }).toString().padStart(5, '0'),
      name: nameDuplicate,
      gender: faker.person.sex(),
      composite_unique_1: faker.person.fullName(),
      composite_unique_2: faker.person.fullName(),
    };

    const response = await request(app)
      .post('/v1/master/land-titles')
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

  it('E.4.2. fails when a composite unique database record already exists', async () => {
    const compositeDuplicate1 = faker.person.fullName();
    const compositeDuplicate2 = faker.person.fullName();

    const landTitleFactory = new LandTitleFactory(DatabaseTestUtil.dbConnection);
    landTitleFactory.state({ composite_unique_1: compositeDuplicate1, composite_unique_2: compositeDuplicate2 });
    await landTitleFactory.create();

    const data: ILandTitle = {
      code: 'EXAMPLE/' + faker.number.int({ min: 1, max: 99999 }).toString().padStart(5, '0'),
      name: faker.person.fullName(),
      gender: faker.person.sex(),
      composite_unique_1: compositeDuplicate1,
      composite_unique_2: compositeDuplicate2,
    };

    const response = await request(app)
      .post('/v1/master/land-titles')
      .set('Authorization', `Bearer ${authorizedUser.accessToken}`)
      .send(data);

    // expect http response
    expect(response.statusCode).toEqual(422);

    // expect response json
    expect(response.body.code).toStrictEqual(422);
    expect(response.body.message).toStrictEqual('Validation failed due to duplicate values.');
    expect(response.body.errors).toStrictEqual({
      'composite_unique_1': ['The combination of composite_unique_1, composite_unique_2 field must be unique.'],
      'composite_unique_2': ['The combination of composite_unique_1, composite_unique_2 field must be unique.'],
    });
  });

  it('E.4.3. fails when validating unique database fields with undefined values', async () => {
    const optionalDuplicate = faker.person.fullName();

    const landTitleFactory = new LandTitleFactory(DatabaseTestUtil.dbConnection);
    landTitleFactory.state({ optional_unique: optionalDuplicate });
    await landTitleFactory.create();

    const data: ILandTitle = {
      code: 'EXAMPLE/' + faker.number.int({ min: 1, max: 99999 }).toString().padStart(5, '0'),
      name: faker.person.fullName(),
      gender: faker.person.sex(),
      composite_unique_1: faker.person.fullName(),
      composite_unique_2: faker.person.fullName(),
      optional_unique: optionalDuplicate,
    };

    const response = await request(app)
      .post('/v1/master/land-titles')
      .set('Authorization', `Bearer ${authorizedUser.accessToken}`)
      .send(data);

    // expect http response
    expect(response.statusCode).toEqual(422);

    // expect response json
    expect(response.body.code).toStrictEqual(422);
    expect(response.body.message).toStrictEqual('Validation failed due to duplicate values.');
    expect(response.body.errors).toStrictEqual({
      'optional_unique': ['The optional_unique field must be unique.'],
    });
  });

  it('E.4.4. fails when validating composite unique database fields with undefined values', async () => {
    const compositeDuplicate1 = faker.person.fullName();
    const compositeDuplicate2 = faker.person.fullName();

    const landTitleFactory = new LandTitleFactory(DatabaseTestUtil.dbConnection);
    landTitleFactory.state({ optional_composite_unique_1: compositeDuplicate1, optional_composite_unique_2: compositeDuplicate2 });
    await landTitleFactory.create();

    const data: ILandTitle = {
      code: 'EXAMPLE/' + faker.number.int({ min: 1, max: 99999 }).toString().padStart(5, '0'),
      name: faker.person.fullName(),
      gender: faker.person.sex(),
      composite_unique_1: faker.person.fullName(),
      composite_unique_2: faker.person.fullName(),
      optional_composite_unique_1: compositeDuplicate1,
      optional_composite_unique_2: compositeDuplicate2,
    };

    const response = await request(app)
      .post('/v1/master/land-titles')
      .set('Authorization', `Bearer ${authorizedUser.accessToken}`)
      .send(data);

    // expect http response
    expect(response.statusCode).toEqual(422);

    // expect response json
    expect(response.body.code).toStrictEqual(422);
    expect(response.body.message).toStrictEqual('Validation failed due to duplicate values.');
    expect(response.body.errors).toStrictEqual({
      'optional_composite_unique_1': ['The combination of optional_composite_unique_1, optional_composite_unique_2 field must be unique.'],
      'optional_composite_unique_2': ['The combination of optional_composite_unique_1, optional_composite_unique_2 field must be unique.'],
    });
  });

  it('E.4.5. fails with a custom error field for unique database validation', async () => {
    const compositeDuplicate1 = faker.person.fullName();
    const compositeDuplicate2 = faker.person.fullName();

    const landTitleFactory = new LandTitleFactory(DatabaseTestUtil.dbConnection);
    landTitleFactory.state({ xxx_composite_unique_1: compositeDuplicate1, xxx_composite_unique_2: compositeDuplicate2 });
    await landTitleFactory.create();

    const data: ILandTitle = {
      code: 'EXAMPLE/' + faker.number.int({ min: 1, max: 99999 }).toString().padStart(5, '0'),
      name: faker.person.fullName(),
      gender: faker.person.sex(),
      composite_unique_1: faker.person.fullName(),
      composite_unique_2: faker.person.fullName(),
      xxx_composite_unique_1: compositeDuplicate1,
      xxx_composite_unique_2: compositeDuplicate2,
    };

    const response = await request(app)
      .post('/v1/master/land-titles')
      .set('Authorization', `Bearer ${authorizedUser.accessToken}`)
      .send(data);

    // expect http response
    expect(response.statusCode).toEqual(422);

    // expect response json
    expect(response.body.code).toStrictEqual(422);
    expect(response.body.message).toStrictEqual('Validation failed due to duplicate values.');
    expect(response.body.errors).toStrictEqual({
      'composite_unique_1': ['The combination of composite_unique_1, composite_unique_2 field must be unique.'],
      'composite_unique_2': ['The combination of composite_unique_1, composite_unique_2 field must be unique.'],
    });
  });

  it('S.1. succeeds', async () => {
    const data = {
      code: 'EXAMPLE/' + faker.number.int({ min: 1, max: 99999 }).toString().padStart(5, '0'),
      name: faker.person.fullName(),
      composite_unique_1: faker.person.fullName(),
      composite_unique_2: faker.person.fullName(),
      age: faker.number.int({ min: 17, max: 100 }),
      gender: faker.person.sex(),
      optional_unique: faker.person.fullName(),
      optional_composite_unique_1: faker.person.fullName(),
      optional_composite_unique_2: faker.person.fullName(),
    };

    const response = await request(app)
      .post('/v1/master/land-titles')
      .set('Authorization', `Bearer ${authorizedUser.accessToken}`)
      .send(data);

    // expect http response
    expect(response.statusCode).toEqual(201);

    // expect response json
    expect(response.body.inserted_id).toBeDefined();

    // expect recorded data
    const landTitleRecord = await DatabaseTestUtil.retrieve<IRetrieveOutput>('land_titles', response.body.inserted_id);

    expect(landTitleRecord?._id).toStrictEqual(response.body.inserted_id);
    expect(landTitleRecord?.name).toStrictEqual(data.name);
    expect(landTitleRecord?.composite_unique_1).toStrictEqual(data.composite_unique_1);
    expect(landTitleRecord?.composite_unique_2).toStrictEqual(data.composite_unique_2);
    expect(landTitleRecord?.age).toStrictEqual(data.age);
    expect(landTitleRecord?.gender).toStrictEqual(data.gender);
    expect(landTitleRecord?.optional_unique).toStrictEqual(data.optional_unique);
    expect(landTitleRecord?.optional_composite_unique_1).toStrictEqual(data.optional_composite_unique_1);
    expect(landTitleRecord?.optional_composite_unique_2).toStrictEqual(data.optional_composite_unique_2);
    expect(isValidDate(landTitleRecord?.created_at)).toBeTruthy();

    // expect recorded data - the counter value to be incremented
    const counterRecord = await DatabaseTestUtil.retrieveMany<ICounterRetrieveOutput>('counters', {
      filter: { name: collectionName },
    });
    expect(counterRecord.data[0].seq).toStrictEqual(1);
  });

  it('S.2. succeeds with only required fields', async () => {
    const data = {
      code: 'EXAMPLE/' + faker.number.int({ min: 1, max: 99999 }).toString().padStart(5, '0'),
      name: faker.person.fullName(),
      gender: faker.person.sex(),
      composite_unique_1: faker.person.fullName(),
      composite_unique_2: faker.person.fullName(),
    };

    const response = await request(app)
      .post('/v1/master/land-titles')
      .set('Authorization', `Bearer ${authorizedUser.accessToken}`)
      .send(data);

    // expect http response
    expect(response.statusCode).toEqual(201);

    // expect response json
    expect(response.body.inserted_id).toBeDefined();

    // expect recorded data
    const landTitleRecord = await DatabaseTestUtil.retrieve<IRetrieveOutput>('land_titles', response.body.inserted_id);

    expect(landTitleRecord?._id).toStrictEqual(response.body.inserted_id);
    expect(landTitleRecord?.name).toStrictEqual(data.name);
    expect(landTitleRecord?.gender).toStrictEqual(data.gender);
    expect(landTitleRecord?.composite_unique_1).toStrictEqual(data.composite_unique_1);
    expect(landTitleRecord?.composite_unique_2).toStrictEqual(data.composite_unique_2);
    expect(isValidDate(landTitleRecord?.created_at)).toBeTruthy();

    // expect recorded data - the counter value to be incremented
    const counterRecord = await DatabaseTestUtil.retrieveMany<ICounterRetrieveOutput>('counters', {
      filter: { name: collectionName },
    });
    expect(counterRecord.data[0].seq).toStrictEqual(1);
  });
});
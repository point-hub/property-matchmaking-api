import { faker } from '@faker-js/faker';
import { DatabaseTestUtil } from '@point-hub/papi';
import { beforeAll, beforeEach, describe, expect, it } from 'bun:test';
import type { Express } from 'express';
import request from 'supertest';

import { createApp } from '@/app';
import { type IAuthUserWithTokenResponse, TestService } from '@/modules/_shared/services/test.service';

import PropertyFactory from '../factory';
import type { IProperty } from '../interface';

describe('update an property', async () => {
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
      permissions: ['properties:update'],
    });
    unauthorizedUser = await testService.createAuthUserAndGetAccessToken({
      permissions: [],
    });
  });

  it('E.1. fails when the user is not authenticated', async () => {
    const resultPropertyFactory = await new PropertyFactory(DatabaseTestUtil.dbConnection).create();

    const response = await request(app)
      .patch(`/v1/master/properties/${resultPropertyFactory.inserted_id}`)
      .set('Authorization', 'Bearer')
      .send();

    // expect http response
    expect(response.statusCode).toEqual(401);

    // expect response json
    expect(response.body.code).toStrictEqual(401);
    expect(response.body.message).toStrictEqual('Authentication credentials is invalid.');
  });

  it('E.2. fails when the user is not authorized', async () => {
    const resultPropertyFactory = await new PropertyFactory(DatabaseTestUtil.dbConnection).create();

    const data: IProperty = {
      name: faker.person.fullName(),
    };

    const response = await request(app)
      .patch(`/v1/master/properties/${resultPropertyFactory.inserted_id}`)
      .set('Authorization', `Bearer ${unauthorizedUser.accessToken}`)
      .send(data);

    // expect http response
    expect(response.statusCode).toEqual(403);

    // expect response json
    expect(response.body.code).toStrictEqual(403);
    expect(response.body.message).toStrictEqual('You do not have permission to perform this action.');
  });

  it('E.3. fails when required field are missing ', async () => {
    const resultPropertyFactory = await new PropertyFactory(DatabaseTestUtil.dbConnection).create();

    const response = await request(app)
      .patch(`/v1/master/properties/${resultPropertyFactory.inserted_id}`)
      .set('Authorization', `Bearer ${authorizedUser.accessToken}`)
      .send({
        name: null,
      });

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

  it('E.4. fails when a unique database field already exists', async () => {
    const nameDuplicate = faker.person.fullName();

    const propertyFactory = new PropertyFactory(DatabaseTestUtil.dbConnection);

    // seed data to compare later
    await propertyFactory.state({ name: nameDuplicate }).create();

    // seed data to edit the name to the same name as above
    const resultPropertyFactory = await propertyFactory.state({ name: faker.person.fullName() }).create();

    const data: IProperty = {
      name: nameDuplicate,
    };

    const response = await request(app)
      .patch(`/v1/master/properties/${resultPropertyFactory.inserted_id}`)
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
    const resultPropertyFactory = await new PropertyFactory(DatabaseTestUtil.dbConnection).createMany(2);

    const updateData = {
      name: faker.person.fullName(),
    };

    const response = await request(app)
      .patch(`/v1/master/properties/${resultPropertyFactory.inserted_ids[0]}`)
      .set('Authorization', `Bearer ${authorizedUser.accessToken}`)
      .send(updateData);

    const properties = await DatabaseTestUtil.retrieveMany<IProperty>('properties');

    // expect http response
    expect(response.statusCode).toEqual(200);

    // expect response json
    expect(response.body).toStrictEqual({
      matched_count: 1,
      modified_count: 1,
    });

    // expect recorded data
    const propertyRecord = await DatabaseTestUtil.retrieve<IProperty>('properties', resultPropertyFactory.inserted_ids[0]);
    expect(propertyRecord?.name).toStrictEqual(updateData.name);

    // expect another data unmodified
    const unmodifiedPropertyRecord = await DatabaseTestUtil.retrieve<IProperty>('properties', resultPropertyFactory.inserted_ids[1]);
    expect(unmodifiedPropertyRecord?.name).toStrictEqual(properties.data[1].name);
  });
});

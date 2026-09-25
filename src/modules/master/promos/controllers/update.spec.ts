import { faker } from '@faker-js/faker';
import { DatabaseTestUtil } from '@point-hub/papi';
import { beforeAll, beforeEach, describe, expect, it } from 'bun:test';
import type { Express } from 'express';
import request from 'supertest';

import { createApp } from '@/app';
import { type IAuthUserWithTokenResponse, TestService } from '@/modules/_shared/services/test.service';

import PromoFactory from '../factory';
import type { IPromo } from '../interface';

describe('update an promo', async () => {
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
      permissions: ['promos:update'],
    });
    unauthorizedUser = await testService.createAuthUserAndGetAccessToken({
      permissions: [],
    });
  });

  it('E.1. fails when the user is not authenticated', async () => {
    const resultPromoFactory = await new PromoFactory(DatabaseTestUtil.dbConnection).create();

    const response = await request(app)
      .patch(`/v1/master/promos/${resultPromoFactory.inserted_id}`)
      .set('Authorization', 'Bearer')
      .send();

    // expect http response
    expect(response.statusCode).toEqual(401);

    // expect response json
    expect(response.body.code).toStrictEqual(401);
    expect(response.body.message).toStrictEqual('Authentication credentials is invalid.');
  });

  it('E.2. fails when the user is not authorized', async () => {
    const resultPromoFactory = await new PromoFactory(DatabaseTestUtil.dbConnection).create();

    const data: IPromo = {
      name: faker.person.fullName(),
      gender: faker.person.sex(),
      composite_unique_1: faker.person.fullName(),
      composite_unique_2: faker.person.fullName(),
    };

    const response = await request(app)
      .patch(`/v1/master/promos/${resultPromoFactory.inserted_id}`)
      .set('Authorization', `Bearer ${unauthorizedUser.accessToken}`)
      .send(data);

    // expect http response
    expect(response.statusCode).toEqual(403);

    // expect response json
    expect(response.body.code).toStrictEqual(403);
    expect(response.body.message).toStrictEqual('You do not have permission to perform this action.');
  });

  it('E.3. fails when required field are missing ', async () => {
    const resultPromoFactory = await new PromoFactory(DatabaseTestUtil.dbConnection).create();

    const response = await request(app)
      .patch(`/v1/master/promos/${resultPromoFactory.inserted_id}`)
      .set('Authorization', `Bearer ${authorizedUser.accessToken}`)
      .send({
        name: null,
        composite_unique_1: null,
        composite_unique_2: null,
      });

    // expect http response
    expect(response.statusCode).toEqual(422);

    // expect response json
    expect(response.body.code).toStrictEqual(422);
    expect(response.body.status).toStrictEqual('Unprocessable Entity');
    expect(response.body.message).toStrictEqual('Validation failed, Please check the highlighted fields.');
    expect(response.body.errors).toStrictEqual({
      name: ['The name field is required.'],
      composite_unique_1: ['The composite_unique_1 field is required.'],
      composite_unique_2: ['The composite_unique_2 field is required.'],
    });
  });

  it('E.4. fails when a unique database field already exists', async () => {
    const nameDuplicate = faker.person.fullName();

    const promoFactory = new PromoFactory(DatabaseTestUtil.dbConnection);

    // seed data to compare later
    await promoFactory.state({ name: nameDuplicate }).create();

    // seed data to edit the name to the same name as above
    const resultPromoFactory = await promoFactory.state({ name: faker.person.fullName() }).create();

    const data: IPromo = {
      name: nameDuplicate,
      gender: faker.person.sex(),
      composite_unique_1: faker.person.fullName(),
      composite_unique_2: faker.person.fullName(),
    };

    const response = await request(app)
      .patch(`/v1/master/promos/${resultPromoFactory.inserted_id}`)
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
    const resultPromoFactory = await new PromoFactory(DatabaseTestUtil.dbConnection).createMany(2);

    const updateData = {
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
      .patch(`/v1/master/promos/${resultPromoFactory.inserted_ids[0]}`)
      .set('Authorization', `Bearer ${authorizedUser.accessToken}`)
      .send(updateData);

    const promos = await DatabaseTestUtil.retrieveMany<IPromo>('promos');

    // expect http response
    expect(response.statusCode).toEqual(200);

    // expect response json
    expect(response.body).toStrictEqual({
      matched_count: 1,
      modified_count: 1,
    });

    // expect recorded data
    const promoRecord = await DatabaseTestUtil.retrieve<IPromo>('promos', resultPromoFactory.inserted_ids[0]);
    expect(promoRecord?.name).toStrictEqual(updateData.name);
    expect(promoRecord?.composite_unique_1).toStrictEqual(updateData.composite_unique_1);
    expect(promoRecord?.composite_unique_2).toStrictEqual(updateData.composite_unique_2);
    expect(promoRecord?.age).toStrictEqual(updateData.age);
    expect(promoRecord?.gender).toStrictEqual(updateData.gender);
    expect(promoRecord?.optional_unique).toStrictEqual(updateData.optional_unique);
    expect(promoRecord?.optional_composite_unique_1).toStrictEqual(updateData.optional_composite_unique_1);
    expect(promoRecord?.optional_composite_unique_2).toStrictEqual(updateData.optional_composite_unique_2);

    // expect another data unmodified
    const unmodifiedPromoRecord = await DatabaseTestUtil.retrieve<IPromo>('promos', resultPromoFactory.inserted_ids[1]);
    expect(unmodifiedPromoRecord?.name).toStrictEqual(promos.data[1].name);
  });
});

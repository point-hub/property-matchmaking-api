import type { IDatabase, IPipeline } from '@point-hub/papi';

import { collectionName } from '../entity';
import type { ICustomerPreference } from '../interface';

export interface IRetrieveRepository {
  handle(_id: string): Promise<IRetrieveOutput | null>
  raw(_id: string): Promise<ICustomerPreference | null>
}

export interface IRetrieveOutput {
  _id: string;
  locations: string[];
  budget_min: number;
  budget_max: number;
  down_payment_min: number;
  down_payment_max: number;
  monthly_payment_min: number;
  monthly_payment_max: number;
  age: number;
  marital_status: string;
  dependents: number;
  problems: string[];
  promos: string[];
  name: string;
  whatsapp: number;
  notes: string;
  is_archived: boolean;
  created_at: Date;
}

export class RetrieveRepository implements IRetrieveRepository {
  constructor(
    public database: IDatabase,
    public options?: Record<string, unknown>,
  ) { }

  async handle(_id: string): Promise<IRetrieveOutput | null> {
    const pipeline: IPipeline[] = [];

    pipeline.push(...this.pipeFilter(_id));
    pipeline.push(...this.pipeProject());

    const response = await this.database.collection(collectionName).aggregate<IRetrieveOutput>(pipeline, {}, this.options);
    if (!response || response.data.length === 0) {
      return null;
    }

    return {
      _id: response.data[0]._id,
      locations: response.data[0].locations,
      budget_min: response.data[0].budget_min,
      budget_max: response.data[0].budget_max,
      down_payment_min: response.data[0].down_payment_min,
      down_payment_max: response.data[0].down_payment_max,
      monthly_payment_min: response.data[0].monthly_payment_min,
      monthly_payment_max: response.data[0].monthly_payment_max,
      age: response.data[0].age,
      marital_status: response.data[0].marital_status,
      dependents: response.data[0].dependents,
      problems: response.data[0].problems,
      promos: response.data[0].promos,
      name: response.data[0].name,
      whatsapp: response.data[0].whatsapp,
      notes: response.data[0].notes,
      is_archived: response.data[0].is_archived,
      created_at: response.data[0].created_at,
    };
  }

  async raw(_id: string): Promise<ICustomerPreference | null> {
    const response = await this.database.collection(collectionName).retrieve<ICustomerPreference>(_id, this.options);
    if (!response) {
      return null;
    }

    return response;
  }

  private pipeFilter(_id: string): IPipeline[] {
    return [{ $match: { _id } }];
  }

  private pipeProject(): IPipeline[] {
    return [
      {
        $project: {
          _id: 1,
          locations: 1,
          budget_min: 1,
          budget_max: 1,
          down_payment_min: 1,
          down_payment_max: 1,
          monthly_payment_min: 1,
          monthly_payment_max: 1,
          age: 1,
          marital_status: 1,
          dependents: 1,
          problems: 1,
          promos: 1,
          name: 1,
          whatsapp: 1,
          notes: 1,
          is_archived: 1,
          created_at: 1,
        },
      },
    ];
  }
}

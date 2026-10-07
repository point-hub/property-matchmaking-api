export interface ICustomerPreference {
  _id?: string
  location?: string;
  budget_min?: number;
  budget_max?: number;
  down_payment_min?: number;
  down_payment_max?: number;
  monthly_payment_min?: number;
  monthly_payment_max?: number;
  age?: number;
  marital_status?: string;
  dependents?: number;
  problems?: string[];
  promos?: string[];
  name?: string;
  whatsapp?: number;
  notes?: string | null | undefined
  is_archived?: boolean | null | undefined
  created_at?: Date
  created_by_id?: string
}

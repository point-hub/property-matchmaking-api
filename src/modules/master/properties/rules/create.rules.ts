/**
 * Available rules
 * https://github.com/mikeerickson/validatorjs?tab=readme-ov-file#available-rules
 */

export const createRules = {
  code: ['required', 'string'],
  name: ['required', 'string'],
  address: ['required', 'string'],
  village: ['required', 'string'],
  district: ['required', 'string'],
  city: ['required', 'string'],
  developer_name: ['required', 'string'],
  whatsapp: ['required', 'string'],
  pricelists: ['required'],
  notes: ['string'],
};

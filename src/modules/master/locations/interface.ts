export interface IFacility {
  _id?: string
  name?: string
  notes?: string | null | undefined
  is_archived?: boolean | null | undefined
  created_at?: Date
  created_by_id?: string
}

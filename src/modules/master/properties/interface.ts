export interface IProperty {
  _id?: string
  code?: string
  name?: string
  address?: string
  village?: string
  district?: string
  city?: string
  google_map_link?: string
  instagram?: string
  pricelists?: { building_area: number, land_area: number, price: number }[]
  land_titles?: string[]
  facilities?: string[]
  promos?: string[]
  developer_name?: string
  whatsapp?: string
  mou?: string
  photos_gate?: string[]
  photos_building?: string[]
  notes?: string | null | undefined
  is_archived?: boolean | null | undefined
  created_at?: Date
  created_by_id?: string
}

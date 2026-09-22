export interface OrderRow {
  id: string
  customer: string
  amount: number
  status: 'pending' | 'paid' | 'shipped'
}

export interface OrderTableProps {
  rows: OrderRow[]
  pageSize?: number
  current?: number
}

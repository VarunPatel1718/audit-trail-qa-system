export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'
export type TransactionStatus = 'pending' | 'approved' | 'rejected' | 'flagged' | 'cleared'
export type DebitCredit = 'debit' | 'credit'

export interface LoginRequest {
  email: string
  password: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
}

export interface UserOut {
  id: number
  email: string
  full_name: string
  role: string
  is_active: boolean
}

export interface Transaction {
  id: number
  transaction_ref: string
  vendor_id: number
  department_id: number
  amount: string | number
  currency: string
  debit_credit: DebitCredit
  account_number: string | null
  transaction_date: string
  description: string | null
  status: TransactionStatus
  risk_score: number
  risk_level: RiskLevel | null
  created_at: string
  updated_at: string
}

export interface VendorSummary {
  id: number
  name: string
  vendor_code: string
  is_active: boolean
}

export interface DepartmentSummary {
  id: number
  name: string
  code: string
  is_active: boolean
}

export interface TransactionDetail extends Transaction {
  vendor: VendorSummary
  department: DepartmentSummary
}

export interface PaginatedTransactions {
  items: Transaction[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface TransactionQueryParams {
  date_from?: string
  date_to?: string
  vendor_id?: number
  department_id?: number
  amount_min?: number
  amount_max?: number
  status?: TransactionStatus
  risk_level?: RiskLevel
  sort_by?: 'transaction_date' | 'amount' | 'risk_score' | 'created_at'
  sort_order?: 'asc' | 'desc'
  page?: number
  page_size?: number
}

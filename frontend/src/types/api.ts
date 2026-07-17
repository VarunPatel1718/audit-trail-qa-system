export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'
export type TransactionStatus = 'pending' | 'approved' | 'rejected' | 'flagged' | 'cleared'
export type DebitCredit = 'debit' | 'credit'
export type FlagStatus = 'open' | 'resolved' | 'dismissed'
export type AuditNoteStatus = 'draft' | 'submitted' | 'approved' | 'rejected'

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

export interface AuditFlag {
  id: number
  rule_name: string
  risk_points: number
  details: string | null
  status: FlagStatus
}

export interface TransactionFlags {
  transaction_id: number
  transaction_ref: string
  risk_score: number
  risk_level: RiskLevel | null
  evaluated: boolean
  flags: AuditFlag[]
}

export interface PolicySearchResult {
  policy_id: number
  score: number
  document_name: string
  title: string
  chapter: string | null
  clause_ref: string | null
  source_page: number | null
  content: string
}

export interface AuditNote {
  id: number
  transaction_id: number
  audit_flag_id: number
  status: AuditNoteStatus
  created_by_id: number | null
  reviewed_by_id: number | null
  submitted_at: string | null
  reviewed_at: string | null
  summary: string
  reasoning: string
  risk_assessment: string
  recommended_action: string
  content: string
  cited_policy_ids: number[]
  cited_policies: PolicySearchResult[]
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

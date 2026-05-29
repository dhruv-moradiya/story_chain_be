enum PayoutMethod {
  UPI = 'upi',
  BANK_TRANSFER = 'bank_transfer',
}

const PAYOUT_METHODS = ['upi', 'bank_transfer'] as const;

enum WithdrawalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

const WITHDRAWAL_STATUSES = [
  'pending',
  'approved',
  'rejected',
  'processing',
  'completed',
  'failed',
] as const;

export { PayoutMethod, PAYOUT_METHODS, WithdrawalStatus, WITHDRAWAL_STATUSES };

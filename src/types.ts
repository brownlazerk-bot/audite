/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type TransactionType =
  | 'REVENUE'
  | 'EXPENSE'
  | 'CAPITAL_DEPOSIT'
  | 'CAPITAL_WITHDRAWAL'
  | 'CASH_INJECTION'
  | 'PURCHASE_ORDER'
  | 'STOCK_ADJUSTMENT';

export type PaymentMethod = 'Cash' | 'Bank' | 'Accounts Receivable' | 'Accounts Payable';

export type Department = 'Rooms' | 'F&B' | 'Admin' | 'Maintenance' | 'Marketing' | 'Other';

export interface TransactionHistoryItem {
  timestamp: string;
  action: 'CREATED' | 'EDITED' | 'MARKED_DELETED' | 'RESTORED';
  user: string;
  details: string;
  ipAddress: string;
}

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  type: TransactionType;
  category: string; // e.g. "Room Revenue", "Food Purchases", "Electricity", "Owner Cash Injection"
  department: Department;
  description: string;
  amount: number;
  paymentMethod: PaymentMethod;
  referenceNumber: string; // Invoice #, Receipt #, Reference #
  approvedBy: string;
  attachmentUrl?: string;
  status: 'Draft' | 'Approved' | 'Pending' | 'Completed';
  
  // Audit Trails
  createdBy: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt?: string;
  deletedBy?: string;
  deletedAt?: string;
  isDeleted?: boolean; // Soft delete - never permanently delete
  deleteReason?: string;
  editReason?: string;
  ipAddress: string;
  history: TransactionHistoryItem[];
}

export interface InventoryBatch {
  id: string;
  itemId: string;
  itemName: string;
  category: string;
  quantityPurchased: number;
  quantityRemaining: number;
  unitPrice: number; // Cost price per unit
  dateReceived: string;
  expiryDate?: string;
  referenceNo: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  unit: string; // kg, bottle, pack, box
  minStockLevel: number;
}

export interface StockUsage {
  id: string;
  itemId: string;
  date: string;
  quantityUsed: number;
  purpose: 'Sales' | 'Waste' | 'Expired' | 'Missing' | 'Complimentary' | 'Returned' | 'Damaged';
  recordedBy: string;
  reason?: string;
}

export interface ManagerReportSubmission {
  month: string; // YYYY-MM
  managerName: string;
  submittedAt: string;
  
  // Reported Figures
  roomRevenue: number;
  fbRevenue: number;
  otherRevenue: number;
  totalRevenue: number;
  
  operatingExpenses: number;
  cogs: number;
  netProfit: number;
  
  cashBalance: number;
  bankBalance: number;
  inventoryValue: number;
  
  notes?: string;
}

export interface AuditAlert {
  id: string;
  timestamp: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  type: 
    | 'BUDGET_EXCEEDED'
    | 'NEGATIVE_PROFIT'
    | 'MISSING_INVENTORY'
    | 'CASH_VARIANCE'
    | 'LARGE_DISCOUNT'
    | 'DELETED_TRANSACTION'
    | 'EDITED_TRANSACTION'
    | 'UNAPPROVED_PURCHASE'
    | 'DUPLICATE_PAYMENT'
    | 'DUPLICATE_INVOICE'
    | 'NEGATIVE_STOCK';
  title: string;
  description: string;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
}

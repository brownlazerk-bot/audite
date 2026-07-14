/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Transaction, InventoryItem, InventoryBatch, StockUsage, ManagerReportSubmission, AuditAlert } from '../types';

export const REVENUE_CATEGORIES = [
  'Room Revenue',
  'Restaurant Revenue',
  'Bar Revenue',
  'Conference Hall Revenue',
  'Laundry Revenue',
  'Swimming Pool Revenue',
  'Airport Pickup Revenue',
  'Tour Services Revenue',
  'Parking Revenue',
  'Other Income'
];

export const EXPENSE_CATEGORIES = [
  'Food Purchases',
  'Beverage Purchases',
  'Kitchen Supplies',
  'Cleaning Supplies',
  'Electricity',
  'Water',
  'Internet',
  'Fuel',
  'Maintenance',
  'Salary',
  'Taxes',
  'Marketing',
  'Transport',
  'Security',
  'Office Expenses',
  'Bank Charges',
  'Miscellaneous'
];

// Initial preloaded inventory items
export const INITIAL_INVENTORY_ITEMS: InventoryItem[] = [
  { id: 'inv-001', name: 'Angus Beef Striploin (kg)', category: 'Food', unit: 'kg', minStockLevel: 20 },
  { id: 'inv-002', name: 'Fresh Salmon Fillet (kg)', category: 'Food', unit: 'kg', minStockLevel: 15 },
  { id: 'inv-003', name: 'Heineken Premium Beer (bottle)', category: 'Beverages', unit: 'bottles', minStockLevel: 100 },
  { id: 'inv-004', name: 'House Red Wine (750ml bottle)', category: 'Beverages', unit: 'bottles', minStockLevel: 24 },
  { id: 'inv-005', name: 'Eco-Lab Multi-Surface Cleaner (liter)', category: 'Cleaning Supplies', unit: 'liters', minStockLevel: 10 },
  { id: 'inv-006', name: 'Premium Cooking Oil (5L jug)', category: 'Kitchen Supplies', unit: 'jugs', minStockLevel: 8 }
];

// Initial FIFO inventory batches (received stock)
export const INITIAL_INVENTORY_BATCHES: InventoryBatch[] = [
  // Angus Beef Striploin: 2 batches
  {
    id: 'batch-beef-1',
    itemId: 'inv-001',
    itemName: 'Angus Beef Striploin (kg)',
    category: 'Food',
    quantityPurchased: 40,
    quantityRemaining: 12,
    unitPrice: 15000, // 15,000 RWF per kg
    dateReceived: '2026-06-05',
    expiryDate: '2026-06-25',
    referenceNo: 'INV-SUP-101'
  },
  {
    id: 'batch-beef-2',
    itemId: 'inv-001',
    itemName: 'Angus Beef Striploin (kg)',
    category: 'Food',
    quantityPurchased: 30,
    quantityRemaining: 30,
    unitPrice: 16500, // Price increased to 16,500 RWF
    dateReceived: '2026-06-20',
    expiryDate: '2026-07-15',
    referenceNo: 'INV-SUP-142'
  },
  // Heineken Beer
  {
    id: 'batch-beer-1',
    itemId: 'inv-003',
    itemName: 'Heineken Premium Beer (bottle)',
    category: 'Beverages',
    quantityPurchased: 200,
    quantityRemaining: 45,
    unitPrice: 1200,
    dateReceived: '2026-06-02',
    expiryDate: '2027-06-02',
    referenceNo: 'INV-SUP-098'
  },
  {
    id: 'batch-beer-2',
    itemId: 'inv-003',
    itemName: 'Heineken Premium Beer (bottle)',
    category: 'Beverages',
    quantityPurchased: 300,
    quantityRemaining: 280,
    unitPrice: 1250,
    dateReceived: '2026-06-18',
    expiryDate: '2027-06-18',
    referenceNo: 'INV-SUP-139'
  },
  // Eco Cleaning
  {
    id: 'batch-clean-1',
    itemId: 'inv-005',
    itemName: 'Eco-Lab Multi-Surface Cleaner (liter)',
    category: 'Cleaning Supplies',
    quantityPurchased: 20,
    quantityRemaining: 8,
    unitPrice: 4500,
    dateReceived: '2026-06-10',
    expiryDate: '2028-06-10',
    referenceNo: 'INV-SUP-115'
  }
];

// Initial stock usages
export const INITIAL_STOCK_USAGES: StockUsage[] = [
  { id: 'use-001', itemId: 'inv-001', date: '2026-06-12', quantityUsed: 15, purpose: 'Sales', recordedBy: 'Chef G. Mugisha', reason: 'Restaurant dinner service' },
  { id: 'use-002', itemId: 'inv-001', date: '2026-06-22', quantityUsed: 13, purpose: 'Sales', recordedBy: 'Chef G. Mugisha', reason: 'Weekend brunch buffets' },
  { id: 'use-003', itemId: 'inv-003', date: '2026-06-15', quantityUsed: 110, purpose: 'Sales', recordedBy: 'Lead Bartender U. Mutoni', reason: 'Bar service sales' },
  { id: 'use-004', itemId: 'inv-003', date: '2026-06-28', quantityUsed: 45, purpose: 'Sales', recordedBy: 'Lead Bartender U. Mutoni', reason: 'Bar service sales' },
  { id: 'use-005', itemId: 'inv-001', date: '2026-06-25', quantityUsed: 3, purpose: 'Expired', recordedBy: 'Chef G. Mugisha', reason: 'Spoilage of batch-beef-1 left in cooler' },
  { id: 'use-006', itemId: 'inv-005', date: '2026-06-18', quantityUsed: 12, purpose: 'Sales', recordedBy: 'Housekeeper A. Uwase', reason: 'Rooms deep cleaning' }
];

// Initial transaction historical entries for Audit Log
export const INITIAL_TRANSACTIONS: Transaction[] = [
  // -- OPENING CAPITAL --
  {
    id: 'tx-cap-001',
    date: '2026-05-01',
    type: 'CAPITAL_DEPOSIT',
    category: 'Owner Capital Deposit',
    department: 'Admin',
    description: 'Initial Opening Owner Equity Contribution for Hotel Launch',
    amount: 150000000, // 150,000,000 RWF (Rwandan Franc)
    paymentMethod: 'Bank',
    referenceNumber: 'REF-CAP-001',
    approvedBy: 'CEO K. Brown',
    status: 'Completed',
    createdBy: 'CEO K. Brown',
    createdAt: '2026-05-01T09:00:00Z',
    ipAddress: '197.243.12.84',
    history: [
      {
        timestamp: '2026-05-01T09:00:00Z',
        action: 'CREATED',
        user: 'CEO K. Brown',
        details: 'Initial corporate equity injection established.',
        ipAddress: '197.243.12.84'
      }
    ]
  },
  
  // -- OWNER CASH INJECTIONS (Must NOT appear as revenue/profit) --
  {
    id: 'tx-cap-002',
    date: '2026-06-10',
    type: 'CASH_INJECTION',
    category: 'Owner Cash Injection',
    department: 'Maintenance',
    description: 'Additional capital injection to renovate conference hall rooms',
    amount: 5000000, // 5M RWF
    paymentMethod: 'Bank',
    referenceNumber: 'REF-INJ-002',
    approvedBy: 'CEO K. Brown',
    status: 'Completed',
    createdBy: 'Financial Controller E. Rwibutso',
    createdAt: '2026-06-10T10:15:00Z',
    ipAddress: '197.243.12.85',
    history: [
      {
        timestamp: '2026-06-10T10:15:00Z',
        action: 'CREATED',
        user: 'Financial Controller E. Rwibutso',
        details: 'Capital cash injection from owner for renovations.',
        ipAddress: '197.243.12.85'
      }
    ]
  },
  {
    id: 'tx-cap-003',
    date: '2026-06-25',
    type: 'CASH_INJECTION',
    category: 'Owner Cash Injection',
    department: 'F&B',
    description: 'Owner cash injection for purchasing heavy-duty kitchen baking equipment',
    amount: 2000000, // 2M RWF
    paymentMethod: 'Bank',
    referenceNumber: 'REF-INJ-003',
    approvedBy: 'CEO K. Brown',
    status: 'Completed',
    createdBy: 'Financial Controller E. Rwibutso',
    createdAt: '2026-06-25T14:40:00Z',
    ipAddress: '197.243.12.85',
    history: [
      {
        timestamp: '2026-06-25T14:40:00Z',
        action: 'CREATED',
        user: 'Financial Controller E. Rwibutso',
        details: 'Capital cash injection from owner for kitchen equipment.',
        ipAddress: '197.243.12.85'
      }
    ]
  },

  // -- OWNER WITHDRAWALS --
  {
    id: 'tx-cap-004',
    date: '2026-06-28',
    type: 'CAPITAL_WITHDRAWAL',
    category: 'Owner Capital Withdrawal',
    department: 'Admin',
    description: 'Personal draw by Owner for private utility expenses',
    amount: 1500000, // 1.5M RWF
    paymentMethod: 'Bank',
    referenceNumber: 'REF-WTH-004',
    approvedBy: 'CEO K. Brown',
    status: 'Completed',
    createdBy: 'Financial Controller E. Rwibutso',
    createdAt: '2026-06-28T16:00:00Z',
    ipAddress: '197.243.12.85',
    history: [
      {
        timestamp: '2026-06-28T16:00:00Z',
        action: 'CREATED',
        user: 'Financial Controller E. Rwibutso',
        details: 'Equity draw registered on behalf of the Owner.',
        ipAddress: '197.243.12.85'
      }
    ]
  },

  // -- REVENUES FOR JUNE 2026 --
  {
    id: 'tx-rev-101',
    date: '2026-06-05',
    type: 'REVENUE',
    category: 'Room Revenue',
    department: 'Rooms',
    description: 'Weekly rooms occupancy invoice audits - Cash & Card settlement',
    amount: 18500000,
    paymentMethod: 'Bank',
    referenceNumber: 'REV-ROOM-001',
    approvedBy: 'Manager J. Kabera',
    status: 'Completed',
    createdBy: 'Manager J. Kabera',
    createdAt: '2026-06-05T18:00:00Z',
    ipAddress: '197.243.15.11',
    history: [
      {
        timestamp: '2026-06-05T18:00:00Z',
        action: 'CREATED',
        user: 'Manager J. Kabera',
        details: 'Weekly rooms audit compiled.',
        ipAddress: '197.243.15.11'
      }
    ]
  },
  {
    id: 'tx-rev-102',
    date: '2026-06-12',
    type: 'REVENUE',
    category: 'Room Revenue',
    department: 'Rooms',
    description: 'Weekly rooms occupancy receipts audit',
    amount: 16200000,
    paymentMethod: 'Bank',
    referenceNumber: 'REV-ROOM-002',
    approvedBy: 'Manager J. Kabera',
    status: 'Completed',
    createdBy: 'Manager J. Kabera',
    createdAt: '2026-06-12T18:00:00Z',
    ipAddress: '197.243.15.11',
    history: [
      {
        timestamp: '2026-06-12T18:00:00Z',
        action: 'CREATED',
        user: 'Manager J. Kabera',
        details: 'Weekly rooms audit compiled.',
        ipAddress: '197.243.15.11'
      }
    ]
  },
  {
    id: 'tx-rev-103',
    date: '2026-06-19',
    type: 'REVENUE',
    category: 'Room Revenue',
    department: 'Rooms',
    description: 'Weekly rooms occupancy receipts audit',
    amount: 14800000,
    paymentMethod: 'Bank',
    referenceNumber: 'REV-ROOM-003',
    approvedBy: 'Manager J. Kabera',
    status: 'Completed',
    createdBy: 'Manager J. Kabera',
    createdAt: '2026-06-19T18:00:00Z',
    ipAddress: '197.243.15.11',
    history: [
      {
        timestamp: '2026-06-19T18:00:00Z',
        action: 'CREATED',
        user: 'Manager J. Kabera',
        details: 'Weekly rooms audit compiled.',
        ipAddress: '197.243.15.11'
      }
    ]
  },
  {
    id: 'tx-rev-104',
    date: '2026-06-26',
    type: 'REVENUE',
    category: 'Room Revenue',
    department: 'Rooms',
    description: 'Weekly rooms occupancy receipts audit',
    amount: 17500000,
    paymentMethod: 'Bank',
    referenceNumber: 'REV-ROOM-004',
    approvedBy: 'Manager J. Kabera',
    status: 'Completed',
    createdBy: 'Manager J. Kabera',
    createdAt: '2026-06-26T18:00:00Z',
    ipAddress: '197.243.15.11',
    history: [
      {
        timestamp: '2026-06-26T18:00:00Z',
        action: 'CREATED',
        user: 'Manager J. Kabera',
        details: 'Weekly rooms audit compiled.',
        ipAddress: '197.243.15.11'
      }
    ]
  },
  
  // Restaurant Revenues
  {
    id: 'tx-rev-105',
    date: '2026-06-10',
    type: 'REVENUE',
    category: 'Restaurant Revenue',
    department: 'F&B',
    description: 'Mid-month corporate lunch buffet banqueting contract',
    amount: 5400000,
    paymentMethod: 'Accounts Receivable',
    referenceNumber: 'REV-REST-001',
    approvedBy: 'Chef G. Mugisha',
    status: 'Completed',
    createdBy: 'Manager J. Kabera',
    createdAt: '2026-06-10T20:30:00Z',
    ipAddress: '197.243.15.11',
    history: [
      {
        timestamp: '2026-06-10T20:30:00Z',
        action: 'CREATED',
        user: 'Manager J. Kabera',
        details: 'Banqueting revenue ledgered.',
        ipAddress: '197.243.15.11'
      }
    ]
  },
  {
    id: 'tx-rev-106',
    date: '2026-06-20',
    type: 'REVENUE',
    category: 'Restaurant Revenue',
    department: 'F&B',
    description: 'General Restaurant daily POS settlement audit',
    amount: 4800000,
    paymentMethod: 'Cash',
    referenceNumber: 'REV-REST-002',
    approvedBy: 'Manager J. Kabera',
    status: 'Completed',
    createdBy: 'Assistant Front Desk D. Keza',
    createdAt: '2026-06-20T22:00:00Z',
    ipAddress: '197.243.15.15',
    history: [
      {
        timestamp: '2026-06-20T22:00:00Z',
        action: 'CREATED',
        user: 'Assistant Front Desk D. Keza',
        details: 'POS daily audit compiled.',
        ipAddress: '197.243.15.15'
      }
    ]
  },

  // Bar Revenue
  {
    id: 'tx-rev-107',
    date: '2026-06-22',
    type: 'REVENUE',
    category: 'Bar Revenue',
    department: 'F&B',
    description: 'Beverage & Pool Lounge sales audits',
    amount: 3200000,
    paymentMethod: 'Cash',
    referenceNumber: 'REV-BAR-001',
    approvedBy: 'Manager J. Kabera',
    status: 'Completed',
    createdBy: 'Assistant Front Desk D. Keza',
    createdAt: '2026-06-22T23:30:00Z',
    ipAddress: '197.243.15.15',
    history: [
      {
        timestamp: '2026-06-22T23:30:00Z',
        action: 'CREATED',
        user: 'Assistant Front Desk D. Keza',
        details: 'Bar POS consolidated.',
        ipAddress: '197.243.15.15'
      }
    ]
  },

  // Conference Hall Revenue
  {
    id: 'tx-rev-108',
    date: '2026-06-15',
    type: 'REVENUE',
    category: 'Conference Hall Revenue',
    department: 'F&B',
    description: 'Conference room hire & AV setup - Telecom Company Event',
    amount: 4500000,
    paymentMethod: 'Bank',
    referenceNumber: 'REV-CONF-001',
    approvedBy: 'Manager J. Kabera',
    status: 'Completed',
    createdBy: 'Manager J. Kabera',
    createdAt: '2026-06-15T11:00:00Z',
    ipAddress: '197.243.15.11',
    history: [
      {
        timestamp: '2026-06-15T11:00:00Z',
        action: 'CREATED',
        user: 'Manager J. Kabera',
        details: 'Conference contract deposit logged.',
        ipAddress: '197.243.15.11'
      }
    ]
  },
  
  // Tour Services Revenue
  {
    id: 'tx-rev-109',
    date: '2026-06-18',
    type: 'REVENUE',
    category: 'Tour Services Revenue',
    department: 'Other',
    description: 'Volcanoes National Park Gorilla Trekking coordination agency commission',
    amount: 1200000,
    paymentMethod: 'Bank',
    referenceNumber: 'REV-TOUR-001',
    approvedBy: 'Manager J. Kabera',
    status: 'Completed',
    createdBy: 'Manager J. Kabera',
    createdAt: '2026-06-18T14:10:00Z',
    ipAddress: '197.243.15.11',
    history: [
      {
        timestamp: '2026-06-18T14:10:00Z',
        action: 'CREATED',
        user: 'Manager J. Kabera',
        details: 'Agency commission payment cleared.',
        ipAddress: '197.243.15.11'
      }
    ]
  },

  // -- OPERATING EXPENSES FOR JUNE 2026 --
  {
    id: 'tx-exp-201',
    date: '2026-06-25',
    type: 'EXPENSE',
    category: 'Salary',
    department: 'Admin',
    description: 'Corporate payroll disbursement for all hotel departments',
    amount: 14200000, // 14.2M RWF
    paymentMethod: 'Bank',
    referenceNumber: 'PAYROLL-2026-06',
    approvedBy: 'CEO K. Brown',
    status: 'Completed',
    createdBy: 'Financial Controller E. Rwibutso',
    createdAt: '2026-06-25T15:00:00Z',
    ipAddress: '197.243.12.85',
    history: [
      {
        timestamp: '2026-06-25T15:00:00Z',
        action: 'CREATED',
        user: 'Financial Controller E. Rwibutso',
        details: 'Payroll register uploaded & confirmed.',
        ipAddress: '197.243.12.85'
      }
    ]
  },
  {
    id: 'tx-exp-202',
    date: '2026-06-02',
    type: 'EXPENSE',
    category: 'Food Purchases',
    department: 'F&B',
    description: 'Angus Beef batch replenishment from Kigali Prime Meats',
    amount: 600000, // 40kg * 15,000
    paymentMethod: 'Accounts Payable',
    referenceNumber: 'INV-SUP-101',
    approvedBy: 'Chef G. Mugisha',
    status: 'Completed',
    createdBy: 'Chef G. Mugisha',
    createdAt: '2026-06-02T10:00:00Z',
    ipAddress: '197.243.15.14',
    history: [
      {
        timestamp: '2026-06-02T10:00:00Z',
        action: 'CREATED',
        user: 'Chef G. Mugisha',
        details: 'Purchased beef raw materials.',
        ipAddress: '197.243.15.14'
      }
    ]
  },
  {
    id: 'tx-exp-203',
    date: '2026-06-18',
    type: 'EXPENSE',
    category: 'Beverage Purchases',
    department: 'F&B',
    description: 'Heineken cases stock purchase from Bralirwa Distributor',
    amount: 375000, // 300 bottles * 1,250
    paymentMethod: 'Accounts Payable',
    referenceNumber: 'INV-SUP-139',
    approvedBy: 'Manager J. Kabera',
    status: 'Completed',
    createdBy: 'Manager J. Kabera',
    createdAt: '2026-06-18T11:00:00Z',
    ipAddress: '197.243.15.11',
    history: [
      {
        timestamp: '2026-06-18T11:00:00Z',
        action: 'CREATED',
        user: 'Manager J. Kabera',
        details: 'Beverage inventory order logged.',
        ipAddress: '197.243.15.11'
      }
    ]
  },
  {
    id: 'tx-exp-204',
    date: '2026-06-15',
    type: 'EXPENSE',
    category: 'Electricity',
    department: 'Maintenance',
    description: 'REG power grid monthly smart meter pre-payment utility',
    amount: 2800000,
    paymentMethod: 'Bank',
    referenceNumber: 'UTIL-REG-0994',
    approvedBy: 'Manager J. Kabera',
    status: 'Completed',
    createdBy: 'Manager J. Kabera',
    createdAt: '2026-06-15T09:30:00Z',
    ipAddress: '197.243.15.11',
    history: [
      {
        timestamp: '2026-06-15T09:30:00Z',
        action: 'CREATED',
        user: 'Manager J. Kabera',
        details: 'Utility cash token generated.',
        ipAddress: '197.243.15.11'
      }
    ]
  },
  {
    id: 'tx-exp-205',
    date: '2026-06-16',
    type: 'EXPENSE',
    category: 'Water',
    department: 'Maintenance',
    description: 'WASAC utility bill - laundry & kitchen mains water grid',
    amount: 950000,
    paymentMethod: 'Bank',
    referenceNumber: 'UTIL-WAS-0822',
    approvedBy: 'Manager J. Kabera',
    status: 'Completed',
    createdBy: 'Manager J. Kabera',
    createdAt: '2026-06-16T15:20:00Z',
    ipAddress: '197.243.15.11',
    history: [
      {
        timestamp: '2026-06-16T15:20:00Z',
        action: 'CREATED',
        user: 'Manager J. Kabera',
        details: 'WASAC bank payment logged.',
        ipAddress: '197.243.15.11'
      }
    ]
  },
  {
    id: 'tx-exp-206',
    date: '2026-06-10',
    type: 'EXPENSE',
    category: 'Marketing',
    department: 'Marketing',
    description: 'Social media advertisements & local billboards design campaign',
    amount: 1500000,
    paymentMethod: 'Bank',
    referenceNumber: 'ADV-MARK-923',
    approvedBy: 'Manager J. Kabera',
    status: 'Completed',
    createdBy: 'Manager J. Kabera',
    createdAt: '2026-06-10T16:15:00Z',
    ipAddress: '197.243.15.11',
    history: [
      {
        timestamp: '2026-06-10T16:15:00Z',
        action: 'CREATED',
        user: 'Manager J. Kabera',
        details: 'Marketing campaign funds cleared.',
        ipAddress: '197.243.15.11'
      }
    ]
  },
  {
    id: 'tx-exp-207',
    date: '2026-06-08',
    type: 'EXPENSE',
    category: 'Fuel',
    department: 'Maintenance',
    description: 'Back-up electricity generator diesel stock purchase',
    amount: 1200000,
    paymentMethod: 'Cash',
    referenceNumber: 'FUEL-SP-3829',
    approvedBy: 'Manager J. Kabera',
    status: 'Completed',
    createdBy: 'Manager J. Kabera',
    createdAt: '2026-06-08T11:45:00Z',
    ipAddress: '197.243.15.11',
    history: [
      {
        timestamp: '2026-06-08T11:45:00Z',
        action: 'CREATED',
        user: 'Manager J. Kabera',
        details: 'Diesel stock filled from SP station.',
        ipAddress: '197.243.15.11'
      }
    ]
  },
  
  // TAXES - Accrued / Paid (Double Entry standard)
  {
    id: 'tx-tax-208',
    date: '2026-06-30',
    type: 'EXPENSE',
    category: 'Taxes',
    department: 'Admin',
    description: 'Monthly estimated Rwanda Revenue Authority (RRA) corporate tax withholding',
    amount: 3500000,
    paymentMethod: 'Bank',
    referenceNumber: 'TAX-RRA-2026-06',
    approvedBy: 'CEO K. Brown',
    status: 'Completed',
    createdBy: 'Financial Controller E. Rwibutso',
    createdAt: '2026-06-30T17:30:00Z',
    ipAddress: '197.243.12.85',
    history: [
      {
        timestamp: '2026-06-30T17:30:00Z',
        action: 'CREATED',
        user: 'Financial Controller E. Rwibutso',
        details: 'RRA tax installment transfer.',
        ipAddress: '197.243.12.85'
      }
    ]
  },

  // -- EARLY JULY 2026 REVENUE & EXPENSES (TO COMPUTE DAILY/WEEKLY IN CURRENT MONTH) --
  {
    id: 'tx-rev-301',
    date: '2026-07-05',
    type: 'REVENUE',
    category: 'Room Revenue',
    department: 'Rooms',
    description: 'Early July weekend rooms settlement consolidated audits',
    amount: 14200000,
    paymentMethod: 'Bank',
    referenceNumber: 'REV-ROOM-005',
    approvedBy: 'Manager J. Kabera',
    status: 'Completed',
    createdBy: 'Manager J. Kabera',
    createdAt: '2026-07-05T18:00:00Z',
    ipAddress: '197.243.15.11',
    history: [
      {
        timestamp: '2026-07-05T18:00:00Z',
        action: 'CREATED',
        user: 'Manager J. Kabera',
        details: 'July week 1 room audit complete.',
        ipAddress: '197.243.15.11'
      }
    ]
  },
  {
    id: 'tx-rev-302',
    date: '2026-07-12',
    type: 'REVENUE',
    category: 'Room Revenue',
    department: 'Rooms',
    description: 'July week 2 rooms audit',
    amount: 15100000,
    paymentMethod: 'Bank',
    referenceNumber: 'REV-ROOM-006',
    approvedBy: 'Manager J. Kabera',
    status: 'Completed',
    createdBy: 'Manager J. Kabera',
    createdAt: '2026-07-12T18:00:00Z',
    ipAddress: '197.243.15.11',
    history: [
      {
        timestamp: '2026-07-12T18:00:00Z',
        action: 'CREATED',
        user: 'Manager J. Kabera',
        details: 'July week 2 room audit complete.',
        ipAddress: '197.243.15.11'
      }
    ]
  },
  {
    id: 'tx-rev-303',
    date: '2026-07-14', // Today is July 14, 2026
    type: 'REVENUE',
    category: 'Restaurant Revenue',
    department: 'F&B',
    description: 'Today F&B dining hall POS breakfast & lunch cash settlement',
    amount: 1450000,
    paymentMethod: 'Cash',
    referenceNumber: 'REV-POS-260714',
    approvedBy: 'Chef G. Mugisha',
    status: 'Completed',
    createdBy: 'Chef G. Mugisha',
    createdAt: '2026-07-14T14:30:00Z',
    ipAddress: '197.243.15.14',
    history: [
      {
        timestamp: '2026-07-14T14:30:00Z',
        action: 'CREATED',
        user: 'Chef G. Mugisha',
        details: 'Logged today breakfast sales.',
        ipAddress: '197.243.15.14'
      }
    ]
  },
  {
    id: 'tx-rev-304',
    date: '2026-07-14', // Today is July 14, 2026
    type: 'REVENUE',
    category: 'Bar Revenue',
    department: 'F&B',
    description: 'Today happy-hour beverage ledger audit',
    amount: 650000,
    paymentMethod: 'Cash',
    referenceNumber: 'REV-POS-BAR14',
    approvedBy: 'Manager J. Kabera',
    status: 'Completed',
    createdBy: 'Assistant Front Desk D. Keza',
    createdAt: '2026-07-14T16:00:00Z',
    ipAddress: '197.243.15.15',
    history: [
      {
        timestamp: '2026-07-14T16:00:00Z',
        action: 'CREATED',
        user: 'Assistant Front Desk D. Keza',
        details: 'Happy hour bar consolidated.',
        ipAddress: '197.243.15.15'
      }
    ]
  },
  {
    id: 'tx-exp-305',
    date: '2026-07-04',
    type: 'EXPENSE',
    category: 'Internet',
    department: 'Admin',
    description: 'MTN Liquid Telecom dedicated fiber internet line prepayment',
    amount: 850000,
    paymentMethod: 'Bank',
    referenceNumber: 'MTN-FIB-78229',
    approvedBy: 'Manager J. Kabera',
    status: 'Completed',
    createdBy: 'Manager J. Kabera',
    createdAt: '2026-07-04T10:00:00Z',
    ipAddress: '197.243.15.11',
    history: [
      {
        timestamp: '2026-07-04T10:00:00Z',
        action: 'CREATED',
        user: 'Manager J. Kabera',
        details: 'Internet subscription renewed.',
        ipAddress: '197.243.15.11'
      }
    ]
  },
  {
    id: 'tx-exp-306',
    date: '2026-07-13',
    type: 'EXPENSE',
    category: 'Maintenance',
    department: 'Maintenance',
    description: 'Elevator system quick hydraulic fluid repair servicing',
    amount: 450000,
    paymentMethod: 'Cash',
    referenceNumber: 'ELEV-SERV-441',
    approvedBy: 'Manager J. Kabera',
    status: 'Completed',
    createdBy: 'Manager J. Kabera',
    createdAt: '2026-07-13T13:40:00Z',
    ipAddress: '197.243.15.11',
    history: [
      {
        timestamp: '2026-07-13T13:40:00Z',
        action: 'CREATED',
        user: 'Manager J. Kabera',
        details: 'Logged cash repair item.',
        ipAddress: '197.243.15.11'
      }
    ]
  },

  // -- SIMULATED "EDITED" & "DELETED" TRANSACTIONS (CRITICAL FOR AUDIT TRIAL LOGS!) --
  // Let's keep a couple of edited / soft-deleted records for verification
  {
    id: 'tx-audit-del-1',
    date: '2026-06-14',
    type: 'REVENUE',
    category: 'Swimming Pool Revenue',
    department: 'Other',
    description: 'Pool VIP day event entry fee (Simulated deleted invoice)',
    amount: 1500000, // 1.5M RWF
    paymentMethod: 'Cash',
    referenceNumber: 'INV-POOL-9922',
    approvedBy: 'Manager J. Kabera',
    status: 'Draft',
    createdBy: 'Manager J. Kabera',
    createdAt: '2026-06-14T10:00:00Z',
    isDeleted: true, // Soft-deleted!
    deletedBy: 'Manager J. Kabera',
    deletedAt: '2026-06-14T15:30:00Z',
    deleteReason: 'Draft invoice cancelled - customer requested conference hall package swap instead.',
    ipAddress: '197.243.15.11',
    history: [
      {
        timestamp: '2026-06-14T10:00:00Z',
        action: 'CREATED',
        user: 'Manager J. Kabera',
        details: 'Created pool reservation draft entry.',
        ipAddress: '197.243.15.11'
      },
      {
        timestamp: '2026-06-14T15:30:00Z',
        action: 'MARKED_DELETED',
        user: 'Manager J. Kabera',
        details: 'Soft deleted: Draft invoice cancelled - customer requested conference hall package swap instead.',
        ipAddress: '197.243.15.11'
      }
    ]
  },
  {
    id: 'tx-audit-edit-1',
    date: '2026-06-08',
    type: 'EXPENSE',
    category: 'Fuel',
    department: 'Maintenance',
    description: 'Generators backup diesel oil purchase (Simulated edited transaction)',
    amount: 1200000, // Originally entered as 800,000 by Manager, corrected to 1,200,000 to match pump receipt
    paymentMethod: 'Cash',
    referenceNumber: 'FUEL-SP-3829',
    approvedBy: 'Manager J. Kabera',
    status: 'Completed',
    createdBy: 'Manager J. Kabera',
    createdAt: '2026-06-08T11:45:00Z',
    updatedBy: 'Financial Controller E. Rwibutso',
    updatedAt: '2026-06-28T10:30:00Z',
    editReason: 'Corrected diesel fuel purchase amount from 800,000 RWF to 1,200,000 RWF to align with audited SP station printed receipt.',
    ipAddress: '197.243.12.85',
    history: [
      {
        timestamp: '2026-06-08T11:45:00Z',
        action: 'CREATED',
        user: 'Manager J. Kabera',
        details: 'Created fuel purchase log for 800,000 RWF.',
        ipAddress: '197.243.15.11'
      },
      {
        timestamp: '2026-06-28T10:30:00Z',
        action: 'EDITED',
        user: 'Financial Controller E. Rwibutso',
        details: 'Corrected diesel fuel purchase amount from 800,000 RWF to 1,200,000 RWF to align with audited SP station printed receipt.',
        ipAddress: '197.243.12.85'
      }
    ]
  }
];

// Budget definitions by category (for budget overrun alerts)
export const MONTHLY_BUDGET_LIMITS: Record<string, number> = {
  'Food Purchases': 3000000,
  'Beverage Purchases': 2000000,
  'Kitchen Supplies': 1000000,
  'Cleaning Supplies': 800000,
  'Electricity': 2500000, // Trigger overrun alert in June since amount is 2,800,000 RWF
  'Water': 1000000,
  'Internet': 1000000,
  'Fuel': 1000000, // Trigger overrun alert in June since Corrected amount is 1,200,000 RWF
  'Maintenance': 2000000,
  'Salary': 15000000,
  'Taxes': 5000000,
  'Marketing': 2000000,
  'Transport': 1000000,
  'Security': 1200000,
  'Office Expenses': 500000,
  'Bank Charges': 200000,
  'Miscellaneous': 500000
};

// Simulated Manager Monthly Report for June 2026 (The CEO compares this against the system-generated figures!)
export const PRELOADED_MANAGER_REPORT_JUNE_2026: ManagerReportSubmission = {
  month: '2026-06',
  managerName: 'Manager J. Kabera',
  submittedAt: '2026-07-02T10:00:00Z',
  
  // Reported Figures - intentionally altered to simulate an inaccurate report for CEO review
  roomRevenue: 64500000, // System ledger: 18.5M + 16.2M + 14.8M + 17.5M = 67,000,000 RWF (Variance of -2.5M RWF!)
  fbRevenue: 12500000, // System ledger: 5.4M + 4.8M (Rest) + 3.2M (Bar) + 4.5M (Conf) = 17,900,000 RWF (Variance of -5.4M RWF!)
  otherRevenue: 2700000, // System ledger: 1.2M (Tours) = 1,200,000 RWF (Variance of +1.5M RWF - manager included the deleted pool transaction!)
  totalRevenue: 79700000, // Manager reported total: 79.7M. Ledger calculated total is 86.1M RWF (Total discrepancy!)
  
  operatingExpenses: 20250000, // System: Salary 14.2M + Elec 2.8M + Water 950K + Mark 1.5M + Fuel 1.2M = 20,650,000 RWF
  cogs: 800000, // Manager reported lower COGS, missing inventory usage calculations
  netProfit: 55150000, // System calculated NP will differ based on real COGS, other incomes, and taxes.
  
  cashBalance: 12400000, // Manager cash box has a physical cash variance!
  bankBalance: 135000000,
  inventoryValue: 5000000, // Incorrectly estimated inventory without using FIFO costing!
  
  notes: 'June was an excellent month. All room revenues and cash accounts reconcile perfectly with physical drawers. Minimal food spoilage. Clean bills received.'
};

// Initial preloaded alerts for the CEO Dashboard
export const INITIAL_ALERTS: AuditAlert[] = [
  {
    id: 'alt-001',
    timestamp: '2026-06-15T10:00:00Z',
    severity: 'CRITICAL',
    type: 'BUDGET_EXCEEDED',
    title: 'Electricity Budget Overrun',
    description: 'Electricity expenses of 2,800,000 RWF exceeded the monthly budget limit of 2,500,000 RWF in June 2026.',
    resolved: false
  },
  {
    id: 'alt-002',
    timestamp: '2026-06-28T10:35:00Z',
    severity: 'WARNING',
    type: 'EDITED_TRANSACTION',
    title: 'Fuel Invoice Amount Edited',
    description: 'Transaction tx-audit-edit-1 was updated from 800,000 RWF to 1,200,000 RWF by Financial Controller E. Rwibutso. Reason: Match printed receipts.',
    resolved: true,
    resolvedBy: 'CEO K. Brown',
    resolvedAt: '2026-06-28T14:00:00Z'
  },
  {
    id: 'alt-003',
    timestamp: '2026-06-14T15:35:00Z',
    severity: 'CRITICAL',
    type: 'DELETED_TRANSACTION',
    title: 'Invoice Voided / Deleted',
    description: 'Draft Swimming Pool Revenue invoice (tx-audit-del-1) of 1,500,000 RWF was voided by Manager J. Kabera.',
    resolved: false
  },
  {
    id: 'alt-004',
    timestamp: '2026-06-25T14:45:00Z',
    severity: 'INFO',
    type: 'UNAPPROVED_PURCHASE',
    title: 'Large Cash Injection Processed',
    description: 'An owner cash injection of 2,000,000 RWF was deposited to purchase kitchen equipment without affecting net profit.',
    resolved: true,
    resolvedBy: 'CEO K. Brown',
    resolvedAt: '2026-06-25T18:00:00Z'
  }
];

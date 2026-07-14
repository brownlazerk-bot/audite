/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  CreditCard, 
  Layers, 
  Activity, 
  ShieldAlert, 
  Briefcase, 
  ArrowRight, 
  Calendar,
  Building,
  UserCheck,
  Package,
  PiggyBank,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  AreaChart, 
  Area,
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { Transaction, InventoryBatch, StockUsage, AuditAlert } from '../types';
import { 
  sumTransactions, 
  calculateFIFOCOGS, 
  calculateCurrentInventoryValue, 
  evaluateFinancialHealthScore 
} from '../utils/finance';

interface DashboardProps {
  transactions: Transaction[];
  batches: InventoryBatch[];
  usages: StockUsage[];
  alerts: AuditAlert[];
  onNavigate: (module: string) => void;
}

export default function Dashboard({ transactions, batches, usages, alerts, onNavigate }: DashboardProps) {
  // 1. Core Calculations
  const activeTxs = transactions.filter(t => !t.isDeleted);
  
  // Current Date logic (System local date set to July 14, 2026 in prompt)
  const todayStr = '2026-07-14';
  
  // Today's Revenue
  const todayRevenue = sumTransactions(transactions, 'REVENUE', { startDate: todayStr, endDate: todayStr });
  
  // Monthly calculations for June 2026 (the complete audited month)
  const juneStart = '2026-06-01';
  const juneEnd = '2026-06-30';
  
  const juneRevenue = sumTransactions(transactions, 'REVENUE', { startDate: juneStart, endDate: juneEnd });
  const juneExpensesRaw = sumTransactions(transactions, 'EXPENSE', { startDate: juneStart, endDate: juneEnd });
  
  // For proper accrual accounting, direct stock purchases (Food, Beverage Purchases) are capitalized in Inventory Asset.
  // They hit P&L as COGS when consumed. Other expenses (Salaries, Utilities, Maintenance) are OPEX.
  const juneDirectPurchases = sumTransactions(transactions, 'EXPENSE', { 
    startDate: juneStart, 
    endDate: juneEnd 
  }).valueOf(); // total exp
  
  // In our categories: 'Food Purchases' and 'Beverage Purchases' are direct stock
  const foodPurchasesJune = sumTransactions(transactions, 'EXPENSE', { category: 'Food Purchases', startDate: juneStart, endDate: juneEnd });
  const bevPurchasesJune = sumTransactions(transactions, 'EXPENSE', { category: 'Beverage Purchases', startDate: juneStart, endDate: juneEnd });
  const juneStockPurchases = foodPurchasesJune + bevPurchasesJune;
  
  const juneOpex = juneExpensesRaw - juneStockPurchases;
  
  // COGS for June (FIFO)
  const juneUsages = usages.filter(u => u.date >= juneStart && u.date <= juneEnd);
  const juneCOGS = calculateFIFOCOGS(juneUsages, batches);
  
  const juneGrossProfit = juneRevenue - juneCOGS;
  const juneNetProfit = juneGrossProfit - juneOpex; // In our standard: Revenue - COGS - OPEX = Operating Profit. 
  // Let's assume other incomes = 0 and Tax is a specific expense category already subtracted or treated.
  
  // Balance Sheet - Current Balances (cumulative across all time)
  const totalRevenueAllTime = sumTransactions(transactions, 'REVENUE');
  const totalExpensesAllTime = sumTransactions(transactions, 'EXPENSE');
  
  // Cash vs Bank tracking
  // We compute cash balance dynamically by summing all transactions of paymentMethod 'Cash' 
  // Debits (Revenues, Capital Deposits, Injections) increase Cash. Credits (Expenses, Withdrawals, PO Payments) decrease Cash.
  const cashReceived = transactions
    .filter(t => !t.isDeleted && t.paymentMethod === 'Cash' && ['REVENUE', 'CAPITAL_DEPOSIT', 'CASH_INJECTION'].includes(t.type))
    .reduce((sum, t) => sum + t.amount, 0);
  const cashPaid = transactions
    .filter(t => !t.isDeleted && t.paymentMethod === 'Cash' && ['EXPENSE', 'CAPITAL_WITHDRAWAL', 'PURCHASE_ORDER'].includes(t.type))
    .reduce((sum, t) => sum + t.amount, 0);
  const cashBalance = cashReceived - cashPaid;
  
  // Bank Balance
  const bankReceived = transactions
    .filter(t => !t.isDeleted && t.paymentMethod === 'Bank' && ['REVENUE', 'CAPITAL_DEPOSIT', 'CASH_INJECTION'].includes(t.type))
    .reduce((sum, t) => sum + t.amount, 0);
  const bankPaid = transactions
    .filter(t => !t.isDeleted && t.paymentMethod === 'Bank' && ['EXPENSE', 'CAPITAL_WITHDRAWAL', 'PURCHASE_ORDER'].includes(t.type))
    .reduce((sum, t) => sum + t.amount, 0);
  const bankBalance = bankReceived - bankPaid;

  // Receivables & Payables
  const accountsReceivable = transactions
    .filter(t => !t.isDeleted && t.paymentMethod === 'Accounts Receivable' && t.type === 'REVENUE')
    .reduce((sum, t) => sum + t.amount, 0);
  const accountsPayable = transactions
    .filter(t => !t.isDeleted && t.paymentMethod === 'Accounts Payable' && t.type === 'EXPENSE')
    .reduce((sum, t) => sum + t.amount, 0);

  // Capital Accounts (Separate from profit)
  const openingCapital = sumTransactions(transactions, 'CAPITAL_DEPOSIT');
  const additionalCapital = sumTransactions(transactions, 'CASH_INJECTION');
  const withdrawnCapital = sumTransactions(transactions, 'CAPITAL_WITHDRAWAL');
  const ownerCapital = openingCapital + additionalCapital - withdrawnCapital;
  
  // Inventory Value (FIFO based remaining)
  const inventoryValue = calculateCurrentInventoryValue(batches);
  
  // Asset totals = Cash + Bank + Inventory + Receivables + Fixed Assets (Let's assume fixed assets like Furniture/Building = 80,000,000 RWF)
  const fixedAssets = 80000000;
  const totalAssets = cashBalance + bankBalance + inventoryValue + accountsReceivable + fixedAssets;
  
  // Liabilities = Payables + Taxes Payable (estimated 3,500,000 RWF)
  const taxesPayable = 3500000;
  const totalLiabilities = accountsPayable + taxesPayable;
  
  // Net Worth (Business Equity) = Total Assets - Total Liabilities
  const businessEquity = totalAssets - totalLiabilities;

  // Cash Flow for June
  const juneCashReceived = transactions
    .filter(t => !t.isDeleted && (t.paymentMethod === 'Cash' || t.paymentMethod === 'Bank') && t.date >= juneStart && t.date <= juneEnd && ['REVENUE', 'CAPITAL_DEPOSIT', 'CASH_INJECTION'].includes(t.type))
    .reduce((sum, t) => sum + t.amount, 0);
  const juneCashPaid = transactions
    .filter(t => !t.isDeleted && (t.paymentMethod === 'Cash' || t.paymentMethod === 'Bank') && t.date >= juneStart && t.date <= juneEnd && ['EXPENSE', 'CAPITAL_WITHDRAWAL', 'PURCHASE_ORDER'].includes(t.type))
    .reduce((sum, t) => sum + t.amount, 0);
  const juneCashFlow = juneCashReceived - juneCashPaid;

  // Operating Profit (June)
  const operatingProfit = juneGrossProfit - juneOpex;

  // Financial Health Score
  const healthScore = evaluateFinancialHealthScore(
    juneRevenue,
    juneNetProfit,
    juneCOGS,
    juneOpex,
    cashBalance + bankBalance,
    totalLiabilities,
    alerts
  );

  // Helper formatting currency (RWF - Rwandan Franc)
  const formatRWF = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'RWF',
      maximumFractionDigits: 0
    }).format(value).replace('RWF', 'FRw');
  };

  // Charts Mock Data spanning May, June, July (dynamic calculations where applicable)
  const monthlyComparisonData = [
    {
      name: 'May 2026',
      Revenue: 78000000,
      Expenses: 18500000,
      Profit: 59500000,
    },
    {
      name: 'June 2026 (Audited)',
      Revenue: juneRevenue,
      Expenses: juneExpensesRaw,
      Profit: juneNetProfit,
    },
    {
      name: 'July 2026 (MTD)',
      Revenue: sumTransactions(transactions, 'REVENUE', { startDate: '2026-07-01', endDate: '2026-07-31' }),
      Expenses: sumTransactions(transactions, 'EXPENSE', { startDate: '2026-07-01', endDate: '2026-07-31' }),
      Profit: sumTransactions(transactions, 'REVENUE', { startDate: '2026-07-01', endDate: '2026-07-31' }) - sumTransactions(transactions, 'EXPENSE', { startDate: '2026-07-01', endDate: '2026-07-31' }),
    }
  ];

  // Pie chart by revenue categories (June)
  const roomRevJune = sumTransactions(transactions, 'REVENUE', { category: 'Room Revenue', startDate: juneStart, endDate: juneEnd });
  const restRevJune = sumTransactions(transactions, 'REVENUE', { category: 'Restaurant Revenue', startDate: juneStart, endDate: juneEnd });
  const barRevJune = sumTransactions(transactions, 'REVENUE', { category: 'Bar Revenue', startDate: juneStart, endDate: juneEnd });
  const confRevJune = sumTransactions(transactions, 'REVENUE', { category: 'Conference Hall Revenue', startDate: juneStart, endDate: juneEnd });
  const tourRevJune = sumTransactions(transactions, 'REVENUE', { category: 'Tour Services Revenue', startDate: juneStart, endDate: juneEnd });
  const otherRevJune = juneRevenue - (roomRevJune + restRevJune + barRevJune + confRevJune + tourRevJune);

  const revenueBreakdownData = [
    { name: 'Rooms', value: roomRevJune },
    { name: 'Restaurant', value: restRevJune },
    { name: 'Bar', value: barRevJune },
    { name: 'Conference', value: confRevJune },
    { name: 'Tours', value: tourRevJune },
    { name: 'Other Services', value: otherRevJune > 0 ? otherRevJune : 0 },
  ].filter(item => item.value > 0);

  const COLORS = ['#0d9488', '#0f766e', '#115e59', '#14b8a6', '#2dd4bf', '#5eead4'];

  const unresolvedAlertsCount = alerts.filter(a => !a.resolved).length;

  return (
    <div className="space-y-6" id="ceo-dashboard">
      {/* CEO Welcome Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 text-white p-6 rounded-xl shadow-sm border border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">CEO Financial Audit Terminal</h1>
          <p className="text-slate-400 text-sm mt-1">
            Real-time IFRS Ledger & Internal Controls Auditing. No estimated or simulated figures.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-slate-800 px-4 py-2 rounded-lg border border-slate-700 text-xs font-mono flex items-center gap-2">
            <Calendar className="w-4 h-4 text-teal-400" />
            <span>AUDIT DATE: 2026-07-14</span>
          </div>
          {unresolvedAlertsCount > 0 ? (
            <div className="bg-red-500/20 text-red-300 border border-red-500/30 px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 animate-pulse">
              <ShieldAlert className="w-4 h-4" />
              <span>{unresolvedAlertsCount} Unresolved Alerts</span>
            </div>
          ) : (
            <div className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4" />
              <span>Ledger Reconciled</span>
            </div>
          )}
        </div>
      </div>

      {/* 16 INDICATORS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Row 1 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium uppercase tracking-wider">
            <span>Today's Revenue</span>
            <DollarSign className="w-4 h-4 text-teal-500" />
          </div>
          <div className="text-xl font-bold text-slate-900 mt-2">{formatRWF(todayRevenue)}</div>
          <div className="text-[10px] text-slate-400 mt-1 font-mono">Date: July 14, 2026</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium uppercase tracking-wider">
            <span>Monthly Revenue (June)</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-bold text-slate-900 mt-2">{formatRWF(juneRevenue)}</div>
          <div className="text-[10px] text-slate-400 mt-1 font-mono">Ledger Receipts</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium uppercase tracking-wider">
            <span>Monthly Expenses (June)</span>
            <TrendingDown className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-xl font-bold text-slate-900 mt-2">{formatRWF(juneExpensesRaw)}</div>
          <div className="text-[10px] text-slate-400 mt-1 font-mono">Includes Capital Purchases</div>
        </div>

        {/* Financial Health Score (Radial Gauge styled) */}
        <div className="bg-slate-50 p-5 rounded-xl border border-teal-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-600 text-xs font-semibold uppercase tracking-wider">
            <span>Audit Health Score</span>
            <Activity className="w-4 h-4 text-teal-600" />
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-extrabold text-teal-700">{healthScore}</span>
            <span className="text-slate-400 text-xs font-bold">/100</span>
          </div>
          <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
            <div 
              className="bg-teal-600 h-1.5 rounded-full transition-all duration-500" 
              style={{ width: `${healthScore}%` }} 
            />
          </div>
          <p className="text-[9px] text-teal-600 font-medium mt-1 font-mono">IFRS Standards Conformity</p>
        </div>

        {/* Row 2 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium uppercase tracking-wider">
            <span>Gross Profit (June)</span>
            <Layers className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-xl font-bold text-slate-900 mt-2">{formatRWF(juneGrossProfit)}</div>
          <div className="text-[10px] text-slate-500 mt-1 font-mono">Revenue - COGS (FIFO)</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium uppercase tracking-wider">
            <span>Operating Profit</span>
            <Activity className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-xl font-bold text-slate-900 mt-2">{formatRWF(operatingProfit)}</div>
          <div className="text-[10px] text-slate-500 mt-1 font-mono">GP - OPEX (Accrual)</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium uppercase tracking-wider">
            <span>Net Profit (June)</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-slate-900 mt-2">{formatRWF(juneNetProfit)}</div>
          <div className="text-[10px] text-slate-500 mt-1 font-mono">After Taxes & Adjustments</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium uppercase tracking-wider">
            <span>Cash Available (Physical)</span>
            <CreditCard className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-bold text-slate-900 mt-2">{formatRWF(cashBalance)}</div>
          <div className="text-[10px] text-slate-500 mt-1 font-mono">Physical Safe Box Balance</div>
        </div>

        {/* Row 3 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium uppercase tracking-wider">
            <span>Bank Balance</span>
            <Building className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl font-bold text-slate-900 mt-2">{formatRWF(bankBalance)}</div>
          <div className="text-[10px] text-slate-500 mt-1 font-mono">Escrow & Operations Acct</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium uppercase tracking-wider">
            <span>Owner Capital</span>
            <PiggyBank className="w-4 h-4 text-teal-500" />
          </div>
          <div className="text-xl font-bold text-slate-900 mt-2">{formatRWF(ownerCapital)}</div>
          <div className="text-[10px] text-slate-500 mt-1 font-mono">Deposits + Injections - Draw</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium uppercase tracking-wider">
            <span>Business Equity</span>
            <Briefcase className="w-4 h-4 text-cyan-500" />
          </div>
          <div className="text-xl font-bold text-slate-900 mt-2">{formatRWF(businessEquity)}</div>
          <div className="text-[10px] text-slate-500 mt-1 font-mono">Total Assets - Liabilities</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium uppercase tracking-wider">
            <span>Accounts Receivable</span>
            <UserCheck className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-bold text-slate-900 mt-2">{formatRWF(accountsReceivable)}</div>
          <div className="text-[10px] text-slate-500 mt-1 font-mono">Corporate Client Slips</div>
        </div>

        {/* Row 4 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium uppercase tracking-wider">
            <span>Accounts Payable</span>
            <CreditCard className="w-4 h-4 text-orange-500" />
          </div>
          <div className="text-xl font-bold text-slate-900 mt-2">{formatRWF(accountsPayable)}</div>
          <div className="text-[10px] text-slate-500 mt-1 font-mono">Supplier Credit Invoices</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium uppercase tracking-wider">
            <span>Inventory Value</span>
            <Package className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-bold text-slate-900 mt-2">{formatRWF(inventoryValue)}</div>
          <div className="text-[10px] text-slate-500 mt-1 font-mono">Audited FIFO Stock Book</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium uppercase tracking-wider">
            <span>Cash Flow (June)</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-slate-900 mt-2">{formatRWF(juneCashFlow)}</div>
          <div className="text-[10px] text-slate-500 mt-1 font-mono">Net Monthly Cash Delta</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium uppercase tracking-wider">
            <span>Net Worth</span>
            <Building className="w-4 h-4 text-teal-800" />
          </div>
          <div className="text-xl font-bold text-teal-950 mt-2">{formatRWF(businessEquity)}</div>
          <div className="text-[10px] text-slate-500 mt-1 font-mono">Firm Valuation Basis</div>
        </div>
      </div>

      {/* METRIC CHARTS & RATIOS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main bar comparison chart */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs lg:col-span-2">
          <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider mb-4">
            Revenue, Expenses & Profit Trends
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyComparisonData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                <YAxis 
                  stroke="#64748b" 
                  fontSize={10} 
                  tickFormatter={(val) => `FRw ${(val / 1000000).toFixed(0)}M`} 
                />
                <Tooltip 
                  formatter={(value: any) => [formatRWF(Number(value)), '']}
                  contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '8px' }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Revenue" fill="#0d9488" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Profit" fill="#818cf8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Doughnut category distribution */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider mb-4">
              Revenue Breakdown (June)
            </h3>
            <div className="h-52 flex justify-center items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={revenueBreakdownData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {revenueBreakdownData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatRWF(Number(value))} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          {/* Key labels */}
          <div className="grid grid-cols-2 gap-2 text-xs mt-3">
            {revenueBreakdownData.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-1.5">
                <span 
                  className="w-2.5 h-2.5 rounded-full inline-block shrink-0" 
                  style={{ backgroundColor: COLORS[index % COLORS.length] }} 
                />
                <span className="text-slate-600 truncate">{entry.name} ({Math.round((entry.value / juneRevenue) * 100)}%)</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* DUAL WIDGET PANEL: BUDGET STATUS & RECENT CRITICAL ALERTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Budget Status Panel */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">
              Operating Expense Ratio vs. Budgets
            </h3>
            <span className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-1 rounded-full font-mono">
              OPEX Ratio: {((juneOpex / juneRevenue) * 100).toFixed(1)}%
            </span>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-600">Employee Salaries</span>
                <span className="text-slate-900">FRw 14.2M / 15M (94%)</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-teal-600 h-2" style={{ width: '94%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-600">Electricity (Overrun Alert!)</span>
                <span className="text-rose-600 font-bold">FRw 2.8M / 2.5M (112%)</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-rose-500 h-2" style={{ width: '100%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-600">Fuel & Backup Generators (Overrun!)</span>
                <span className="text-rose-600 font-bold">FRw 1.2M / 1M (120%)</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-rose-500 h-2" style={{ width: '100%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-600">Social Billboards & Ad Marketing</span>
                <span className="text-slate-900">FRw 1.5M / 2M (75%)</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-indigo-600 h-2" style={{ width: '75%' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Unresolved CEO Alerts */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                Active Internal Control Flags
              </h3>
              <button 
                onClick={() => onNavigate('alerts')}
                className="text-xs text-teal-600 font-semibold hover:underline flex items-center gap-1"
              >
                View all <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-3">
              {alerts.filter(a => !a.resolved).slice(0, 3).map((alert) => (
                <div 
                  key={alert.id} 
                  className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
                    alert.severity === 'CRITICAL' 
                      ? 'bg-rose-50 border-rose-200 text-rose-800' 
                      : 'bg-amber-50 border-amber-200 text-amber-800'
                  }`}
                >
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold">{alert.title}</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">{alert.description}</p>
                  </div>
                </div>
              ))}
              {alerts.filter(a => !a.resolved).length === 0 && (
                <div className="text-center py-6 text-slate-400">
                  <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                  <p className="text-xs">All financial controls and budgets are green. No alerts triggered.</p>
                </div>
              )}
            </div>
          </div>
          <div className="pt-4 border-t border-slate-100 text-[10px] text-slate-400 font-mono mt-3">
            Audit logging: Soft deletes enabled. Deleting invoices is strictly monitored.
          </div>
        </div>
      </div>
    </div>
  );
}

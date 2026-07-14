/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Filter, 
  CheckCircle, 
  AlertCircle, 
  ShieldAlert,
  FileSpreadsheet,
  Coins,
  TrendingDown,
  ChevronRight
} from 'lucide-react';
import { Transaction, Department, PaymentMethod } from '../types';
import { EXPENSE_CATEGORIES, MONTHLY_BUDGET_LIMITS } from '../data/initialData';
import { sumTransactions } from '../utils/finance';

interface ExpenseModuleProps {
  transactions: Transaction[];
  onAddTransaction: (tx: Omit<Transaction, 'id' | 'createdAt' | 'createdBy' | 'ipAddress' | 'history'> & { editReason?: string; deleteReason?: string }) => void;
  onSoftDeleteTransaction: (id: string, reason: string) => void;
}

export default function ExpenseModule({ transactions, onAddTransaction, onSoftDeleteTransaction }: ExpenseModuleProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [filterDept, setFilterDept] = useState<string>('All');

  // Form state
  const [date, setDate] = useState('2026-07-14');
  const [category, setCategory] = useState('Food Purchases');
  const [department, setDepartment] = useState<Department>('F&B');
  const [supplier, setSupplier] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Bank');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [approvedBy, setApprovedBy] = useState('Manager J. Kabera');
  const [attachment, setAttachment] = useState<string>('Voucher_Receipt_Attached.pdf');

  const [softDeleteId, setSoftDeleteId] = useState<string | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);

  // Core Calculations
  const todayStr = '2026-07-14';

  const dailyExpenses = sumTransactions(transactions, 'EXPENSE', { startDate: todayStr, endDate: todayStr });
  const weeklyExpenses = sumTransactions(transactions, 'EXPENSE', { startDate: '2026-07-08', endDate: todayStr });
  const monthlyExpensesJuly = sumTransactions(transactions, 'EXPENSE', { startDate: '2026-07-01', endDate: '2026-07-31' });
  const monthlyExpensesJune = sumTransactions(transactions, 'EXPENSE', { startDate: '2026-06-01', endDate: '2026-06-30' });
  const annualExpenses = sumTransactions(transactions, 'EXPENSE', { startDate: '2026-01-01', endDate: '2026-12-31' });

  // Filtered Expense Journals
  const activeExpenses = transactions.filter(t => t.type === 'EXPENSE' && !t.isDeleted);

  const filteredExpenses = activeExpenses.filter(tx => {
    if (filterCategory !== 'All' && tx.category !== filterCategory) return false;
    if (filterDept !== 'All' && tx.department !== filterDept) return false;
    return true;
  }).sort((a, b) => b.date.localeCompare(a.date));

  const formatRWF = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'RWF',
      maximumFractionDigits: 0
    }).format(value).replace('RWF', 'FRw');
  };

  // Determine budget status for current selected category
  const getCurrentCategoryBudgetStatus = (cat: string, amtToAdd: number) => {
    const limit = MONTHLY_BUDGET_LIMITS[cat] || 0;
    // Calculate what has been spent on this category in July so far
    const currentSpent = sumTransactions(transactions, 'EXPENSE', {
      category: cat,
      startDate: '2026-07-01',
      endDate: '2026-07-31'
    });
    
    const newTotal = currentSpent + amtToAdd;
    return {
      limit,
      currentSpent,
      newTotal,
      overrun: limit > 0 && newTotal > limit
    };
  };

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amtNum = Number(amount);
    if (!amount || isNaN(amtNum) || amtNum <= 0) {
      setNotification({ message: 'Please enter a valid positive expense amount.', type: 'error' });
      return;
    }
    if (!supplier.trim() || !description.trim() || !referenceNumber.trim()) {
      setNotification({ message: 'Supplier, description and voucher number are required.', type: 'error' });
      return;
    }

    // Check budget overrun for immediate warning
    const budgetInfo = getCurrentCategoryBudgetStatus(category, amtNum);

    onAddTransaction({
      date,
      type: 'EXPENSE',
      category,
      department,
      description: `${description} [Supplier: ${supplier}]`,
      amount: amtNum,
      paymentMethod,
      referenceNumber,
      approvedBy,
      attachmentUrl: attachment,
      status: 'Completed'
    });

    if (budgetInfo.overrun) {
      setNotification({ 
        message: `Expense successfully recorded, but TRIGGERS BUDGET OVERRUN! ${category} Monthly Budget: ${formatRWF(budgetInfo.limit)}. Projected spend: ${formatRWF(budgetInfo.newTotal)}.`, 
        type: 'warning' 
      });
    } else {
      setNotification({ message: 'Expense entry posted and balanced in ledger.', type: 'success' });
    }

    setSupplier('');
    setDescription('');
    setAmount('');
    setReferenceNumber('');
    setShowAddForm(false);

    setTimeout(() => setNotification(null), 5000);
  };

  const handleDeleteTrigger = (id: string) => {
    setSoftDeleteId(id);
    setDeleteReason('');
  };

  const confirmSoftDelete = () => {
    if (!deleteReason.trim()) {
      setNotification({ message: 'Reason for voiding is required under internal audit procedures.', type: 'error' });
      return;
    }
    if (softDeleteId) {
      onSoftDeleteTransaction(softDeleteId, deleteReason);
      setNotification({ message: 'Expense voided and marked as de-recognized.', type: 'success' });
      setSoftDeleteId(null);
      setDeleteReason('');
      setTimeout(() => setNotification(null), 4000);
    }
  };

  // Find most expensive category for June
  const catSums: Record<string, number> = {};
  EXPENSE_CATEGORIES.forEach(cat => {
    catSums[cat] = sumTransactions(transactions, 'EXPENSE', { category: cat, startDate: '2026-06-01', endDate: '2026-06-30' });
  });

  let topExpenseCat = 'N/A';
  let topExpenseAmt = 0;
  Object.entries(catSums).forEach(([cat, val]) => {
    if (val > topExpenseAmt) {
      topExpenseAmt = val;
      topExpenseCat = cat;
    }
  });

  const handleCSVExport = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Date,Category,Department,Description,Amount,Payment Method,Reference No,Approved By\n';
    
    filteredExpenses.forEach(r => {
      csvContent += `"${r.date}","${r.category}","${r.department}","${r.description.replace(/"/g, '""')}",${r.amount},"${r.paymentMethod}","${r.referenceNumber}","${r.approvedBy}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'Expense_Ledger_Report.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Expense Ledger & Procurement Book</h2>
          <p className="text-slate-500 text-xs mt-1">GAAP Accrual expense tracking and corporate budget control panel.</p>
        </div>
        <div className="flex gap-2 self-start">
          <button 
            onClick={handleCSVExport}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export CSV</span>
          </button>
          <button 
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-rose-600 hover:bg-rose-700 text-white rounded-lg px-3 py-2 text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Record Expense Entry</span>
          </button>
        </div>
      </div>

      {/* NOTIFICATION TOAST */}
      {notification && (
        <div className={`p-4 rounded-lg flex items-start gap-2 text-xs ${
          notification.type === 'success' 
            ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' 
            : notification.type === 'warning'
              ? 'bg-amber-50 border border-amber-200 text-amber-800 font-semibold'
              : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {notification.type === 'success' && <CheckCircle className="w-4 h-4 shrink-0" />}
          {notification.type === 'warning' && <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600" />}
          {notification.type === 'error' && <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* EXPENSE SUMMARY DASHBOARD */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="text-slate-500 text-[10px] uppercase font-semibold tracking-wider">Today's Expense</div>
          <div className="text-lg font-bold text-slate-900 mt-1">{formatRWF(dailyExpenses)}</div>
          <p className="text-[9px] text-slate-400 mt-1 font-mono">July 14, 2026</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="text-slate-500 text-[10px] uppercase font-semibold tracking-wider">Weekly Expenses</div>
          <div className="text-lg font-bold text-slate-900 mt-1">{formatRWF(weeklyExpenses)}</div>
          <p className="text-[9px] text-slate-400 mt-1 font-mono">7-Day Rolling Outlay</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="text-slate-500 text-[10px] uppercase font-semibold tracking-wider">Monthly Expenses (June)</div>
          <div className="text-lg font-bold text-slate-900 mt-1">{formatRWF(monthlyExpensesJune)}</div>
          <p className="text-[9px] text-slate-400 mt-1 font-mono">Audited Outflow</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="text-slate-500 text-[10px] uppercase font-semibold tracking-wider">Annual Expenses</div>
          <div className="text-lg font-bold text-slate-900 mt-1">{formatRWF(annualExpenses)}</div>
          <p className="text-[9px] text-slate-400 mt-1 font-mono">2026 YTD Disbursements</p>
        </div>

        {/* Top Outflow Category Card */}
        <div className="bg-rose-50 p-4 rounded-xl border border-rose-200 flex flex-col justify-between">
          <div className="text-rose-800 text-[10px] uppercase font-bold tracking-wider">Top Expense (June)</div>
          <div className="text-base font-extrabold text-rose-950 mt-1 truncate" title={topExpenseCat}>
            {topExpenseCat}
          </div>
          <p className="text-[10px] text-rose-700 font-mono mt-0.5">{formatRWF(topExpenseAmt)}</p>
        </div>
      </div>

      {/* RECORD ENTRY FORM */}
      {showAddForm && (
        <form onSubmit={handleAddExpense} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-rose-600" />
              Book New Corporate Expense / Stock Procurement Entry
            </h3>
            {amount && !isNaN(Number(amount)) && Number(amount) > 0 && (
              <div className="text-xs">
                {getCurrentCategoryBudgetStatus(category, Number(amount)).overrun ? (
                  <span className="text-rose-600 font-bold bg-rose-50 px-2.5 py-1 rounded-full border border-rose-100 flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5" /> Budget Overrun Alert
                  </span>
                ) : (
                  <span className="text-emerald-600 font-semibold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                    Within Budget
                  </span>
                )}
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Expense Date</label>
              <input 
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-rose-500 focus:bg-white"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Expense Category</label>
              <select 
                value={category} 
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-rose-500 focus:bg-white"
              >
                {EXPENSE_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Debited Department</label>
              <select 
                value={department} 
                onChange={(e) => setDepartment(e.target.value as Department)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-rose-500 focus:bg-white"
              >
                <option value="F&B">Food & Beverage (F&B)</option>
                <option value="Rooms">Rooms / Housekeeping</option>
                <option value="Maintenance">Maintenance & Utilities</option>
                <option value="Admin">Administration (Admin)</option>
                <option value="Marketing">Marketing & Advertising</option>
                <option value="Other">Other Services</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Supplier / Creditor Name</label>
              <input 
                type="text" 
                placeholder="e.g. Kigali Prime Meats, REG Utility, WASAC"
                value={supplier} 
                onChange={(e) => setSupplier(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-rose-500 focus:bg-white"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Disbursed Amount (RWF)</label>
              <input 
                type="number" 
                placeholder="e.g. 1200000"
                value={amount} 
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-rose-500 focus:bg-white"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Invoice / Voucher / PO Number</label>
              <input 
                type="text" 
                placeholder="e.g. INV-SUP-154"
                value={referenceNumber} 
                onChange={(e) => setReferenceNumber(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-rose-500 focus:bg-white"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Payment Method</label>
              <select 
                value={paymentMethod} 
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-rose-500 focus:bg-white"
              >
                <option value="Bank">Bank Wire / Card Settlement</option>
                <option value="Cash">Cash Drawer</option>
                <option value="Accounts Payable">Accounts Payable (Supplier Credit)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Internal Control Approver</label>
              <input 
                type="text" 
                value={approvedBy} 
                onChange={(e) => setApprovedBy(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-rose-500 focus:bg-white"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Evidence Attachment File</label>
              <input 
                type="text" 
                value={attachment} 
                onChange={(e) => setAttachment(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-mono focus:ring-1 focus:ring-rose-500 focus:bg-white"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Expense Description Summary</label>
            <input 
              type="text" 
              placeholder="e.g. Purchase of 40 cases of drinks, emergency elevator line maintenance..."
              value={description} 
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-rose-500 focus:bg-white"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button 
              type="button" 
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 text-xs border border-slate-300 hover:bg-slate-50 rounded-lg font-medium text-slate-600"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="px-4 py-2 text-xs bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold"
            >
              Disburse & Post Expense Entry
            </button>
          </div>
        </form>
      )}

      {/* FILTER & JOURNAL TABLE */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-semibold text-slate-700">Journal Audit Filters:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <select 
              value={filterCategory} 
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg text-xs p-1.5 focus:ring-1 focus:ring-rose-500"
            >
              <option value="All">All Categories</option>
              {EXPENSE_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            <select 
              value={filterDept} 
              onChange={(e) => setFilterDept(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg text-xs p-1.5 focus:ring-1 focus:ring-rose-500"
            >
              <option value="All">All Departments</option>
              <option value="F&B">Food & Beverage</option>
              <option value="Rooms">Rooms</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Admin">Admin</option>
              <option value="Marketing">Marketing</option>
            </select>
          </div>
        </div>

        {/* PROCUREMENT TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/50 text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b border-slate-200">
                <th className="p-4">Date</th>
                <th className="p-4">Category</th>
                <th className="p-4">Department</th>
                <th className="p-4">Description</th>
                <th className="p-4 text-right">Amount</th>
                <th className="p-4">Voucher No</th>
                <th className="p-4">Payment Method</th>
                <th className="p-4">Approved By</th>
                <th className="p-4 text-center">Receipt</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filteredExpenses.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 font-mono font-medium">{tx.date}</td>
                  <td className="p-4">
                    <span className="bg-rose-50 text-rose-800 border border-rose-100 font-medium px-2.5 py-1 rounded-full text-[11px]">
                      {tx.category}
                    </span>
                  </td>
                  <td className="p-4 font-semibold text-slate-500">{tx.department}</td>
                  <td className="p-4 truncate max-w-xs" title={tx.description}>{tx.description}</td>
                  <td className="p-4 text-right font-bold text-rose-700 font-mono">{formatRWF(tx.amount)}</td>
                  <td className="p-4 font-mono text-slate-500">{tx.referenceNumber}</td>
                  <td className="p-4 font-medium text-slate-600">{tx.paymentMethod}</td>
                  <td className="p-4 text-slate-500">{tx.approvedBy}</td>
                  <td className="p-4 text-center font-mono text-[10px] text-teal-600 font-semibold underline cursor-pointer">
                    {tx.attachmentUrl}
                  </td>
                  <td className="p-4 text-center">
                    <button 
                      onClick={() => handleDeleteTrigger(tx.id)}
                      className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                      title="Soft Delete (Preserves history in Audit Trail)"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredExpenses.length === 0 && (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400 text-xs">
                    No active expenses matching the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SOFT DELETE CONFIRMATION MODAL */}
      {softDeleteId && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl border border-slate-200 max-w-md w-full p-6 shadow-lg space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2 text-rose-700">
              <AlertCircle className="w-5 h-5" />
              Internal Control: De-recognize Expense Request
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Accounting principles require archiving voided payments rather than purging them. This transaction will remain marked as deactivated in the <b>Audit Trail</b>.
            </p>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Reason for Voiding Voucher (Required for Audit Log)
              </label>
              <textarea 
                rows={3}
                placeholder="Enter audit explanation or voucher cancellation details..."
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                className="w-full border border-slate-300 bg-slate-50 rounded-lg p-2 text-xs focus:ring-1 focus:ring-rose-500"
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <button 
                onClick={() => setSoftDeleteId(null)}
                className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button 
                onClick={confirmSoftDelete}
                className="px-3 py-1.5 text-xs bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold"
              >
                Void Expense Transaction
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

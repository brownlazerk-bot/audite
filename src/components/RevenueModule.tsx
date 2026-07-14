/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  DollarSign, 
  Plus, 
  Trash2, 
  TrendingUp, 
  TrendingDown, 
  Briefcase, 
  Filter, 
  CheckCircle, 
  AlertCircle,
  FileSpreadsheet
} from 'lucide-react';
import { Transaction, Department, PaymentMethod } from '../types';
import { REVENUE_CATEGORIES } from '../data/initialData';
import { sumTransactions } from '../utils/finance';

interface RevenueModuleProps {
  transactions: Transaction[];
  onAddTransaction: (tx: Omit<Transaction, 'id' | 'createdAt' | 'createdBy' | 'ipAddress' | 'history'> & { editReason?: string; deleteReason?: string }) => void;
  onSoftDeleteTransaction: (id: string, reason: string) => void;
}

export default function RevenueModule({ transactions, onAddTransaction, onSoftDeleteTransaction }: RevenueModuleProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [filterPayment, setFilterPayment] = useState<string>('All');
  
  // Form states
  const [date, setDate] = useState('2026-07-14');
  const [category, setCategory] = useState('Room Revenue');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Bank');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [approvedBy, setApprovedBy] = useState('Manager J. Kabera');
  const [softDeleteId, setSoftDeleteId] = useState<string | null>(null);
  const [deleteReason, setDeleteReason] = useState('');

  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Core Dynamic Period Sums (excluding deleted)
  const todayStr = '2026-07-14';
  
  // Daily Revenue (Today)
  const dailyRevenue = sumTransactions(transactions, 'REVENUE', { startDate: todayStr, endDate: todayStr });
  
  // Weekly Revenue (July 8 to July 14, 2026)
  const weeklyRevenue = sumTransactions(transactions, 'REVENUE', { startDate: '2026-07-08', endDate: todayStr });
  
  // Monthly Revenue (Current active month July)
  const monthlyRevenueJuly = sumTransactions(transactions, 'REVENUE', { startDate: '2026-07-01', endDate: '2026-07-31' });
  
  // Audited June Month Revenue
  const monthlyRevenueJune = sumTransactions(transactions, 'REVENUE', { startDate: '2026-06-01', endDate: '2026-06-30' });

  // Annual Revenue (All 2026)
  const annualRevenue = sumTransactions(transactions, 'REVENUE', { startDate: '2026-01-01', endDate: '2026-12-31' });

  // Growth calculation (June vs preloaded May of 78,000,000 RWF)
  const mayRevenuePreloaded = 78000000;
  const growthPercent = ((monthlyRevenueJune - mayRevenuePreloaded) / mayRevenuePreloaded) * 100;

  // Filtered List of active revenues
  const activeRevenues = transactions.filter(t => t.type === 'REVENUE' && !t.isDeleted);
  
  const filteredRevenues = activeRevenues.filter(tx => {
    if (filterCategory !== 'All' && tx.category !== filterCategory) return false;
    if (filterPayment !== 'All' && tx.paymentMethod !== filterPayment) return false;
    return true;
  }).sort((a, b) => b.date.localeCompare(a.date));

  // Determine top and lowest sources of income (based on audited June)
  const categoryTotals: Record<string, number> = {};
  REVENUE_CATEGORIES.forEach(cat => {
    categoryTotals[cat] = sumTransactions(transactions, 'REVENUE', { category: cat, startDate: '2026-06-01', endDate: '2026-06-30' });
  });

  let topSource = 'N/A';
  let topAmount = 0;
  let lowestSource = 'N/A';
  let lowestAmount = Infinity;

  Object.entries(categoryTotals).forEach(([cat, val]) => {
    if (val > topAmount) {
      topAmount = val;
      topSource = cat;
    }
    // Lowest positive source
    if (val > 0 && val < lowestAmount) {
      lowestAmount = val;
      lowestSource = cat;
    }
  });

  if (lowestAmount === Infinity) lowestSource = 'N/A';

  const formatRWF = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'RWF',
      maximumFractionDigits: 0
    }).format(value).replace('RWF', 'FRw');
  };

  const handleAddRevenue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setNotification({ message: 'Please enter a valid positive revenue amount.', type: 'error' });
      return;
    }
    if (!description.trim() || !referenceNumber.trim()) {
      setNotification({ message: 'Please fill in description and reference number.', type: 'error' });
      return;
    }

    // Determine department dynamically based on category
    let dept: Department = 'Other';
    if (category === 'Room Revenue') {
      dept = 'Rooms';
    } else if (['Restaurant Revenue', 'Bar Revenue', 'Conference Hall Revenue'].includes(category)) {
      dept = 'F&B';
    } else if (category === 'Laundry Revenue' || category === 'Airport Pickup Revenue' || category === 'Parking Revenue') {
      dept = 'Other';
    } else {
      dept = 'Admin';
    }

    onAddTransaction({
      date,
      type: 'REVENUE',
      category,
      department: dept,
      description,
      amount: Number(amount),
      paymentMethod,
      referenceNumber,
      approvedBy,
      status: 'Completed'
    });

    setNotification({ message: 'Revenue entry successfully logged into the journal.', type: 'success' });
    setDescription('');
    setAmount('');
    setReferenceNumber('');
    setShowAddForm(false);

    setTimeout(() => setNotification(null), 4000);
  };

  const handleDeleteTrigger = (id: string) => {
    setSoftDeleteId(id);
    setDeleteReason('');
  };

  const confirmSoftDelete = () => {
    if (!deleteReason.trim()) {
      setNotification({ message: 'You must provide an audit reason for deleting this transaction.', type: 'error' });
      return;
    }
    if (softDeleteId) {
      onSoftDeleteTransaction(softDeleteId, deleteReason);
      setNotification({ message: 'Transaction flagged as voided. Kept in Audit Trial.', type: 'success' });
      setSoftDeleteId(null);
      setDeleteReason('');
      setTimeout(() => setNotification(null), 4000);
    }
  };

  // Export current list of revenues as CSV
  const handleCSVExport = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Date,Category,Department,Description,Amount,Payment Method,Reference No,Approved By\n';
    
    filteredRevenues.forEach(r => {
      csvContent += `"${r.date}","${r.category}","${r.department}","${r.description.replace(/"/g, '""')}",${r.amount},"${r.paymentMethod}","${r.referenceNumber}","${r.approvedBy}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'Revenue_Journal_Report.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Revenue Bookkeeping Journal</h2>
          <p className="text-slate-500 text-xs mt-1">Accrual-based income ledger tracking categorized hotel inflows.</p>
        </div>
        <div className="flex gap-2 self-start">
          <button 
            onClick={() => handleCSVExport()}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export CSV</span>
          </button>
          <button 
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-teal-600 hover:bg-teal-700 text-white rounded-lg px-3 py-2 text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Record Revenue Entry</span>
          </button>
        </div>
      </div>

      {/* NOTIFICATION TOAST */}
      {notification && (
        <div className={`p-4 rounded-lg flex items-start gap-2 text-xs ${
          notification.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {notification.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* REVENUE SUMS OVERVIEW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="text-slate-500 text-[10px] uppercase font-semibold tracking-wider">Today's Revenue</div>
          <div className="text-lg font-bold text-slate-900 mt-1">{formatRWF(dailyRevenue)}</div>
          <p className="text-[9px] text-slate-400 mt-1 font-mono">July 14, 2026</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="text-slate-500 text-[10px] uppercase font-semibold tracking-wider">Weekly Revenue</div>
          <div className="text-lg font-bold text-slate-900 mt-1">{formatRWF(weeklyRevenue)}</div>
          <p className="text-[9px] text-slate-400 mt-1 font-mono">7-Day Rolling Sum</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="text-slate-500 text-[10px] uppercase font-semibold tracking-wider">Monthly Revenue (June)</div>
          <div className="text-lg font-bold text-slate-900 mt-1">{formatRWF(monthlyRevenueJune)}</div>
          <p className="text-[9px] text-slate-400 mt-1 font-mono">Audited Month Total</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="text-slate-500 text-[10px] uppercase font-semibold tracking-wider">Annual Revenue (YTD)</div>
          <div className="text-lg font-bold text-slate-900 mt-1">{formatRWF(annualRevenue)}</div>
          <p className="text-[9px] text-slate-400 mt-1 font-mono">All 2026 Dynamic Ledger</p>
        </div>
        
        {/* Growth card */}
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 text-white flex flex-col justify-between">
          <div className="text-slate-400 text-[10px] uppercase font-semibold tracking-wider">Revenue Growth (Jun vs May)</div>
          <div className="flex items-center gap-1.5 mt-1">
            {growthPercent >= 0 ? (
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            ) : (
              <TrendingDown className="w-5 h-5 text-rose-400" />
            )}
            <span className={`text-lg font-bold ${growthPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {growthPercent.toFixed(1)}%
            </span>
          </div>
          <p className="text-[9px] text-slate-400 mt-1 font-mono">May Ref: FRw 78M</p>
        </div>
      </div>

      {/* TOP & LOWEST STREAMS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 flex items-center gap-3">
          <div className="bg-teal-600/10 p-2.5 rounded-lg text-teal-700">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-teal-800 font-bold uppercase tracking-wider">Top Revenue Stream (June)</div>
            <div className="text-sm font-extrabold text-teal-950 mt-0.5">{topSource}</div>
            <div className="text-xs text-teal-700 font-mono mt-0.5">{formatRWF(topAmount)}</div>
          </div>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center gap-3">
          <div className="bg-orange-600/10 p-2.5 rounded-lg text-orange-700">
            <TrendingDown className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-orange-800 font-bold uppercase tracking-wider">Lowest Revenue Stream (June)</div>
            <div className="text-sm font-extrabold text-orange-950 mt-0.5">{lowestSource}</div>
            <div className="text-xs text-orange-700 font-mono mt-0.5">{formatRWF(lowestAmount)}</div>
          </div>
        </div>
      </div>

      {/* RECORD ENTRY FORM */}
      {showAddForm && (
        <form onSubmit={handleAddRevenue} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
            Log New Room, POS, or Contract Revenue Entry
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Date of Settlement</label>
              <input 
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-teal-500 focus:bg-white"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Income Source Category</label>
              <select 
                value={category} 
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-teal-500 focus:bg-white"
              >
                {REVENUE_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Payment Settlement Channel</label>
              <select 
                value={paymentMethod} 
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-teal-500 focus:bg-white"
              >
                <option value="Bank">Bank Deposit/Card POS</option>
                <option value="Cash">Cash Ledger Box</option>
                <option value="Accounts Receivable">Accounts Receivable (Client Slips)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Amount Settled (RWF)</label>
              <input 
                type="number" 
                placeholder="e.g. 1500000"
                value={amount} 
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-teal-500 focus:bg-white"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Audit Invoice/Receipt Number</label>
              <input 
                type="text" 
                placeholder="e.g. REV-ROOM-005"
                value={referenceNumber} 
                onChange={(e) => setReferenceNumber(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-teal-500 focus:bg-white"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Authorized Auditing Signoff</label>
              <input 
                type="text" 
                value={approvedBy} 
                onChange={(e) => setApprovedBy(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-teal-500 focus:bg-white"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Revenue Description & Evidence Summary</label>
            <input 
              type="text" 
              placeholder="e.g. Daily POS check-ins, Front desk ledger audits..."
              value={description} 
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-teal-500 focus:bg-white"
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
              className="px-4 py-2 text-xs bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold"
            >
              Post to Journal Ledger
            </button>
          </div>
        </form>
      )}

      {/* FILTER & TRANSACTION LIST */}
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
              className="bg-white border border-slate-300 rounded-lg text-xs p-1.5 focus:ring-1 focus:ring-teal-500"
            >
              <option value="All">All Categories</option>
              {REVENUE_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            <select 
              value={filterPayment} 
              onChange={(e) => setFilterPayment(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg text-xs p-1.5 focus:ring-1 focus:ring-teal-500"
            >
              <option value="All">All Payment Channels</option>
              <option value="Bank">Bank / Credit Card</option>
              <option value="Cash">Cash Box</option>
              <option value="Accounts Receivable">Accounts Receivable</option>
            </select>
          </div>
        </div>

        {/* JOURNAL LISTING */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/50 text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b border-slate-200">
                <th className="p-4">Date</th>
                <th className="p-4">Category</th>
                <th className="p-4">Department</th>
                <th className="p-4">Description</th>
                <th className="p-4 text-right">Amount</th>
                <th className="p-4">Reference No</th>
                <th className="p-4">Payment Method</th>
                <th className="p-4">Approved By</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filteredRevenues.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 font-mono font-medium">{tx.date}</td>
                  <td className="p-4">
                    <span className="bg-teal-50 text-teal-800 border border-teal-100 font-medium px-2.5 py-1 rounded-full text-[11px]">
                      {tx.category}
                    </span>
                  </td>
                  <td className="p-4 font-semibold text-slate-500">{tx.department}</td>
                  <td className="p-4 truncate max-w-xs" title={tx.description}>{tx.description}</td>
                  <td className="p-4 text-right font-bold text-slate-900 font-mono">{formatRWF(tx.amount)}</td>
                  <td className="p-4 font-mono text-slate-500">{tx.referenceNumber}</td>
                  <td className="p-4 font-medium text-slate-600">{tx.paymentMethod}</td>
                  <td className="p-4 text-slate-500">{tx.approvedBy}</td>
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
              {filteredRevenues.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400 text-xs">
                    No active revenues recorded matching the current filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SOFT DELETE CONFIRMATION MODAL MOCKUP (CEO SECURITY CONTROL) */}
      {softDeleteId && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl border border-slate-200 max-w-md w-full p-6 shadow-lg space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2 text-rose-700">
              <AlertCircle className="w-5 h-5" />
              Internal Control: Void Transaction Request
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Accounting principles forbid removing journal logs. Deleting this will <b>soft-delete</b> the transaction: it is excluded from P&L reports, but remains marked as voided in the <b>Audit Trail</b>.
            </p>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Reason for Voiding Invoice (Required for Audit Log)
              </label>
              <textarea 
                rows={3}
                placeholder="Enter formal justification, error explanation, or original voucher reference..."
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
                Void Transaction
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

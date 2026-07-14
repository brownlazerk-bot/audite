/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  PiggyBank, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Plus, 
  History, 
  TrendingUp, 
  FileText,
  UserCheck,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { Transaction, PaymentMethod } from '../types';
import { sumTransactions } from '../utils/finance';

interface OwnerEquityModuleProps {
  transactions: Transaction[];
  onAddTransaction: (tx: Omit<Transaction, 'id' | 'createdAt' | 'createdBy' | 'ipAddress' | 'history'> & { editReason?: string; deleteReason?: string }) => void;
}

export default function OwnerEquityModule({ transactions, onAddTransaction }: OwnerEquityModuleProps) {
  const [showInjectionForm, setShowInjectionForm] = useState(false);
  const [showWithdrawalForm, setShowWithdrawalForm] = useState(false);

  // Form states
  const [date, setDate] = useState('2026-07-14');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [reference, setReference] = useState('');
  const [approvedBy, setApprovedBy] = useState('CEO K. Brown');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Bank');

  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Calculations
  const openingCapital = sumTransactions(transactions, 'CAPITAL_DEPOSIT');
  const additionalCapital = sumTransactions(transactions, 'CASH_INJECTION');
  const withdrawnCapital = sumTransactions(transactions, 'CAPITAL_WITHDRAWAL');
  const currentCapital = openingCapital + additionalCapital - withdrawnCapital;

  // History listing
  const equityTxs = transactions.filter(t => 
    !t.isDeleted && ['CAPITAL_DEPOSIT', 'CASH_INJECTION', 'CAPITAL_WITHDRAWAL'].includes(t.type)
  ).sort((a, b) => b.date.localeCompare(a.date));

  const formatRWF = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'RWF',
      maximumFractionDigits: 0
    }).format(value).replace('RWF', 'FRw');
  };

  const handlePostInjection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setNotification({ message: 'Enter a valid investment capital amount.', type: 'error' });
      return;
    }
    if (!reason.trim() || !reference.trim()) {
      setNotification({ message: 'Reason and reference voucher number are required.', type: 'error' });
      return;
    }

    onAddTransaction({
      date,
      type: 'CASH_INJECTION',
      category: 'Owner Cash Injection',
      department: 'Admin',
      description: `Owner Capital Cash Injection: ${reason}`,
      amount: Number(amount),
      paymentMethod,
      referenceNumber: reference,
      approvedBy,
      status: 'Completed'
    });

    setNotification({ message: 'Owner Cash Injection recorded. Capital Account increased. Profit is NOT affected.', type: 'success' });
    setAmount('');
    setReason('');
    setReference('');
    setShowInjectionForm(false);
    setTimeout(() => setNotification(null), 4000);
  };

  const handlePostWithdrawal = (e: React.FormEvent) => {
    e.preventDefault();
    const wthNum = Number(amount);
    if (!amount || isNaN(wthNum) || wthNum <= 0) {
      setNotification({ message: 'Enter a valid withdrawal amount.', type: 'error' });
      return;
    }
    if (wthNum > currentCapital) {
      setNotification({ message: `Insufficient Capital Available. Max withdrawal limit: ${formatRWF(currentCapital)}`, type: 'error' });
      return;
    }
    if (!reason.trim() || !reference.trim()) {
      setNotification({ message: 'Reason and reference voucher are required.', type: 'error' });
      return;
    }

    onAddTransaction({
      date,
      type: 'CAPITAL_WITHDRAWAL',
      category: 'Owner Capital Withdrawal',
      department: 'Admin',
      description: `Owner Equity Draw: ${reason}`,
      amount: wthNum,
      paymentMethod,
      referenceNumber: reference,
      approvedBy,
      status: 'Completed'
    });

    setNotification({ message: 'Owner Capital Withdrawal processed. Capital Account reduced.', type: 'success' });
    setAmount('');
    setReason('');
    setReference('');
    setShowWithdrawalForm(false);
    setTimeout(() => setNotification(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Owner Equity & Capital Registry</h2>
          <p className="text-slate-500 text-xs mt-1">
            Tracks capital contributions, cash injections, and equity drawings separate from operational net income.
          </p>
        </div>
        <div className="flex gap-2 self-start">
          <button 
            onClick={() => { setShowWithdrawalForm(false); setShowInjectionForm(!showInjectionForm); }}
            className="bg-teal-600 hover:bg-teal-700 text-white rounded-lg px-3 py-2 text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Record Cash Injection</span>
          </button>
          <button 
            onClick={() => { setShowInjectionForm(false); setShowWithdrawalForm(!showWithdrawalForm); }}
            className="bg-amber-600 hover:bg-amber-700 text-white rounded-lg px-3 py-2 text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all"
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>Record Owner Withdrawal</span>
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

      {/* CAPITAL ACCOUNT HIGHLIGHTS */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {/* Current Capital Balance (The Master Card) */}
        <div className="bg-slate-900 text-white p-5 rounded-xl border border-slate-800 shadow-md col-span-1 sm:col-span-1">
          <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Current Owner Capital</div>
          <div className="text-xl font-extrabold text-teal-400 mt-2 font-mono">{formatRWF(currentCapital)}</div>
          <p className="text-[9px] text-slate-400 mt-2 font-mono">Closing Capital Balance</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <div className="text-slate-500 text-[10px] uppercase font-semibold tracking-wider flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-teal-600" />
            <span>Opening Capital</span>
          </div>
          <div className="text-lg font-bold text-slate-900 mt-2 font-mono">{formatRWF(openingCapital)}</div>
          <p className="text-[9px] text-slate-400 mt-1 font-mono">Laid-down Equity Balance</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <div className="text-slate-500 text-[10px] uppercase font-semibold tracking-wider flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
            <span>Additional Injections</span>
          </div>
          <div className="text-lg font-bold text-slate-950 mt-2 font-mono">{formatRWF(additionalCapital)}</div>
          <p className="text-[9px] text-emerald-600 font-semibold mt-1 font-mono">Renovations & Equipment</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <div className="text-slate-500 text-[10px] uppercase font-semibold tracking-wider flex items-center gap-1">
            <ArrowDownLeft className="w-3.5 h-3.5 text-rose-600" />
            <span>Withdrawn Capital</span>
          </div>
          <div className="text-lg font-bold text-rose-700 mt-2 font-mono">{formatRWF(withdrawnCapital)}</div>
          <p className="text-[9px] text-rose-600 font-semibold mt-1 font-mono">Personal Drawings Out</p>
        </div>
      </div>

      {/* SEPARATION COMPLIANCE ADVISORY */}
      <div className="bg-teal-50 border border-teal-200 p-4 rounded-xl text-xs text-teal-900 flex items-start gap-2.5">
        <PiggyBank className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-bold uppercase tracking-wider text-[10px] text-teal-800">GAAP / IFRS Asset Isolation Standard</h4>
          <p className="mt-1 leading-relaxed text-slate-600">
            This module operates under the <b>Business Entity Concept</b>. When you renovate rooms (e.g., spending 5,000,000 FRw) or purchase kitchen gear (e.g., 2,000,000 FRw) using out-of-pocket owner cash, these injections increase the hotel's <b>Opening Capital Account</b> and <b>Physical Cash / Asset Ledger</b> but are strictly banned from inflating operating profit or operational revenue figures.
          </p>
        </div>
      </div>

      {/* RECORD INJECTION FORM */}
      {showInjectionForm && (
        <form onSubmit={handlePostInjection} className="bg-white p-6 rounded-xl border border-teal-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-teal-800 uppercase tracking-wider flex items-center gap-1.5">
            <ArrowUpRight className="w-4 h-4 text-emerald-500" />
            Inject New Owner Capital (Increase cash reserves without inflating profit)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Date of Cash Deposit</label>
              <input 
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-teal-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Injected Capital Amount (RWF)</label>
              <input 
                type="number" 
                placeholder="e.g. 5000000"
                value={amount} 
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-teal-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Deposit Target Account</label>
              <select 
                value={paymentMethod} 
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-teal-500"
              >
                <option value="Bank">Bank Operations Escrow Account</option>
                <option value="Cash">Physical Cash Safe</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Audit Deposit Reference Number</label>
              <input 
                type="text" 
                placeholder="e.g. REF-INJ-004"
                value={reference} 
                onChange={(e) => setReference(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-teal-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Internal Control Signoff Authorizer</label>
              <input 
                type="text" 
                value={approvedBy} 
                onChange={(e) => setApprovedBy(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-teal-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Capital Investment Reason & Proof</label>
            <input 
              type="text" 
              placeholder="e.g. Renovation of conference hall rooms, heavy baking equipment purchase..."
              value={reason} 
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-teal-500"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button 
              type="button" 
              onClick={() => setShowInjectionForm(false)}
              className="px-4 py-2 text-xs border border-slate-300 hover:bg-slate-50 rounded-lg font-medium text-slate-600"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="px-4 py-2 text-xs bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold"
            >
              Record Capital Deposit
            </button>
          </div>
        </form>
      )}

      {/* RECORD WITHDRAWAL FORM */}
      {showWithdrawalForm && (
        <form onSubmit={handlePostWithdrawal} className="bg-white p-6 rounded-xl border border-amber-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
            <ArrowDownLeft className="w-4 h-4 text-rose-500" />
            Disburse Owner Capital Withdrawal (Personal Drawing)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Withdrawal Date</label>
              <input 
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-amber-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Withdrawal Amount (RWF)</label>
              <input 
                type="number" 
                placeholder="e.g. 1500000"
                value={amount} 
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-amber-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Withdrawal Disbursed Account</label>
              <select 
                value={paymentMethod} 
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-amber-500"
              >
                <option value="Bank">Bank Wire out of Operations</option>
                <option value="Cash">Physical Cash Safe withdrawal</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Withdrawal Voucher Reference Number</label>
              <input 
                type="text" 
                placeholder="e.g. REF-WTH-005"
                value={reference} 
                onChange={(e) => setReference(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-amber-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Disbursement Authorizer Signoff</label>
              <input 
                type="text" 
                value={approvedBy} 
                onChange={(e) => setApprovedBy(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-amber-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Personal Draw Reason / Purpose</label>
            <input 
              type="text" 
              placeholder="e.g. Owner personal utilities draw, private tax settlement..."
              value={reason} 
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-amber-500"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button 
              type="button" 
              onClick={() => setShowWithdrawalForm(false)}
              className="px-4 py-2 text-xs border border-slate-300 hover:bg-slate-50 rounded-lg font-medium text-slate-600"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="px-4 py-2 text-xs bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold"
            >
              Post Capital Withdrawal
            </button>
          </div>
        </form>
      )}

      {/* EQUITY CAPITAL LEDGER HISTORY */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
          <History className="w-4 h-4 text-slate-500" />
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Owner Capital Account Ledger</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/50 text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b border-slate-200">
                <th className="p-4">Transaction Date</th>
                <th className="p-4">Equity Event Type</th>
                <th className="p-4">Reference No</th>
                <th className="p-4">Description / Audit Justification</th>
                <th className="p-4 text-right">Inflow (+)</th>
                <th className="p-4 text-right">Drawing (-)</th>
                <th className="p-4">Channel</th>
                <th className="p-4">Authorized By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {equityTxs.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 font-mono font-medium">{tx.date}</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-full font-medium text-[11px] border ${
                      tx.type === 'CAPITAL_DEPOSIT' 
                        ? 'bg-blue-50 border-blue-100 text-blue-800' 
                        : tx.type === 'CASH_INJECTION'
                          ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
                          : 'bg-amber-50 border-amber-100 text-amber-800'
                    }`}>
                      {tx.type === 'CAPITAL_DEPOSIT' 
                        ? 'Initial Capital Deposit' 
                        : tx.type === 'CASH_INJECTION'
                          ? 'Owner Cash Injection'
                          : 'Owner Capital Withdrawal'
                      }
                    </span>
                  </td>
                  <td className="p-4 font-mono text-slate-500">{tx.referenceNumber}</td>
                  <td className="p-4 font-medium text-slate-600">{tx.description}</td>
                  <td className="p-4 text-right font-bold text-emerald-600 font-mono">
                    {tx.type !== 'CAPITAL_WITHDRAWAL' ? formatRWF(tx.amount) : ''}
                  </td>
                  <td className="p-4 text-right font-bold text-amber-600 font-mono">
                    {tx.type === 'CAPITAL_WITHDRAWAL' ? formatRWF(tx.amount) : ''}
                  </td>
                  <td className="p-4 text-slate-500">{tx.paymentMethod}</td>
                  <td className="p-4 text-slate-500 flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                    <span>{tx.approvedBy}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

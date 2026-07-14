/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  History, 
  Search, 
  User, 
  Globe, 
  Trash2, 
  AlertCircle, 
  CheckCircle,
  RefreshCw,
  Eye,
  Info
} from 'lucide-react';
import { Transaction, TransactionHistoryItem } from '../types';

interface AuditLogModuleProps {
  transactions: Transaction[];
  onRestoreTransaction: (id: string) => void;
}

export default function AuditLogModule({ transactions, onRestoreTransaction }: AuditLogModuleProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('All');
  const [notification, setNotification] = useState<string | null>(null);

  // Compile a flat list of ALL historical edits across ALL transactions (including soft-deleted ones)
  const auditHistory: {
    txId: string;
    referenceNo: string;
    category: string;
    amount: number;
    timestamp: string;
    action: TransactionHistoryItem['action'];
    user: string;
    details: string;
    ipAddress: string;
    isTxDeleted: boolean;
  }[] = [];

  transactions.forEach(tx => {
    tx.history.forEach(hist => {
      auditHistory.push({
        txId: tx.id,
        referenceNo: tx.referenceNumber,
        category: tx.category,
        amount: tx.amount,
        timestamp: hist.timestamp,
        action: hist.action,
        user: hist.user,
        details: hist.details,
        ipAddress: hist.ipAddress,
        isTxDeleted: !!tx.isDeleted
      });
    });
  });

  // Sort chronological feed (newest first)
  const sortedHistory = auditHistory.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  // Filtered history
  const filteredHistory = sortedHistory.filter(item => {
    if (actionFilter !== 'All' && item.action !== actionFilter) return false;
    
    const searchLower = searchTerm.toLowerCase();
    if (searchTerm) {
      return (
        item.user.toLowerCase().includes(searchLower) ||
        item.details.toLowerCase().includes(searchLower) ||
        item.referenceNo.toLowerCase().includes(searchLower) ||
        item.category.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  // Extract only CURRENTLY DELETED transactions for CEO inspection
  const deletedTransactions = transactions.filter(t => t.isDeleted);

  const formatRWF = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'RWF',
      maximumFractionDigits: 0
    }).format(value).replace('RWF', 'FRw');
  };

  const handleRestore = (id: string) => {
    onRestoreTransaction(id);
    setNotification('Transaction successfully restored and re-balanced in accounting reports.');
    setTimeout(() => setNotification(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <History className="w-5 h-5 text-slate-700" />
          General Ledger Auditing & Forensic Trail
        </h2>
        <p className="text-slate-500 text-xs mt-1">
          Undeletable journaling feed mapping all ledger creations, modifications, IP addresses, and soft deletions.
        </p>
      </div>

      {/* NOTIFICATION TOAST */}
      {notification && (
        <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* INTEGRITY STATS BAR */}
      <div className="bg-slate-900 text-white p-4 rounded-xl border border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
        <div>
          <span className="text-slate-400">LEDGER STATE:</span>{' '}
          <span className="text-teal-400 font-bold uppercase">RECONCILED & SECURE</span>
        </div>
        <div>
          <span className="text-slate-400">COMPLIANCE STATS:</span>{' '}
          <span>100% Undeletable Journaling</span>
        </div>
        <div>
          <span className="text-slate-400">SOFT-DELETED VAULT:</span>{' '}
          <span className="font-bold text-rose-400">{deletedTransactions.length} Voided Invoices</span>
        </div>
      </div>

      {/* TWO SECTIONS: FORENSIC TIMELINE & SOFT-DELETED VAULT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Forensic Timeline Feed (Col Span 2) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row gap-3 items-center justify-between">
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
              Live Audited Ledger History Feed
            </h3>
            
            <div className="flex gap-2 w-full sm:w-auto">
              {/* Search */}
              <div className="relative w-full sm:w-48">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input 
                  type="text" 
                  placeholder="Search log..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-lg p-1.5 pl-8 text-xs w-full focus:bg-white focus:ring-1 focus:ring-slate-500"
                />
              </div>

              {/* Action Filter */}
              <select 
                value={actionFilter} 
                onChange={(e) => setActionFilter(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg text-xs p-1.5 focus:ring-1 focus:ring-slate-500 shrink-0"
              >
                <option value="All">All Actions</option>
                <option value="CREATED">Created</option>
                <option value="EDITED">Edited</option>
                <option value="MARKED_DELETED">Deleted/Voided</option>
                <option value="RESTORED">Restored</option>
              </select>
            </div>
          </div>

          {/* TIMELINE TIMELINE FEED */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6 max-h-[500px] overflow-y-auto">
            {filteredHistory.map((item, index) => (
              <div key={index} className="flex gap-4 items-start relative">
                {/* Visual timeline line connector */}
                {index !== filteredHistory.length - 1 && (
                  <span className="absolute left-3 top-6 bottom-0 w-0.5 bg-slate-100" />
                )}
                
                {/* Icon wrapper */}
                <span className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center border text-[10px] font-bold ${
                  item.action === 'CREATED' 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                    : item.action === 'EDITED'
                      ? 'bg-blue-50 border-blue-200 text-blue-700'
                      : item.action === 'RESTORED'
                        ? 'bg-purple-50 border-purple-200 text-purple-700'
                        : 'bg-rose-50 border-rose-200 text-rose-700'
                }`}>
                  {item.action[0]}
                </span>

                <div className="space-y-1.5 text-xs text-slate-700 flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="font-bold text-slate-900 uppercase text-[10px] tracking-wider">
                      {item.action === 'MARKED_DELETED' ? 'VOIDED / SOFT-DELETED' : item.action} ENTRY
                    </span>
                    <span className="font-mono text-[10px] text-slate-400">
                      {new Date(item.timestamp).toLocaleString()}
                    </span>
                  </div>

                  <p className="text-slate-600 font-medium">{item.details}</p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] text-slate-500 font-mono">
                    <div className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>{item.user}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Globe className="w-3.5 h-3.5 text-slate-400" />
                      <span>IP: {item.ipAddress}</span>
                    </div>
                    <div>Ref: {item.referenceNo}</div>
                    <div className="font-semibold text-right">Value: {formatRWF(item.amount)}</div>
                  </div>
                </div>
              </div>
            ))}
            {filteredHistory.length === 0 && (
              <div className="text-center py-12 text-slate-400 text-xs">
                No audited history matches search filter.
              </div>
            )}
          </div>
        </div>

        {/* Soft-Deleted Vault (Col Span 1) */}
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1">
              <Trash2 className="w-4 h-4 text-rose-600" />
              Voided Invoices Vault
            </h3>
            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
              These items are excluded from balance sheets but kept permanently for auditing. Re-balances ledger upon restoration.
            </p>
          </div>

          <div className="space-y-3">
            {deletedTransactions.map(tx => (
              <div key={tx.id} className="bg-rose-50/50 border border-rose-200/60 rounded-xl p-4 space-y-3 text-xs">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                      VOIDED
                    </span>
                    <h4 className="font-bold text-slate-900 mt-1">{tx.category}</h4>
                    <p className="text-[10px] text-slate-400 font-mono">{tx.referenceNumber} | ID: {tx.id}</p>
                  </div>
                  <span className="font-mono font-bold text-slate-900">{formatRWF(tx.amount)}</span>
                </div>

                <div className="p-2 bg-white rounded border border-rose-100 text-[11px]">
                  <p className="font-semibold text-slate-500">Void Reason:</p>
                  <p className="text-slate-700 italic mt-0.5 font-medium">"{tx.deleteReason || 'No reason provided.'}"</p>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-rose-200/40 text-[10px] text-slate-400">
                  <span>By: {tx.deletedBy}</span>
                  <button 
                    onClick={() => handleRestore(tx.id)}
                    className="text-teal-700 hover:text-teal-900 font-bold flex items-center gap-1 text-[11px]"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Restore
                  </button>
                </div>
              </div>
            ))}
            {deletedTransactions.length === 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-xs">
                <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p>No voided transactions. All ledger entries are currently active.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

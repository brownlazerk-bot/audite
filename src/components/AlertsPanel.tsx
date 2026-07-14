/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  ShieldAlert, 
  CheckCircle, 
  AlertTriangle, 
  Info, 
  Trash2, 
  Search, 
  Filter,
  Activity,
  ThumbsUp,
  RefreshCw,
  HelpCircle,
  FileSpreadsheet
} from 'lucide-react';
import { AuditAlert, Transaction, InventoryBatch } from '../types';

interface AlertsPanelProps {
  alerts: AuditAlert[];
  transactions: Transaction[];
  batches: InventoryBatch[];
  onResolveAlert: (id: string, comment: string) => void;
}

export default function AlertsPanel({ alerts, transactions, batches, onResolveAlert }: AlertsPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('All');
  const [resolveId, setResolveId] = useState<string | null>(null);
  const [resolveComment, setResolveComment] = useState('');

  // 1. Compile Dynamic State-Driven Alerts
  const dynamicAlerts: AuditAlert[] = [];
  const todayStr = '2026-07-14';

  // Check for any Negative Stock (where remaining qty < 0) - none by model safety, but let's audit batches
  batches.forEach(b => {
    if (b.quantityRemaining < 0) {
      dynamicAlerts.push({
        id: `dyn-stock-${b.id}`,
        timestamp: todayStr + 'T00:00:00Z',
        severity: 'CRITICAL',
        type: 'NEGATIVE_STOCK',
        title: 'Negative Stock Warning',
        description: `Batch ${b.id} for ${b.itemName} registers negative quantity remaining of ${b.quantityRemaining}. Reconcile FIFO ledger immediately!`,
        resolved: false
      });
    }
  });

  // Check for duplicate invoice numbers
  const invoiceNumbers: Record<string, string[]> = {};
  transactions.filter(t => !t.isDeleted).forEach(t => {
    if (t.referenceNumber) {
      if (!invoiceNumbers[t.referenceNumber]) {
        invoiceNumbers[t.referenceNumber] = [];
      }
      invoiceNumbers[t.referenceNumber].push(t.id);
    }
  });

  Object.entries(invoiceNumbers).forEach(([invNo, ids]) => {
    if (ids.length > 1) {
      dynamicAlerts.push({
        id: `dyn-dup-${invNo}`,
        timestamp: todayStr + 'T01:00:00Z',
        severity: 'CRITICAL',
        type: 'DUPLICATE_INVOICE',
        title: 'Duplicate Invoice Detected',
        description: `Invoice reference number ${invNo} was recorded across multiple ledger entries: [${ids.join(', ')}]. High risk of duplicate payment or entry fraud.`,
        resolved: false
      });
    }
  });

  // Combine static and dynamic alerts
  const allAlerts = [...dynamicAlerts, ...alerts];

  const sortedAlerts = allAlerts.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  // Filters
  const filteredAlerts = sortedAlerts.filter(a => {
    if (severityFilter !== 'All' && a.severity !== severityFilter) return false;
    
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        a.title.toLowerCase().includes(searchLower) ||
        a.description.toLowerCase().includes(searchLower) ||
        a.type.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  const getAlertStyle = (alert: AuditAlert) => {
    if (alert.resolved) {
      return 'bg-slate-50 border-slate-200 opacity-60';
    }
    if (alert.severity === 'CRITICAL') {
      return 'bg-rose-50/50 border-rose-200/80';
    }
    if (alert.severity === 'WARNING') {
      return 'bg-amber-50/50 border-amber-200/80';
    }
    return 'bg-blue-50/50 border-blue-200/80';
  };

  const getAlertBadge = (alert: AuditAlert) => {
    if (alert.resolved) {
      return <span className="bg-slate-100 text-slate-700 font-bold px-2.5 py-0.5 rounded text-[10px] uppercase">RESOLVED</span>;
    }
    if (alert.severity === 'CRITICAL') {
      return <span className="bg-rose-600 text-white font-bold px-2.5 py-0.5 rounded text-[10px] uppercase animate-pulse">CRITICAL</span>;
    }
    if (alert.severity === 'WARNING') {
      return <span className="bg-amber-500 text-slate-900 font-bold px-2.5 py-0.5 rounded text-[10px] uppercase">WARNING</span>;
    }
    return <span className="bg-blue-600 text-white font-bold px-2.5 py-0.5 rounded text-[10px] uppercase">INFO</span>;
  };

  const triggerResolve = (id: string) => {
    setResolveId(id);
    setResolveComment('');
  };

  const confirmResolve = () => {
    if (!resolveComment.trim()) return;
    if (resolveId) {
      onResolveAlert(resolveId, resolveComment);
      setResolveId(null);
      setResolveComment('');
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-red-600" />
          CEO Audit Alerts & Compliance Centre
        </h2>
        <p className="text-slate-500 text-xs mt-1">
          Dynamic background checker auditing budget overruns, invoice voids, duplicate payments, and negative stock.
        </p>
      </div>

      {/* FILTER & SEARCH */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-slate-500" />
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Alert Investigation Hub</span>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-52">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input 
              type="text" 
              placeholder="Search alert codes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg p-1.5 pl-8 text-xs w-full focus:bg-white focus:ring-1 focus:ring-slate-500"
            />
          </div>

          <select 
            value={severityFilter} 
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-white border border-slate-300 rounded-lg text-xs p-1.5 focus:ring-1 focus:ring-slate-500 shrink-0"
          >
            <option value="All">All Severities</option>
            <option value="CRITICAL">Critical Only</option>
            <option value="WARNING">Warnings</option>
            <option value="INFO">Information</option>
          </select>
        </div>
      </div>

      {/* ALERTS FEED */}
      <div className="grid grid-cols-1 gap-4">
        {filteredAlerts.map((alert) => (
          <div 
            key={alert.id} 
            className={`p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-start justify-between gap-4 transition-all shadow-xs ${getAlertStyle(alert)}`}
          >
            <div className="flex gap-3.5 items-start">
              <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border ${
                alert.resolved 
                  ? 'bg-slate-100 border-slate-200 text-slate-500' 
                  : alert.severity === 'CRITICAL'
                    ? 'bg-rose-100 border-rose-200 text-rose-700'
                    : alert.severity === 'WARNING'
                      ? 'bg-amber-100 border-amber-200 text-amber-700'
                      : 'bg-blue-100 border-blue-200 text-blue-700'
              }`}>
                {alert.severity === 'CRITICAL' ? (
                  <ShieldAlert className="w-5 h-5" />
                ) : alert.severity === 'WARNING' ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (
                  <Info className="w-5 h-5" />
                )}
              </span>

              <div className="space-y-1 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-extrabold text-slate-900 text-sm tracking-tight">{alert.title}</h3>
                  {getAlertBadge(alert)}
                </div>
                <p className="text-slate-600 font-medium leading-relaxed max-w-2xl">{alert.description}</p>
                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono pt-1">
                  <span>LOGGED: {new Date(alert.timestamp).toLocaleString()}</span>
                  <span>|</span>
                  <span>TRIGGER: {alert.type}</span>
                </div>

                {alert.resolved && (
                  <div className="mt-3 p-2.5 bg-slate-100 rounded-lg border border-slate-200/60 font-mono text-[10px] text-slate-500">
                    <div>RESOLVED BY: {alert.resolvedBy} | ON: {new Date(alert.resolvedAt!).toLocaleDateString()}</div>
                    <div className="mt-1 text-slate-700 font-bold">COMMENT: "{alert.resolvedBy === 'CEO K. Brown' ? alert.resolvedBy + ': ' : ''}Resolved after audit sign-off."</div>
                  </div>
                )}
              </div>
            </div>

            {/* RESOLVE TRIGGER BUTTON */}
            {!alert.resolved && (
              <button 
                onClick={() => triggerResolve(alert.id)}
                className="bg-slate-900 hover:bg-slate-800 text-white rounded-lg px-3.5 py-1.5 text-xs font-bold shrink-0 self-start sm:self-center flex items-center gap-1 shadow-xs transition-all"
              >
                <ThumbsUp className="w-3.5 h-3.5" />
                <span>Mark Resolved</span>
              </button>
            )}
          </div>
        ))}
        {filteredAlerts.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-xs">
            <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
            <p className="font-bold">Clear Ledger Board!</p>
            <p className="text-[11px] mt-1">No alerts triggered or matching the filters.</p>
          </div>
        )}
      </div>

      {/* RESOLUTION REASON MODAL */}
      {resolveId && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl border border-slate-200 max-w-md w-full p-6 shadow-lg space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2 text-teal-800">
              <CheckCircle className="w-5 h-5" />
              Sign-Off: Resolve Internal Alert
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Before resolving this budget overrun, void, or duplicate warning, standard internal control procedures require entering your audit sign-off resolution note.
            </p>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                CEO Resolution Comment / Sign-Off Note
              </label>
              <textarea 
                rows={3}
                placeholder="e.g. Reviewed SP fuel receipt, approved; or de-recognized duplicate voucher..."
                value={resolveComment}
                onChange={(e) => setResolveComment(e.target.value)}
                className="w-full border border-slate-300 bg-slate-50 rounded-lg p-2 text-xs focus:ring-1 focus:ring-teal-500"
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <button 
                onClick={() => setResolveId(null)}
                className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button 
                onClick={confirmResolve}
                disabled={!resolveComment.trim()}
                className="px-3 py-1.5 text-xs bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold disabled:opacity-50"
              >
                Sign Off & Close Alert
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

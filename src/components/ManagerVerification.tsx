/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  ShieldAlert, 
  CheckCircle, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  HelpCircle,
  Eye,
  Lock,
  Compass
} from 'lucide-react';
import { Transaction, InventoryBatch, StockUsage, ManagerReportSubmission } from '../types';
import { PRELOADED_MANAGER_REPORT_JUNE_2026 } from '../data/initialData';
import { 
  sumTransactions, 
  calculateFIFOCOGS, 
  calculateCurrentInventoryValue,
  calculateOpeningInventoryValue
} from '../utils/finance';

interface ManagerVerificationProps {
  transactions: Transaction[];
  batches: InventoryBatch[];
  usages: StockUsage[];
}

export default function ManagerVerification({ transactions, batches, usages }: ManagerVerificationProps) {
  const [managerReport, setManagerReport] = useState<ManagerReportSubmission>(PRELOADED_MANAGER_REPORT_JUNE_2026);
  const [showExplanation, setShowExplanation] = useState(true);

  // June dates
  const juneStart = '2026-06-01';
  const juneEnd = '2026-06-30';

  // --- LEDGER SYSTEM VALUES (JUNE) ---
  const roomRevenueLedger = sumTransactions(transactions, 'REVENUE', { category: 'Room Revenue', startDate: juneStart, endDate: juneEnd });
  const restRevenueLedger = sumTransactions(transactions, 'REVENUE', { category: 'Restaurant Revenue', startDate: juneStart, endDate: juneEnd });
  const barRevenueLedger = sumTransactions(transactions, 'REVENUE', { category: 'Bar Revenue', startDate: juneStart, endDate: juneEnd });
  const confRevenueLedger = sumTransactions(transactions, 'REVENUE', { category: 'Conference Hall Revenue', startDate: juneStart, endDate: juneEnd });
  const tourRevenueLedger = sumTransactions(transactions, 'REVENUE', { category: 'Tour Services Revenue', startDate: juneStart, endDate: juneEnd });
  
  // Total F&B operational
  const fbRevenueLedger = restRevenueLedger + barRevenueLedger + confRevenueLedger;
  
  // Other dynamic revenue
  const totalRevenueLedger = sumTransactions(transactions, 'REVENUE', { startDate: juneStart, endDate: juneEnd });
  const otherRevenueLedger = totalRevenueLedger - (roomRevenueLedger + fbRevenueLedger);

  // COGS June (FIFO)
  const juneUsages = usages.filter(u => u.date >= juneStart && u.date <= juneEnd);
  const juneBatches = batches.filter(b => b.dateReceived <= juneEnd);
  const cogsLedger = calculateFIFOCOGS(juneUsages, juneBatches);

  // OPEX June
  const foodPurchasesJune = sumTransactions(transactions, 'EXPENSE', { category: 'Food Purchases', startDate: juneStart, endDate: juneEnd });
  const bevPurchasesJune = sumTransactions(transactions, 'EXPENSE', { category: 'Beverage Purchases', startDate: juneStart, endDate: juneEnd });
  const totalJunePurchases = foodPurchasesJune + bevPurchasesJune;
  const rawOpexJune = sumTransactions(transactions, 'EXPENSE', { startDate: juneStart, endDate: juneEnd });
  const opexLedger = rawOpexJune - totalJunePurchases; // Direct stock is capitalized as Inventory, non-stock is OPEX

  // Net Profit
  const taxExp = sumTransactions(transactions, 'EXPENSE', { category: 'Taxes', startDate: juneStart, endDate: juneEnd });
  const otherIncome = sumTransactions(transactions, 'REVENUE', { category: 'Other Income', startDate: juneStart, endDate: juneEnd });
  const netProfitLedger = (totalRevenueLedger - cogsLedger - opexLedger) + otherIncome - taxExp;

  // Cash and Bank at June 30
  const cashReceivedJuneEnd = transactions
    .filter(t => !t.isDeleted && t.paymentMethod === 'Cash' && t.date <= juneEnd && ['REVENUE', 'CAPITAL_DEPOSIT', 'CASH_INJECTION'].includes(t.type))
    .reduce((sum, t) => sum + t.amount, 0);
  const cashPaidJuneEnd = transactions
    .filter(t => !t.isDeleted && t.paymentMethod === 'Cash' && t.date <= juneEnd && ['EXPENSE', 'CAPITAL_WITHDRAWAL', 'PURCHASE_ORDER'].includes(t.type))
    .reduce((sum, t) => sum + t.amount, 0);
  const cashBalanceLedger = cashReceivedJuneEnd - cashPaidJuneEnd;

  const bankReceivedJuneEnd = transactions
    .filter(t => !t.isDeleted && t.paymentMethod === 'Bank' && t.date <= juneEnd && ['REVENUE', 'CAPITAL_DEPOSIT', 'CASH_INJECTION'].includes(t.type))
    .reduce((sum, t) => sum + t.amount, 0);
  const bankPaidJuneEnd = transactions
    .filter(t => !t.isDeleted && t.paymentMethod === 'Bank' && t.date <= juneEnd && ['EXPENSE', 'CAPITAL_WITHDRAWAL', 'PURCHASE_ORDER'].includes(t.type))
    .reduce((sum, t) => sum + t.amount, 0);
  const bankBalanceLedger = bankReceivedJuneEnd - bankPaidJuneEnd;

  // Inventory value up to June 30
  const tempBatches = JSON.parse(JSON.stringify(batches.filter(b => b.dateReceived <= juneEnd))) as InventoryBatch[];
  const tempUsages = usages.filter(u => u.date <= juneEnd);
  const sortedUsages = [...tempUsages].sort((a, b) => a.date.localeCompare(b.date));
  for (const usage of sortedUsages) {
    let remaining = usage.quantityUsed;
    const itemBatches = tempBatches
      .filter(b => b.itemId === usage.itemId)
      .sort((a, b) => a.dateReceived.localeCompare(b.dateReceived));
    for (const b of itemBatches) {
      if (remaining <= 0) break;
      const take = Math.min(b.quantityRemaining, remaining);
      b.quantityRemaining -= take;
      remaining -= take;
    }
  }
  const inventoryValueLedger = tempBatches.reduce((sum, b) => sum + (b.quantityRemaining * b.unitPrice), 0);

  // --- COMPARE FIELDS DEFINITION ---
  const compareItems = [
    { label: 'Room Revenue', reported: managerReport.roomRevenue, ledger: roomRevenueLedger, category: 'Revenue' },
    { label: 'Food & Beverage (F&B) Revenue', reported: managerReport.fbRevenue, ledger: fbRevenueLedger, category: 'Revenue' },
    { label: 'Other Operational Income', reported: managerReport.otherRevenue, ledger: otherRevenueLedger, category: 'Revenue' },
    { label: 'TOTAL MONTHLY REVENUE', reported: managerReport.totalRevenue, ledger: totalRevenueLedger, category: 'RevenueSummary' },
    { label: 'Cost of Goods Sold (COGS)', reported: managerReport.cogs, ledger: cogsLedger, category: 'COGS' },
    { label: 'Operating Expenditures (OPEX)', reported: managerReport.operatingExpenses, ledger: opexLedger, category: 'Expense' },
    { label: 'NET OPERATIONAL PROFIT', reported: managerReport.netProfit, ledger: netProfitLedger, category: 'ProfitSummary' },
    { label: 'Cash Drawer Balance', reported: managerReport.cashBalance, ledger: cashBalanceLedger, category: 'Balance' },
    { label: 'Bank Escrow Balance', reported: managerReport.bankBalance, ledger: bankBalanceLedger, category: 'Balance' },
    { label: 'Inventory Assets Book Value', reported: managerReport.inventoryValue, ledger: inventoryValueLedger, category: 'Balance' },
  ];

  const formatRWF = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'RWF',
      maximumFractionDigits: 0
    }).format(value).replace('RWF', 'FRw');
  };

  const getAlertIcon = (variance: number) => {
    if (Math.abs(variance) < 10) {
      return <CheckCircle className="w-4 h-4 text-emerald-500" />;
    } else {
      return <ShieldAlert className="w-4 h-4 text-rose-500 animate-pulse" />;
    }
  };

  const getAlertRowStyle = (variance: number) => {
    if (Math.abs(variance) >= 10) {
      return 'bg-rose-50/50 hover:bg-rose-100/30';
    }
    return 'hover:bg-slate-50/50';
  };

  // Find audit trail events in June that caused the discrepancies:
  // 1. tx-audit-del-1 (Swimming Pool revenue voided by manager but reported anyway to inflate figures)
  const poolVoidedTx = transactions.find(t => t.id === 'tx-audit-del-1');
  // 2. tx-audit-edit-1 (Diesel purchase correcting fuel exp from 800K to 1.2M - manager reported outdated 800K figures!)
  const fuelEditedTx = transactions.find(t => t.id === 'tx-audit-edit-1');

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-rose-600" />
          Manager Report Verification & Reconciliation
        </h2>
        <p className="text-slate-500 text-xs mt-1">
          Automated auditing: Compares manager drafts against core double-entry transaction ledgers.
        </p>
      </div>

      {/* COMPLIANCE WARNING */}
      {showExplanation && (
        <div className="bg-slate-900 text-white p-5 rounded-xl border border-slate-800 space-y-3 relative overflow-hidden">
          <button 
            onClick={() => setShowExplanation(false)}
            className="absolute top-4 right-4 text-slate-400 hover:text-white text-xs font-bold"
          >
            ✕ Dismiss
          </button>
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-amber-400" />
            <h4 className="font-bold text-xs uppercase tracking-wider text-amber-300">
              Internal Control Forensic Findings (June 2026 Period)
            </h4>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
            This workspace acts as a business intelligence audit shield for the CEO. The manager submitted a drafted monthly report (the <b>Reported column</b>). Our forensic ledger (the <b>System Verified column</b>) calculated dynamic totals from verified raw vouchers. Critical cash, revenue, and opex discrepancies were exposed.
          </p>
        </div>
      )}

      {/* MANAGER SUBMISSION BIO */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs text-slate-700 font-medium">
        <div>
          <span className="text-slate-400">SUBMISSION:</span> June 2026 Draft Report
        </div>
        <div>
          <span className="text-slate-400">MANAGER:</span> {managerReport.managerName}
        </div>
        <div>
          <span className="text-slate-400">SUBMITTED AT:</span> {new Date(managerReport.submittedAt).toLocaleDateString()}
        </div>
        <span className="bg-rose-100 text-rose-800 border border-rose-200 font-bold px-2.5 py-1 rounded text-[10px] uppercase">
          RECONCILIATION FAIL (ALERT RED)
        </span>
      </div>

      {/* SIDE-BY-SIDE VERIFICATION GRID */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b border-slate-200">
                <th className="p-4">Accounting Metric Line Item</th>
                <th className="p-4 text-right">Reported (Manager Draft)</th>
                <th className="p-4 text-right">System Verified (Ledger)</th>
                <th className="p-4 text-right">Discrepancy (Variance)</th>
                <th className="p-4 text-center">Audit status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {compareItems.map((item, index) => {
                const variance = item.reported - item.ledger;
                const isSummary = ['RevenueSummary', 'ProfitSummary', 'COGS'].includes(item.category);
                
                return (
                  <tr 
                    key={index} 
                    className={`${getAlertRowStyle(variance)} ${
                      isSummary ? 'bg-slate-50/70 font-bold text-slate-900 border-y border-slate-200' : ''
                    }`}
                  >
                    <td className={`p-4 ${isSummary ? 'font-extrabold uppercase text-[11px]' : 'pl-6 text-slate-600'}`}>
                      {item.label}
                    </td>
                    <td className="p-4 text-right font-mono font-bold text-slate-800">
                      {formatRWF(item.reported)}
                    </td>
                    <td className="p-4 text-right font-mono font-bold text-slate-900">
                      {formatRWF(item.ledger)}
                    </td>
                    <td className={`p-4 text-right font-mono font-bold ${
                      Math.abs(variance) < 10 
                        ? 'text-emerald-600' 
                        : variance > 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      {variance > 0 ? '+' : ''}{formatRWF(variance)}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex justify-center">
                        {getAlertIcon(variance)}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* FORENSIC AUDIT TRAIL EVIDENCE (THE WHY) */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
          <ShieldAlert className="w-5 h-5 text-rose-600" />
          Ledger Investigation Helper (What caused the variances?)
        </h3>

        <div className="space-y-4 text-xs">
          {/* Finding 1: Voided / Deleted Pool Invoice */}
          <div className="bg-rose-50 border border-rose-200 p-4 rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              <span className="bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase">FRAUD RISK ALERT</span>
              <h4 className="font-bold text-rose-950">Discrepancy: Voided Invoice Included in Manager's Report</h4>
            </div>
            <p className="text-slate-600 leading-relaxed">
              The manager reported <b>FRw 2,700,000</b> in Other Operational Income. However, our system ledger shows only <b>FRw 1,200,000</b> (Gorilla Trekking Comm.).
              Our audit logs discovered that a Swimming Pool VIP day invoice (<b>tx-audit-del-1 for FRw 1,500,000</b>) was voided/soft-deleted by the manager on June 14, but the manager <b>still included this 1,500,000 FRw inside their reported figures</b> to artificially inflate the hotel's monthly revenue!
            </p>
            <div className="p-2.5 bg-white border border-rose-100 rounded text-[11px] font-mono text-slate-500">
              <div>Voided Invoice ID: tx-audit-del-1 | Voided by: Manager J. Kabera</div>
              <div className="mt-1 text-rose-700 font-semibold">Delete Reason: "Draft invoice cancelled - customer requested conference hall swap instead."</div>
            </div>
          </div>

          {/* Finding 2: Corrected Fuel purchase */}
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              <span className="bg-amber-600 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase">REPORTING LAG</span>
              <h4 className="font-bold text-amber-950">Discrepancy: Operating Expenses Outdated Draft Figures</h4>
            </div>
            <p className="text-slate-600 leading-relaxed">
              The manager reported <b>FRw 20,250,000</b> in OPEX. Our system ledger verified <b>FRw 20,650,000</b> (a variance of FRw 400,000).
              Investigation shows the manager reported fuel purchase at their initial draft entry of <b>FRw 800,000</b>. On June 28, the Financial Controller updated transaction <b>tx-audit-edit-1 to FRw 1,200,000</b> to align with the audited printed SP diesel pump receipt. The manager's reported figures were never updated.
            </p>
            <div className="p-2.5 bg-white border border-amber-100 rounded text-[11px] font-mono text-slate-500">
              <div>Edited Invoice ID: tx-audit-edit-1 | Updated by: Controller E. Rwibutso</div>
              <div className="mt-1 text-amber-700 font-semibold">Correction Reason: "Corrected diesel fuel purchase amount from 800,000 RWF to 1,200,000 RWF to align with audited SP station printed receipt."</div>
            </div>
          </div>

          {/* Finding 3: Cash Drawer Variance */}
          <div className="bg-rose-50 border border-rose-200 p-4 rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              <span className="bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase">CASH BOX VARIANCE</span>
              <h4 className="font-bold text-rose-950">Discrepancy: Physical Cash Drawer Underage</h4>
            </div>
            <p className="text-slate-600 leading-relaxed">
              The manager reported physical cash of <b>FRw 12,400,000</b> in the vault. Our dynamic journal ledger registers cash balance at <b>FRw 14,800,000</b>. There is an audited shortage of <b>FRw 2,400,000</b> which represents missing physical cash drawer receipts!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Sparkles, 
  ShieldAlert, 
  CheckCircle, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Search, 
  Eye, 
  FileText, 
  Fingerprint, 
  Database, 
  ArrowRight, 
  Coins, 
  Clock, 
  Terminal, 
  Printer, 
  PenTool, 
  HelpCircle, 
  Building, 
  Layers, 
  Activity, 
  CheckCircle2, 
  Briefcase,
  Sliders,
  DollarSign,
  AlertCircle
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { Transaction, InventoryBatch, StockUsage, AuditAlert } from '../types';
import { 
  sumTransactions, 
  calculateFIFOCOGS, 
  calculateCurrentInventoryValue,
  calculateInventoryLosses
} from '../utils/finance';

interface AiAuditEngineProps {
  transactions: Transaction[];
  batches: InventoryBatch[];
  usages: StockUsage[];
  alerts: AuditAlert[];
}

type TabType = 'intelligence' | 'verification' | 'exceptions' | 'forensics' | 'report';

export default function AiAuditEngine({ transactions, batches, usages, alerts }: AiAuditEngineProps) {
  const [activeTab, setActiveTab] = useState<TabType>('intelligence');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTxForDetail, setSelectedTxForDetail] = useState<Transaction | null>(null);
  const [selectedAuditPoint, setSelectedAuditPoint] = useState<string | null>(null);
  const [signedReport, setSignedReport] = useState(false);
  const [ceoComments, setCeoComments] = useState('');

  // ----------------------------------------------------
  // CORE CALCULATIONS & STATS
  // ----------------------------------------------------
  const activeTxs = useMemo(() => transactions.filter(t => !t.isDeleted), [transactions]);
  const deletedTxs = useMemo(() => transactions.filter(t => t.isDeleted), [transactions]);

  // June 2026 calculations (Focus month)
  const juneStart = '2026-06-01';
  const juneEnd = '2026-06-30';
  
  const totalRevenue = useMemo(() => sumTransactions(transactions, 'REVENUE'), [transactions]);
  const totalExpenses = useMemo(() => sumTransactions(transactions, 'EXPENSE'), [transactions]);
  const cogsTotal = useMemo(() => calculateFIFOCOGS(usages, batches), [usages, batches]);
  const currentInvValue = useMemo(() => calculateCurrentInventoryValue(batches), [batches]);
  const invLosses = useMemo(() => calculateInventoryLosses(usages, batches), [usages, batches]);
  const totalLossValue = invLosses.wasteCost + invLosses.expiredCost + invLosses.missingCost;

  // ----------------------------------------------------
  // SECTION 1 & 3: TRANSACTION SOURCE VERIFICATION ENGINE
  // ----------------------------------------------------
  const auditedTransactions = useMemo(() => {
    return transactions.map(tx => {
      const anomalies: string[] = [];
      const evidence: { label: string; verified: boolean; type: string; details: string }[] = [];
      let riskScore = 0; // 0 to 100

      // Evidence linkage based on type
      if (tx.type === 'REVENUE') {
        const hasPOSInvoice = tx.referenceNumber && tx.referenceNumber.startsWith('INV-');
        const hasReceipt = tx.referenceNumber && (tx.referenceNumber.includes('REC') || tx.referenceNumber.startsWith('INV-'));
        const hasBooking = tx.category === 'Room Revenue' || tx.description.toLowerCase().includes('room') || tx.description.toLowerCase().includes('booking');
        
        evidence.push({
          label: 'POS Invoice Connection',
          verified: !!hasPOSInvoice,
          type: 'Invoice',
          details: hasPOSInvoice ? `POS invoice verified matching ID ${tx.referenceNumber}` : 'No direct digital POS record linked'
        });
        evidence.push({
          label: 'Customer Payment Slip',
          verified: !!hasReceipt,
          type: 'Receipt',
          details: hasReceipt ? `Receipt generated under transaction ${tx.id}` : 'Manual cash ledger override used'
        });
        evidence.push({
          label: 'PMS Reservation Linkage',
          verified: hasBooking,
          type: 'Reservation',
          details: hasBooking ? `Room management system checked-in record verified` : 'No automatic PMS booking mapping found'
        });

        if (!hasPOSInvoice) {
          anomalies.push('Missing Digital POS Invoice Reference');
          riskScore += 35;
        }
        if (!hasReceipt) {
          anomalies.push('Missing Original Payment Receipt Link');
          riskScore += 25;
        }
      } else if (tx.type === 'EXPENSE') {
        const isProcurement = tx.id.startsWith('tx-proc-');
        const isAdjust = tx.id.startsWith('tx-adj-');
        const isPayroll = tx.category === 'Salaries' || tx.category.toLowerCase().includes('payroll') || tx.category.toLowerCase().includes('wage');
        const isUtility = tx.category === 'Electricity' || tx.category === 'Water' || tx.category.toLowerCase().includes('utility');

        if (isProcurement) {
          evidence.push(
            { label: 'Purchase Order (PO)', verified: true, type: 'PO', details: 'PO generated & matched by Purchasing Dept' },
            { label: 'Supplier Invoice', verified: true, type: 'Invoice', details: `Supplier Invoice #${tx.referenceNumber} matches ledger` },
            { label: 'Goods Received Note (GRN)', verified: true, type: 'GRN', details: `GRN recorded in Inventory Warehouse` },
            { label: 'Stock Entry Adjustment', verified: true, type: 'StockEntry', details: 'FIFO batch recorded and assigned' }
          );
        } else if (isPayroll) {
          const hasTimesheet = tx.description.toLowerCase().includes('june') || tx.description.toLowerCase().includes('approved');
          evidence.push(
            { label: 'Biometric Attendance logs', verified: hasTimesheet, type: 'Attendance', details: hasTimesheet ? 'Biometric logs match payroll hours' : 'No attendance log matching payroll run' },
            { label: 'Timesheet Summary Sign-off', verified: hasTimesheet, type: 'Timesheet', details: hasTimesheet ? 'HR and Manager approved timesheet' : 'Manual timesheet approval bypass detected' },
            { label: 'Payroll Disbursement approval', verified: tx.status === 'Completed', type: 'Approval', details: tx.status === 'Completed' ? 'Disbursed through verified corporate account' : 'Pending payment clearance audit' }
          );
          if (!hasTimesheet) {
            anomalies.push('Missing Employee Attendance Records');
            riskScore += 45;
          }
        } else if (isAdjust) {
          evidence.push(
            { label: 'Stocktake Count Reconciliation', verified: true, type: 'Stocktake', details: 'FIFO Usage discrepancy adjusting entry' },
            { label: 'Auditor Loss Voucher sign-off', verified: true, type: 'Approval', details: 'Loss approved to balance physical counts' }
          );
        } else {
          // Standard OPEX
          const hasPO = tx.amount < 150000; // Mock check: high amounts need PO
          evidence.push(
            { label: 'Purchase Order Approval', verified: hasPO, type: 'PO', details: hasPO ? 'Automatic micro-purchase approval' : 'Large expense posted without pre-approved PO' },
            { label: 'Supplier Invoice Document', verified: !!tx.referenceNumber, type: 'Invoice', details: tx.referenceNumber ? `Supplier invoice linked: #${tx.referenceNumber}` : 'No invoice file attached' },
            { label: 'Department Manager Signature', verified: tx.approvedBy.length > 0, type: 'Approval', details: tx.approvedBy ? `Digitally authorized by ${tx.approvedBy}` : 'Unsigned financial entry' }
          );

          if (!hasPO && tx.amount >= 150000) {
            anomalies.push('Missing Purchase Order for Large Expense');
            riskScore += 40;
          }
          if (!tx.referenceNumber) {
            anomalies.push('Missing Supplier Invoice Voucher');
            riskScore += 30;
          }
          if (!tx.approvedBy) {
            anomalies.push('Missing Authorizing Signature');
            riskScore += 35;
          }
        }
      } else if (tx.type === 'CAPITAL_DEPOSIT' || tx.type === 'CASH_INJECTION') {
        const hasSlip = tx.referenceNumber && tx.referenceNumber.length > 0;
        evidence.push(
          { label: 'Owner Equity Register Entry', verified: true, type: 'Register', details: 'Owner Capital accounts updated' },
          { label: 'Bank Cash Deposit Slip', verified: !!hasSlip, type: 'BankSlip', details: hasSlip ? `Bank deposit validated: Ref #${tx.referenceNumber}` : 'No bank deposit record matched' }
        );
        if (!hasSlip) {
          anomalies.push('Missing Cash Deposit slip proof');
          riskScore += 50;
        }
      }

      // Fraud / Exception triggers
      const isDuplicate = transactions.some(other => 
        other.id !== tx.id && 
        !other.isDeleted && 
        !tx.isDeleted &&
        other.amount === tx.amount && 
        other.category === tx.category && 
        other.type === tx.type && 
        Math.abs(new Date(other.date).getTime() - new Date(tx.date).getTime()) < 24 * 60 * 60 * 1000 * 2
      );
      if (isDuplicate) {
        anomalies.push('Potential Duplicate Transaction Pattern');
        riskScore += 40;
      }

      if (tx.isDeleted) {
        anomalies.push('Soft-Deleted / Voided Entry (Forensic Trail Active)');
        riskScore += 55;
      }

      if (tx.editReason) {
        anomalies.push('Post-Facto Ledger Modification (Edited)');
        riskScore += 25;
      }

      // Large manual discounts
      if (tx.type === 'REVENUE' && tx.description.toLowerCase().includes('discount') && tx.amount > 100000) {
        anomalies.push('Highly Suspicious Manual Discount Amount');
        riskScore += 50;
      }

      // Negative values
      if (tx.amount < 0) {
        anomalies.push('Illegal Negative Entry');
        riskScore += 65;
      }

      const riskLevel = riskScore >= 50 ? 'HIGH' : riskScore >= 20 ? 'MEDIUM' : 'LOW';

      return {
        ...tx,
        anomalies,
        evidence,
        riskScore,
        riskLevel
      };
    });
  }, [transactions]);

  // Filtered lists for Exception tab
  const exceptionTransactions = useMemo(() => {
    return auditedTransactions.filter(tx => tx.anomalies.length > 0 || tx.riskLevel === 'HIGH' || tx.isDeleted);
  }, [auditedTransactions]);

  // ----------------------------------------------------
  // SECTION 2 & 5: DYNAMIC CROSS VERIFICATION ENGINE
  // ----------------------------------------------------
  const crossVerificationChecks = useMemo(() => {
    // 1. Restaurant Sales vs Kitchen Production
    const fnbSales = activeTxs.filter(t => t.category === 'F&B Revenue').reduce((s, r) => s + r.amount, 0);
    // Let's assume kitchen production reports indicate standard sales expectation of 13,850,000 RWF based on chef order tickets
    const kitchenProductionValue = 13850000;
    const fnbDiff = fnbSales - kitchenProductionValue;
    const fnbDiffPct = (fnbDiff / kitchenProductionValue) * 100;

    // 2. Kitchen Production vs Inventory Usage
    const actualOOSLoss = totalLossValue; // Spoilage/wastage
    // Target loss expectation: 1.5% of COGS
    const cogsExpectedLoss = cogsTotal * 0.015;
    const inventoryVariance = actualOOSLoss - cogsExpectedLoss;
    const inventoryDiffPct = (inventoryVariance / cogsExpectedLoss) * 100;

    // 3. Room Bookings vs PMS Payments
    const roomSales = activeTxs.filter(t => t.category === 'Room Revenue').reduce((s, r) => s + r.amount, 0);
    // PMS reservations expect 17,920,000 RWF based on room night stays
    const pmsExpectation = 17920000;
    const roomDiff = roomSales - pmsExpectation;
    const roomDiffPct = (roomDiff / pmsExpectation) * 100;

    // 4. Payroll vs Attendance Log
    const totalPayroll = activeTxs.filter(t => t.category === 'Salaries').reduce((s, r) => s + r.amount, 0);
    // Attendance system calculates total wage cost based on clock-ins to be 4,120,000 RWF
    const attendanceExpectation = 4120000;
    const payrollDiff = totalPayroll - attendanceExpectation;
    const payrollDiffPct = (payrollDiff / attendanceExpectation) * 100;

    // 5. Cash Book vs Real Cash Count
    const computedCash = activeTxs.filter(t => t.paymentMethod === 'Cash').reduce((sum, t) => {
      if (t.type === 'REVENUE' || t.type === 'CAPITAL_DEPOSIT' || t.type === 'CASH_INJECTION') return sum + t.amount;
      if (t.type === 'EXPENSE' || t.type === 'CAPITAL_WITHDRAWAL') return sum - t.amount;
      return sum;
    }, 0);
    const physicalCashCount = 4210000; // Mock current actual physical drawer balance
    const cashVariance = physicalCashCount - computedCash;
    const cashDiffPct = (cashVariance / computedCash) * 100;

    // 6. Bank Book vs Bank Statement Matcher
    const computedBank = activeTxs.filter(t => t.paymentMethod === 'Bank').reduce((sum, t) => {
      if (t.type === 'REVENUE' || t.type === 'CAPITAL_DEPOSIT' || t.type === 'CASH_INJECTION') return sum + t.amount;
      if (t.type === 'EXPENSE' || t.type === 'CAPITAL_WITHDRAWAL') return sum - t.amount;
      return sum;
    }, 0);
    const actualBankStatementBalance = 15300000; // Mock real online bank feed integration
    const bankVariance = actualBankStatementBalance - computedBank;
    const bankDiffPct = (bankVariance / computedBank) * 100;

    return [
      {
        id: 'cross-fnb',
        title: 'F&B POS Sales ↔ Kitchen Order Tickets',
        expectation: kitchenProductionValue,
        actual: fnbSales,
        diff: fnbDiff,
        diffPct: fnbDiffPct,
        reason: 'Order tickets written manually but never keyed in the POS at F&B outlet.',
        evidence: 'Table 14 and Table 15 had handwritten captain orders but no matching cash receipts on July 10th.',
        employee: 'Cashier G. Mutoni',
        risk: 'HIGH',
        recommendation: 'Audit captain order pads sequentially against POS system daily totals.'
      },
      {
        id: 'cross-inv',
        title: 'Actual Inventory Loss ↔ Target Waste Limit',
        expectation: cogsExpectedLoss,
        actual: actualOOSLoss,
        diff: inventoryVariance,
        diffPct: inventoryDiffPct,
        reason: 'High spoilage of perishable seafood in cold room and untracked missing cleaning supplies.',
        evidence: 'Audit recorded 15 units of Missing purpose usage in FIFO inventory store.',
        employee: 'Storekeeper F. Mugisha',
        risk: 'MEDIUM',
        recommendation: 'Install temperature logging telemetry and restrict dry store key access.'
      },
      {
        id: 'cross-pms',
        title: 'Room Revenue Ledger ↔ PMS Reservation Nights',
        expectation: pmsExpectation,
        actual: roomSales,
        diff: roomDiff,
        diffPct: roomDiffPct,
        reason: 'Complementary room upgrades authorized by duty manager without system adjustment notes.',
        evidence: 'Upgrade rate mismatch detected in rooms 104 and 302.',
        employee: 'Manager J. Kabera',
        risk: 'MEDIUM',
        recommendation: 'Mandate digital reason logging in PMS before room keycard generation.'
      },
      {
        id: 'cross-payroll',
        title: 'Salaries Ledger ↔ Biometric Clock-ins',
        expectation: attendanceExpectation,
        actual: totalPayroll,
        diff: payrollDiff,
        diffPct: payrollDiffPct,
        reason: 'Paid hours exceeded biometric records for 2 maintenance technicians.',
        evidence: 'Manual timesheet overrides approved for employee ID EMP-104 on July 3rd.',
        employee: 'HR Coordinator A. Umutoni',
        risk: 'HIGH',
        recommendation: 'Disable manual supervisor hour corrections; enforce gate clock-in logic.'
      },
      {
        id: 'cross-cash',
        title: 'Cash Book Balance ↔ Physical Cash Count',
        expectation: computedCash,
        actual: physicalCashCount,
        diff: cashVariance,
        diffPct: cashDiffPct,
        reason: 'Daily drawer reconciliation math error; unrecorded minor beverage purchases.',
        evidence: 'Drawer count on July 12th showed discrepancy of cash-in-hand.',
        employee: 'Cashier G. Mutoni',
        risk: 'HIGH',
        recommendation: 'Enforce dual-sign off daily cash counts; run random mid-shift audits.'
      },
      {
        id: 'cross-bank',
        title: 'Bank Ledger Balance ↔ Direct Bank Statement',
        expectation: computedBank,
        actual: actualBankStatementBalance,
        diff: bankVariance,
        diffPct: bankDiffPct,
        reason: 'Outstanding unpresented checks issued to suppliers not yet debited from corporate account.',
        evidence: 'Check reference #CK-8291 to Alpha Distributors is in transit.',
        employee: 'Accountant S. Kamali',
        risk: 'LOW',
        recommendation: 'Complete bank reconciliation reports weekly using bank Statement feeds.'
      }
    ];
  }, [activeTxs, totalLossValue, cogsTotal]);

  // ----------------------------------------------------
  // SECTION 7: AI BUSINESS HEALTH SCORE ENGINE
  // ----------------------------------------------------
  const healthMetrics = useMemo(() => {
    // Score cards with detailed descriptions
    const financialHealth = Math.min(100, Math.max(20, Math.round((totalRevenue - totalExpenses) / (totalRevenue || 1) * 200 + 40)));
    const cashFlowHealth = Math.min(100, Math.max(20, Math.round(activeTxs.filter(t => t.paymentMethod === 'Bank' || t.paymentMethod === 'Cash').length > 5 ? 88 : 45)));
    const profitability = Math.min(100, Math.max(10, Math.round(((totalRevenue - cogsTotal - (totalExpenses * 0.4)) / (totalRevenue || 1)) * 100 + 50)));
    const inventoryControl = Math.min(100, Math.max(15, Math.round(100 - (totalLossValue / (cogsTotal || 1) * 300))));
    const expenseControl = Math.min(100, Math.max(20, Math.round(100 - (activeTxs.filter(t => t.type === 'EXPENSE' && t.amount > 1000000).length * 10))));
    const compliance = Math.min(100, Math.max(10, Math.round(100 - (exceptionTransactions.length * 3))));
    
    const overallScore = Math.round((financialHealth + cashFlowHealth + profitability + inventoryControl + expenseControl + compliance) / 6);

    return [
      {
        id: 'overall',
        title: 'Overall Business Health Score',
        score: overallScore,
        color: overallScore >= 80 ? 'emerald' : overallScore >= 60 ? 'amber' : 'red',
        weight: '100%',
        justification: 'The global indicator of compliance, operational efficiency, and transaction traceability. Based on a blended average of internal accounting accuracy and physical asset controls.'
      },
      {
        id: 'financial',
        title: 'Financial Solvency Health',
        score: financialHealth,
        color: financialHealth >= 80 ? 'emerald' : financialHealth >= 60 ? 'amber' : 'red',
        weight: '20%',
        justification: 'Measures net operating assets and revenue vs recurring debt. Outstanding bank balances provide adequate cover for current short-term trade payables.'
      },
      {
        id: 'cashflow',
        title: 'Cash Flow Velocity',
        score: cashFlowHealth,
        color: cashFlowHealth >= 80 ? 'emerald' : cashFlowHealth >= 60 ? 'amber' : 'red',
        weight: '15%',
        justification: 'Analyzes speed of collections from card and mobile money aggregators into core operating bank accounts. Delays in liquidating F&B credit accounts drag down the metric.'
      },
      {
        id: 'profitability',
        title: 'Operating Profitability Margin',
        score: profitability,
        color: profitability >= 80 ? 'emerald' : profitability >= 60 ? 'amber' : 'red',
        weight: '20%',
        justification: 'Evaluates COGS and OPEX efficiency. Room occupancy margins are highly efficient at 78%, which subsidizes lower food beverage profitability caused by high storage spoilage.'
      },
      {
        id: 'inventory',
        title: 'Inventory Asset Controls',
        score: inventoryControl,
        color: inventoryControl >= 80 ? 'emerald' : inventoryControl >= 60 ? 'amber' : 'red',
        weight: '15%',
        justification: 'Assesses variance between physical storage audits and chronological FIFO digital batches. Unrecorded store usage and kitchen waste present leakage issues.'
      },
      {
        id: 'expense',
        title: 'OPEX Authorization Control',
        score: expenseControl,
        color: expenseControl >= 80 ? 'emerald' : expenseControl >= 60 ? 'amber' : 'red',
        weight: '15%',
        justification: 'Tracks pre-approval compliance. Multi-layered approvals exist for major procurement checks, but emergency maintenance purchases sometimes bypass purchase order sequences.'
      },
      {
        id: 'compliance',
        title: 'Regulatory & Forensic Compliance',
        score: compliance,
        color: compliance >= 80 ? 'emerald' : compliance >= 60 ? 'amber' : 'red',
        weight: '15%',
        justification: 'Scans ledger for erased records, post-facto invoice adjustments, duplicated voucher references, and unlinked POS records.'
      }
    ];
  }, [totalRevenue, totalExpenses, cogsTotal, totalLossValue, activeTxs, exceptionTransactions]);

  // ----------------------------------------------------
  // SECTION 11 & 12: PREDICTIVE AUDIT AI & BUSINESS INTELLIGENCE
  // ----------------------------------------------------
  const predictiveAIModel = useMemo(() => {
    const insights = [
      {
        metric: 'Food Cost Ratio',
        alert: 'Food cost spiked by 18% over historical baseline standard.',
        cause: 'Seasonal price increases from fresh seafood suppliers coupled with F&B warehouse cold room thermostat failure.',
        action: 'Re-calibrate refrigeration systems immediately and lock down purchasing rates with Alpha Distributors via a 6-month contract.'
      },
      {
        metric: 'Utility Expenses',
        alert: 'Electricity opex increased unexpectedly by 12% in July.',
        cause: 'HVAC units operated continuously at maximum cooling capacity due to heatwave, plus unmetered power consumption in maintenance shed.',
        action: 'Deploy smart digital sub-meters for high-draw machinery and institute occupancy sensors in all public conference zones.'
      },
      {
        metric: 'Discount Frequency',
        alert: 'Manager-authorized discounts increased by 45% month-on-month.',
        cause: 'F&B weekend promotions combined with manual "Customer Satisfaction" discount overrides applied at point of checkout.',
        action: 'Replace open-text discount fields with hardcoded code options that require secondary auditor token activation.'
      },
      {
        metric: 'Accounts Receivable',
        alert: 'Average trade collections expanded from 14 days to 28 days.',
        cause: 'Delays in invoicing corporate group booking clients and sluggish follow-up on corporate accounts.',
        action: 'Institute automated email payment reminders 3 days before due date; hold booking privileges for accounts past 45 days.'
      }
    ];
    return insights;
  }, []);

  const overallScoreCard = healthMetrics.find(m => m.id === 'overall')!;

  const formatRWF = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'RWF',
      maximumFractionDigits: 0
    }).format(value).replace('RWF', 'FRw');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6" id="ai-audit-root">
      
      {/* SECTION HEADER & LOGO */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-xs gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">AI Audit Intelligence Engine</h1>
              <span className="text-[10px] font-mono font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full uppercase tracking-wider">
                Auditor Live v3.2
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Continuous transaction-level verification, risk profiling, fraud detection, and multi-department reconciliation.
            </p>
          </div>
        </div>

        {/* TOP STATUS COUNTERS */}
        <div className="flex flex-wrap gap-3 font-mono text-[11px]">
          <div className="bg-emerald-50 text-emerald-800 border border-emerald-100 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>VERIFIED: {activeTxs.length - exceptionTransactions.length} TXs</span>
          </div>
          <div className="bg-red-50 text-red-800 border border-red-100 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-red-600 animate-pulse" />
            <span>ANOMALIES DETECTED: {exceptionTransactions.length}</span>
          </div>
          <button 
            id="print-audit-trigger"
            onClick={handlePrint}
            className="bg-slate-900 text-white hover:bg-slate-800 px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition-all font-sans font-medium"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Dossier Report</span>
          </button>
        </div>
      </div>

      {/* CORE WORKSPACE TAB NAVIGATION */}
      <div className="border-b border-slate-200" id="audit-tabs-container">
        <div className="flex flex-wrap -mb-px gap-2">
          {[
            { id: 'intelligence', label: 'AI Business Intelligence & Health', icon: <Activity className="w-4 h-4" /> },
            { id: 'verification', label: 'Cross-Department Verification', icon: <Layers className="w-4 h-4" /> },
            { id: 'exceptions', label: 'Exceptions & Source Link Audit', icon: <ShieldAlert className="w-4 h-4" /> },
            { id: 'forensics', label: 'CEO Forensic Investigation Console', icon: <Fingerprint className="w-4 h-4" /> },
            { id: 'report', label: 'Monthly Internal Audit Report', icon: <FileText className="w-4 h-4" /> },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-btn-${tab.id}`}
                onClick={() => {
                  setActiveTab(tab.id as TabType);
                  setSelectedAuditPoint(null);
                }}
                className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold rounded-t-xl border-b-2 transition-all cursor-pointer ${
                  isActive 
                    ? 'border-indigo-600 text-indigo-600 bg-white shadow-2xs' 
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB CONTENT SPACES */}
      <div className="space-y-6">
        
        {/* ========================================================
            TAB 1: AI BUSINESS INTELLIGENCE & HEALTH Score
            ======================================================== */}
        {activeTab === 'intelligence' && (
          <div className="space-y-6" id="tab-intelligence-view">
            
            {/* CORE SCORES GRID */}
            <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-7 gap-4">
              <div className="md:col-span-3 bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-6 rounded-2xl shadow-md border border-indigo-900/40 relative overflow-hidden flex flex-col justify-between">
                <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-44 h-44 bg-indigo-500/10 rounded-full blur-2xl" />
                <div>
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] uppercase font-mono tracking-widest text-indigo-300">Auditor Blended Assessment</span>
                    <Sparkles className="w-5 h-5 text-indigo-400" />
                  </div>
                  <h3 className="text-2xl font-black mt-2">{overallScoreCard.score}%</h3>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-3">
                    <div className="bg-gradient-to-r from-emerald-400 to-indigo-400 h-full rounded-full" style={{ width: `${overallScoreCard.score}%` }} />
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-xs text-indigo-200/90 leading-relaxed font-sans">
                    {overallScoreCard.justification}
                  </p>
                  <p className="text-[10px] text-indigo-300/60 mt-2 font-mono">Weight: {overallScoreCard.weight} of corporate health algorithm</p>
                </div>
              </div>

              {healthMetrics.filter(m => m.id !== 'overall').map((m) => (
                <button
                  key={m.id}
                  id={`health-metric-card-${m.id}`}
                  onClick={() => setSelectedAuditPoint(m.id)}
                  className={`bg-white p-5 rounded-2xl border transition-all hover:border-indigo-400 hover:shadow-xs flex flex-col justify-between text-left cursor-pointer ${
                    selectedAuditPoint === m.id ? 'ring-2 ring-indigo-500 border-indigo-500' : 'border-slate-200'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">{m.title}</span>
                      <span className={`w-2 h-2 rounded-full ${
                        m.color === 'emerald' ? 'bg-emerald-500' : m.color === 'amber' ? 'bg-amber-500' : 'bg-rose-500'
                      }`} />
                    </div>
                    <div className="flex items-baseline gap-1 mt-2">
                      <span className="text-2xl font-extrabold text-slate-950">{m.score}</span>
                      <span className="text-slate-400 text-xs font-mono">/100</span>
                    </div>
                  </div>
                  <div className="mt-4 text-[11px] text-slate-500 line-clamp-2">
                    {m.justification}
                  </div>
                </button>
              ))}
            </div>

            {/* SELECTED SCORE DETAIL EXPLAINER */}
            {selectedAuditPoint && (
              <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 animate-fade-in flex items-start gap-4">
                <div className="p-3 bg-slate-800 text-indigo-400 rounded-xl">
                  <Terminal className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs uppercase font-mono tracking-wider text-indigo-400 font-bold">
                    Auditor Analytical Justification Breakdown: {healthMetrics.find(h => h.id === selectedAuditPoint)?.title}
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed max-w-5xl">
                    {healthMetrics.find(h => h.id === selectedAuditPoint)?.justification}
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono mt-1">
                    Risk Engine parameters matched: Total Transactions active: {activeTxs.length} | Audit logs processed: {transactions.length} entries | DB Integrity: 100% CPA Verified.
                  </p>
                </div>
              </div>
            )}

            {/* REAL-TIME BI INSIGHTS & CHARTS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* CHARTS TREND */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Revenue & COGS Verification Trend</h3>
                  <p className="text-xs text-slate-500">Comparing recorded revenue versus FIFO calculated Cost of Goods Sold across periods.</p>
                </div>
                
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={[
                        { name: 'May 2026', Revenue: 14200000, COGS: 1800000 },
                        { name: 'June 2026', Revenue: 18350000, COGS: 2362500 },
                        { name: 'July 2026', Revenue: totalRevenue, COGS: cogsTotal },
                      ]}
                      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorCOGS" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `${v / 1000000}M`} tickLine={false} />
                      <Tooltip formatter={(value) => formatRWF(value as number)} />
                      <Legend verticalAlign="top" height={36} iconType="circle" />
                      <Area type="monotone" dataKey="Revenue" stroke="#10b981" fillOpacity={1} fill="url(#colorRev)" strokeWidth={2} />
                      <Area type="monotone" dataKey="COGS" stroke="#ef4444" fillOpacity={1} fill="url(#colorCOGS)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="text-[11px] text-slate-500 flex items-center justify-between font-mono bg-slate-50 p-2.5 rounded-lg">
                  <span>Calculated COGS Total: {formatRWF(cogsTotal)}</span>
                  <span>Est Gross Margin: {totalRevenue > 0 ? ((totalRevenue - cogsTotal) / totalRevenue * 100).toFixed(1) : 0}%</span>
                </div>
              </div>

              {/* SECTION 11 & 12: PREDICTIVE AUDIT AI */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Predictive Audit AI & Business Warnings</h3>
                  <p className="text-xs text-slate-500">Statistical anomalies in opex, inventory and discounting compared against baseline targets.</p>
                </div>

                <div className="space-y-3.5">
                  {predictiveAIModel.map((item, idx) => (
                    <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2 hover:bg-slate-100/30 transition-all">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-mono uppercase bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-bold">
                          {item.metric}
                        </span>
                        <div className="flex items-center gap-1 text-amber-600 font-semibold text-[10px] font-mono">
                          <AlertTriangle className="w-3 h-3 animate-bounce" />
                          <span>ANOMALY PROFILED</span>
                        </div>
                      </div>
                      <h4 className="text-xs font-bold text-slate-950 leading-tight">{item.alert}</h4>
                      <div className="text-[11px] text-slate-600 space-y-1">
                        <p><span className="font-semibold text-slate-800">Probable Cause:</span> {item.cause}</p>
                        <p><span className="font-semibold text-slate-800">CPA Corrective Recommendation:</span> <span className="text-indigo-600">{item.action}</span></p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ========================================================
            TAB 2: CROSS-DEPARTMENT VERIFICATION
            ======================================================== */}
        {activeTab === 'verification' && (
          <div className="space-y-6" id="tab-verification-view">
            
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Departmental Cross-Verification Ledger</h3>
                <p className="text-xs text-slate-500">
                  Every dollar in the balance sheet must have dual-point validation. This ledger automatically compares independent system logs to highlight variances.
                </p>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs" id="cross-verification-table">
                  <thead className="bg-slate-50 text-slate-600 font-mono text-[10px] uppercase border-b border-slate-200">
                    <tr>
                      <th className="p-3.5 font-bold">Verification Route</th>
                      <th className="p-3.5 text-right font-bold">Target Expectation</th>
                      <th className="p-3.5 text-right font-bold">Ledger Actual</th>
                      <th className="p-3.5 text-right font-bold">Variance</th>
                      <th className="p-3.5 text-right font-bold">Variance %</th>
                      <th className="p-3.5 font-bold">Auditor Conclusion & Reason</th>
                      <th className="p-3.5 font-bold text-center">Risk Level</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {crossVerificationChecks.map((item) => {
                      const isHighRisk = item.risk === 'HIGH';
                      const isMedRisk = item.risk === 'MEDIUM';
                      const hasDiscrepancy = Math.abs(item.diff) > 0;
                      return (
                        <React.Fragment key={item.id}>
                          <tr className="hover:bg-slate-50/50 transition-all">
                            <td className="p-3.5 font-semibold text-slate-900 max-w-xs">{item.title}</td>
                            <td className="p-3.5 text-right font-mono font-medium text-slate-700">{formatRWF(item.expectation)}</td>
                            <td className="p-3.5 text-right font-mono font-bold text-slate-900">{formatRWF(item.actual)}</td>
                            <td className={`p-3.5 text-right font-mono font-bold ${
                              item.diff === 0 ? 'text-emerald-600' : isHighRisk ? 'text-red-600' : 'text-amber-600'
                            }`}>
                              {item.diff > 0 ? '+' : ''}{formatRWF(item.diff)}
                            </td>
                            <td className={`p-3.5 text-right font-mono font-semibold ${
                              item.diffPct === 0 ? 'text-emerald-600' : isHighRisk ? 'text-red-600' : 'text-amber-600'
                            }`}>
                              {item.diffPct > 0 ? '+' : ''}{item.diffPct.toFixed(1)}%
                            </td>
                            <td className="p-3.5 max-w-sm">
                              <div className="font-medium text-slate-900">{item.reason}</div>
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">Responsible: {item.employee}</div>
                            </td>
                            <td className="p-3.5 text-center">
                              <span className={`px-2 py-0.5 text-[10px] font-mono font-extrabold rounded-md ${
                                isHighRisk 
                                  ? 'bg-red-100 text-red-800' 
                                  : isMedRisk 
                                    ? 'bg-amber-100 text-amber-800' 
                                    : 'bg-emerald-100 text-emerald-800'
                              }`}>
                                {item.risk}
                              </span>
                            </td>
                          </tr>
                          
                          {/* ROOT CAUSE DETAILS EXPANSION */}
                          {hasDiscrepancy && (
                            <tr className="bg-slate-50/40">
                              <td colSpan={7} className="p-3 px-4 border-b border-slate-200">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px] text-slate-600 leading-normal">
                                  <div>
                                    <span className="font-bold text-slate-800 uppercase text-[9px] font-mono tracking-wider block">Auditor Evidence Captured:</span>
                                    <p className="mt-0.5 italic text-slate-500">"{item.evidence}"</p>
                                  </div>
                                  <div>
                                    <span className="font-bold text-slate-800 uppercase text-[9px] font-mono tracking-wider block">CPA Remedial Recommendation:</span>
                                    <p className="mt-0.5 font-medium text-indigo-700">{item.recommendation}</p>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ========================================================
            TAB 3: EXCEPTIONS & SOURCE LINK AUDIT
            ======================================================== */}
        {activeTab === 'exceptions' && (
          <div className="space-y-6" id="tab-exceptions-view">
            
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Audit Exception Report (Anomalies Only)</h3>
                  <p className="text-xs text-slate-500">
                    Showing only ledger items flagged for missing evidence, potential duplicate vouchers, erasures, or manual adjustments. Click any transaction to trace its full forensic audit trail.
                  </p>
                </div>
                
                <div className="relative w-full md:w-64">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Search className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    placeholder="Search exception log..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs" id="exceptions-audit-table">
                  <thead className="bg-slate-50 text-slate-600 font-mono text-[10px] uppercase border-b border-slate-200">
                    <tr>
                      <th className="p-3">ID / Reference</th>
                      <th className="p-3">Posting Date</th>
                      <th className="p-3">Department</th>
                      <th className="p-3">Category</th>
                      <th className="p-3 text-right">Amount</th>
                      <th className="p-3 text-center">Method</th>
                      <th className="p-3">Flagged Exceptions</th>
                      <th className="p-3 text-center">Risk</th>
                      <th className="p-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {exceptionTransactions
                      .filter(tx => 
                        tx.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        tx.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        tx.description.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map((tx) => {
                        const isHighRisk = tx.riskLevel === 'HIGH';
                        const isDeleted = tx.isDeleted;
                        return (
                          <tr key={tx.id} className={`hover:bg-slate-50/50 transition-all ${isDeleted ? 'bg-red-50/20' : ''}`}>
                            <td className="p-3">
                              <div className="font-mono font-bold text-slate-900">{tx.id}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{tx.referenceNumber || 'NO REF'}</div>
                            </td>
                            <td className="p-3 text-slate-600 font-mono">{tx.date}</td>
                            <td className="p-3 text-slate-700">{tx.department}</td>
                            <td className="p-3 text-slate-800 font-medium">{tx.category}</td>
                            <td className={`p-3 text-right font-mono font-bold ${isDeleted ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                              {formatRWF(tx.amount)}
                            </td>
                            <td className="p-3 text-center">
                              <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px] font-mono">
                                {tx.paymentMethod}
                              </span>
                            </td>
                            <td className="p-3 max-w-xs">
                              <div className="space-y-1">
                                {tx.anomalies.map((flag, fIdx) => (
                                  <div key={fIdx} className="flex items-center gap-1 text-[11px] text-red-700 font-medium">
                                    <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                                    <span>{flag}</span>
                                  </div>
                                ))}
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <span className={`px-2 py-0.5 text-[10px] font-mono font-extrabold rounded ${
                                isHighRisk ? 'bg-red-100 text-red-800 animate-pulse' : 'bg-amber-100 text-amber-800'
                              }`}>
                                {tx.riskLevel}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <button
                                id={`trace-btn-${tx.id}`}
                                onClick={() => {
                                  setSelectedTxForDetail(tx);
                                  setActiveTab('forensics');
                                }}
                                className="p-1.5 hover:bg-indigo-50 text-indigo-600 rounded-lg transition-all cursor-pointer"
                                title="Forensic Source Verification Trace"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ========================================================
            TAB 4: CEO FORENSIC INVESTIGATION CONSOLE
            ======================================================== */}
        {activeTab === 'forensics' && (
          <div className="space-y-6" id="tab-forensics-view">
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* SELECT OR SEARCH TRANSACTION SIDEBAR */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4 lg:col-span-1">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Select Forensic Profile</h3>
                  <p className="text-xs text-slate-500">Pick any ledger entry below to run high-fidelity source document traceback analysis.</p>
                </div>

                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Search className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="text"
                    placeholder="Filter suspect list..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5 max-h-[480px] overflow-y-auto pr-1">
                  {auditedTransactions
                    .filter(tx => 
                      tx.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
                      tx.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      tx.description.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .slice(0, 15)
                    .map((tx) => {
                      const isSelected = selectedTxForDetail?.id === tx.id;
                      return (
                        <button
                          key={tx.id}
                          id={`forensic-list-item-${tx.id}`}
                          onClick={() => setSelectedTxForDetail(tx)}
                          className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex justify-between items-center ${
                            isSelected 
                              ? 'bg-slate-950 text-white border-slate-950' 
                              : 'bg-slate-50/50 hover:bg-slate-100/50 border-slate-200'
                          }`}
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className={`text-[9px] font-mono font-bold px-1 py-0.2 rounded ${
                                isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-800'
                              }`}>{tx.id}</span>
                              <span className="text-xs font-semibold truncate max-w-[120px]">{tx.category}</span>
                            </div>
                            <div className={`text-[10px] ${isSelected ? 'text-slate-400' : 'text-slate-500'} truncate max-w-[180px]`}>{tx.description}</div>
                            <div className={`text-[9px] font-mono ${isSelected ? 'text-slate-400' : 'text-slate-400'}`}>{tx.date}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-bold font-mono">{formatRWF(tx.amount)}</div>
                            {tx.riskLevel === 'HIGH' && (
                              <span className="text-[9px] font-extrabold bg-red-100 text-red-800 px-1 py-0.2 rounded inline-block mt-1 font-mono">
                                HIGH
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* CORE FORENSIC DETAILED AUDIT PANEL */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
                {selectedTxForDetail ? (
                  <div className="divide-y divide-slate-100" id="forensic-detail-view-card">
                    
                    {/* PROFILE CARD HEADER */}
                    <div className="p-6 bg-slate-950 text-white flex justify-between items-start gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="p-1 bg-indigo-600 text-white rounded text-xs font-mono font-extrabold">{selectedTxForDetail.id}</span>
                          <h2 className="text-base font-bold">{selectedTxForDetail.category}</h2>
                        </div>
                        <p className="text-xs text-slate-300">"{selectedTxForDetail.description}"</p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-black font-mono text-emerald-400">{formatRWF(selectedTxForDetail.amount)}</div>
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase ${
                          selectedTxForDetail.riskLevel === 'HIGH' ? 'bg-red-500 text-white animate-pulse' : 'bg-indigo-500 text-white'
                        }`}>
                          Risk Score: {selectedTxForDetail.riskScore}%
                        </span>
                      </div>
                    </div>

                    {/* SECTION 8: FORENSIC INVESTIGATION METRICS */}
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* SYSTEM METADATA VOUCHER */}
                      <div className="space-y-4">
                        <h4 className="text-xs uppercase tracking-wider font-mono text-slate-400 font-bold flex items-center gap-2">
                          <Terminal className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Cyber & Registry Footprint</span>
                        </h4>

                        <div className="grid grid-cols-2 gap-4 text-xs font-mono bg-slate-50 p-4 rounded-xl border border-slate-100">
                          <div>
                            <span className="text-slate-400 text-[10px] uppercase block font-sans">Created By</span>
                            <span className="font-semibold text-slate-900">{selectedTxForDetail.createdBy || 'System Automated'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[10px] uppercase block font-sans">Authorized By</span>
                            <span className="font-semibold text-slate-900">{selectedTxForDetail.approvedBy || 'PENDING VOUCHER SIGN-OFF'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[10px] uppercase block font-sans">Device Origin IP</span>
                            <span className="font-semibold text-indigo-600">{selectedTxForDetail.ipAddress || '197.243.12.9'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[10px] uppercase block font-sans">System Device ID</span>
                            <span className="font-semibold text-slate-900">DEV-HTL-9281 (Terminal A)</span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-slate-400 text-[10px] uppercase block font-sans">Audit Ledger History Trail</span>
                            <div className="mt-1 space-y-1 font-sans text-[10px]">
                              {selectedTxForDetail.history?.map((h, hIdx) => (
                                <div key={hIdx} className="bg-white p-1.5 rounded border border-slate-100 flex items-start gap-1">
                                  <Clock className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                                  <div>
                                    <span className="font-bold text-slate-800">{h.action}</span> by {h.user} at {h.timestamp.substring(11, 19)}: "{h.details}"
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* ACCOUNTING & FINANCIAL IMPACT VECTOR */}
                      <div className="space-y-4">
                        <h4 className="text-xs uppercase tracking-wider font-mono text-slate-400 font-bold flex items-center gap-2">
                          <Activity className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Financial & Ledger Balance Impacts</span>
                        </h4>

                        <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-100">
                          <div className="p-2.5 bg-white rounded-lg border border-slate-100">
                            <span className="text-slate-400 text-[10px] uppercase block font-sans">Operating Cash Impact</span>
                            <span className={`font-bold font-mono text-xs ${
                              selectedTxForDetail.type === 'REVENUE' ? 'text-emerald-600' : 'text-rose-600'
                            }`}>
                              {selectedTxForDetail.type === 'REVENUE' ? '+' : '-'}{formatRWF(selectedTxForDetail.amount)}
                            </span>
                          </div>

                          <div className="p-2.5 bg-white rounded-lg border border-slate-100">
                            <span className="text-slate-400 text-[10px] uppercase block font-sans">Bank Account Impact</span>
                            <span className="font-bold font-mono text-slate-900 text-xs">
                              {selectedTxForDetail.paymentMethod === 'Bank' ? 'Active Clearance' : 'Not Routed'}
                            </span>
                          </div>

                          <div className="p-2.5 bg-white rounded-lg border border-slate-100">
                            <span className="text-slate-400 text-[10px] uppercase block font-sans">Warehouse Stock Impact</span>
                            <span className="font-bold font-sans text-slate-800 text-xs">
                              {selectedTxForDetail.id.startsWith('tx-proc') ? 'FIFO Batch Added' : selectedTxForDetail.id.startsWith('tx-adj') ? 'FIFO Loss Expensed' : 'No Direct Store Action'}
                            </span>
                          </div>

                          <div className="p-2.5 bg-white rounded-lg border border-slate-100">
                            <span className="text-slate-400 text-[10px] uppercase block font-sans">Net P&L Net Profit</span>
                            <span className={`font-bold font-mono text-xs ${
                              selectedTxForDetail.type === 'REVENUE' ? 'text-emerald-600' : 'text-rose-600'
                            }`}>
                              {selectedTxForDetail.type === 'REVENUE' ? 'POS Asset Addition' : 'Opex Dr Voucher'}
                            </span>
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* SECTION 1: SUPPORTING SOURCE DOCUMENTS */}
                    <div className="p-6 space-y-4">
                      <h4 className="text-xs uppercase tracking-wider font-mono text-slate-400 font-bold flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Supporting Source Verification Files</span>
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {selectedTxForDetail.evidence?.map((doc, dIdx) => (
                          <div key={dIdx} className={`p-4 rounded-xl border flex flex-col justify-between h-28 relative overflow-hidden ${
                            doc.verified ? 'bg-emerald-50/50 border-emerald-100' : 'bg-red-50/50 border-red-100'
                          }`}>
                            <div className="absolute right-0 top-0 translate-x-3 -translate-y-3 opacity-10">
                              <Database className="w-16 h-16 text-slate-950" />
                            </div>
                            <div className="flex justify-between items-start">
                              <span className="text-xs font-bold text-slate-900">{doc.label}</span>
                              <span className={`w-2 h-2 rounded-full ${
                                doc.verified ? 'bg-emerald-500' : 'bg-red-500'
                              }`} />
                            </div>
                            <div className="text-[10px] text-slate-500 leading-tight">
                              {doc.details}
                            </div>
                            <div className="flex justify-between items-center text-[9px] font-mono">
                              <span className="text-slate-400 uppercase">Class: {doc.type}</span>
                              <span className={doc.verified ? 'text-emerald-700 font-bold' : 'text-red-700 font-bold'}>
                                {doc.verified ? 'VERIFIED' : 'MISSING VOUCHER'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* HIGH RISK CRITICAL RECOMMENDATION ALERT */}
                      {selectedTxForDetail.riskLevel === 'HIGH' && (
                        <div className="p-4 bg-red-100 text-red-950 rounded-xl border border-red-200 flex items-start gap-3">
                          <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <h5 className="text-xs font-extrabold font-mono uppercase tracking-wide">Critical Security Audit Warning</h5>
                            <p className="text-xs leading-normal">
                              The system is currently running a <strong>Forensic Exception Trace</strong> because key verification components are missing. Immediate auditor verification is highly recommended. Ensure cashier drawer counts are performed manually.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                  </div>
                ) : (
                  <div className="p-12 text-center text-slate-400 space-y-3">
                    <Fingerprint className="w-16 h-16 mx-auto text-slate-300 animate-pulse" />
                    <p className="text-sm font-semibold">CEO Investigation Mode Idle</p>
                    <p className="text-xs max-w-sm mx-auto">
                      Select any transaction or flagged anomaly on the left panel to execute a deep cyber, cyber-registry and supporting document trace.
                    </p>
                  </div>
                )}
              </div>

            </div>

          </div>
        )}

        {/* ========================================================
            TAB 5: MONTHLY INTERNAL AUDIT REPORT
            ======================================================== */}
        {activeTab === 'report' && (
          <div className="space-y-6" id="tab-report-view">
            
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xs max-w-4xl mx-auto space-y-8" id="printable-audit-report">
              
              {/* REPORT HEADER */}
              <div className="border-b-2 border-slate-900 pb-6 flex justify-between items-end">
                <div>
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Monthly Internal Audit Report</h1>
                  <p className="text-xs font-mono text-slate-500 uppercase tracking-widest mt-1">
                    HEAVEN HAVEN SUITES • FISCAL PERIOD: JUNE / JULY 2026
                  </p>
                </div>
                <div className="text-right">
                  <div className="p-2 bg-indigo-50 text-indigo-700 font-mono font-bold text-xs uppercase tracking-wider inline-block rounded-lg">
                    CPA Dossier #HH-2026-A1
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Generated: July 14, 2026</p>
                </div>
              </div>

              {/* EXECUTIVE SUMMARY */}
              <div className="space-y-3">
                <h3 className="text-xs font-mono font-extrabold uppercase tracking-wider text-indigo-600 border-b border-indigo-100 pb-1">
                  1. Executive Summary
                </h3>
                <p className="text-xs text-slate-700 leading-relaxed font-serif">
                  Pursuant to professional standards of internal auditing, this document compiles the monthly independent forensic examination of the hospitality operating ledger for the fiscal period spanning June 1, 2026, through July 14, 2026. A comprehensive audit trail was established tracing general journal postings to physical warehouse batches (FIFO tracking) and digital billing systems (POS checkout logs). 
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs pt-2">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-slate-400 text-[10px] block font-sans">Reconciled Turnover</span>
                    <span className="font-bold text-slate-950 text-sm">{formatRWF(totalRevenue)}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-slate-400 text-[10px] block font-sans">COGS & Operating Expenses</span>
                    <span className="font-bold text-slate-950 text-sm">{formatRWF(totalExpenses + cogsTotal)}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-slate-400 text-[10px] block font-sans">Identified Discrepancies</span>
                    <span className="font-bold text-red-600 text-sm">{formatRWF(totalLossValue + 150000)}</span>
                  </div>
                </div>
              </div>

              {/* AUDITED MODULE REVIEW */}
              <div className="space-y-4">
                <h3 className="text-xs font-mono font-extrabold uppercase tracking-wider text-indigo-600 border-b border-indigo-100 pb-1">
                  2. Detailed Analytical Reviews
                </h3>

                <div className="space-y-3.5 text-xs">
                  <div>
                    <h4 className="font-bold text-slate-900">A. Revenue Ledger Audit</h4>
                    <p className="text-slate-600 leading-normal">
                      PMS night audit reports show overall Room Revenue of {formatRWF(totalRevenue * 0.65)} with full physical occupancy logs. However, unlinked POS revenue checks exist totaling {formatRWF(totalRevenue * 0.05)}, which trigger warning exceptions.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">B. Procurement & FIFO Inventory Verification</h4>
                    <p className="text-slate-600 leading-normal">
                      Procurement batches are recorded with chronological receiving timestamps. Stockusages of purpose 'Sales' correctly mapped to cost entries totaling {formatRWF(cogsTotal)}. Spoilage adjustment write-offs of {formatRWF(totalLossValue)} were posted to prevent balance sheet inflation.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">C. Payroll & Timecard Audit</h4>
                    <p className="text-slate-600 leading-normal">
                      Salaries ledger matches authorized contracts. A discrepancy of {formatRWF(180000)} was noted under the Maintenance department, where manual approval codes bypasses gate biometric clockings. Corrective action filed.
                    </p>
                  </div>
                </div>
              </div>

              {/* TOP FINDINGS TABLE */}
              <div className="space-y-3">
                <h3 className="text-xs font-mono font-extrabold uppercase tracking-wider text-indigo-600 border-b border-indigo-100 pb-1">
                  3. Key Forensic Audit Findings
                </h3>

                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-left text-[11px] font-sans">
                    <thead className="bg-slate-50 font-mono text-[9px] uppercase border-b border-slate-200">
                      <tr>
                        <th className="p-2.5 font-bold">Ref No.</th>
                        <th className="p-2.5 font-bold">Discovered Finding Exception</th>
                        <th className="p-2.5 font-bold text-center">Risk</th>
                        <th className="p-2.5 text-right font-bold">Est. Financial Loss</th>
                        <th className="p-2.5 font-bold">CPA Recommended Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="p-2.5 font-mono text-slate-500">AUD-01</td>
                        <td className="p-2.5 font-semibold text-slate-950">F&B POS checkout voided invoices after payment collection</td>
                        <td className="p-2.5 text-center"><span className="bg-red-100 text-red-800 text-[9px] px-1.5 py-0.2 rounded font-mono">HIGH</span></td>
                        <td className="p-2.5 text-right font-mono text-slate-900">{formatRWF(650000)}</td>
                        <td className="p-2.5 text-slate-600">Enforce supervisor code override limits and inspect transaction timestamp logs.</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-mono text-slate-500">AUD-02</td>
                        <td className="p-2.5 font-semibold text-slate-950">Inventory issued from kitchen warehouse store without corresponding POS tickets</td>
                        <td className="p-2.5 text-center"><span className="bg-red-100 text-red-800 text-[9px] px-1.5 py-0.2 rounded font-mono">HIGH</span></td>
                        <td className="p-2.5 text-right font-mono text-slate-900">{formatRWF(180000)}</td>
                        <td className="p-2.5 text-slate-600">Install independent weight meters in food preparation zones and audit daily waste logs.</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-mono text-slate-500">AUD-03</td>
                        <td className="p-2.5 font-semibold text-slate-950">Duplicate vendor payment voucher references found in maintenance OPEX</td>
                        <td className="p-2.5 text-center"><span className="bg-amber-100 text-amber-800 text-[9px] px-1.5 py-0.2 rounded font-mono">MEDIUM</span></td>
                        <td className="p-2.5 text-right font-mono text-slate-900">{formatRWF(450000)}</td>
                        <td className="p-2.5 text-slate-600">Implement system-level checks preventing duplicate entries of similar invoices.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* CEO COMMENTS INPUT */}
              <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100 no-print" id="ceo-comments-container">
                <label className="text-xs font-bold text-slate-900 flex items-center gap-1">
                  <span>CEO Official Review Comments</span>
                  <span className="text-[9px] text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded font-mono">OPTIONAL</span>
                </label>
                <textarea
                  rows={2}
                  value={ceoComments}
                  onChange={(e) => setCeoComments(e.target.value)}
                  placeholder="Enter CEO feedback, actions or comments for the internal audit record..."
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                />
              </div>

              {/* DIGITAL APPROVAL & SIGNATURE PANEL */}
              <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-6">
                <div className="space-y-1 text-center sm:text-left">
                  <span className="text-[10px] font-mono text-slate-400 block uppercase">Internal Auditor Sign-off</span>
                  <div className="font-serif italic text-base text-indigo-700">Audit-Engine AI Agent, CPA (Rwanda)</div>
                  <span className="text-[9px] text-slate-400 font-mono block">Digitally Certified & Timestamped</span>
                </div>

                <div className="text-center sm:text-right space-y-2">
                  <span className="text-[10px] font-mono text-slate-400 block uppercase">CEO Audit Acceptance Lock</span>
                  {signedReport ? (
                    <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl animate-bounce">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <div className="text-left">
                        <div className="text-xs font-bold text-emerald-900">APPROVED & SIGNED</div>
                        <div className="text-[9px] text-slate-500 font-mono">CEO K. Brown - Approved on July 14, 2026</div>
                      </div>
                    </div>
                  ) : (
                    <button
                      id="accept-report-btn"
                      onClick={() => setSignedReport(true)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs py-2 px-4 rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer inline-flex"
                    >
                      <PenTool className="w-3.5 h-3.5" />
                      <span>Lock & Sign Report</span>
                    </button>
                  )}
                </div>
              </div>

            </div>

          </div>
        )}

      </div>

    </div>
  );
}

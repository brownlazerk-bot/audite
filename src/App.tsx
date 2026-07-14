/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Building, 
  ShieldAlert, 
  Coins, 
  History, 
  Scale, 
  ShoppingCart, 
  PiggyBank, 
  BookOpen, 
  Bell,
  CheckCircle,
  Menu,
  TrendingUp,
  ChevronRight,
  Sparkles,
  FileText
} from 'lucide-react';

import { Transaction, InventoryBatch, StockUsage, AuditAlert, PaymentMethod } from './types';
import { 
  INITIAL_TRANSACTIONS, 
  INITIAL_INVENTORY_BATCHES, 
  INITIAL_STOCK_USAGES, 
  INITIAL_ALERTS,
  INITIAL_INVENTORY_ITEMS
} from './data/initialData';
import { INITIAL_MASTER_ITEMS, MasterInventoryItem } from './data/masterItemsSeed';

// Pages
import Dashboard from './components/Dashboard';
import AiAuditEngine from './components/AiAuditEngine';
import AiDocumentIntelligence from './components/AiDocumentIntelligence';
import RevenueModule from './components/RevenueModule';
import ExpenseModule from './components/ExpenseModule';
import OwnerEquityModule from './components/OwnerEquityModule';
import InventoryModule from './components/InventoryModule';
import FinancialStatements from './components/FinancialStatements';
import ManagerVerification from './components/ManagerVerification';
import AuditLogModule from './components/AuditLogModule';
import AlertsPanel from './components/AlertsPanel';

type ActivePage = 
  | 'dashboard' 
  | 'aiaudit'
  | 'aidoc'
  | 'revenue' 
  | 'expense' 
  | 'equity' 
  | 'inventory' 
  | 'statements' 
  | 'verify' 
  | 'auditlog' 
  | 'alerts';

export default function App() {
  const [activePage, setActivePage] = useState<ActivePage>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // --- STATE ---
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [batches, setBatches] = useState<InventoryBatch[]>(INITIAL_INVENTORY_BATCHES);
  const [usages, setUsages] = useState<StockUsage[]>(INITIAL_STOCK_USAGES);
  const [alerts, setAlerts] = useState<AuditAlert[]>(INITIAL_ALERTS);

  // Dynamic state for Master Inventory Catalog items
  const [masterItems, setMasterItems] = useState<MasterInventoryItem[]>(() => {
    // Map initial legacy items to MasterInventoryItem format for backward compatibility
    const originalMapped: MasterInventoryItem[] = INITIAL_INVENTORY_ITEMS.map(item => {
      const matchedSeed = INITIAL_MASTER_ITEMS.find(m => m.name.toLowerCase().includes(item.name.toLowerCase().split(' ')[0]));
      return {
        id: item.id,
        code: matchedSeed?.code || `ALC-${item.id.toUpperCase()}`,
        sku: matchedSeed?.sku || `SKU-${item.id.toUpperCase()}`,
        barcode: matchedSeed?.barcode || `BAR-${item.id}`,
        qrCode: matchedSeed?.qrCode || `QR-${item.id}`,
        name: item.name,
        category: matchedSeed?.category || (item.category === 'Food' ? 'Restaurant Menu' : (item.category === 'Beverages' ? 'Alcoholic Beverages' : item.category as string)),
        subcategory: matchedSeed?.subcategory || 'General',
        brand: matchedSeed?.brand || 'Hotel Supply',
        unit: item.unit,
        purchasePrice: matchedSeed?.purchasePrice || (item.id === 'inv-001' ? 15000 : item.id === 'inv-003' ? 1200 : 2500),
        sellingPrice: matchedSeed?.sellingPrice || (item.id === 'inv-001' ? 22000 : item.id === 'inv-003' ? 1800 : 4500),
        averageCost: matchedSeed?.purchasePrice || (item.id === 'inv-001' ? 15000 : item.id === 'inv-003' ? 1200 : 2500),
        openingStock: matchedSeed?.openingStock || 100,
        minimumStock: item.minStockLevel || 10,
        maximumStock: matchedSeed?.maximumStock || 500,
        reorderLevel: matchedSeed?.reorderLevel || 30,
        supplier: matchedSeed?.supplier || 'General Supplier',
        tax: matchedSeed?.tax || 18,
        storageLocation: matchedSeed?.storageLocation || 'Main Store',
        description: matchedSeed?.description || item.name,
        status: 'Active' as const,
      };
    });

    // Filter out duplicates from seed that we've already mapped
    const remainingSeeds = INITIAL_MASTER_ITEMS.filter(seed => {
      // Heineken is inv-003
      if (seed.name.includes("Heineken")) return false;
      // Cooking Oil is inv-006 (and matched to inv-006)
      if (seed.name.includes("Cooking Oil")) return false;
      return true;
    });

    return [...originalMapped, ...remainingSeeds];
  });

  const formatRWF = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'RWF',
      maximumFractionDigits: 0
    }).format(value).replace('RWF', 'FRw');
  };

  // --- MUTATORS & TRANSACTIONS ENGINE ---

  // Add general journal entry
  const handleAddTransaction = (newTx: Omit<Transaction, 'id' | 'createdAt' | 'createdBy' | 'ipAddress' | 'history'> & { editReason?: string; deleteReason?: string }) => {
    const todayStr = new Date().toISOString();
    const id = `tx-gen-${Math.floor(1000 + Math.random() * 9000)}`;
    const authorizer = 'CEO K. Brown';
    const ip = '197.243.12.9';

    const tx: Transaction = {
      ...newTx,
      id,
      createdAt: todayStr,
      createdBy: authorizer,
      ipAddress: ip,
      history: [
        {
          action: 'CREATED',
          timestamp: todayStr,
          user: authorizer,
          details: `Manual posting to ${newTx.category} registry. Reference: ${newTx.referenceNumber}`,
          ipAddress: ip
        }
      ]
    };

    setTransactions(prev => [tx, ...prev]);

    // If it's a budget overrun or suspicious category, check if we need to alert the CEO
    if (newTx.type === 'EXPENSE' && newTx.amount > 2000000) {
      const alertId = `al-gen-${Math.floor(1000 + Math.random() * 9000)}`;
      const alert: AuditAlert = {
        id: alertId,
        timestamp: todayStr,
        severity: 'WARNING',
        type: 'BUDGET_EXCEEDED',
        title: 'Large Corporate Expense Logged',
        description: `Expense categorized under "${newTx.category}" of value ${formatRWF(newTx.amount)} was posted. Verify purchase voucher sign-off.`,
        resolved: false
      };
      setAlerts(prev => [alert, ...prev]);
    }
  };

  // Edit general transaction (Auditor corrections)
  const handleEditTransaction = (id: string, updatedFields: Partial<Transaction>, reason: string) => {
    const todayStr = new Date().toISOString();
    const user = 'CEO K. Brown';
    const ip = '197.243.12.9';

    setTransactions(prev => prev.map(tx => {
      if (tx.id === id) {
        const historyItem = {
          action: 'EDITED' as const,
          timestamp: todayStr,
          user,
          details: `Corrected field values. Reason: "${reason}"`,
          ipAddress: ip
        };

        return {
          ...tx,
          ...updatedFields,
          history: [...tx.history, historyItem]
        };
      }
      return tx;
    }));
  };

  // Soft-Delete transaction (Undeletable internal audit control)
  const handleDeleteTransaction = (id: string, reason: string) => {
    const todayStr = new Date().toISOString();
    const user = 'CEO K. Brown';
    const ip = '197.243.12.9';

    setTransactions(prev => prev.map(tx => {
      if (tx.id === id) {
        const historyItem = {
          action: 'MARKED_DELETED' as const,
          timestamp: todayStr,
          user,
          details: `Soft-deleted / voided from ledger. Audit justification: "${reason}"`,
          ipAddress: ip
        };

        return {
          ...tx,
          isDeleted: true,
          deletedAt: todayStr,
          deletedBy: user,
          deleteReason: reason,
          history: [...tx.history, historyItem]
        };
      }
      return tx;
    }));

    // Trigger Critical alert for Voided Invoice
    const targetTx = transactions.find(t => t.id === id);
    if (targetTx) {
      const alert: AuditAlert = {
        id: `al-void-${id}`,
        timestamp: todayStr,
        severity: 'CRITICAL',
        type: 'DELETED_TRANSACTION',
        title: 'Transaction Soft-Deleted (Voided)',
        description: `Ledger entry "${targetTx.category}" for ${formatRWF(targetTx.amount)} was de-recognized. Reason: "${reason}"`,
        resolved: false
      };
      setAlerts(prev => [alert, ...prev]);
    }
  };

  // Restore transaction (Re-recognize)
  const handleRestoreTransaction = (id: string) => {
    const todayStr = new Date().toISOString();
    const user = 'CEO K. Brown';
    const ip = '197.243.12.9';

    setTransactions(prev => prev.map(tx => {
      if (tx.id === id) {
        const historyItem = {
          action: 'RESTORED' as const,
          timestamp: todayStr,
          user,
          details: 'Restored from void state. Re-recognized on Balance Sheet.',
          ipAddress: ip
        };

        return {
          ...tx,
          isDeleted: false,
          deletedAt: undefined,
          deletedBy: undefined,
          deleteReason: undefined,
          history: [...tx.history, historyItem]
        };
      }
      return tx;
    }));
  };

  // --- FIFO PROCUREMENT WORKFLOW ---
  // When check-in stock, we add a batch and automatically post a corresponding Expense transaction to keep ledger equal!
  const handleAddProcurement = (newBatch: Omit<InventoryBatch, 'id'>, paymentMethod: PaymentMethod) => {
    const todayStr = new Date().toISOString();
    const batchId = `bat-gen-${Math.floor(1000 + Math.random() * 9000)}`;
    const user = 'CEO K. Brown';
    const ip = '197.243.12.9';

    const batch: InventoryBatch = {
      ...newBatch,
      id: batchId
    };

    // Add batch
    setBatches(prev => [...prev, batch]);

    // Also post Expense entry to keep ledger balanced!
    const txCategory = newBatch.category === 'Food' ? 'Food Purchases' : 'Beverage Purchases';
    const totalAmount = newBatch.quantityPurchased * newBatch.unitPrice;

    const txId = `tx-proc-${Math.floor(1000 + Math.random() * 9000)}`;
    const tx: Transaction = {
      id: txId,
      date: newBatch.dateReceived,
      type: 'EXPENSE',
      category: txCategory,
      department: 'F&B',
      description: `Procured stock: ${newBatch.quantityPurchased} units of ${newBatch.itemName}. Batch ID: ${batchId}`,
      amount: totalAmount,
      paymentMethod,
      referenceNumber: newBatch.referenceNo,
      approvedBy: 'Manager J. Kabera',
      status: 'Completed',
      createdAt: todayStr,
      createdBy: user,
      ipAddress: ip,
      history: [
        {
          action: 'CREATED',
          timestamp: todayStr,
          user,
          details: `Automatic expense allocation from stock procurement batch check-in.`,
          ipAddress: ip
        }
      ]
    };

    setTransactions(prev => [tx, ...prev]);
  };

  // --- FIFO USAGE WORKFLOW (CHRONOLOGICAL BATCH CONSUMPTION) ---
  const handleAddStockUsage = (newUsage: Omit<StockUsage, 'id'>) => {
    const usageId = `usg-gen-${Math.floor(1000 + Math.random() * 9000)}`;
    const usage: StockUsage = {
      ...newUsage,
      id: usageId
    };

    // Add usage record
    setUsages(prev => [...prev, usage]);

    // Live consumption inside batches (FIFO ORDER)
    setBatches(prevBatches => {
      // Find batches for this item and sort chronologically
      const itemBatches = prevBatches
        .filter(b => b.itemId === newUsage.itemId)
        .sort((a, b) => a.dateReceived.localeCompare(b.dateReceived));

      let remainingToConsume = newUsage.quantityUsed;

      return prevBatches.map(b => {
        if (b.itemId === newUsage.itemId && remainingToConsume > 0) {
          const take = Math.min(b.quantityRemaining, remainingToConsume);
          remainingToConsume -= take;
          return {
            ...b,
            quantityRemaining: b.quantityRemaining - take
          };
        }
        return b;
      });
    });

    // Check if this usage is a loss/waste/spoilage, and if so post an internal adjusting loss voucher!
    if (['Waste', 'Expired', 'Missing'].includes(newUsage.purpose)) {
      // Calculate loss value based on the item's first active batch price
      const activeBatch = batches.find(b => b.itemId === newUsage.itemId && b.quantityRemaining > 0);
      const unitCost = activeBatch ? activeBatch.unitPrice : 1500; // default
      const totalLossValue = newUsage.quantityUsed * unitCost;

      const todayStr = new Date().toISOString();
      const user = 'CEO K. Brown';
      const ip = '197.243.12.9';

      const tx: Transaction = {
        id: `tx-adj-${Math.floor(1000 + Math.random() * 9000)}`,
        date: newUsage.date,
        type: 'EXPENSE',
        category: 'Miscellaneous',
        department: 'F&B',
        description: `Stocktake adjusting loss voucher for ${newUsage.purpose}: ${newUsage.reason || 'Spoilage'}`,
        amount: totalLossValue,
        paymentMethod: 'Cash',
        referenceNumber: `ADJ-USG-${usageId.substring(4)}`,
        approvedBy: 'Manager J. Kabera',
        status: 'Completed',
        createdAt: todayStr,
        createdBy: user,
        ipAddress: ip,
        history: [
          {
            action: 'CREATED',
            timestamp: todayStr,
            user,
            details: `Internal accounting adjust entry for inventory write-off: ${newUsage.purpose}`,
            ipAddress: ip
          }
        ]
      };

      setTransactions(prev => [tx, ...prev]);

      // Trigger warning alert for wastage
      if (totalLossValue > 100000) {
        const alert: AuditAlert = {
          id: `al-waste-${usageId}`,
          timestamp: todayStr,
          severity: 'WARNING',
          type: 'NEGATIVE_STOCK',
          title: 'High Food Spoilage Logged',
          description: `Loss of ${newUsage.quantityUsed} units detected. Value: ${formatRWF(totalLossValue)}. Reason: ${newUsage.reason || 'Unspecified'}`,
          resolved: false
        };
        setAlerts(prev => [alert, ...prev]);
      }
    }
  };

  // --- RESOLVE ALERTS ---
  const handleResolveAlert = (id: string, comment: string) => {
    const todayStr = new Date().toISOString();
    setAlerts(prev => prev.map(a => {
      if (a.id === id) {
        return {
          ...a,
          resolved: true,
          resolvedAt: todayStr,
          resolvedBy: 'CEO K. Brown',
          resolutionComment: comment
        };
      }
      return a;
    }));
  };

  // --- WIPE DATABASE / START FRESH ---
  const handleWipeDatabase = (options: { clearInventoryOnly: boolean }) => {
    setMasterItems([]);
    setBatches([]);
    setUsages([]);
    if (!options.clearInventoryOnly) {
      setTransactions([]);
      setAlerts([]);
    }
  };

  // Navigation Items
  const menuItems = [
    { id: 'dashboard', label: 'CEO Dashboard', icon: <Building className="w-4 h-4" /> },
    { id: 'aiaudit', label: 'AI Audit Intelligence', icon: <Sparkles className="w-4 h-4 text-indigo-600 animate-pulse" /> },
    { id: 'aidoc', label: 'AI Doc Intelligence', icon: <FileText className="w-4 h-4 text-indigo-500" /> },
    { id: 'revenue', label: 'Revenue Ledger', icon: <Coins className="w-4 h-4 text-emerald-600" /> },
    { id: 'expense', label: 'Expense Ledger', icon: <Coins className="w-4 h-4 text-rose-600" /> },
    { id: 'inventory', label: 'FIFO Inventory & COGS', icon: <ShoppingCart className="w-4 h-4 text-cyan-600" /> },
    { id: 'equity', label: 'Owner Capital & Equity', icon: <PiggyBank className="w-4 h-4 text-teal-600" /> },
    { id: 'statements', label: 'Financial Statements', icon: <BookOpen className="w-4 h-4 text-slate-700" /> },
    { id: 'verify', label: 'Report Reconciliation', icon: <ShieldAlert className="w-4 h-4 text-red-600 animate-pulse" /> },
    { id: 'alerts', label: 'CEO Alert Centre', icon: <Bell className="w-4 h-4 text-amber-500" /> },
    { id: 'auditlog', label: 'Forensic Audit Logs', icon: <History className="w-4 h-4 text-indigo-600" /> },
  ] as const;

  // Unresolved alerts count
  const unresolvedAlertsCount = alerts.filter(a => !a.resolved).length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* CORPORATE NAV TOP-BAR */}
      <header className="bg-slate-900 text-white h-16 shrink-0 flex items-center justify-between px-6 border-b border-slate-800 z-30">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1 text-slate-400 hover:text-white rounded-lg focus:outline-none"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-gradient-to-tr from-teal-500 to-emerald-500 rounded-lg shadow-sm">
              <Building className="w-4 h-4 text-slate-950 font-bold" />
            </span>
            <div>
              <h1 className="text-sm font-extrabold tracking-wider uppercase">Heaven Haven Suites</h1>
              <p className="text-[10px] text-slate-400 font-mono tracking-widest">Internal Controls Dashboard</p>
            </div>
          </div>
        </div>

        {/* TOP STATUS ROW */}
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-400 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>SECURED (CPA COMPLIANT)</span>
          </div>

          <button 
            onClick={() => setActivePage('alerts')}
            className="relative p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
          >
            <Bell className="w-4.5 h-4.5" />
            {unresolvedAlertsCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-red-600 text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-slate-900 animate-bounce">
                {unresolvedAlertsCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* CORE FRAME LAYOUT */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* SIDEBAR NAVIGATION PANEL */}
        <aside className={`bg-white border-r border-slate-200 w-64 shrink-0 transition-all duration-300 z-20 flex flex-col justify-between ${
          sidebarOpen ? 'translate-x-0 ml-0' : '-translate-x-full -ml-64'
        }`}>
          <div className="p-4 space-y-1.5">
            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider pl-3 pb-2">
              Auditor Workspaces
            </div>
            
            <nav className="space-y-1">
              {menuItems.map((item) => {
                const isActive = activePage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActivePage(item.id)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold tracking-tight transition-all text-left ${
                      isActive 
                        ? 'bg-slate-950 text-white shadow-xs' 
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {item.icon}
                      <span>{item.label}</span>
                    </div>
                    {item.id === 'alerts' && unresolvedAlertsCount > 0 && (
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                        isActive ? 'bg-red-500 text-white' : 'bg-red-100 text-red-800'
                      }`}>
                        {unresolvedAlertsCount}
                      </span>
                    )}
                    {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-60" />}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* SIDEBAR FOOTER */}
          <div className="p-4 border-t border-slate-100 bg-slate-50 text-[10px] text-slate-400 font-mono space-y-1">
            <p>User: CEO K. Brown</p>
            <p>Access Level: Internal Auditor</p>
            <p>DB State: Reconciled</p>
          </div>
        </aside>

        {/* MAIN WORKSPACE SCREEN CONTENT */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
          {activePage === 'dashboard' && (
            <Dashboard 
              transactions={transactions} 
              batches={batches}
              usages={usages}
              alerts={alerts}
              onNavigate={(page) => setActivePage(page as ActivePage)} 
            />
          )}

          {activePage === 'aiaudit' && (
            <AiAuditEngine 
              transactions={transactions}
              batches={batches}
              usages={usages}
              alerts={alerts}
            />
          )}

          {activePage === 'aidoc' && (
            <AiDocumentIntelligence 
              transactions={transactions}
              batches={batches}
              usages={usages}
              alerts={alerts}
            />
          )}

          {activePage === 'revenue' && (
            <RevenueModule 
              transactions={transactions} 
              onAddTransaction={handleAddTransaction}
              onSoftDeleteTransaction={handleDeleteTransaction}
            />
          )}

          {activePage === 'expense' && (
            <ExpenseModule 
              transactions={transactions} 
              onAddTransaction={handleAddTransaction}
              onSoftDeleteTransaction={handleDeleteTransaction}
            />
          )}

          {activePage === 'inventory' && (
            <InventoryModule 
              batches={batches}
              usages={usages}
              transactions={transactions}
              onAddProcurement={handleAddProcurement}
              onAddStockUsage={handleAddStockUsage}
              masterItems={masterItems}
              onUpdateMasterItems={setMasterItems}
              onWipeDatabase={handleWipeDatabase}
            />
          )}

          {activePage === 'equity' && (
            <OwnerEquityModule 
              transactions={transactions} 
              onAddTransaction={handleAddTransaction}
            />
          )}

          {activePage === 'statements' && (
            <FinancialStatements 
              transactions={transactions}
              batches={batches}
              usages={usages}
            />
          )}

          {activePage === 'verify' && (
            <ManagerVerification 
              transactions={transactions}
              batches={batches}
              usages={usages}
            />
          )}

          {activePage === 'alerts' && (
            <AlertsPanel 
              alerts={alerts}
              transactions={transactions}
              batches={batches}
              onResolveAlert={handleResolveAlert}
            />
          )}

          {activePage === 'auditlog' && (
            <AuditLogModule 
              transactions={transactions} 
              onRestoreTransaction={handleRestoreTransaction}
            />
          )}
        </main>
      </div>
    </div>
  );
}


/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Transaction, InventoryBatch, StockUsage } from '../types';

/**
 * Calculates FIFO Cost of Goods Sold (COGS) based on stock usages of purpose 'Sales'.
 * Under FIFO, the oldest available batches are consumed first.
 */
export function calculateFIFOCOGS(usages: StockUsage[], batches: InventoryBatch[]): number {
  let cogsTotal = 0;
  
  // We want to calculate the cost for each stock usage of purpose 'Sales'
  const salesUsages = usages.filter(u => u.purpose === 'Sales');
  
  // Create a deep copy of batches to simulate consumption over the sales
  const simulatedBatches = JSON.parse(JSON.stringify(batches)) as InventoryBatch[];
  
  // Group usages by itemId and sort chronologically to apply FIFO
  const sortedUsages = [...salesUsages].sort((a, b) => a.date.localeCompare(b.date));
  
  for (const usage of sortedUsages) {
    let remainingToCost = usage.quantityUsed;
    
    // Find batches for this item, sorted by dateReceived (FIFO order)
    const itemBatches = simulatedBatches
      .filter(b => b.itemId === usage.itemId)
      .sort((a, b) => a.dateReceived.localeCompare(b.dateReceived));
      
    for (const batch of itemBatches) {
      if (remainingToCost <= 0) break;
      if (batch.quantityRemaining <= 0) continue;
      
      const take = Math.min(batch.quantityRemaining, remainingToCost);
      cogsTotal += take * batch.unitPrice;
      batch.quantityRemaining -= take;
      remainingToCost -= take;
    }
  }
  
  return cogsTotal;
}

/**
 * Calculates losses due to waste, expired items, and missing items based on FIFO stock usages.
 */
export function calculateInventoryLosses(usages: StockUsage[], batches: InventoryBatch[]): {
  wasteCost: number;
  expiredCost: number;
  missingCost: number;
} {
  let wasteCost = 0;
  let expiredCost = 0;
  let missingCost = 0;
  
  const simulatedBatches = JSON.parse(JSON.stringify(batches)) as InventoryBatch[];
  const nonSalesUsages = usages.filter(u => u.purpose !== 'Sales');
  const sortedUsages = [...nonSalesUsages].sort((a, b) => a.date.localeCompare(b.date));
  
  for (const usage of sortedUsages) {
    let remainingToCost = usage.quantityUsed;
    const itemBatches = simulatedBatches
      .filter(b => b.itemId === usage.itemId)
      .sort((a, b) => a.dateReceived.localeCompare(b.dateReceived));
      
    for (const batch of itemBatches) {
      if (remainingToCost <= 0) break;
      if (batch.quantityRemaining <= 0) continue;
      
      const take = Math.min(batch.quantityRemaining, remainingToCost);
      const cost = take * batch.unitPrice;
      
      if (usage.purpose === 'Waste') wasteCost += cost;
      else if (usage.purpose === 'Expired') expiredCost += cost;
      else if (usage.purpose === 'Missing') missingCost += cost;
      
      batch.quantityRemaining -= take;
      remainingToCost -= take;
    }
  }
  
  return { wasteCost, expiredCost, missingCost };
}

/**
 * Calculates current Inventory Value based on remaining quantities in batches.
 */
export function calculateCurrentInventoryValue(batches: InventoryBatch[]): number {
  return batches.reduce((sum, b) => sum + (b.quantityRemaining * b.unitPrice), 0);
}

/**
 * Calculates opening inventory value at start of period
 * For the preloaded data, let's assume it was the sum of purchased quantities
 * before the current active sales.
 */
export function calculateOpeningInventoryValue(batches: InventoryBatch[]): number {
  return batches.reduce((sum, b) => sum + (b.quantityPurchased * b.unitPrice), 0);
}

/**
 * Extracts and sums up transactions of a specific type and optionally category, in a date range.
 */
export function sumTransactions(
  transactions: Transaction[],
  type: Transaction['type'],
  options?: { category?: string; department?: string; startDate?: string; endDate?: string }
): number {
  return transactions
    .filter(tx => {
      if (tx.isDeleted) return false;
      if (tx.type !== type) return false;
      if (options?.category && tx.category !== options.category) return false;
      if (options?.department && tx.department !== options.department) return false;
      if (options?.startDate && tx.date < options.startDate) return false;
      if (options?.endDate && tx.date > options.endDate) return false;
      return true;
    })
    .reduce((sum, tx) => sum + tx.amount, 0);
}

/**
 * Evaluates the Financial Health Score (0 - 100) based on standard audit metrics:
 * - Gross Profit Margin (Higher is better, Weight 25)
 * - Net Profit Margin (Positive is better, Weight 25)
 * - Cash-to-Liability Ratio / Quick Ratio (Weight 20)
 * - Operating Expense Ratio (Lower is better, Weight 15)
 * - Audit Trail Cleanness: lack of deleted or unapproved records (Weight 15)
 */
export function evaluateFinancialHealthScore(
  totalRevenue: number,
  netProfit: number,
  cogs: number,
  opex: number,
  cashAndBank: number,
  payables: number,
  alerts: { severity: string; resolved: boolean }[]
): number {
  if (totalRevenue <= 0) return 50; // default middle
  
  // 1. Gross Profit Margin score (Target: >60%)
  const gp = totalRevenue - cogs;
  const gpMargin = gp / totalRevenue;
  const gpScore = Math.min(100, Math.max(0, gpMargin * 130)); // 60% GP margin gives ~78 points
  
  // 2. Net Profit Margin score (Target: >20%)
  const npMargin = netProfit / totalRevenue;
  const npScore = npMargin > 0 ? Math.min(100, npMargin * 400) : 0; // 20% NP margin gives 80 points
  
  // 3. Quick Ratio (Cash / Current Payables). Target: >1.5
  const quickRatio = payables > 0 ? cashAndBank / payables : 3;
  const qrScore = Math.min(100, (quickRatio / 2) * 100);
  
  // 4. Operating Expense Ratio (Target: <40%)
  const opexRatio = opex / totalRevenue;
  const opexScore = Math.max(0, 100 - (opexRatio * 150)); // 30% opex ratio gives 55 points
  
  // 5. Audit Compliance score (Deductions for unresolved warnings/critical alerts)
  const unresolvedCritical = alerts.filter(a => a.severity === 'CRITICAL' && !a.resolved).length;
  const unresolvedWarning = alerts.filter(a => a.severity === 'WARNING' && !a.resolved).length;
  const auditScore = Math.max(0, 100 - (unresolvedCritical * 15) - (unresolvedWarning * 5));
  
  const finalScore = Math.round(
    (gpScore * 0.25) +
    (npScore * 0.25) +
    (qrScore * 0.20) +
    (opexScore * 0.15) +
    (auditScore * 0.15)
  );
  
  return Math.min(100, Math.max(0, finalScore));
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef } from 'react';
import { 
  Package, 
  Plus, 
  Calendar, 
  Tag, 
  TrendingUp, 
  ShoppingCart, 
  Trash2, 
  AlertTriangle, 
  Activity,
  UserCheck,
  CheckCircle,
  AlertCircle,
  FileText,
  Search,
  Download,
  Upload,
  Filter,
  Check,
  Edit,
  X,
  FileSpreadsheet,
  Sparkles,
  RefreshCw,
  TrendingDown,
  Info,
  DollarSign,
  ChevronRight,
  Sliders,
  Layers,
  ArrowUpDown,
  Barcode,
  Grid
} from 'lucide-react';
import { InventoryBatch, StockUsage, PaymentMethod, Transaction } from '../types';
import { MasterInventoryItem } from '../data/masterItemsSeed';
import * as XLSX from 'xlsx';

interface InventoryModuleProps {
  batches: InventoryBatch[];
  usages: StockUsage[];
  transactions: Transaction[];
  onAddProcurement: (batch: Omit<InventoryBatch, 'id'>, paymentMethod: PaymentMethod) => void;
  onAddStockUsage: (usage: Omit<StockUsage, 'id'>) => void;
  masterItems: MasterInventoryItem[];
  onUpdateMasterItems: React.Dispatch<React.SetStateAction<MasterInventoryItem[]>>;
  onWipeDatabase?: (options: { clearInventoryOnly: boolean }) => void;
}

type ActiveTab = 'catalog' | 'procurement' | 'usage' | 'audit' | 'profitability' | 'summary';

export default function InventoryModule({ 
  batches, 
  usages, 
  transactions, 
  onAddProcurement, 
  onAddStockUsage,
  masterItems,
  onUpdateMasterItems,
  onWipeDatabase 
}: InventoryModuleProps) {
  
  const [activeTab, setActiveTab] = useState<ActiveTab>('catalog');
  const [showWipeModal, setShowWipeModal] = useState(false);
  
  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStockLevel, setSelectedStockLevel] = useState<'all' | 'low' | 'out' | 'normal'>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'Active' | 'Inactive'>('all');
  
  // Custom Dynamic Categories
  const [customCategories, setCustomCategories] = useState<string[]>([
    'Alcoholic Beverages',
    'Soft Drinks & Water',
    'Wines & Spirits',
    'Restaurant Menu',
    'Kitchen Ingredients',
    'Breakfast',
    'Desserts',
    'Cleaning Supplies',
    'Office Supplies',
    'Assets',
    'Maintenance'
  ]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showCategoryForm, setShowCategoryForm] = useState(false);

  // Notifications
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);

  // Manual Add/Edit Item modal
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MasterInventoryItem | null>(null);
  
  // Form States for Add/Edit
  const [itemName, setItemName] = useState('');
  const [itemCategory, setItemCategory] = useState('Alcoholic Beverages');
  const [itemSubcategory, setItemSubcategory] = useState('');
  const [itemBrand, setItemBrand] = useState('');
  const [itemUnit, setItemUnit] = useState('Bottle');
  const [itemPurchasePrice, setItemPurchasePrice] = useState('');
  const [itemSellingPrice, setItemSellingPrice] = useState('');
  const [itemOpeningStock, setItemOpeningStock] = useState('');
  const [itemMinStock, setItemMinStock] = useState('');
  const [itemMaxStock, setItemMaxStock] = useState('');
  const [itemReorderLevel, setItemReorderLevel] = useState('');
  const [itemSupplier, setItemSupplier] = useState('');
  const [itemTax, setItemTax] = useState('18');
  const [itemStorageLocation, setItemStorageLocation] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [itemStatus, setItemStatus] = useState<'Active' | 'Inactive'>('Active');

  // Excel Import States
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importPreview, setImportPreview] = useState<any[] | null>(null);
  const [importErrors, setImportErrors] = useState<{ row: number; msg: string; severity: 'critical' | 'warning' }[] | null>(null);
  const [importMode, setImportMode] = useState<'insert' | 'update'>('insert'); // 'insert' for Excel Import, 'update' for Bulk Update

  // Physical Count input states (for Audit Variance)
  const [physicalCounts, setPhysicalCounts] = useState<Record<string, string>>({});
  
  // Toast trigger helper
  const triggerNotification = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  // ----------------------------------------------------
  // DYNAMIC COMPREHENSIVE ITEM-LEVEL STATISTICS
  // ----------------------------------------------------
  const auditedItems = useMemo(() => {
    return masterItems.map(item => {
      // 1. Opening
      const opening = item.openingStock || 0;

      // 2. Purchased & Received (from batches)
      const itemBatches = batches.filter(b => b.itemId === item.id);
      const purchased = itemBatches.reduce((sum, b) => sum + b.quantityPurchased, 0);
      const received = purchased;

      // 3. Stock usages by purpose
      const itemUsages = usages.filter(u => u.itemId === item.id);
      const sold = itemUsages.filter(u => u.purpose === 'Sales').reduce((sum, u) => sum + u.quantityUsed, 0);
      const complimentary = itemUsages.filter(u => u.purpose === 'Complimentary').reduce((sum, u) => sum + u.quantityUsed, 0);
      const returned = itemUsages.filter(u => u.purpose === 'Returned').reduce((sum, u) => sum + u.quantityUsed, 0); // returned to stock
      const damaged = itemUsages.filter(u => u.purpose === 'Damaged').reduce((sum, u) => sum + u.quantityUsed, 0);
      const expired = itemUsages.filter(u => u.purpose === 'Expired').reduce((sum, u) => sum + u.quantityUsed, 0);
      const waste = itemUsages.filter(u => u.purpose === 'Waste').reduce((sum, u) => sum + u.quantityUsed, 0);
      const missing = itemUsages.filter(u => u.purpose === 'Missing').reduce((sum, u) => sum + u.quantityUsed, 0);

      // 4. Closing Quantity (Calculated)
      const closing = Math.max(0, opening + purchased - sold - complimentary - damaged - expired - waste - missing + returned);

      // 5. Physical Count & Variance
      const hasPhysicalInput = physicalCounts[item.id] !== undefined && physicalCounts[item.id] !== '';
      const physicalCount = hasPhysicalInput ? Number(physicalCounts[item.id]) : closing;
      const variance = physicalCount - closing;
      const variancePercent = closing > 0 ? (variance / closing) * 100 : 0;

      // 6. Financial Costs
      const purchaseCost = itemBatches.reduce((sum, b) => sum + (b.quantityPurchased * b.unitPrice), 0) || (purchased * item.purchasePrice);
      const salesRevenue = sold * item.sellingPrice;

      // 7. FIFO Cost of Goods Sold (COGS)
      // We simulate FIFO calculation based on the actual sales usages and batches
      let cogs = 0;
      let remainingToAllocate = sold;
      // Deep clone batches of this item
      const clonedBatches = itemBatches.map(b => ({ ...b })).sort((a, b) => a.dateReceived.localeCompare(b.dateReceived));
      
      for (const batch of clonedBatches) {
        if (remainingToAllocate <= 0) break;
        const take = Math.min(batch.quantityRemaining, remainingToAllocate);
        cogs += take * batch.unitPrice;
        remainingToAllocate -= take;
      }
      // If we sold more than what batches can cover, use current purchase price for excess
      if (remainingToAllocate > 0) {
        cogs += remainingToAllocate * item.purchasePrice;
      }

      // 8. Profits
      const grossProfit = salesRevenue - cogs;
      // Net Profit accounts for sales revenue, COGS, and lost stock cost
      const totalLostQty = damaged + expired + waste + missing;
      const lostStockCost = totalLostQty * item.purchasePrice;
      const netProfit = grossProfit - lostStockCost;

      // 9. Velocity Metrics
      const avgDailySales = Number((sold / 30).toFixed(2));
      const avgMonthlySales = sold;
      const daysRemaining = avgDailySales > 0 ? Math.ceil(closing / avgDailySales) : 999;

      // 10. Stock Aging Status
      const activeBatchCount = itemBatches.filter(b => b.quantityRemaining > 0).length;
      let aging = 'Active';
      if (sold === 0 && closing > 0) {
        aging = 'Dead (>90 days)';
      } else if (daysRemaining > 90) {
        aging = 'Slow (30-90 days)';
      } else if (daysRemaining <= 30) {
        aging = 'Fast Moving';
      }

      return {
        ...item,
        opening,
        purchased,
        received,
        sold,
        complimentary,
        returned,
        damaged,
        expired,
        waste,
        missing,
        closing,
        physicalCount,
        variance,
        variancePercent,
        purchaseCost,
        salesRevenue,
        cogs,
        grossProfit,
        netProfit,
        avgDailySales,
        avgMonthlySales,
        daysRemaining,
        aging,
        activeBatchCount
      };
    });
  }, [masterItems, batches, usages, physicalCounts]);

  // Total system profits for contribution calculations
  const totalSystemNetProfit = useMemo(() => {
    return auditedItems.reduce((sum, item) => sum + Math.max(0, item.netProfit), 0);
  }, [auditedItems]);

  // Final enriched audit list with Profit Contribution %
  const finalAuditedItems = useMemo(() => {
    return auditedItems.map(item => {
      const profitContribution = totalSystemNetProfit > 0 && item.netProfit > 0
        ? (item.netProfit / totalSystemNetProfit) * 100
        : 0;
      
      const inventoryValue = item.closing * item.purchasePrice;
      const inventoryTurnover = item.cogs / (((item.opening * item.purchasePrice) + inventoryValue) / 2 || 1);

      return {
        ...item,
        profitContribution,
        inventoryValue,
        inventoryTurnover
      };
    });
  }, [auditedItems, totalSystemNetProfit]);

  // ----------------------------------------------------
  // FILTERING AND SEARCHING
  // ----------------------------------------------------
  const filteredCatalogItems = useMemo(() => {
    return finalAuditedItems.filter(item => {
      const matchesSearch = 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.barcode && item.barcode.includes(searchTerm)) ||
        item.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.brand.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const matchesStatus = selectedStatus === 'all' || item.status === selectedStatus;
      
      let matchesStock = true;
      if (selectedStockLevel === 'out') {
        matchesStock = item.closing === 0;
      } else if (selectedStockLevel === 'low') {
        matchesStock = item.closing > 0 && item.closing <= item.minimumStock;
      } else if (selectedStockLevel === 'normal') {
        matchesStock = item.closing > item.minimumStock;
      }

      return matchesSearch && matchesCategory && matchesStatus && matchesStock;
    });
  }, [finalAuditedItems, searchTerm, selectedCategory, selectedStatus, selectedStockLevel]);

  // ----------------------------------------------------
  // DYNAMIC CATEGORY CREATION
  // ----------------------------------------------------
  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    if (customCategories.includes(newCategoryName.trim())) {
      triggerNotification('Category already exists!', 'error');
      return;
    }
    setCustomCategories(prev => [...prev, newCategoryName.trim()]);
    triggerNotification(`Category "${newCategoryName.trim()}" added successfully!`, 'success');
    setNewCategoryName('');
    setShowCategoryForm(false);
  };

  // ----------------------------------------------------
  // MANUAL ITEM MUTATION (ADD / EDIT)
  // ----------------------------------------------------
  const handleOpenAddModal = () => {
    setEditingItem(null);
    setItemName('');
    setItemCategory(customCategories[0] || 'Alcoholic Beverages');
    setItemSubcategory('');
    setItemBrand('');
    setItemUnit('Bottle');
    setItemPurchasePrice('');
    setItemSellingPrice('');
    setItemOpeningStock('100');
    setItemMinStock('20');
    setItemMaxStock('500');
    setItemReorderLevel('30');
    setItemSupplier('General Wholesalers');
    setItemTax('18');
    setItemStorageLocation('Main Store - Row A');
    setItemDescription('');
    setItemStatus('Active');
    setShowItemModal(true);
  };

  const handleOpenEditModal = (item: MasterInventoryItem) => {
    setEditingItem(item);
    setItemName(item.name);
    setItemCategory(item.category);
    setItemSubcategory(item.subcategory);
    setItemBrand(item.brand);
    setItemUnit(item.unit);
    setItemPurchasePrice(item.purchasePrice.toString());
    setItemSellingPrice(item.sellingPrice.toString());
    setItemOpeningStock(item.openingStock.toString());
    setItemMinStock(item.minimumStock.toString());
    setItemMaxStock(item.maximumStock.toString());
    setItemReorderLevel(item.reorderLevel.toString());
    setItemSupplier(item.supplier);
    setItemTax(item.tax.toString());
    setItemStorageLocation(item.storageLocation);
    setItemDescription(item.description);
    setItemStatus(item.status);
    setShowItemModal(true);
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim() || !itemPurchasePrice || !itemSellingPrice) {
      triggerNotification('Please provide a name, purchase price, and selling price.', 'error');
      return;
    }

    const pPrice = Number(itemPurchasePrice);
    const sPrice = Number(itemSellingPrice);
    if (isNaN(pPrice) || pPrice < 0 || isNaN(sPrice) || sPrice < 0) {
      triggerNotification('Prices must be valid non-negative numbers.', 'error');
      return;
    }

    if (editingItem) {
      // Edit mode
      onUpdateMasterItems(prev => prev.map(item => {
        if (item.id === editingItem.id) {
          return {
            ...item,
            name: itemName,
            category: itemCategory,
            subcategory: itemSubcategory,
            brand: itemBrand,
            unit: itemUnit,
            purchasePrice: pPrice,
            sellingPrice: sPrice,
            openingStock: Number(itemOpeningStock) || 0,
            minimumStock: Number(itemMinStock) || 0,
            maximumStock: Number(itemMaxStock) || 1000,
            reorderLevel: Number(itemReorderLevel) || 0,
            supplier: itemSupplier,
            tax: Number(itemTax) || 0,
            storageLocation: itemStorageLocation,
            description: itemDescription,
            status: itemStatus
          };
        }
        return item;
      }));
      triggerNotification(`Successfully updated item: ${itemName}`, 'success');
    } else {
      // Add mode
      const newItemId = `ITEM-${Math.floor(10000 + Math.random() * 90000)}`;
      const autoCode = `${itemCategory.substring(0, 3).toUpperCase()}-${itemName.substring(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
      
      const newItem: MasterInventoryItem = {
        id: newItemId,
        code: autoCode,
        sku: `SKU-${autoCode}`,
        barcode: `BAR-${Math.floor(100000000000 + Math.random() * 900000000000)}`,
        qrCode: `QR-${autoCode}`,
        name: itemName,
        category: itemCategory,
        subcategory: itemSubcategory || 'General',
        brand: itemBrand || 'Generic',
        unit: itemUnit,
        purchasePrice: pPrice,
        sellingPrice: sPrice,
        averageCost: pPrice,
        openingStock: Number(itemOpeningStock) || 0,
        minimumStock: Number(itemMinStock) || 0,
        maximumStock: Number(itemMaxStock) || 1000,
        reorderLevel: Number(itemReorderLevel) || 0,
        supplier: itemSupplier || 'General Supplier',
        tax: Number(itemTax) || 18,
        storageLocation: itemStorageLocation || 'Main Store',
        description: itemDescription || 'Dynamic Catalog Item',
        status: itemStatus
      };

      onUpdateMasterItems(prev => [...prev, newItem]);
      triggerNotification(`Successfully registered product: ${itemName} [Code: ${autoCode}]`, 'success');
    }

    setShowItemModal(false);
  };

  // ----------------------------------------------------
  // CLIENT EXCEL PARSER (IMPORT / BULK UPDATE)
  // ----------------------------------------------------
  const triggerFileSelector = (mode: 'insert' | 'update') => {
    setImportMode(mode);
    fileInputRef.current?.click();
  };

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Parse rows as raw json array
        const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet);
        
        if (rawRows.length === 0) {
          triggerNotification('The uploaded Excel sheet contains no records.', 'error');
          return;
        }

        // Validate rows
        const errors: { row: number; msg: string; severity: 'critical' | 'warning' }[] = [];
        const validatedRows: any[] = [];

        rawRows.forEach((row, index) => {
          const rowNum = index + 2; // Row number in sheet (header is row 1)
          
          const name = row['Item Name'] || row['name'] || row['ItemName'];
          const category = row['Category'] || row['category'];
          const purchasePrice = Number(row['Purchase Price'] || row['purchase_price'] || row['purchasePrice']);
          const sellingPrice = Number(row['Selling Price'] || row['selling_price'] || row['sellingPrice']);
          const code = row['Item Code'] || row['code'] || row['ItemCode'] || row['Code'];
          const sku = row['SKU'] || row['sku'];

          // CRITICAL VALIDATIONS
          if (importMode === 'insert' && !name) {
            errors.push({ row: rowNum, msg: 'Missing "Item Name"', severity: 'critical' });
          }
          if (importMode === 'insert' && !category) {
            errors.push({ row: rowNum, msg: 'Missing "Category"', severity: 'critical' });
          }
          if (importMode === 'update' && !code && !sku) {
            errors.push({ row: rowNum, msg: 'Missing both "Item Code" and "SKU" (At least one required for Bulk Update)', severity: 'critical' });
          }
          if (isNaN(purchasePrice) || purchasePrice < 0) {
            errors.push({ row: rowNum, msg: `Invalid Purchase Price: "${row['Purchase Price']}"`, severity: 'critical' });
          }
          if (isNaN(sellingPrice) || sellingPrice < 0) {
            errors.push({ row: rowNum, msg: `Invalid Selling Price: "${row['Selling Price']}"`, severity: 'critical' });
          }

          // WARNINGS (NON-BLOCKING)
          if (importMode === 'insert' && purchasePrice > sellingPrice && sellingPrice > 0) {
            errors.push({ row: rowNum, msg: `Purchase price (${purchasePrice}) is greater than Selling price (${sellingPrice}) (Expected Profit Negative!)`, severity: 'warning' });
          }
          const isCategoryExist = category && customCategories.some(c => c.toLowerCase() === category.toString().toLowerCase());
          if (category && !isCategoryExist) {
            errors.push({ row: rowNum, msg: `Category "${category}" is not configured in list. Will be added dynamically!`, severity: 'warning' });
          }

          // Check duplicate item names or codes within active masterItems
          if (importMode === 'insert') {
            const nameExists = masterItems.some(item => item.name.toLowerCase() === name?.toString().toLowerCase());
            if (nameExists) {
              errors.push({ row: rowNum, msg: `Duplicate Name: Product "${name}" already exists in Master Catalog.`, severity: 'warning' });
            }
          }

          validatedRows.push({
            name: name?.toString() || '',
            category: category?.toString() || '',
            subcategory: (row['Subcategory'] || row['subcategory'] || 'General').toString(),
            brand: (row['Brand'] || row['brand'] || 'Generic').toString(),
            unit: (row['Unit'] || row['unit'] || 'Bottle').toString(),
            purchasePrice: isNaN(purchasePrice) ? 0 : purchasePrice,
            sellingPrice: isNaN(sellingPrice) ? 0 : sellingPrice,
            openingStock: Number(row['Opening Stock'] || row['openingStock'] || 0) || 0,
            minimumStock: Number(row['Minimum Stock'] || row['minimumStock'] || 10) || 10,
            maximumStock: Number(row['Maximum Stock'] || row['maximumStock'] || 1000) || 1000,
            reorderLevel: Number(row['Reorder Level'] || row['reorderLevel'] || 20) || 20,
            supplier: (row['Supplier'] || row['supplier'] || 'General Supplier').toString(),
            tax: Number(row['Tax'] || row['tax'] || 18) || 18,
            storageLocation: (row['Storage Location'] || row['storageLocation'] || 'Store').toString(),
            description: (row['Description'] || row['description'] || 'Uploaded via Excel').toString(),
            code: code?.toString() || '',
            sku: sku?.toString() || ''
          });
        });

        setImportPreview(validatedRows);
        setImportErrors(errors.length > 0 ? errors : null);
        
        // Reset file input
        if (fileInputRef.current) fileInputRef.current.value = '';
      } catch (err) {
        console.error(err);
        triggerNotification('Failed to read Excel file. Please use a clean .xlsx format.', 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const confirmImport = () => {
    if (!importPreview || importPreview.length === 0) return;

    // Filter out rows with CRITICAL errors
    const criticalRows = importErrors ? importErrors.filter(e => e.severity === 'critical').map(e => e.row) : [];
    const validRowsToImport = importPreview.filter((_, idx) => !criticalRows.includes(idx + 2));

    if (validRowsToImport.length === 0) {
      triggerNotification('No valid rows available to import due to critical errors.', 'error');
      return;
    }

    if (importMode === 'insert') {
      // Create new items
      const newItems: MasterInventoryItem[] = validRowsToImport.map((row, idx) => {
        const newItemId = `ITEM-${Math.floor(20000 + Math.random() * 80000 + idx)}`;
        const autoCode = row.code || `${row.category.substring(0, 3).toUpperCase()}-${row.name.substring(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
        
        // Add dynamic category if it does not exist
        if (row.category && !customCategories.includes(row.category)) {
          setCustomCategories(prev => [...prev, row.category]);
        }

        return {
          id: newItemId,
          code: autoCode,
          sku: row.sku || `SKU-${autoCode}`,
          barcode: `BAR-${Math.floor(100000000000 + Math.random() * 900000000000)}`,
          qrCode: `QR-${autoCode}`,
          name: row.name,
          category: row.category,
          subcategory: row.subcategory,
          brand: row.brand,
          unit: row.unit,
          purchasePrice: row.purchasePrice,
          sellingPrice: row.sellingPrice,
          averageCost: row.purchasePrice,
          openingStock: row.openingStock,
          minimumStock: row.minimumStock,
          maximumStock: row.maximumStock,
          reorderLevel: row.reorderLevel,
          supplier: row.supplier,
          tax: row.tax,
          storageLocation: row.storageLocation,
          description: row.description,
          status: 'Active' as const
        };
      });

      onUpdateMasterItems(prev => [...prev, ...newItems]);
      triggerNotification(`Successfully imported ${newItems.length} products to Master Catalog!`, 'success');
    } else {
      // Bulk Update mode (uses Code or SKU to update matched records)
      let updatedCount = 0;
      onUpdateMasterItems(prev => prev.map(item => {
        const matchedRow = validRowsToImport.find(row => 
          (row.code && row.code.toLowerCase() === item.code.toLowerCase()) || 
          (row.sku && row.sku.toLowerCase() === item.sku.toLowerCase())
        );

        if (matchedRow) {
          updatedCount++;
          return {
            ...item,
            // Update prices, limits, and values if provided in sheet
            purchasePrice: matchedRow.purchasePrice > 0 ? matchedRow.purchasePrice : item.purchasePrice,
            sellingPrice: matchedRow.sellingPrice > 0 ? matchedRow.sellingPrice : item.sellingPrice,
            minimumStock: matchedRow.minimumStock !== 10 ? matchedRow.minimumStock : item.minimumStock,
            maximumStock: matchedRow.maximumStock !== 1000 ? matchedRow.maximumStock : item.maximumStock,
            reorderLevel: matchedRow.reorderLevel !== 20 ? matchedRow.reorderLevel : item.reorderLevel,
            storageLocation: matchedRow.storageLocation !== 'Store' ? matchedRow.storageLocation : item.storageLocation,
            supplier: matchedRow.supplier !== 'General Supplier' ? matchedRow.supplier : item.supplier,
            description: matchedRow.description !== 'Uploaded via Excel' ? matchedRow.description : item.description,
          };
        }
        return item;
      }));

      triggerNotification(`Bulk update complete! Updated ${updatedCount} products using Item Codes/SKUs.`, 'success');
    }

    // Clear previews
    setImportPreview(null);
    setImportErrors(null);
  };

  // ----------------------------------------------------
  // DOWNLOAD EXCEL TEMPLATE
  // ----------------------------------------------------
  const handleDownloadTemplate = () => {
    const headers = [
      "Item Name", "Category", "Subcategory", "Brand", "Unit", 
      "Purchase Price", "Selling Price", "Opening Stock", 
      "Minimum Stock", "Maximum Stock", "Reorder Level", "Supplier", 
      "Tax", "Storage Location", "Description", "Item Code", "SKU"
    ];

    const sampleRows = [
      {
        "Item Name": "Primus Beer (72cl Glass Bottle)",
        "Category": "Alcoholic Beverages",
        "Subcategory": "Beers",
        "Brand": "Bralirwa",
        "Unit": "Bottle",
        "Purchase Price": 900,
        "Selling Price": 1500,
        "Opening Stock": 120,
        "Minimum Stock": 48,
        "Maximum Stock": 480,
        "Reorder Level": 60,
        "Supplier": "Bralirwa Distributors",
        "Tax": 18,
        "Storage Location": "Bar Cellar - Row A",
        "Description": "Classic Rwandan beer.",
        "Item Code": "ALC-PRI-001",
        "SKU": "SKU-PRIMUS-G"
      },
      {
        "Item Name": "Akabenzi (Pork Chops Platter)",
        "Category": "Restaurant Menu",
        "Subcategory": "Plates",
        "Brand": "Hotel Kitchen",
        "Unit": "Plate",
        "Purchase Price": 2200,
        "Selling Price": 6500,
        "Opening Stock": 0,
        "Minimum Stock": 0,
        "Maximum Stock": 0,
        "Reorder Level": 0,
        "Supplier": "Hotel Kitchen",
        "Tax": 18,
        "Storage Location": "Main Kitchen",
        "Description": "Traditional pork fry.",
        "Item Code": "RES-AKA-033",
        "SKU": "SKU-AKABENZI-P"
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleRows, { header: headers });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "InventoryTemplate");
    
    // Write out download
    XLSX.writeFile(workbook, "Master_Inventory_Excel_Template.xlsx");
    triggerNotification("Template download initiated! Check your downloads directory.", "success");
  };

  // ----------------------------------------------------
  // EXCEL BULK EXPORT
  // ----------------------------------------------------
  const handleExportExcel = () => {
    // 1. Prepare flat dataset containing all requested catalog & audit fields
    const exportRows = finalAuditedItems.map((item, index) => ({
      "Rank": index + 1,
      "Item ID": item.id,
      "Code": item.code,
      "SKU": item.sku,
      "Barcode": item.barcode,
      "Product Name": item.name,
      "Category": item.category,
      "Subcategory": item.subcategory,
      "Brand": item.brand,
      "Unit": item.unit,
      "Supplier": item.supplier,
      "Storage Location": item.storageLocation,
      "Purchase Price (FRw)": item.purchasePrice,
      "Selling Price (FRw)": item.sellingPrice,
      "Tax Rate %": item.tax,
      "Opening Qty": item.opening,
      "Purchased Qty": item.purchased,
      "Received Qty": item.received,
      "Sold Qty": item.sold,
      "Complimentary Qty": item.complimentary,
      "Returned Qty": item.returned,
      "Damaged Qty": item.damaged,
      "Expired Qty": item.expired,
      "Waste Qty": item.waste,
      "Missing Qty": item.missing,
      "Closing Qty": item.closing,
      "Physical Qty": item.physicalCount,
      "Variance Qty": item.variance,
      "Variance %": item.variancePercent.toFixed(1) + "%",
      "Total Revenue (FRw)": item.salesRevenue,
      "Total Purchases (FRw)": item.purchaseCost,
      "Total COGS (FRw)": item.cogs,
      "Gross Profit (FRw)": item.grossProfit,
      "Net Profit (FRw)": item.netProfit,
      "Days Remaining": item.daysRemaining === 999 ? "Infinite" : item.daysRemaining,
      "Stock Aging Class": item.aging,
      "Profit Contribution %": item.profitContribution.toFixed(2) + "%",
      "Current Status": item.status
    }));

    // 2. Category Level Summary sheet data
    const categorySummary: Record<string, { count: number; value: number; revenue: number; cogs: number; profit: number }> = {};
    finalAuditedItems.forEach(item => {
      if (!categorySummary[item.category]) {
        categorySummary[item.category] = { count: 0, value: 0, revenue: 0, cogs: 0, profit: 0 };
      }
      categorySummary[item.category].count++;
      categorySummary[item.category].value += item.inventoryValue;
      categorySummary[item.category].revenue += item.salesRevenue;
      categorySummary[item.category].cogs += item.cogs;
      categorySummary[item.category].profit += item.netProfit;
    });

    const categorySummaryRows = Object.keys(categorySummary).map(cat => ({
      "Category": cat,
      "Total Products": categorySummary[cat].count,
      "Inventory Value (FRw)": categorySummary[cat].value,
      "Sales Revenue (FRw)": categorySummary[cat].revenue,
      "COGS (FRw)": categorySummary[cat].cogs,
      "Net Profit Contribution (FRw)": categorySummary[cat].profit
    }));

    // Generate sheets
    const workbook = XLSX.utils.book_new();
    const catalogSheet = XLSX.utils.json_to_sheet(exportRows);
    const summarySheet = XLSX.utils.json_to_sheet(categorySummaryRows);

    XLSX.utils.book_append_sheet(workbook, catalogSheet, "Master Inventory & Audit");
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Category Performance Pivot");

    XLSX.writeFile(workbook, `EXECUTIVE_INVENTORY_AUDIT_${new Date().toISOString().split('T')[0]}.xlsx`);
    triggerNotification("Executive Excel Audit Report exported successfully!", "success");
  };

  // ----------------------------------------------------
  // PDF REPORT / PRINT TRIGGER
  // ----------------------------------------------------
  const handlePrintPDF = () => {
    window.print();
  };

  // ----------------------------------------------------
  // LOG MANUAL STOCKTAKE PHYSICAL ADJUSTMENT
  // ----------------------------------------------------
  const handleSaveStocktake = (itemId: string) => {
    const matchedItem = finalAuditedItems.find(i => i.id === itemId);
    if (!matchedItem) return;

    const currentCount = Number(physicalCounts[itemId]);
    if (isNaN(currentCount) || currentCount < 0) {
      triggerNotification('Please enter a valid physical quantity count.', 'error');
      return;
    }

    const calculatedClosing = matchedItem.closing;
    const diff = currentCount - calculatedClosing;

    if (diff === 0) {
      triggerNotification('Physical count matches closing stock perfectly. No variance recorded.', 'warning');
      return;
    }

    if (diff < 0) {
      // Missing / Damaged Stock adjustment log
      onAddStockUsage({
        itemId,
        date: new Date().toISOString().split('T')[0],
        quantityUsed: Math.abs(diff),
        purpose: 'Missing',
        recordedBy: 'Super Admin Audit'
      });
      triggerNotification(`Recorded ${Math.abs(diff)} missing units of ${matchedItem.name} under stock adjustment.`, 'warning');
    } else {
      // Surplus Stock Return / Procurement correction batch log
      onAddProcurement({
        itemId,
        itemName: matchedItem.name,
        category: matchedItem.category as any,
        quantityPurchased: diff,
        quantityRemaining: diff,
        unitPrice: matchedItem.purchasePrice,
        dateReceived: new Date().toISOString().split('T')[0],
        referenceNo: 'AUDIT-SURPLUS-ADJ'
      }, 'Accounts Payable');
      triggerNotification(`Seeded ${diff} surplus units batch of ${matchedItem.name} into FIFO registry.`, 'success');
    }

    // Clear physical count input after save
    setPhysicalCounts(prev => {
      const copy = { ...prev };
      delete copy[itemId];
      return copy;
    });
  };

  // Helper currency formatter
  const formatRWF = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'RWF',
      maximumFractionDigits: 0
    }).format(value).replace('RWF', 'FRw');
  };

  // ----------------------------------------------------
  // RENDER MAIN COMPONENT TABS
  // ----------------------------------------------------
  return (
    <div className="space-y-6">
      
      {/* EXCLUSIVELY HIDDEN DURING APP WORKSPACE VIEW but visible in @media print */}
      <div className="hidden print:block text-slate-950 p-6 border-b-2 border-slate-900 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight">KIGALI HEIGHTS COURT HOTEL</h1>
            <p className="text-xs text-slate-500 mt-1 font-mono">Master Inventory Ledger & Internal Costing Audit Report</p>
          </div>
          <div className="text-right font-mono text-xs text-slate-600">
            <div>Audit Date: {new Date().toLocaleString()}</div>
            <div>Auditor: Super Admin CEO</div>
            <div>Ref Code: ERP-AUD-INV-001</div>
          </div>
        </div>
      </div>

      {/* HEADER SECTION */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border border-indigo-200">
              ERP Master Module
            </span>
            <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border border-emerald-200">
              Live FIFO Costing
            </span>
          </div>
          <h2 className="text-2xl font-black text-slate-950 tracking-tight mt-1 flex items-center gap-2">
            <Package className="w-6 h-6 text-slate-800" />
            Master Inventory Catalog & Audit System
          </h2>
          <p className="text-slate-500 text-xs mt-1 max-w-4xl">
            Single Source of Truth for every product sold, consumed, or received. High-accuracy chronological audit controls, automatic physical variance ledger, profit calculations, and bulk spreadsheet integrations.
          </p>
        </div>
        
        {/* TOP LEVEL ACTION BUTTONS */}
        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={handleDownloadTemplate}
            className="bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold flex items-center gap-1.5 transition-all"
            title="Download formatted Excel sheet template for product loads"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Template</span>
          </button>

          <button 
            onClick={() => triggerFileSelector('insert')}
            className="bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-lg px-3 py-2 text-xs font-semibold flex items-center gap-1.5 transition-all"
            title="Upload standard products spreadsheet"
          >
            <Upload className="w-3.5 h-3.5 text-teal-600" />
            <span>Import Excel</span>
          </button>

          <button 
            onClick={() => triggerFileSelector('update')}
            className="bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 rounded-lg px-3 py-2 text-xs font-semibold flex items-center gap-1.5 transition-all"
            title="Update existing product prices/reorder specs via SKU upload"
          >
            <RefreshCw className="w-3.5 h-3.5 text-sky-600 animate-spin-hover" />
            <span>Bulk Update</span>
          </button>

          <button 
            onClick={handleExportExcel}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-3 py-2 text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Excel</span>
          </button>

          <button 
            onClick={handlePrintPDF}
            className="bg-slate-900 hover:bg-slate-950 text-white rounded-lg px-3 py-2 text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all"
          >
            <FileText className="w-4 h-4" />
            <span>Export PDF / Print</span>
          </button>

          <button 
            onClick={() => setShowWipeModal(true)}
            className="bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-lg px-3 py-2 text-xs font-semibold flex items-center gap-1.5 transition-all"
            title="Wipe out preloaded sample data to load your own products and ledgers"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
            <span>Wipe Template Data</span>
          </button>

          {/* HIDDEN FILE INPUT */}
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleExcelUpload} 
            accept=".xlsx, .xls" 
            className="hidden" 
          />
        </div>
      </div>

      {/* NOTIFICATION BOX */}
      {notification && (
        <div className={`p-4 rounded-xl flex items-start gap-3 text-xs shadow-xs border transition-all print:hidden ${
          notification.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : notification.type === 'warning'
            ? 'bg-amber-50 border-amber-200 text-amber-800'
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {notification.type === 'success' ? <CheckCircle className="w-5 h-5 shrink-0 text-emerald-600" /> : <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />}
          <div>
            <span className="font-bold uppercase tracking-wider block text-[10px]">System Notification</span>
            <span className="mt-1 block">{notification.message}</span>
          </div>
        </div>
      )}

      {/* EXCEL IMPORT PREVIEW & AUDIT CONFIRMATION BOX */}
      {importPreview && (
        <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl p-5 space-y-4 print:hidden animate-fade-in">
          <div className="flex justify-between items-center border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-teal-600" />
              <div>
                <h4 className="text-sm font-bold text-slate-900 uppercase tracking-tight">
                  {importMode === 'insert' ? 'Excel Import Stage Gate' : 'Bulk Product Update Matcher'}
                </h4>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Validating data rows, duplicate identifiers, pricing profiles, and suppliers before merging into database.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={confirmImport}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Confirm & Commit Import</span>
              </button>
              <button 
                onClick={() => { setImportPreview(null); setImportErrors(null); }}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>

          {/* Validation Errors Box */}
          {importErrors && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg max-h-40 overflow-y-auto space-y-1.5 text-[11px]">
              <span className="font-bold text-amber-800 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                Data Validation Scan Discovered the following alerts ({importErrors.length}):
              </span>
              <div className="divide-y divide-amber-100 font-mono">
                {importErrors.map((err, i) => (
                  <div key={i} className="py-1 flex justify-between">
                    <span className="font-semibold text-amber-900">Row {err.row}:</span>
                    <span className="text-amber-800 text-right">{err.msg}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Data Rows Preview */}
          <div className="overflow-x-auto max-h-60 rounded-lg border border-slate-200 bg-white shadow-xs">
            <table className="w-full text-left text-[11px] border-collapse font-mono">
              <thead className="bg-slate-100 text-slate-600 uppercase font-bold sticky top-0">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">Product Name</th>
                  <th className="p-3">Category</th>
                  <th className="p-3 text-right">Purchase Price</th>
                  <th className="p-3 text-right">Selling Price</th>
                  <th className="p-3 text-right">Opening Qty</th>
                  <th className="p-3">Supplier</th>
                  <th className="p-3">Item Code</th>
                  <th className="p-3">SKU</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {importPreview.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="p-3 font-semibold text-slate-400">{idx + 1}</td>
                    <td className="p-3 font-bold text-slate-900">{item.name || 'N/A'}</td>
                    <td className="p-3">{item.category || 'N/A'}</td>
                    <td className="p-3 text-right text-teal-800">{formatRWF(item.purchasePrice)}</td>
                    <td className="p-3 text-right text-slate-900">{formatRWF(item.sellingPrice)}</td>
                    <td className="p-3 text-right">{item.openingStock}</td>
                    <td className="p-3 truncate max-w-[120px]">{item.supplier}</td>
                    <td className="p-3 text-slate-500">{item.code || '(Auto)'}</td>
                    <td className="p-3 text-slate-500">{item.sku || '(Auto)'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TABS SELECTOR */}
      <div className="flex border-b border-slate-200 print:hidden overflow-x-auto scrollbar-hide">
        {[
          { id: 'catalog', label: 'Master Catalog', icon: <Package className="w-4 h-4" /> },
          { id: 'procurement', label: 'FIFO Procurements & PO', icon: <ShoppingCart className="w-4 h-4" /> },
          { id: 'usage', label: 'Usage & Waste Logs', icon: <Plus className="w-4 h-4" /> },
          { id: 'audit', label: 'Audit Diagnostics Ledger', icon: <Activity className="w-4 h-4 text-indigo-600" /> },
          { id: 'profitability', label: 'Item Profitability Report', icon: <TrendingUp className="w-4 h-4 text-emerald-600" /> },
          { id: 'summary', label: 'Executive Summaries', icon: <Grid className="w-4 h-4 text-violet-600 animate-pulse" /> }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as ActiveTab)}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 whitespace-nowrap transition-all ${
              activeTab === tab.id 
                ? 'border-slate-900 text-slate-950 font-black' 
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ----------------------------------------------------
          TAB 1: MASTER INVENTORY CATALOG
          ---------------------------------------------------- */}
      {activeTab === 'catalog' && (
        <div className="space-y-6 print:hidden">
          
          {/* CONTROL BAR */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col lg:flex-row gap-4 justify-between items-center">
            
            {/* Search Input */}
            <div className="relative w-full lg:w-96">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input 
                type="text"
                placeholder="Search catalog by name, code, SKU, barcode..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs focus:outline-hidden focus:border-slate-400 font-medium"
              />
            </div>

            {/* Filters selectors */}
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              
              {/* Category */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700">
                <Filter className="w-3.5 h-3.5" />
                <span>Category:</span>
                <select 
                  value={selectedCategory} 
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bg-transparent border-0 p-0 text-xs font-bold focus:ring-0 cursor-pointer"
                >
                  <option value="all">All Categories</option>
                  {customCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Stock Levels */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700">
                <Sliders className="w-3.5 h-3.5" />
                <span>Stock:</span>
                <select 
                  value={selectedStockLevel} 
                  onChange={(e) => setSelectedStockLevel(e.target.value as any)}
                  className="bg-transparent border-0 p-0 text-xs font-bold focus:ring-0 cursor-pointer"
                >
                  <option value="all">All Quantities</option>
                  <option value="low">Low Stock (≤ Reorder Level)</option>
                  <option value="out">Out of Stock (Zero)</option>
                  <option value="normal">Healthy Stock Levels</option>
                </select>
              </div>

              {/* Status */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700">
                <Activity className="w-3.5 h-3.5" />
                <span>Status:</span>
                <select 
                  value={selectedStatus} 
                  onChange={(e) => setSelectedStatus(e.target.value as any)}
                  className="bg-transparent border-0 p-0 text-xs font-bold focus:ring-0 cursor-pointer"
                >
                  <option value="all">All States</option>
                  <option value="Active">Active Only</option>
                  <option value="Inactive">Inactive Only</option>
                </select>
              </div>

              {/* Add category button */}
              <button 
                onClick={() => setShowCategoryForm(!showCategoryForm)}
                className="text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 p-2 rounded-lg text-xs font-bold flex items-center gap-1"
                title="Create a custom category dynamically"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>+ Custom Category</span>
              </button>

              {/* Add Item Button */}
              <button 
                onClick={handleOpenAddModal}
                className="bg-slate-900 hover:bg-slate-950 text-white rounded-lg px-3 py-2 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item Manually</span>
              </button>
            </div>
          </div>

          {/* Dynamic Category Creation Row Form */}
          {showCategoryForm && (
            <form onSubmit={handleAddCategory} className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-center gap-3 max-w-md animate-fade-in">
              <input 
                type="text" 
                placeholder="Enter custom category name (e.g. Assets, Cigars)..."
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs w-full focus:outline-hidden"
              />
              <button 
                type="submit"
                className="bg-slate-900 hover:bg-slate-950 text-white text-xs font-bold px-3 py-1.5 rounded-lg shrink-0"
              >
                Save Category
              </button>
              <button 
                type="button" 
                onClick={() => setShowCategoryForm(false)} 
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* DYNAMIC GRID VIEW OF CATALOG */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredCatalogItems.map((item) => {
              const isLowStock = item.closing > 0 && item.closing <= item.minimumStock;
              const isOutOfStock = item.closing === 0;

              return (
                <div 
                  key={item.id} 
                  className={`bg-white rounded-xl border p-5 shadow-2xs hover:shadow-xs transition-all relative flex flex-col justify-between ${
                    isOutOfStock 
                      ? 'border-rose-300 bg-rose-50/20' 
                      : isLowStock 
                      ? 'border-amber-300 bg-amber-50/10' 
                      : 'border-slate-200'
                  }`}
                >
                  <div>
                    {/* Header line */}
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                        {item.category} / {item.subcategory}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                          item.status === 'Active' 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}>
                          {item.status}
                        </span>
                        <button 
                          onClick={() => handleOpenEditModal(item)}
                          className="text-slate-400 hover:text-slate-800 p-1 rounded-sm"
                          title="Edit product parameters"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Name & ID specs */}
                    <h3 className="text-sm font-bold text-slate-900 mt-2 hover:text-slate-950 truncate" title={item.name}>
                      {item.name}
                    </h3>
                    
                    <div className="flex items-center gap-2 mt-1.5 font-mono text-[10px] text-slate-500">
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded-xs font-semibold">Code: {item.code}</span>
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded-xs font-semibold">SKU: {item.sku}</span>
                    </div>

                    {/* Description */}
                    <p className="text-slate-500 text-[11px] mt-2 line-clamp-2 italic h-8">
                      {item.description || 'No item description available.'}
                    </p>

                    {/* Visual Barcode & QR Block */}
                    <div className="mt-3 p-2 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between font-mono text-[9px] text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Barcode className="w-4 h-4 text-slate-600" />
                        <div>
                          <div className="text-[8px] font-bold">BARCODE (EAN-13)</div>
                          <div>{item.barcode || 'NO_BARCODE'}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[8px] font-bold text-slate-400">QR LINK</div>
                        <div className="font-bold text-indigo-600">{item.qrCode}</div>
                      </div>
                    </div>
                  </div>

                  {/* Stock Levels Panel */}
                  <div className="border-t border-slate-100 pt-4 mt-4 space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-medium">Quantity Balance:</span>
                      <span className={`font-mono font-extrabold px-2 py-0.5 rounded-md ${
                        isOutOfStock 
                          ? 'text-rose-700 bg-rose-100 border border-rose-300' 
                          : isLowStock 
                          ? 'text-amber-700 bg-amber-100 border border-amber-300' 
                          : 'text-slate-900 bg-slate-100'
                      }`}>
                        {item.closing} {item.unit}s
                      </span>
                    </div>

                    {/* Progress visual stock bar */}
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${
                          isOutOfStock ? 'bg-rose-600' : isLowStock ? 'bg-amber-500' : 'bg-emerald-600'
                        }`}
                        style={{ width: `${Math.min(100, (item.closing / (item.maximumStock || 500)) * 100)}%` }}
                      />
                    </div>

                    {/* Financial prices */}
                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                      <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                        <span className="text-slate-400 font-medium block">Standard Cost</span>
                        <span className="font-bold text-slate-700 font-mono">{formatRWF(item.purchasePrice)}</span>
                      </div>
                      <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                        <span className="text-slate-400 font-medium block">Selling Price</span>
                        <span className="font-bold text-teal-800 font-mono">{formatRWF(item.sellingPrice)}</span>
                      </div>
                    </div>

                    {/* Warning flags */}
                    {isOutOfStock ? (
                      <div className="flex items-center gap-1 text-[10px] text-rose-600 font-semibold bg-rose-50 p-1 px-2 rounded-md">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                        <span>STOCK OUT PREVENTION ALERT: Immediate Procurement required!</span>
                      </div>
                    ) : isLowStock ? (
                      <div className="flex items-center gap-1 text-[10px] text-amber-700 font-semibold bg-amber-50 p-1 px-2 rounded-md">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                        <span>LOW STOCK EXCEEDED: Below Reorder Level of {item.reorderLevel} units</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>

          {filteredCatalogItems.length === 0 && (
            <div className="text-center py-12 bg-slate-50 border rounded-xl border-slate-200">
              <Package className="w-12 h-12 text-slate-300 mx-auto" />
              <h4 className="text-slate-700 font-bold mt-3">No Master Items Found</h4>
              <p className="text-slate-400 text-xs mt-1">Refine your search term or chosen filters to explore database.</p>
            </div>
          )}
        </div>
      )}

      {/* ----------------------------------------------------
          TAB 2: FIFO PROCUREMENTS (PURCHASE ENTRY / RECEIVING)
          ---------------------------------------------------- */}
      {activeTab === 'procurement' && (
        <div className="space-y-6 print:hidden">
          
          {/* PROCUREMENT SUBMISSION FORM */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-teal-600" />
              Receive New Stock Batch (Goods Received Note - GRN Entry)
            </h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const formData = new FormData(form);
              const itemId = formData.get('itemId') as string;
              const qty = Number(formData.get('quantity'));
              const price = Number(formData.get('price'));
              const ref = formData.get('ref') as string;
              const pMethod = formData.get('paymentMethod') as PaymentMethod;
              const rDate = formData.get('receivedDate') as string;
              const exp = formData.get('expiry') as string;

              if (!itemId || !qty || qty <= 0 || !price || price <= 0 || !ref) {
                triggerNotification('Provide valid positive quantity, price, and Invoice reference code.', 'error');
                return;
              }

              const matchedItem = masterItems.find(i => i.id === itemId)!;

              onAddProcurement({
                itemId,
                itemName: matchedItem.name,
                category: matchedItem.category as any,
                quantityPurchased: qty,
                quantityRemaining: qty,
                unitPrice: price,
                dateReceived: rDate,
                expiryDate: exp || undefined,
                referenceNo: ref
              }, pMethod);

              triggerNotification(`GRN SUCCESS: Checked-in ${qty} ${matchedItem.unit}s of "${matchedItem.name}" at ${formatRWF(price)} unit cost. Logged in general ledger.`, 'success');
              form.reset();
            }} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 text-xs font-semibold text-slate-700">
              
              {/* Choose Catalog Item */}
              <div>
                <label className="block text-slate-500 mb-1">Catalog Item to Receive:</label>
                <select name="itemId" required className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium">
                  {masterItems.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-slate-500 mb-1">Quantity Received:</label>
                <input type="number" name="quantity" required placeholder="e.g. 50" min="1" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2" />
              </div>

              {/* Unit Cost */}
              <div>
                <label className="block text-slate-500 mb-1">Actual Unit Cost Price (FRw):</label>
                <input type="number" name="price" required placeholder="e.g. 1000" min="1" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2" />
              </div>

              {/* Invoice Reference */}
              <div>
                <label className="block text-slate-500 mb-1">Invoice / Receipt Reference #:</label>
                <input type="text" name="ref" required placeholder="INV-SUP-882" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2" />
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-slate-500 mb-1">Accounting Ledger Account:</label>
                <select name="paymentMethod" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium">
                  <option value="Accounts Payable">Accounts Payable (Supplier Debt)</option>
                  <option value="Cash">Cash Registry (Petty Cash)</option>
                  <option value="Bank">Bank Wire (BK Account)</option>
                </select>
              </div>

              {/* Date Received */}
              <div>
                <label className="block text-slate-500 mb-1">Date Checked-in:</label>
                <input type="date" name="receivedDate" defaultValue="2026-07-14" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2" />
              </div>

              {/* Expiry Date */}
              <div>
                <label className="block text-slate-500 mb-1">Batch Expiry Date (Optional):</label>
                <input type="date" name="expiry" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2" />
              </div>

              <div className="flex items-end">
                <button 
                  type="submit" 
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white rounded-lg p-2 font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer h-9"
                >
                  <Plus className="w-4 h-4" />
                  <span>Execute Goods Inflow (GRN)</span>
                </button>
              </div>
            </form>
          </div>

          {/* ACTIVE BATCHES TABLE */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                <Layers className="w-4 h-4 text-slate-600" />
                Active Storage Batches (FIFO Chronological Inventory Ledger)
              </span>
              <span className="bg-teal-100 text-teal-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                Total Batches Tracked: {batches.length}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100/50 text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b border-slate-200">
                    <th className="p-4">Batch ID</th>
                    <th className="p-4">Item Name</th>
                    <th className="p-4 text-center">Date Received</th>
                    <th className="p-4 text-right">Qty Purchased</th>
                    <th className="p-4 text-right">Qty Remaining (FIFO)</th>
                    <th className="p-4 text-right">Unit Price</th>
                    <th className="p-4 text-right">Asset Valuation</th>
                    <th className="p-4">Invoice Ref</th>
                    <th className="p-4 text-center">Expiry</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-mono">
                  {batches.map((batch) => {
                    const totalVal = batch.quantityRemaining * batch.unitPrice;
                    return (
                      <tr key={batch.id} className={`hover:bg-slate-50/50 transition-colors ${batch.quantityRemaining === 0 ? 'bg-slate-50/70 text-slate-400' : ''}`}>
                        <td className="p-4 font-bold">{batch.id}</td>
                        <td className="p-4 font-bold text-slate-900 font-sans">{batch.itemName}</td>
                        <td className="p-4 text-center text-slate-500">{batch.dateReceived}</td>
                        <td className="p-4 text-right font-bold">{batch.quantityPurchased}</td>
                        <td className="p-4 text-right font-extrabold text-teal-700">{batch.quantityRemaining}</td>
                        <td className="p-4 text-right text-slate-600">{formatRWF(batch.unitPrice)}</td>
                        <td className="p-4 text-right font-bold text-slate-900">{formatRWF(totalVal)}</td>
                        <td className="p-4 text-slate-500">{batch.referenceNo}</td>
                        <td className="p-4 text-center text-slate-500">{batch.expiryDate || 'N/A'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          TAB 3: STOCK USAGE & WASTE LOGS
          ---------------------------------------------------- */}
      {activeTab === 'usage' && (
        <div className="space-y-6 print:hidden">
          
          {/* USAGE LOGGING FORM */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4 text-rose-600" />
              Record Stock Usage / Spoilage / return Log
            </h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const formData = new FormData(form);
              const itemId = formData.get('itemId') as string;
              const qty = Number(formData.get('quantity'));
              const purpose = formData.get('purpose') as any;
              const dateStr = formData.get('usageDate') as string;
              const recordedBy = formData.get('staff') as string;
              const reason = formData.get('reason') as string;

              if (!itemId || !qty || qty <= 0 || !recordedBy) {
                triggerNotification('Provide valid positive usage quantity and recorder staff name.', 'error');
                return;
              }

              // Check stock sufficiency
              const matchedItem = finalAuditedItems.find(i => i.id === itemId)!;
              
              if (purpose !== 'Returned' && qty > matchedItem.closing) {
                triggerNotification(`Stock Out Blocked! Only ${matchedItem.closing} units of "${matchedItem.name}" remaining. Cannot use ${qty}.`, 'error');
                return;
              }

              onAddStockUsage({
                itemId,
                date: dateStr,
                quantityUsed: qty,
                purpose,
                recordedBy,
                reason: reason || undefined
              });

              triggerNotification(`LOGGED SUCCESS: Recorded ${qty} units outflow of "${matchedItem.name}" for "${purpose}".`, 'success');
              form.reset();
            }} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 text-xs font-semibold text-slate-700">
              
              {/* Choose Catalog Item */}
              <div>
                <label className="block text-slate-500 mb-1">Catalog Item to Log:</label>
                <select name="itemId" required className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium">
                  {masterItems.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-slate-500 mb-1">Quantity (Units):</label>
                <input type="number" name="quantity" required placeholder="e.g. 5" min="1" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2" />
              </div>

              {/* Purpose */}
              <div>
                <label className="block text-slate-500 mb-1">Allocation Outflow Purpose:</label>
                <select name="purpose" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium">
                  <option value="Sales">Sales Outflow (POS Consumption)</option>
                  <option value="Waste">Kitchen Waste / Cooking Shrinkage</option>
                  <option value="Expired">Spoilage / Expired Disposal</option>
                  <option value="Missing">Stocktake Missing Variance</option>
                  <option value="Complimentary">Complimentary / Manager Guest Gift</option>
                  <option value="Returned">Returned to Supplier (Inventory Inflow)</option>
                </select>
              </div>

              {/* Date */}
              <div>
                <label className="block text-slate-500 mb-1">Log Date:</label>
                <input type="date" name="usageDate" defaultValue="2026-07-14" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2" />
              </div>

              {/* Recorder */}
              <div>
                <label className="block text-slate-500 mb-1">Authorized Staff Name:</label>
                <input type="text" name="staff" required placeholder="e.g. Chef G. Mugisha" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2" />
              </div>

              {/* Reason */}
              <div>
                <label className="block text-slate-500 mb-1">Adjustment Reason / Context Note:</label>
                <input type="text" name="reason" placeholder="e.g. Dinner service brochette consumption" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2" />
              </div>

              <div className="md:col-span-2 xl:col-span-3 flex justify-end">
                <button 
                  type="submit"
                  className="bg-rose-600 hover:bg-rose-700 text-white rounded-lg px-6 py-2 text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer h-9"
                >
                  <Plus className="w-4 h-4" />
                  <span>Record Transaction Outflow</span>
                </button>
              </div>
            </form>
          </div>

          {/* HISTORICAL LOGS TABLE */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                <History className="w-4 h-4 text-slate-600" />
                Chronological Outflow & Spoilage Adjustment Records
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100/50 text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b border-slate-200">
                    <th className="p-4">Adjustment ID</th>
                    <th className="p-4">Item Name</th>
                    <th className="p-4 text-center">Date Adjusted</th>
                    <th className="p-4 text-right">Adjustment Qty</th>
                    <th className="p-4">Purpose</th>
                    <th className="p-4">Recorded By</th>
                    <th className="p-4">Audit Reason Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-mono">
                  {usages.map((usage) => {
                    const matched = masterItems.find(i => i.id === usage.itemId);
                    return (
                      <tr key={usage.id} className="hover:bg-slate-50/50">
                        <td className="p-4 font-bold">{usage.id}</td>
                        <td className="p-4 font-bold text-slate-900 font-sans">{matched?.name || 'Unknown Item'}</td>
                        <td className="p-4 text-center text-slate-500">{usage.date}</td>
                        <td className="p-4 text-right font-extrabold text-slate-950">{usage.quantityUsed}</td>
                        <td className="p-4">
                          <span className={`px-2.5 py-0.5 rounded-full font-bold text-[9px] uppercase border ${
                            usage.purpose === 'Sales' 
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : usage.purpose === 'Returned'
                              ? 'bg-sky-50 text-sky-800 border-sky-200'
                              : usage.purpose === 'Complimentary'
                              ? 'bg-violet-50 text-violet-800 border-violet-200'
                              : 'bg-rose-50 text-rose-800 border-rose-200'
                          }`}>
                            {usage.purpose}
                          </span>
                        </td>
                        <td className="p-4 font-sans font-medium text-slate-600">{usage.recordedBy}</td>
                        <td className="p-4 font-sans text-slate-500 italic max-w-xs truncate">{usage.reason || 'N/A'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          TAB 4: ITEM AUDIT DIAGNOSTICS LEDGER
          ---------------------------------------------------- */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          
          {/* INTRO CALLOUT */}
          <div className="bg-slate-900 text-white rounded-xl p-5 border border-slate-800 shadow-lg flex flex-col md:flex-row gap-5 items-center justify-between print:hidden">
            <div className="space-y-1">
              <span className="bg-indigo-500 text-white font-bold text-[9px] uppercase px-2 py-0.5 rounded-full tracking-wider">
                Auditor Desk Live Calculations
              </span>
              <h3 className="text-lg font-bold tracking-tight">Dynamic Physical Variance & Audit Controller</h3>
              <p className="text-slate-400 text-xs max-w-2xl">
                This ledger automatically aggregates opening quantities, purchases, sales, waste, missing, and closing stock balances for every item. Enter the **Physical Count** below to reconcile balances and detect leakage instantaneously.
              </p>
            </div>
            <div className="text-right shrink-0">
              <div className="text-xs text-slate-400">Total Audit Variance Cost</div>
              <div className="text-xl font-mono font-black text-rose-400 mt-1">
                {formatRWF(finalAuditedItems.reduce((sum, i) => sum + Math.abs(i.variance * i.purchasePrice), 0))}
              </div>
            </div>
          </div>

          {/* MAIN AUDIT LEDGER TABLE */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between print:hidden">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-slate-600" />
                Hotel Master Inventory Variance Ledger (Auto-Auditing)
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Formula: Opening + Received - Sold - Spoilage/Missing = Closing Balance</span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/50 text-slate-500 text-[9px] font-bold uppercase tracking-wider border-b border-slate-200 font-mono">
                    <th className="p-3">Item Specs</th>
                    <th className="p-3 text-right">Opening</th>
                    <th className="p-3 text-right">Received</th>
                    <th className="p-3 text-right">Sold</th>
                    <th className="p-3 text-right">Comp</th>
                    <th className="p-3 text-right text-sky-800">Returned</th>
                    <th className="p-3 text-right text-rose-800">Losses</th>
                    <th className="p-3 text-right font-bold text-slate-950">Closing</th>
                    <th className="p-3 text-center text-indigo-700 font-black">Physical Count</th>
                    <th className="p-3 text-right font-black">Variance</th>
                    <th className="p-3 text-right font-black">Variance %</th>
                    <th className="p-3 text-right font-black">Turnover</th>
                    <th className="p-3 text-center print:hidden">Reconcile</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-slate-700">
                  {finalAuditedItems.map((item) => {
                    const totalLoss = item.damaged + item.expired + item.waste + item.missing;
                    const isVarianceAlert = item.variance !== 0;

                    return (
                      <tr key={item.id} className={`hover:bg-slate-50/50 transition-colors ${isVarianceAlert ? 'bg-amber-50/20' : ''}`}>
                        {/* Item Details */}
                        <td className="p-3 font-sans">
                          <div className="font-bold text-slate-900 leading-tight">{item.name}</div>
                          <div className="text-[9px] font-mono text-slate-400 mt-0.5">Code: {item.code} | Unit: {item.unit}</div>
                        </td>
                        {/* Metrics */}
                        <td className="p-3 text-right font-bold">{item.opening}</td>
                        <td className="p-3 text-right text-slate-600">{item.received}</td>
                        <td className="p-3 text-right text-emerald-800">{item.sold}</td>
                        <td className="p-3 text-right text-violet-800">{item.complimentary}</td>
                        <td className="p-3 text-right text-sky-800">{item.returned}</td>
                        <td className="p-3 text-right text-rose-800">{totalLoss}</td>
                        <td className="p-3 text-right font-black text-slate-950">{item.closing}</td>
                        
                        {/* Physical Count Input */}
                        <td className="p-2 text-center print:hidden">
                          <input 
                            type="number"
                            placeholder={item.closing.toString()}
                            value={physicalCounts[item.id] || ''}
                            onChange={(e) => setPhysicalCounts(prev => ({
                              ...prev,
                              [item.id]: e.target.value
                            }))}
                            className="w-16 bg-slate-50 focus:bg-white text-center border border-indigo-200 hover:border-indigo-400 rounded-md py-1 font-bold text-indigo-900"
                          />
                        </td>
                        <td className="p-2 text-center hidden print:table-cell text-slate-900 font-bold">
                          {item.physicalCount}
                        </td>

                        {/* Variance specs */}
                        <td className={`p-3 text-right font-black ${
                          item.variance < 0 ? 'text-rose-600' : item.variance > 0 ? 'text-emerald-600' : 'text-slate-500'
                        }`}>
                          {item.variance > 0 ? `+${item.variance}` : item.variance}
                        </td>

                        <td className={`p-3 text-right font-black ${
                          item.variancePercent < 0 ? 'text-rose-600' : item.variancePercent > 0 ? 'text-emerald-600' : 'text-slate-500'
                        }`}>
                          {item.variancePercent.toFixed(1)}%
                        </td>

                        <td className="p-3 text-right font-medium text-slate-600">
                          {isNaN(item.inventoryTurnover) || item.inventoryTurnover === Infinity ? '0.00' : item.inventoryTurnover.toFixed(2)}x
                        </td>

                        {/* Reconcile button */}
                        <td className="p-2 text-center print:hidden">
                          {physicalCounts[item.id] !== undefined && physicalCounts[item.id] !== '' ? (
                            <button 
                              onClick={() => handleSaveStocktake(item.id)}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-md px-2 py-1 text-[10px] font-bold flex items-center gap-0.5 mx-auto"
                            >
                              <Check className="w-3 h-3" />
                              <span>Reconcile</span>
                            </button>
                          ) : (
                            <span className="text-slate-400 text-[10px] italic">Reconciled</span>
                          )}
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

      {/* ----------------------------------------------------
          TAB 5: ITEM PROFITABILITY & VELOCITY REPORT
          ---------------------------------------------------- */}
      {activeTab === 'profitability' && (
        <div className="space-y-6">
          
          {/* CARD SUMMARY ROWS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:hidden">
            <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
              <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-600">Top Revenue Leader</span>
              {(() => {
                const leader = [...finalAuditedItems].sort((a, b) => b.salesRevenue - a.salesRevenue)[0];
                return leader ? (
                  <div className="mt-2">
                    <div className="text-sm font-black text-emerald-950 truncate">{leader.name}</div>
                    <div className="text-lg font-mono font-black text-emerald-700 mt-1">{formatRWF(leader.salesRevenue)}</div>
                  </div>
                ) : <div className="mt-2 text-xs text-slate-400">N/A</div>;
              })()}
            </div>

            <div className="bg-violet-50 rounded-xl p-4 border border-violet-200">
              <span className="text-[10px] uppercase font-bold tracking-wider text-violet-600">Max Profit Contributor</span>
              {(() => {
                const contributor = [...finalAuditedItems].sort((a, b) => b.netProfit - a.netProfit)[0];
                return contributor ? (
                  <div className="mt-2">
                    <div className="text-sm font-black text-violet-950 truncate">{contributor.name}</div>
                    <div className="text-lg font-mono font-black text-violet-700 mt-1">{formatRWF(contributor.netProfit)}</div>
                  </div>
                ) : <div className="mt-2 text-xs text-slate-400">N/A</div>;
              })()}
            </div>

            <div className="bg-rose-50 rounded-xl p-4 border border-rose-200">
              <span className="text-[10px] uppercase font-bold tracking-wider text-rose-600">Dead / Inactive Capital Stock</span>
              {(() => {
                const deadCapital = finalAuditedItems.filter(i => i.sold === 0 && i.closing > 0).reduce((sum, i) => sum + i.inventoryValue, 0);
                return (
                  <div className="mt-2">
                    <div className="text-sm font-bold text-rose-950">Value of Unsold Stale Assets</div>
                    <div className="text-lg font-mono font-black text-rose-700 mt-1">{formatRWF(deadCapital)}</div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* MAIN PROFITABILITY TABLE */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between print:hidden">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-600 animate-pulse" />
                Hotel ERP Detailed Product Profitability & Stock Velocity Report
              </span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-md">
                Sort: Net Profit Performance
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/50 text-slate-500 text-[9px] font-bold uppercase tracking-wider border-b border-slate-200 font-mono">
                    <th className="p-3">Rank / Product</th>
                    <th className="p-3 text-right">Cost Price</th>
                    <th className="p-3 text-right">Selling Price</th>
                    <th className="p-3 text-right">GP Per Unit</th>
                    <th className="p-3 text-right">Purchased</th>
                    <th className="p-3 text-right">Units Sold</th>
                    <th className="p-3 text-right">Total Revenue</th>
                    <th className="p-3 text-right">Total COGS</th>
                    <th className="p-3 text-right">Gross Profit</th>
                    <th className="p-3 text-right text-emerald-800">Net Profit</th>
                    <th className="p-3 text-right text-rose-800">Unsold Value</th>
                    <th className="p-3 text-center">Velocity State</th>
                    <th className="p-3 text-right text-violet-800">Net Share %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-slate-700">
                  {[...finalAuditedItems].sort((a, b) => b.netProfit - a.netProfit).map((item, index) => {
                    const gpPerUnit = item.sellingPrice - item.purchasePrice;
                    const isDead = item.sold === 0 && item.closing > 0;
                    const isFast = item.aging === 'Fast Moving';
                    
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-3 font-sans">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-slate-400 text-[10px] w-4 font-bold">{index + 1}.</span>
                            <div>
                              <div className="font-bold text-slate-900 leading-tight">{item.name}</div>
                              <div className="text-[8px] font-mono text-slate-400 mt-0.5">{item.category}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-right text-slate-600">{formatRWF(item.purchasePrice)}</td>
                        <td className="p-3 text-right text-slate-900">{formatRWF(item.sellingPrice)}</td>
                        <td className="p-3 text-right text-emerald-700 font-bold">{formatRWF(gpPerUnit)}</td>
                        <td className="p-3 text-right text-slate-600">{item.purchased}</td>
                        <td className="p-3 text-right font-bold text-slate-900">{item.sold}</td>
                        <td className="p-3 text-right text-slate-900">{formatRWF(item.salesRevenue)}</td>
                        <td className="p-3 text-right text-slate-600">{formatRWF(item.cogs)}</td>
                        <td className="p-3 text-right font-semibold">{formatRWF(item.grossProfit)}</td>
                        <td className="p-3 text-right font-black text-emerald-700">{formatRWF(item.netProfit)}</td>
                        <td className="p-3 text-right text-rose-800 font-medium">{formatRWF(item.inventoryValue)}</td>
                        
                        {/* Velocity Badge */}
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase ${
                            isDead 
                              ? 'bg-rose-50 text-rose-700 border-rose-200' 
                              : isFast 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {isDead ? 'Dead Stock' : item.aging}
                          </span>
                        </td>

                        <td className="p-3 text-right font-black text-violet-700">{item.profitContribution.toFixed(1)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          TAB 6: EXECUTIVE SUMMARIES & AI INTELLIGENCE
          ---------------------------------------------------- */}
      {activeTab === 'summary' && (
        <div className="space-y-6">
          
          {/* AI INVENTORY INTELLIGENCE SECTION */}
          <div className="bg-gradient-to-br from-indigo-950 via-slate-950 to-slate-900 text-white rounded-xl p-6 border border-slate-800 shadow-xl space-y-4">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
                <h3 className="text-lg font-black tracking-tight uppercase">AI Inventory Intelligence Analyst</h3>
              </div>
              <span className="bg-indigo-500/30 text-indigo-200 font-mono text-[9px] font-black uppercase px-2.5 py-1 rounded-full border border-indigo-400/20">
                Cognitive Ledger Analysis
              </span>
            </div>
            
            <p className="text-slate-300 text-xs leading-relaxed max-w-4xl">
              Analyzing master catalog records, transaction flows, and historical batch shrinkage, the AI has generated these real-time audit suggestions:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-medium text-slate-100 pt-2">
              
              {/* Overstock Alert */}
              <div className="p-4 bg-white/5 border border-white/10 rounded-lg space-y-1">
                <span className="text-amber-400 text-[10px] font-bold block uppercase tracking-wider">Overstock & Idle Capital Warning</span>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  We currently hold {finalAuditedItems.filter(i => i.closing > i.maximumStock).length} products exceeding maximum configured stocks. Idle cash in dead warehouse assets is valued at:
                  <span className="text-amber-300 font-bold font-mono block mt-1 text-sm">
                    {formatRWF(finalAuditedItems.filter(i => i.closing > i.maximumStock).reduce((sum, i) => sum + i.inventoryValue, 0))}
                  </span>
                </p>
              </div>

              {/* Expiring Alerts */}
              <div className="p-4 bg-white/5 border border-white/10 rounded-lg space-y-1">
                <span className="text-rose-400 text-[10px] font-bold block uppercase tracking-wider">Urgent Spoilage & Expiry Threats</span>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Batches nearing expiry within the next 30 days are located in <span className="font-bold">Bar Cellar Row A</span>. Immediate promotional sales or culinary use of <span className="font-bold">Primus and Fanta Glass</span> is advised. Potential risk:
                  <span className="text-rose-300 font-bold font-mono block mt-1 text-sm">
                    {formatRWF(batches.filter(b => b.expiryDate && new Date(b.expiryDate) < new Date('2026-08-14')).reduce((sum, b) => sum + (b.quantityRemaining * b.unitPrice), 0))}
                  </span>
                </p>
              </div>

              {/* Reorder Recommendation */}
              <div className="p-4 bg-white/5 border border-white/10 rounded-lg space-y-1">
                <span className="text-teal-400 text-[10px] font-bold block uppercase tracking-wider">Automated Reorder Suggestions</span>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  {finalAuditedItems.filter(i => i.closing <= i.reorderLevel).length} catalog items are at or below reorder levels. We recommend initiating procurement with <span className="font-bold">Bralirwa Distributors</span> to replenish stocks. Est. replenish budget:
                  <span className="text-teal-300 font-bold font-mono block mt-1 text-sm">
                    {formatRWF(finalAuditedItems.filter(i => i.closing <= i.reorderLevel).reduce((sum, i) => sum + ((i.reorderLevel * 2) * i.purchasePrice), 0))}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* TWO COLUMN PERFORMANCE LISTS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* TOP 20 PROFIT PERFORMERS */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-1">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                Top performing Products by Profit Contribution
              </h4>
              <div className="divide-y divide-slate-100 font-mono text-[11px]">
                {[...finalAuditedItems].sort((a, b) => b.netProfit - a.netProfit).slice(0, 10).map((item, idx) => (
                  <div key={item.id} className="py-2.5 flex justify-between items-center hover:bg-slate-50 px-1 rounded-md">
                    <div>
                      <div className="font-bold text-slate-900 font-sans">{idx + 1}. {item.name}</div>
                      <div className="text-[9px] text-slate-400 mt-0.5">{item.category} | Qty Sold: {item.sold}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-emerald-700">{formatRWF(item.netProfit)}</div>
                      <div className="text-[9px] text-violet-600 font-bold">{item.profitContribution.toFixed(1)}% Share</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* DEAD / LOWEST PERFORMERS LIST */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-1">
                <TrendingDown className="w-4 h-4 text-rose-600" />
                Dead Stock / Lowest Performing Products
              </h4>
              <div className="divide-y divide-slate-100 font-mono text-[11px]">
                {[...finalAuditedItems].sort((a, b) => a.sold - b.sold || b.inventoryValue - a.inventoryValue).slice(0, 10).map((item, idx) => (
                  <div key={item.id} className="py-2.5 flex justify-between items-center hover:bg-slate-50 px-1 rounded-md">
                    <div>
                      <div className="font-bold text-slate-900 font-sans">{idx + 1}. {item.name}</div>
                      <div className="text-[9px] text-slate-400 mt-0.5">Category: {item.category} | In Stock: {item.closing}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-rose-700">Value: {formatRWF(item.inventoryValue)}</div>
                      <div className="text-[9px] text-slate-500 font-bold">Sold: {item.sold} Units</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          EDIT/ADD ITEM MODAL DIALOG
          ---------------------------------------------------- */}
      {showItemModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 print:hidden animate-fade-in">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight">
                {editingItem ? `Modify Master Specs: ${editingItem.name}` : 'Register New Product in Master Catalog'}
              </h3>
              <button onClick={() => setShowItemModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="p-5 space-y-4 text-xs font-semibold text-slate-700">
              
              {/* Product Basic */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-500 mb-1">Item Name *:</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. Primus Beer" 
                    value={itemName} 
                    onChange={(e) => setItemName(e.target.value)} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium" 
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Catalog Category *:</label>
                  <select 
                    value={itemCategory} 
                    onChange={(e) => setItemCategory(e.target.value)} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium"
                  >
                    {customCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-500 mb-1">Subcategory:</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Beers, Sodas" 
                    value={itemSubcategory} 
                    onChange={(e) => setItemSubcategory(e.target.value)} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2" 
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Brand Name:</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Bralirwa, Coca-Cola" 
                    value={itemBrand} 
                    onChange={(e) => setItemBrand(e.target.value)} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2" 
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Unit of Measure:</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Bottle, Plate, kg, Liter" 
                    value={itemUnit} 
                    onChange={(e) => setItemUnit(e.target.value)} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2" 
                  />
                </div>
              </div>

              {/* Financial Specs */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-500 mb-1">Standard Purchase Cost (FRw) *:</label>
                  <input 
                    type="number" 
                    required 
                    placeholder="e.g. 900" 
                    value={itemPurchasePrice} 
                    onChange={(e) => setItemPurchasePrice(e.target.value)} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono" 
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Selling Price (FRw) *:</label>
                  <input 
                    type="number" 
                    required 
                    placeholder="e.g. 1500" 
                    value={itemSellingPrice} 
                    onChange={(e) => setItemSellingPrice(e.target.value)} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono" 
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">VAT / Tax Rate %:</label>
                  <select 
                    value={itemTax} 
                    onChange={(e) => setItemTax(e.target.value)} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2"
                  >
                    <option value="18">18% Standard VAT</option>
                    <option value="0">0% Exempt / Consumables</option>
                    <option value="15">15% Special Excise</option>
                  </select>
                </div>
              </div>

              {/* Stock Specs */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-slate-500 mb-1">Opening Stock:</label>
                  <input 
                    type="number" 
                    placeholder="100" 
                    value={itemOpeningStock} 
                    onChange={(e) => setItemOpeningStock(e.target.value)} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2" 
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Min Alert Stock:</label>
                  <input 
                    type="number" 
                    placeholder="20" 
                    value={itemMinStock} 
                    onChange={(e) => setItemMinStock(e.target.value)} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2" 
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Max Stock Limit:</label>
                  <input 
                    type="number" 
                    placeholder="1000" 
                    value={itemMaxStock} 
                    onChange={(e) => setItemMaxStock(e.target.value)} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2" 
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Reorder level:</label>
                  <input 
                    type="number" 
                    placeholder="30" 
                    value={itemReorderLevel} 
                    onChange={(e) => setItemReorderLevel(e.target.value)} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2" 
                  />
                </div>
              </div>

              {/* Logistics & Supplier */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-500 mb-1">Preferred Supplier Name:</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Bralirwa Distributors" 
                    value={itemSupplier} 
                    onChange={(e) => setItemSupplier(e.target.value)} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium" 
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Storage Physical Location:</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Room B Rack 3" 
                    value={itemStorageLocation} 
                    onChange={(e) => setItemStorageLocation(e.target.value)} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2" 
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Product Status:</label>
                  <select 
                    value={itemStatus} 
                    onChange={(e) => setItemStatus(e.target.value as any)} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-bold"
                  >
                    <option value="Active">Active Ledger Entry</option>
                    <option value="Inactive">Inactive / Suspended</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-slate-500 mb-1">Item Description / Usage Guidelines:</label>
                <textarea 
                  placeholder="Enter detailed description..."
                  value={itemDescription}
                  onChange={(e) => setItemDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 h-20"
                />
              </div>

              {/* Actions */}
              <div className="border-t border-slate-100 pt-4 flex justify-end gap-2.5">
                <button 
                  type="button" 
                  onClick={() => setShowItemModal(false)}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold px-4 py-2 rounded-lg"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="bg-slate-900 hover:bg-slate-950 text-white text-xs font-bold px-5 py-2 rounded-lg"
                >
                  Save Master Item Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SYSTEM RESET / WIPE TEMPLATE MODAL */}
      {showWipeModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in print:hidden">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 relative space-y-4">
            <button 
              onClick={() => setShowWipeModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <span className="p-3 bg-red-50 text-red-600 rounded-xl border border-red-200">
                <Trash2 className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 uppercase tracking-tight">Wipe Template Data</h3>
                <p className="text-slate-500 text-xs">Choose how to start fresh with your custom hotel details.</p>
              </div>
            </div>

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs leading-relaxed space-y-1.5">
              <span className="font-extrabold flex items-center gap-1">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                DANGER ZONE: Irreversible Operation
              </span>
              <p>
                Wiping template data removes preloaded hotel products, batches, and records. This action cannot be undone. Please select the scope of your system reset:
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {/* Option 1: Inventory Only */}
              <button 
                onClick={() => {
                  if (onWipeDatabase) {
                    onWipeDatabase({ clearInventoryOnly: true });
                    triggerNotification("Cleaned all preloaded products, FIFO batches, and usages successfully! Ready for your catalog import.", "success");
                  } else {
                    onUpdateMasterItems([]);
                    triggerNotification("Cleaned products successfully!", "success");
                  }
                  setShowWipeModal(false);
                }}
                className="w-full text-left p-3.5 border border-slate-200 hover:border-slate-400 rounded-xl bg-slate-50 hover:bg-white transition-all group flex gap-3.5"
              >
                <div className="p-2 bg-cyan-50 group-hover:bg-cyan-100 rounded-lg text-cyan-700 shrink-0 h-9 w-9 flex items-center justify-center font-bold">
                  1
                </div>
                <div>
                  <span className="block text-xs font-black text-slate-900 uppercase tracking-wide">Wipe Inventory Catalog Only</span>
                  <span className="block text-slate-500 text-[10px] mt-0.5 leading-normal">
                    Wipe only the product master catalog list, FIFO purchases/procurement batches, and usage logs. Keeps financial logs, audit alerts, and other modules intact.
                  </span>
                </div>
              </button>

              {/* Option 2: Full System Wipe */}
              <button 
                onClick={() => {
                  if (onWipeDatabase) {
                    onWipeDatabase({ clearInventoryOnly: false });
                    triggerNotification("Full hotel database and accounts cleared successfully. Starting with 100% clean sheets!", "success");
                  } else {
                    onUpdateMasterItems([]);
                    triggerNotification("Cleaned products successfully!", "success");
                  }
                  setShowWipeModal(false);
                }}
                className="w-full text-left p-3.5 border border-red-100 hover:border-red-400 rounded-xl bg-red-50/30 hover:bg-red-50/10 transition-all group flex gap-3.5"
              >
                <div className="p-2 bg-red-100 group-hover:bg-red-200 rounded-lg text-red-700 shrink-0 h-9 w-9 flex items-center justify-center font-bold">
                  2
                </div>
                <div>
                  <span className="block text-xs font-black text-red-955 uppercase tracking-wide">Complete Database Reset (Recommended)</span>
                  <span className="block text-slate-600 text-[10px] mt-0.5 leading-normal">
                    Completely clear products, batches, stock usages, financial ledger transactions, audit logs, and unresolved alerts. Restart Heaven Haven Suites with empty accounting books!
                  </span>
                </div>
              </button>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button 
                onClick={() => setShowWipeModal(false)}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold px-4 py-2 rounded-lg"
              >
                Keep Template Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

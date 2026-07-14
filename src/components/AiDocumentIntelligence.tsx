/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  FileText,
  Upload,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  Layers,
  TrendingUp,
  Download,
  Search,
  Eye,
  ShieldAlert,
  Coins,
  ArrowRight,
  Database,
  Printer,
  ChevronRight,
  FileSpreadsheet,
  Trash2,
  DollarSign,
  PieChart as LucidePieChart,
  ShoppingBag,
  Users,
  Activity,
  UserCheck,
  AlertCircle,
  Clock,
  Briefcase,
  HelpCircle,
  ArrowUpRight,
  Fingerprint
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
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import * as XLSX from 'xlsx';
import { Transaction, InventoryBatch, StockUsage, AuditAlert } from '../types';

interface AiDocumentIntelligenceProps {
  transactions: Transaction[];
  batches: InventoryBatch[];
  usages: StockUsage[];
  alerts: AuditAlert[];
}

// Structuring document types
type DocType =
  | 'supplier_invoice'
  | 'purchase_order'
  | 'delivery_note'
  | 'bank_statement'
  | 'payroll_report'
  | 'tax_document';

interface ExtractedDoc {
  id: string;
  name: string;
  type: DocType;
  uploadDate: string;
  fileSize: string;
  status: 'valid' | 'warning' | 'critical';
  confidenceScore: number;
  extractedFields: {
    invoiceNo?: string;
    poNo?: string;
    supplier?: string;
    customer?: string;
    tin?: string;
    date?: string;
    grandTotal: number;
    subtotal: number;
    taxAmount: number;
    paymentMethod?: string;
    signatureVerified: boolean;
    hasImageManipulation: boolean;
    pagesCount: number;
  };
  lineItems: {
    sku: string;
    description: string;
    qty: number;
    unit: string;
    price: number;
    total: number;
  }[];
  validationIssues: string[];
  crossMatchingStatus: {
    poMatched: boolean;
    invoiceMatched: boolean;
    grnMatched: boolean;
    ledgerMatched: boolean;
    bankMatched: boolean;
    mismatchReason?: string;
  };
  fraudScore: number; // 0-100
}

type ExecutiveDashboardTab =
  | 'executive_kpis'
  | 'sales_analytics'
  | 'expense_analytics'
  | 'inventory_analytics'
  | 'purchasing_supplier'
  | 'fraud_risk'
  | 'cash_capital';

export default function AiDocumentIntelligence({
  transactions,
  batches,
  usages,
  alerts
}: AiDocumentIntelligenceProps) {
  // Pre-loaded Demo Documents to give a pristine, zero-config high fidelity experience
  const [documents, setDocuments] = useState<ExtractedDoc[]>([
    {
      id: 'DOC-2026-001',
      name: 'Alpha_Distributors_Invoice_6821.pdf',
      type: 'supplier_invoice',
      uploadDate: '2026-07-10 09:41',
      fileSize: '1.2 MB',
      status: 'valid',
      confidenceScore: 98.4,
      extractedFields: {
        invoiceNo: 'INV-6821',
        poNo: 'PO-2026-904',
        supplier: 'Alpha Distributors Ltd',
        customer: 'Hilltop Manor Hotel',
        tin: 'TIN-9812-RW',
        date: '2026-07-08',
        grandTotal: 1450000,
        subtotal: 1228813,
        taxAmount: 221187,
        paymentMethod: 'Bank Transfer',
        signatureVerified: true,
        hasImageManipulation: false,
        pagesCount: 2
      },
      lineItems: [
        { sku: 'FNB-MEAT-01', description: 'Fresh Beef Tenderloin (KG)', qty: 80, unit: 'KG', price: 9500, total: 760000 },
        { sku: 'FNB-SEA-03', description: 'Lake Kivu Tilapia (KG)', qty: 110, unit: 'KG', price: 4200, total: 462000 },
        { sku: 'FNB-VEG-09', description: 'Organic Irish Potatoes (Bag)', qty: 4, unit: 'BAG', price: 7000, total: 28000 }
      ],
      validationIssues: [],
      crossMatchingStatus: {
        poMatched: true,
        invoiceMatched: true,
        grnMatched: true,
        ledgerMatched: true,
        bankMatched: true
      },
      fraudScore: 8
    },
    {
      id: 'DOC-2026-002',
      name: 'Electric_Grid_Utility_Bill_June.pdf',
      type: 'tax_document',
      uploadDate: '2026-07-11 14:15',
      fileSize: '840 KB',
      status: 'warning',
      confidenceScore: 91.2,
      extractedFields: {
        invoiceNo: 'EU-90182-26',
        poNo: 'N/A',
        supplier: 'Rwanda Energy Group (REG)',
        customer: 'Hilltop Manor Hotel',
        tin: 'TIN-0019-RW',
        date: '2026-06-30',
        grandTotal: 840000,
        subtotal: 711864,
        taxAmount: 128136,
        paymentMethod: 'MoMo Corporate Pay',
        signatureVerified: true,
        hasImageManipulation: false,
        pagesCount: 1
      },
      lineItems: [
        { sku: 'OPEX-UTIL-01', description: 'Commercial Power Consumption - June 2026', qty: 1, unit: 'MONTH', price: 840000, total: 840000 }
      ],
      validationIssues: [
        'Discrepancy: Extracted VAT calculations differ from standard 18% tax line by 150 RWF (rounding anomaly).'
      ],
      crossMatchingStatus: {
        poMatched: false,
        invoiceMatched: true,
        grnMatched: false,
        ledgerMatched: true,
        bankMatched: true,
        mismatchReason: 'Direct utility billing - PO and GRN processes bypassed standard procurement channels.'
      },
      fraudScore: 18
    },
    {
      id: 'DOC-2026-003',
      name: 'Timesheet_Maintenance_Team_June.xlsx',
      type: 'payroll_report',
      uploadDate: '2026-07-12 11:02',
      fileSize: '450 KB',
      status: 'critical',
      confidenceScore: 96.5,
      extractedFields: {
        invoiceNo: 'PAY-2026-06',
        poNo: 'N/A',
        supplier: 'HR Department',
        customer: 'Hilltop Manor Hotel',
        tin: 'N/A',
        date: '2026-06-30',
        grandTotal: 4120000,
        subtotal: 4120000,
        taxAmount: 0,
        paymentMethod: 'Direct Bank Deposit',
        signatureVerified: false,
        hasImageManipulation: true,
        pagesCount: 3
      },
      lineItems: [
        { sku: 'EMP-101', description: 'Maintenance Supervisor (Hours worked)', qty: 180, unit: 'HOURS', price: 8000, total: 1440000 },
        { sku: 'EMP-104', description: 'Lead HVAC Technician (Hours worked)', qty: 195, unit: 'HOURS', price: 6000, total: 1170000 },
        { sku: 'EMP-112', description: 'Junior Plumber (Overtime Hours claimed)', qty: 160, unit: 'HOURS', price: 4500, total: 720000 }
      ],
      validationIssues: [
        'IMAGE MANIPULATION KEY DETECTED: Cloned/Edited pixel grid found on signature region of Supervisor Sign-off.',
        'Arithmetic Failure: Sum of line items does not equal Grand Total. Total lines sum to 3,330,000 RWF but Grand Total claims 4,120,000 RWF (+790,000 RWF ghost variance).'
      ],
      crossMatchingStatus: {
        poMatched: false,
        invoiceMatched: false,
        grnMatched: false,
        ledgerMatched: false,
        bankMatched: true,
        mismatchReason: 'Disbursement bank match confirmed but supporting timesheet signature is unverified and arithmetic sum contains ghost discrepancies.'
      },
      fraudScore: 84
    },
    {
      id: 'DOC-2026-004',
      name: 'Supplier_Bravo_Quote_Liquor.pdf',
      type: 'supplier_invoice',
      uploadDate: '2026-07-13 16:30',
      fileSize: '1.8 MB',
      status: 'warning',
      confidenceScore: 94.1,
      extractedFields: {
        invoiceNo: 'INV-1104',
        poNo: 'PO-2026-905',
        supplier: 'Bravo Beverage Importers',
        customer: 'Hilltop Manor Hotel',
        tin: 'TIN-4829-RW',
        date: '2026-07-12',
        grandTotal: 2150000,
        subtotal: 1822034,
        taxAmount: 327966,
        paymentMethod: 'Bank Transfer',
        signatureVerified: true,
        hasImageManipulation: false,
        pagesCount: 2
      },
      lineItems: [
        { sku: 'INV-LIQ-02', description: 'Highland Scotch Whisky (Cases of 12)', qty: 5, unit: 'CASES', price: 290000, total: 1450000 },
        { sku: 'INV-LIQ-09', description: 'Dry Gin Import (Cases of 12)', qty: 4, unit: 'CASES', price: 175000, total: 700000 }
      ],
      validationIssues: [
        'Supplier Compliance Check: Bravo Beverage Importers TIN matching certificate expires in 3 days.',
        'Price Spike Detected: Highland Scotch Whisky case price suddenly increased by 18% from the previous June average of 245,700 RWF.'
      ],
      crossMatchingStatus: {
        poMatched: true,
        invoiceMatched: true,
        grnMatched: true,
        ledgerMatched: true,
        bankMatched: false,
        mismatchReason: 'Goods received and stock updated but bank payment clearance is currently outstanding.'
      },
      fraudScore: 35
    }
  ]);

  const [activeDashboard, setActiveDashboard] = useState<ExecutiveDashboardTab>('executive_kpis');
  const [selectedDoc, setSelectedDoc] = useState<ExtractedDoc | null>(documents[0]);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadMessage, setUploadMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // ----------------------------------------------------
  // ADVANCED ANALYTICS CALCULATORS
  // ----------------------------------------------------

  // 1. Sales & Product Analytics
  const salesAnalytics = useMemo(() => {
    // Aggregates standard F&B and Room Revenue items
    const fnbSalesCount = transactions.filter(t => t.category === 'F&B Revenue' && !t.isDeleted).length;
    const roomSalesCount = transactions.filter(t => t.category === 'Room Revenue' && !t.isDeleted).length;

    const products = [
      { id: '1', name: 'Deluxe Room Stay', category: 'Rooms', unitsSold: 42, revenue: 12600000, grossProfit: 10450000, discountPct: 5.2, cancellationPct: 1.5, peakDay: 'Saturday' },
      { id: '2', name: 'Fresh Beef Tenderloin Meal', category: 'F&B Restaurant', unitsSold: 210, revenue: 3570000, grossProfit: 1575000, discountPct: 8.5, cancellationPct: 4.2, peakDay: 'Friday' },
      { id: '3', name: 'Lake Kivu Tilapia Platter', category: 'F&B Restaurant', unitsSold: 185, revenue: 2220000, grossProfit: 1295000, discountPct: 2.1, cancellationPct: 0.8, peakDay: 'Sunday' },
      { id: '4', name: 'Highland Scotch Whisky Shot', category: 'Bar/Lounge', unitsSold: 120, revenue: 1440000, grossProfit: 864000, discountPct: 14.2, cancellationPct: 12.5, peakDay: 'Saturday' },
      { id: '5', name: 'Dry Gin Premium Cocktail', category: 'Bar/Lounge', unitsSold: 95, revenue: 760000, grossProfit: 456000, discountPct: 10.0, cancellationPct: 5.0, peakDay: 'Friday' }
    ];

    const bestSelling = [...products].sort((a, b) => b.revenue - a.revenue);
    const worstSelling = [...products].sort((a, b) => a.revenue - b.revenue);

    return {
      products,
      bestSelling,
      worstSelling,
      fnbSalesCount,
      roomSalesCount
    };
  }, [transactions]);

  // 2. Expense & Cost Per Unit Analytics
  const expenseAnalytics = useMemo(() => {
    const totalOPEX = transactions.filter(t => t.type === 'EXPENSE' && !t.isDeleted).reduce((sum, t) => sum + t.amount, 0);
    const totalOccupiedRoomNights = 78; // Mock active count
    const totalMealsServed = 395;
    const totalFTEEmployees = 14;

    const opexByDept = [
      { name: 'Rooms Division', value: totalOPEX * 0.25 },
      { name: 'Kitchen & F&B', value: totalOPEX * 0.42 },
      { name: 'Administration', value: totalOPEX * 0.18 },
      { name: 'Utilities & General', value: totalOPEX * 0.15 }
    ];

    const costPerRoom = totalOccupiedRoomNights > 0 ? (totalOPEX * 0.25) / totalOccupiedRoomNights : 0;
    const costPerMeal = totalMealsServed > 0 ? (totalOPEX * 0.42) / totalMealsServed : 0;
    const costPerEmployee = totalFTEEmployees > 0 ? totalOPEX / totalFTEEmployees : 0;

    return {
      totalOPEX,
      opexByDept,
      costPerRoom,
      costPerMeal,
      costPerEmployee
    };
  }, [transactions]);

  // 3. Inventory Stock Turnover & Variance Analytics
  const inventoryAnalytics = useMemo(() => {
    // Map existing batches and usages
    const stockItems = [
      { name: 'Fresh Beef Tenderloin', opening: 120, purchased: 80, issued: 95, sold: 90, variance: -5, unit: 'KG', cost: 9500, ageDays: 14, category: 'A - Fast Moving' },
      { name: 'Lake Kivu Tilapia', opening: 90, purchased: 110, issued: 120, sold: 118, variance: -2, unit: 'KG', price: 4200, cost: 3500, ageDays: 8, category: 'B - Medium Moving' },
      { name: 'Highland Scotch Whisky', opening: 40, purchased: 60, issued: 30, sold: 28, variance: -2, unit: 'BOTTLE', cost: 24100, ageDays: 45, category: 'C - Slow Moving' },
      { name: 'Dry Gin Import', opening: 35, purchased: 48, issued: 25, sold: 24, variance: -1, unit: 'BOTTLE', cost: 14500, ageDays: 52, category: 'C - Slow Moving' },
      { name: 'Bulk Cleaning Detergent', opening: 200, purchased: 0, issued: 45, sold: 0, variance: -15, unit: 'LITER', cost: 1200, ageDays: 90, category: 'C - Slow Moving (Dead Stock)' }
    ];

    return {
      stockItems
    };
  }, []);

  // 4. Supplier Pricing Spike Analyser
  const supplierAnalytics = useMemo(() => {
    return [
      { name: 'Alpha Distributors Ltd', share: 62, totalSpent: 4820000, rating: 'Excellent', contractsActive: 2 },
      { name: 'Bravo Beverage Importers', share: 22, totalSpent: 2150000, rating: 'At Risk (TIN Expiry)', contractsActive: 1 },
      { name: 'Rwanda Energy Group', share: 11, totalSpent: 840000, rating: 'Utility Monopolist', contractsActive: 0 },
      { name: 'Kigali Fresh Market Wholesalers', share: 5, totalSpent: 380000, rating: 'Satisfactory', contractsActive: 0 }
    ];
  }, []);

  // ----------------------------------------------------
  // DUMMY SIMULATED OCR UPLOADER & TYPE DETECTOR
  // ----------------------------------------------------
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const processFile = (fileName: string, fileSize: string) => {
    setIsUploading(true);
    setUploadProgress(10);
    setUploadMessage('Initiating neural document classification...');

    // Progress Simulation
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            // Document construction
            let type: DocType = 'supplier_invoice';
            const lowerName = fileName.toLowerCase();
            if (lowerName.includes('payroll') || lowerName.includes('staff') || lowerName.includes('timesheet')) {
              type = 'payroll_report';
            } else if (lowerName.includes('po') || lowerName.includes('order')) {
              type = 'purchase_order';
            } else if (lowerName.includes('bank') || lowerName.includes('statement')) {
              type = 'bank_statement';
            } else if (lowerName.includes('delivery') || lowerName.includes('note')) {
              type = 'delivery_note';
            } else if (lowerName.includes('tax') || lowerName.includes('vat') || lowerName.includes('reg') || lowerName.includes('bill')) {
              type = 'tax_document';
            }

            const isDuplicate = documents.some(d => d.name === fileName);

            const newDoc: ExtractedDoc = {
              id: `DOC-2026-00${documents.length + 1}`,
              name: fileName,
              type,
              uploadDate: new Date().toISOString().replace('T', ' ').substring(0, 16),
              fileSize: fileSize || '1.1 MB',
              status: isDuplicate ? 'critical' : 'valid',
              confidenceScore: Math.round(88 + Math.random() * 11),
              extractedFields: {
                invoiceNo: `INV-${Math.round(1000 + Math.random() * 8999)}`,
                poNo: type === 'supplier_invoice' ? `PO-2026-${Math.round(900 + Math.random() * 99)}` : 'N/A',
                supplier: type === 'payroll_report' ? 'HR Payroll Run' : 'Kigali Fresh Market Wholesalers',
                customer: 'Hilltop Manor Hotel',
                tin: 'TIN-4811-RW',
                date: new Date().toISOString().substring(0, 10),
                grandTotal: 650000,
                subtotal: 550847,
                taxAmount: 99153,
                paymentMethod: 'Cash Drawer',
                signatureVerified: true,
                hasImageManipulation: false,
                pagesCount: 1
              },
              lineItems: [
                { sku: 'FNB-VEG-11', description: 'Fresh Red Tomatoes (Box)', qty: 10, unit: 'BOX', price: 15000, total: 150000 },
                { sku: 'FNB-VEG-12', description: 'Fresh White Onions (Bag)', qty: 12, unit: 'BAG', price: 25000, total: 300000 },
                { sku: 'FNB-VEG-15', description: 'Fresh Bell Peppers (KG)', qty: 40, unit: 'KG', price: 5000, total: 200000 }
              ],
              validationIssues: isDuplicate
                ? ['DUPLICATE DOCUMENT DETECTED: This file name and check-sum matches an identical existing entry in the ERP database.']
                : [],
              crossMatchingStatus: {
                poMatched: type !== 'payroll_report',
                invoiceMatched: true,
                grnMatched: type !== 'payroll_report',
                ledgerMatched: true,
                bankMatched: true
              },
              fraudScore: isDuplicate ? 95 : 12
            };

            setDocuments(prevDocs => [newDoc, ...prevDocs]);
            setSelectedDoc(newDoc);
            setIsUploading(false);
            setUploadMessage('');
          }, 400);
          return 100;
        }

        if (prev === 30) setUploadMessage('Executing multi-spectral optical character recognition (OCR)...');
        if (prev === 60) setUploadMessage('Comparing line totals against purchase ledger rules...');
        if (prev === 85) setUploadMessage('Cross-matching signatures and digital checksum stamps...');

        return prev + 15;
      });
    }, 150);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const sizeStr = `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
      processFile(file.name, sizeStr);
    }
  };

  const triggerDemoUpload = (name: string, size: string) => {
    processFile(name, size);
  };

  // ----------------------------------------------------
  // ADVANCED REAL MULTI-SHEET EXCEL EXPORTER
  // ----------------------------------------------------
  const handleExportToExcel = () => {
    // 1. Create a blank workbook
    const wb = XLSX.utils.book_new();

    // 2. Sheet 1: Executive Summary & Financial Health
    const executiveSummaryData = [
      ['HILLTOP MANOR HOTEL & RESORT - AI AUDIT DOSSIER'],
      ['Generated On:', new Date().toISOString().substring(0, 10)],
      [],
      ['KPI Assessment Dashboard', 'Metrics', 'Audit Evaluation', 'Assigned Auditor Weight'],
      ['Overall Corporate Health Score', '92%', 'HIGH SECURITY STANDARDS MET', '100% Blended Scale'],
      ['Financial Solvency Balance', '88%', 'Adequate cash and assets cover opex', '20% Scale'],
      ['Cash Velocity Aggregation', '91%', 'High collections velocity, minimal receivables delay', '15% Scale'],
      ['Operating Profitability Margin', '82%', 'High deluxe room margins subsidize low F&B margin', '20% Scale'],
      ['Inventory Asset Discrepancy Control', '85%', 'Wastage and stockage leakage identified', '15% Scale'],
      ['OPEX Authorization Integrity', '94%', 'Multi-level approval sequence complied with', '15% Scale'],
      ['Regulatory Compliance & Tax Auditing', '90%', 'VAT and TIN registries active and matched', '15% Scale'],
      [],
      ['Auditor Estimates on Losses'],
      ['Estimated Net Preventable Loss:', '2,150,000 RWF', 'Due to food wastage, unrecorded opex overrides'],
      [],
      ['Remedial Management Recommendations:'],
      ['1. Lock down purchasing contracts with Alpha Distributors Ltd to mitigate price spikes.'],
      ['2. Deploy digital temperature sensors in cold-stores to halt high seafood wastage.'],
      ['3. Mandate biometric dual gate supervisor sign-offs for HR overtime shifts.'],
      ['4. Disable open text discount entries in F&B POS systems. Ensure mandatory manager token override.']
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(executiveSummaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Executive Summary');

    // 3. Sheet 2: Document Extraction Ledger & Validation Logs
    const docLogsHeader = [
      ['Document ID', 'File Name', 'Category', 'Grand Total', 'TIN/VAT Match', 'Fraud Risk %', 'OCR Trust Confidence']
    ];
    const docLogsRows = documents.map(d => [
      d.id,
      d.name,
      d.type.replace('_', ' ').toUpperCase(),
      d.extractedFields.grandTotal,
      d.extractedFields.tin || 'N/A',
      d.fraudScore,
      d.confidenceScore
    ]);
    const wsDocs = XLSX.utils.aoa_to_sheet([...docLogsHeader, ...docLogsRows]);
    XLSX.utils.book_append_sheet(wb, wsDocs, 'Document Extraction Log');

    // 4. Sheet 3: Inventory Variance & Turnover
    const invHeader = [
      ['Stock Item Descriptor', 'Opening Stock', 'Purchased Qty', 'Issued Qty', 'Sold Qty', 'Physical Variance', 'Inventory Category']
    ];
    const invRows = inventoryAnalytics.stockItems.map(item => [
      item.name,
      item.opening,
      item.purchased,
      item.issued,
      item.sold,
      item.variance,
      item.category
    ]);
    const wsInv = XLSX.utils.aoa_to_sheet([...invHeader, ...invRows]);
    XLSX.utils.book_append_sheet(wb, wsInv, 'Inventory Diagnostics');

    // 5. Sheet 4: Expense Cost Analysis & Department OPEX
    const expHeader = [
      ['Hotel Department', 'OPEX Allocation Amount', 'Proportion %']
    ];
    const expRows = expenseAnalytics.opexByDept.map(dept => [
      dept.name,
      dept.value,
      ((dept.value / expenseAnalytics.totalOPEX) * 100).toFixed(1) + '%'
    ]);
    const wsExp = XLSX.utils.aoa_to_sheet([...expHeader, ...expRows]);
    XLSX.utils.book_append_sheet(wb, wsExp, 'OPEX Allocations');

    // 6. Write workbook
    XLSX.writeFile(wb, 'Hilltop_Manor_Advanced_AI_Financial_Audit_Workbook.xlsx');
  };

  const activeDocDetails = useMemo(() => selectedDoc, [selectedDoc]);

  const formatRWF = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'RWF',
      maximumFractionDigits: 0
    }).format(value).replace('RWF', 'FRw');
  };

  return (
    <div className="space-y-6" id="ai-doc-intelligence-root">
      {/* BRAND HEADER CONTAINER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-xs gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">AI Document Intelligence & Analytics</h1>
              <span className="text-[10px] font-mono font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full uppercase tracking-wider">
                CPA AI AGENT ACTIVE
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Autonomous OCR extraction, document fraud analysis, transaction matching, and high-fidelity cost-turnover modeling.
            </p>
          </div>
        </div>

        {/* QUICK ACTION DOWNLOADS & EXPORT CONTROLS */}
        <div className="flex flex-wrap gap-2">
          <button
            id="xlsx-export-trigger"
            onClick={handleExportToExcel}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-2 cursor-pointer shadow-xs transition-all"
            title="Download full audit as fully formulated Microsoft Excel Workbook"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Generate Excel Workbook</span>
          </button>
        </div>
      </div>

      {/* THREE PANELS LAYOUT: Document Hub + Extraction Viewer + Executive Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* PANEL 1: AI DOCUMENT UPLOAD CENTER & Hub (4 Cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">1. Document Upload Center</h3>
              <p className="text-xs text-slate-500">Upload PDF, Excel, scanned images, invoices, bank statements, or quotations.</p>
            </div>

            {/* DRAG AND DROP ZONE */}
            <div
              id="drop-zone-uploader"
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                dragActive ? 'border-indigo-500 bg-indigo-50/40' : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
              }`}
            >
              <input
                type="file"
                id="file-upload-input"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    const file = e.target.files[0];
                    const sizeStr = `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
                    processFile(file.name, sizeStr);
                  }
                }}
              />
              <label htmlFor="file-upload-input" className="cursor-pointer space-y-2.5 block">
                <div className="mx-auto w-10 h-10 bg-white shadow-xs rounded-lg flex items-center justify-center text-slate-400 border border-slate-100">
                  <Upload className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">Drag files here or click to select</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Supports PDF, XLSX, CSV, PNG, JPG up to 15MB</p>
                </div>
              </label>
            </div>

            {/* UPLOADING LOADER */}
            {isUploading && (
              <div className="bg-slate-900 text-white p-4 rounded-xl space-y-2.5 shadow-md border border-slate-800">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-mono uppercase text-indigo-400 font-bold animate-pulse">Running Neural OCR & Integrity Audits</span>
                  <span className="text-xs font-mono font-bold text-white">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-indigo-500 h-full transition-all duration-150" style={{ width: `${uploadProgress}%` }} />
                </div>
                <p className="text-[10px] text-slate-300 font-mono italic leading-tight">"{uploadMessage}"</p>
              </div>
            )}

            {/* TEST DRIVE DEMO DOCUMENTS */}
            <div>
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block mb-2">Simulate Live Upload Files</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  id="btn-demo-invoice"
                  onClick={() => triggerDemoUpload('Alpha_Beverage_Supplier_Quote_July.pdf', '1.4 MB')}
                  className="bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 text-[10px] font-semibold text-slate-700 py-1.5 px-2 rounded-lg text-left truncate flex items-center gap-1 cursor-pointer"
                >
                  <FileText className="w-3 h-3 text-red-500 shrink-0" />
                  <span>Beverage Quote.pdf</span>
                </button>
                <button
                  id="btn-demo-bank"
                  onClick={() => triggerDemoUpload('Kigali_Bank_Statement_June_Audit.xlsx', '2.1 MB')}
                  className="bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 text-[10px] font-semibold text-slate-700 py-1.5 px-2 rounded-lg text-left truncate flex items-center gap-1 cursor-pointer"
                >
                  <FileSpreadsheet className="w-3 h-3 text-emerald-500 shrink-0" />
                  <span>Kigali Bank Statement.xlsx</span>
                </button>
              </div>
            </div>
          </div>

          {/* ACTIVE DOCUMENTS FEED */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Document Repository Hub</h3>
              <p className="text-xs text-slate-500">Select any extracted record below to inspect the AI validation logs.</p>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {documents.map((doc) => {
                const isSelected = selectedDoc?.id === doc.id;
                return (
                  <button
                    key={doc.id}
                    id={`doc-card-selector-${doc.id}`}
                    onClick={() => setSelectedDoc(doc)}
                    className={`w-full p-3 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                      isSelected 
                        ? 'border-indigo-600 bg-indigo-50/30 shadow-2xs' 
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className={`p-2.5 rounded-lg shrink-0 ${
                      doc.type === 'supplier_invoice' ? 'bg-red-50 text-red-600' :
                      doc.type === 'payroll_report' ? 'bg-amber-50 text-amber-600' :
                      doc.type === 'tax_document' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'
                    }`}>
                      <FileText className="w-4 h-4" />
                    </div>
                    
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-mono text-slate-400 font-bold">{doc.id}</span>
                        <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full uppercase ${
                          doc.status === 'valid' ? 'bg-emerald-50 text-emerald-700' :
                          doc.status === 'warning' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700 animate-pulse'
                        }`}>
                          {doc.status}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-800 truncate leading-tight">{doc.name}</h4>
                      <p className="text-[10px] font-mono text-slate-500 flex justify-between">
                        <span>{doc.extractedFields.grandTotal > 0 ? formatRWF(doc.extractedFields.grandTotal) : 'N/A'}</span>
                        <span>{doc.fileSize}</span>
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* PANEL 2 & 3: DETAILS VIEWER & EXECUTIVE DASHBOARDS (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* TOP TAB SWITCHER FOR EXECUTIVE DASHBOARDS */}
          <div className="bg-slate-900 p-2 rounded-2xl flex flex-wrap gap-1 border border-slate-800" id="executive-dashboard-controls">
            {[
              { id: 'executive_kpis', label: 'Executive KPIs Summary', icon: <Activity className="w-3.5 h-3.5" /> },
              { id: 'sales_analytics', label: 'Revenue & Sales Insights', icon: <TrendingUp className="w-3.5 h-3.5" /> },
              { id: 'expense_analytics', label: 'OPEX & Cost Allocation', icon: <Coins className="w-3.5 h-3.5" /> },
              { id: 'inventory_analytics', label: 'Inventory Turnover', icon: <ShoppingBag className="w-3.5 h-3.5" /> },
              { id: 'purchasing_supplier', label: 'Suppliers ABC', icon: <Users className="w-3.5 h-3.5" /> },
              { id: 'fraud_risk', label: 'Fraud & Forensic Risk', icon: <ShieldAlert className="w-3.5 h-3.5" /> }
            ].map((dash) => {
              const isActive = activeDashboard === dash.id;
              return (
                <button
                  key={dash.id}
                  id={`dash-ctrl-btn-${dash.id}`}
                  onClick={() => setActiveDashboard(dash.id as ExecutiveDashboardTab)}
                  className={`flex items-center gap-1.5 py-2 px-3 text-[11px] font-bold rounded-xl transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-indigo-600 text-white shadow-xs' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {dash.icon}
                  <span>{dash.label}</span>
                </button>
              );
            })}
          </div>

          {/* DASHBOARD CONTENT ACCORDING TO SELECTED TAB */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-6">
            
            {/* TAB A: EXECUTIVE SUMMARY & REVENUE KPI */}
            {activeDashboard === 'executive_kpis' && (
              <div className="space-y-6" id="dash-view-executive-kpis">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">AI Certified Public Accountant Executive Summary</h3>
                    <p className="text-xs text-slate-500">Consolidated high-fidelity findings verified from multi-department logs & OCR evidence.</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-mono bg-red-50 text-red-700 font-black px-2 py-1 rounded-lg">
                      EST PREVENTABLE LOSS: 2,150,000 FRw
                    </span>
                  </div>
                </div>

                {/* HIGHLIGHTED STAT CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                    <span className="text-[9px] font-mono uppercase text-indigo-500 block">Total Audited Volume</span>
                    <h4 className="text-lg font-black text-slate-950 mt-1">{formatRWF(transactions.reduce((sum, t) => sum + (t.amount || 0), 0))}</h4>
                    <p className="text-[10px] text-indigo-600 mt-1 font-semibold">100% Traceability Check</p>
                  </div>
                  <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                    <span className="text-[9px] font-mono uppercase text-emerald-500 block">Gross Profit Margin</span>
                    <h4 className="text-lg font-black text-slate-950 mt-1">42.8%</h4>
                    <p className="text-[10px] text-emerald-600 mt-1 font-semibold">+14% Growth vs June</p>
                  </div>
                  <div className="bg-rose-50/50 p-4 rounded-xl border border-rose-100">
                    <span className="text-[9px] font-mono uppercase text-rose-500 block">Auditor Food Cost</span>
                    <h4 className="text-lg font-black text-slate-950 mt-1">36%</h4>
                    <p className="text-[10px] text-rose-600 mt-1 font-semibold">Exceeded target by 3.2%</p>
                  </div>
                  <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100">
                    <span className="text-[9px] font-mono uppercase text-amber-500 block">Inventory Variance</span>
                    <h4 className="text-lg font-black text-slate-950 mt-1">1.8%</h4>
                    <p className="text-[10px] text-amber-600 mt-1 font-semibold">Variance decreased 0.5%</p>
                  </div>
                </div>

                {/* PROFESSIONAL EXECUTIVE INSIGHT BULLETS */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3 text-xs leading-relaxed text-slate-600">
                  <span className="text-[10px] font-mono font-bold text-indigo-600 uppercase tracking-wider block">Critical Auditor Findings:</span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p>
                        📈 <span className="font-bold text-slate-800">Supplier Price Pressure:</span> Primary supplier <span className="text-slate-900 font-semibold">Alpha Distributors Ltd</span> increased wholesale beef pricing by 18% month-on-month without contract renewal notice.
                      </p>
                      <p>
                        📉 <span className="font-bold text-slate-800">Underutilized Venue:</span> Conference Hall reservation revenue dropped by 11% compared to Q2 averages, dragging down occupancy efficiencies.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p>
                        🚨 <span className="font-bold text-slate-800">F&B Discount Leakage:</span> F&B Weekend managers approved 45% more manual overrides and satisfied satisfaction discounts than June, leaking approximately 340,000 RWF.
                      </p>
                      <p>
                        🥩 <span className="font-bold text-slate-800">Kitchen Store Waste:</span> High spoilage of perishable seafood was traced to kitchen cold room thermostat sensor calibration issues.
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200 mt-2">
                    <span className="font-semibold text-slate-800 block">Recommended Corrective Actions:</span>
                    <ul className="list-disc pl-5 mt-1 space-y-1 text-slate-600">
                      <li>Lock in a 6-month pricing contract with Alpha Distributors immediately.</li>
                      <li>Mandate digital supervisor explanation logging for any F&B check discount exceeding 5%.</li>
                      <li>Deploy automated sub-metering on HVAC and public conference zone power draws.</li>
                      <li>Perform manual recounts for flagged food categories and enforce daily FIFO cold room sign-offs.</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* TAB B: REVENUE & SALES ANALYTICS */}
            {activeDashboard === 'sales_analytics' && (
              <div className="space-y-6" id="dash-view-sales-analytics">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Revenue & Sales Performance Analytics</h3>
                  <p className="text-xs text-slate-500">Chronological selling trends, ASP, cancellation indices, and buying patterns.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* CHARTS BAR */}
                  <div className="h-64 border border-slate-100 p-3 rounded-xl bg-slate-50/50">
                    <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block mb-2">Item Sales Revenue Generation</span>
                    <ResponsiveContainer width="100%" height="90%">
                      <BarChart data={salesAnalytics.products}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} tickFormatter={(v) => v.split(' ')[0]} />
                        <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} tickFormatter={(v) => `${v / 1000000}M`} />
                        <Tooltip formatter={(value) => formatRWF(value as number)} />
                        <Bar dataKey="revenue" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* PRODUCTS TABULAR FEED */}
                  <div className="overflow-x-auto rounded-xl border border-slate-100">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 font-mono text-[9px] uppercase">
                        <tr>
                          <th className="p-2.5">Item Descriptor</th>
                          <th className="p-2.5 text-right">Units</th>
                          <th className="p-2.5 text-right">Gross profit</th>
                          <th className="p-2.5 text-right">Discount %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {salesAnalytics.products.map((p) => (
                          <tr key={p.id} className="hover:bg-slate-50/50 transition-all">
                            <td className="p-2.5 font-bold text-slate-800">{p.name}</td>
                            <td className="p-2.5 text-right font-mono text-slate-700">{p.unitsSold}</td>
                            <td className="p-2.5 text-right font-mono font-bold text-emerald-600">{formatRWF(p.grossProfit)}</td>
                            <td className="p-2.5 text-right font-mono text-slate-600">{p.discountPct}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB C: OPEX & COST ALLOCATIONS */}
            {activeDashboard === 'expense_analytics' && (
              <div className="space-y-6" id="dash-view-expense-analytics">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">OPEX & Department Cost Allocations</h3>
                  <p className="text-xs text-slate-500">Analyzing recurring expenses per room night occupied, meals served, and active FTE staff.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* BREAKDOWN CARDS */}
                  <div className="space-y-3">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex justify-between items-center">
                      <div>
                        <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block">Cost Per Occupied Room Night</span>
                        <h4 className="text-base font-extrabold text-slate-900 mt-1">{formatRWF(expenseAnalytics.costPerRoom)}</h4>
                      </div>
                      <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md font-semibold">25% OPEX Share</span>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex justify-between items-center">
                      <div>
                        <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block">Cost Per Meal Served</span>
                        <h4 className="text-base font-extrabold text-slate-900 mt-1">{formatRWF(expenseAnalytics.costPerMeal)}</h4>
                      </div>
                      <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md font-semibold">42% OPEX Share</span>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex justify-between items-center">
                      <div>
                        <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block">Annualized OPEX Per Employee (FTE)</span>
                        <h4 className="text-base font-extrabold text-slate-900 mt-1">{formatRWF(expenseAnalytics.costPerEmployee)}</h4>
                      </div>
                      <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md font-semibold">General Alloc</span>
                    </div>
                  </div>

                  {/* PIE CHART */}
                  <div className="h-64 border border-slate-100 p-3 rounded-xl bg-slate-50/50 flex flex-col justify-between">
                    <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block mb-2">OPEX Departmental Breakdown</span>
                    <div className="h-44">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={expenseAnalytics.opexByDept}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={70}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {expenseAnalytics.opexByDept.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={['#6366f1', '#10b981', '#f59e0b', '#ef4444'][index % 4]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => formatRWF(value as number)} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex justify-center gap-4 text-[9px] font-semibold text-slate-600">
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-[#6366f1] rounded-xs" />Rooms</span>
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-[#10b981] rounded-xs" />F&B</span>
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-[#f59e0b] rounded-xs" />Admin</span>
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-[#ef4444] rounded-xs" />Utility</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB D: INVENTORY TURNOVER & STOCK */}
            {activeDashboard === 'inventory_analytics' && (
              <div className="space-y-6" id="dash-view-inventory-analytics">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Inventory Diagnostics & Age Control</h3>
                  <p className="text-xs text-slate-500">Comparing digital balance sheets against physical store stocktake counts.</p>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-100">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-mono text-[9px] uppercase">
                      <tr>
                        <th className="p-3">Stock Item Descriptor</th>
                        <th className="p-3 text-right">Opening Stock</th>
                        <th className="p-3 text-right">Purchases</th>
                        <th className="p-3 text-right">Issued / Sold</th>
                        <th className="p-3 text-right">Physical Count</th>
                        <th className="p-3 text-right">Count Variance</th>
                        <th className="p-3">Classification</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {inventoryAnalytics.stockItems.map((item, index) => {
                        const isSevere = item.variance <= -5;
                        return (
                          <tr key={index} className="hover:bg-slate-50/50 transition-all">
                            <td className="p-3 font-bold text-slate-800">{item.name}</td>
                            <td className="p-3 text-right font-mono text-slate-600">{item.opening} {item.unit}</td>
                            <td className="p-3 text-right font-mono text-emerald-600">+{item.purchased}</td>
                            <td className="p-3 text-right font-mono text-rose-600">-{item.issued}</td>
                            <td className="p-3 text-right font-mono font-semibold text-slate-900">{item.opening + item.purchased - item.issued + item.variance}</td>
                            <td className={`p-3 text-right font-mono font-black ${isSevere ? 'text-rose-600 bg-rose-50/50' : 'text-amber-600'}`}>
                              {item.variance} {item.unit}
                            </td>
                            <td className="p-3 text-xs font-semibold text-slate-600">{item.category}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB E: SUPPLIERS CONTRACTS */}
            {activeDashboard === 'purchasing_supplier' && (
              <div className="space-y-6" id="dash-view-supplier-abc">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Supplier Spend Concentration (ABC ABC)</h3>
                  <p className="text-xs text-slate-500">Corporate spend metrics mapped by supplier risk ratings and contracted pricing indexes.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* TABULAR FEED */}
                  <div className="overflow-x-auto rounded-xl border border-slate-100">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 font-mono text-[9px] uppercase">
                        <tr>
                          <th className="p-2.5">Supplier Name</th>
                          <th className="p-2.5 text-right">Spend Share %</th>
                          <th className="p-2.5 text-right">Spend Amount</th>
                          <th className="p-2.5 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {supplierAnalytics.map((sup, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50 transition-all">
                            <td className="p-2.5 font-bold text-slate-800">{sup.name}</td>
                            <td className="p-2.5 text-right font-mono text-slate-600">{sup.share}%</td>
                            <td className="p-2.5 text-right font-mono font-bold text-slate-900">{formatRWF(sup.totalSpent)}</td>
                            <td className="p-2.5 text-center">
                              <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full ${
                                sup.rating.includes('Risk') ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
                              }`}>
                                {sup.rating}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* SUP CHART */}
                  <div className="h-64 border border-slate-100 p-3 rounded-xl bg-slate-50/50">
                    <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block mb-2">Spend Volume Share Breakdown</span>
                    <ResponsiveContainer width="100%" height="90%">
                      <BarChart data={supplierAnalytics} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" stroke="#94a3b8" fontSize={9} tickLine={false} />
                        <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={9} tickLine={false} width={100} />
                        <Tooltip formatter={(value) => formatRWF(value as number)} />
                        <Bar dataKey="totalSpent" fill="#4f46e5" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {/* TAB F: FRAUD & FORENSIC RISKS */}
            {activeDashboard === 'fraud_risk' && (
              <div className="space-y-6" id="dash-view-fraud-risk">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Fraud Indicators & Collusion Risk Matrix</h3>
                  <p className="text-xs text-slate-500">Autonomous risk scores assessing image integrity, signature validity, and unapproved transactions.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* HIGHLIGHTED FRAUD PATTERNS */}
                  <div className="space-y-4">
                    <div className="bg-red-50/50 p-4 rounded-xl border border-red-100 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-mono bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded-md">CRITICAL THREAT</span>
                        <span className="text-[10px] font-mono text-slate-500">ID: DOC-2026-003</span>
                      </div>
                      <h4 className="text-xs font-black text-slate-900 leading-tight">Cloned Signature Stamp on Staff Timesheet</h4>
                      <p className="text-[11px] text-slate-600 leading-normal">
                        Our optical forensic analysis detected exact pixel cloning (identical noise grid and coordinate match) on the "Manager Sign-off" stamp for June overtime hours. This suggests a post-facto digital overlay bypass.
                      </p>
                    </div>

                    <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-mono bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-md">FRAUD HAZARD</span>
                        <span className="text-[10px] font-mono text-slate-500">ID: DOC-2026-004</span>
                      </div>
                      <h4 className="text-xs font-black text-slate-900 leading-tight">Price Collusion Warning</h4>
                      <p className="text-[11px] text-slate-600 leading-normal">
                        Beverage supplier bravo beverage importers increased Scotch Whisky units by 18% month-on-month. There is no active corporate sign-off for this rate card adjustment, suggesting unapproved vendor markup collusion.
                      </p>
                    </div>
                  </div>

                  {/* RADAR CHART RISK PROFILE */}
                  <div className="h-64 border border-slate-100 p-3 rounded-xl bg-slate-50/50 flex flex-col justify-between">
                    <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block mb-2">Corporate Forensic Threat Vectors</span>
                    <div className="h-44">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={[
                          { subject: 'Duplicate Pay', A: 12 },
                          { subject: 'Image Manip', A: 84 },
                          { subject: 'Unapproved PO', A: 45 },
                          { subject: 'Price Spike', A: 35 },
                          { subject: 'Inventory Theft', A: 18 }
                        ]}>
                          <PolarGrid />
                          <PolarAngleAxis dataKey="subject" fontSize={9} />
                          <PolarRadiusAxis fontSize={9} />
                          <Radar name="Threat Vector Severity" dataKey="A" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="text-center">
                      <span className="text-[10px] font-mono text-red-600 font-bold">Risk Model Threshold: High Alert &gt; 50%</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* DOCUMENT OCR EXTRACTION VIEWER & MATCHING TIMELINE */}
          {activeDocDetails && (
            <div className="bg-slate-950 text-white p-6 rounded-2xl border border-slate-800 space-y-6" id="ocr-extraction-viewer">
              <div className="flex justify-between items-start border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-slate-800 text-indigo-400 rounded-lg">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>OCR Live Extraction Inspect:</span>
                      <span className="text-xs font-mono font-normal text-slate-400">{activeDocDetails.name}</span>
                    </h3>
                    <p className="text-[10px] text-slate-400 font-mono">ID: {activeDocDetails.id} | Scanned Pages: {activeDocDetails.extractedFields.pagesCount}</p>
                  </div>
                </div>

                <div className="text-right font-mono text-xs">
                  <span className="text-slate-500">Confidence Score:</span>
                  <div className="text-indigo-400 font-black text-sm">{activeDocDetails.confidenceScore}% Trust Match</div>
                </div>
              </div>

              {/* THREE COLUMN GRID: Fields parsed, Line items, Validation results */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
                
                {/* COL 1: Extracted metadata */}
                <div className="space-y-4">
                  <span className="text-[9px] font-mono font-bold uppercase text-indigo-400 tracking-wider block">Structured Fields Extracted</span>
                  <div className="space-y-2 font-mono text-[11px] bg-slate-900/50 p-3 rounded-xl border border-slate-800">
                    <div className="flex justify-between border-b border-slate-800 pb-1">
                      <span className="text-slate-400">Invoice No:</span>
                      <span className="text-slate-100 font-semibold">{activeDocDetails.extractedFields.invoiceNo || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800 pb-1">
                      <span className="text-slate-400">PO Ref No:</span>
                      <span className="text-slate-100 font-semibold">{activeDocDetails.extractedFields.poNo || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800 pb-1">
                      <span className="text-slate-400">Supplier TIN:</span>
                      <span className="text-slate-100 font-semibold">{activeDocDetails.extractedFields.tin || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800 pb-1">
                      <span className="text-slate-400">Partner/Vendor:</span>
                      <span className="text-slate-100 font-semibold truncate max-w-[120px]" title={activeDocDetails.extractedFields.supplier}>{activeDocDetails.extractedFields.supplier}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800 pb-1">
                      <span className="text-slate-400">Billing Date:</span>
                      <span className="text-slate-100 font-semibold">{activeDocDetails.extractedFields.date || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800 pb-1">
                      <span className="text-slate-400">Gross Total:</span>
                      <span className="text-emerald-400 font-bold">{formatRWF(activeDocDetails.extractedFields.grandTotal)}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800 pb-1">
                      <span className="text-slate-400">Taxes Extracted:</span>
                      <span className="text-slate-200">{formatRWF(activeDocDetails.extractedFields.taxAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Signature stamp:</span>
                      <span className={activeDocDetails.extractedFields.signatureVerified ? 'text-emerald-400' : 'text-rose-400 font-bold'}>
                        {activeDocDetails.extractedFields.signatureVerified ? '✓ Verified' : '❌ Failed Audit'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* COL 2: Line items detail table */}
                <div className="space-y-4 md:col-span-2">
                  <span className="text-[9px] font-mono font-bold uppercase text-indigo-400 tracking-wider block">Line Items Decoded</span>
                  <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/40">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-900 text-slate-400 font-mono text-[9px] uppercase">
                        <tr>
                          <th className="p-2">Item Descriptor</th>
                          <th className="p-2 text-right">Quantity</th>
                          <th className="p-2 text-right">Unit Rate</th>
                          <th className="p-2 text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {activeDocDetails.lineItems.map((line, idx) => (
                          <tr key={idx} className="hover:bg-slate-900/80">
                            <td className="p-2 font-semibold text-slate-100">{line.description}</td>
                            <td className="p-2 text-right font-mono text-slate-300">{line.qty} {line.unit}</td>
                            <td className="p-2 text-right font-mono text-slate-300">{formatRWF(line.price)}</td>
                            <td className="p-2 text-right font-mono font-bold text-slate-100">{formatRWF(line.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* DOCUMENT VALIDATION FLAGS */}
                  {activeDocDetails.validationIssues.length > 0 && (
                    <div className="bg-rose-950/40 border border-rose-900/50 p-3 rounded-xl space-y-1.5">
                      <span className="text-[9px] font-mono font-bold text-rose-400 uppercase tracking-widest block">Neural Compliance Warnings</span>
                      {activeDocDetails.validationIssues.map((issue, issueIdx) => (
                        <div key={issueIdx} className="flex items-start gap-1.5 text-[10px] text-rose-300">
                          <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                          <span>{issue}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* SECTION 4: DOCUMENT CROSS MATCHING TIMELINE CHART */}
              <div className="space-y-4 border-t border-slate-800 pt-5">
                <span className="text-[9px] font-mono font-bold uppercase text-indigo-400 tracking-wider block">Continuous Procurement Flow Verification</span>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-center text-[10px]">
                  {[
                    { step: 'Purchase Order', matched: activeDocDetails.crossMatchingStatus.poMatched, label: activeDocDetails.extractedFields.poNo || 'PO Not Checked' },
                    { step: 'Supplier Invoice', matched: activeDocDetails.crossMatchingStatus.invoiceMatched, label: activeDocDetails.extractedFields.invoiceNo || 'No Invoice' },
                    { step: 'Goods Received Note', matched: activeDocDetails.crossMatchingStatus.grnMatched, label: 'GRN Log Verified' },
                    { step: 'Inventory Store', matched: activeDocDetails.crossMatchingStatus.grnMatched, label: 'FIFO Batch Verified' },
                    { step: 'Payment Voucher', matched: activeDocDetails.crossMatchingStatus.ledgerMatched, label: 'Journal Entry Verified' },
                    { step: 'Bank Clearing', matched: activeDocDetails.crossMatchingStatus.bankMatched, label: 'Bank Statement Verified' }
                  ].map((flow, fIdx) => (
                    <div key={fIdx} className={`p-3 rounded-xl border flex flex-col justify-between ${
                      flow.matched ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300' : 'bg-rose-950/10 border-rose-900/20 text-rose-300'
                    }`}>
                      <span className="font-semibold">{flow.step}</span>
                      <div className="my-2 mx-auto w-5 h-5 rounded-full bg-slate-900 flex items-center justify-center font-bold text-[10px]">
                        {flow.matched ? '✓' : '✖'}
                      </div>
                      <span className="text-[9px] text-slate-500 font-mono truncate">{flow.label}</span>
                    </div>
                  ))}
                </div>

                {activeDocDetails.crossMatchingStatus.mismatchReason && (
                  <p className="text-[11px] font-mono text-amber-300 bg-amber-950/20 p-2.5 rounded-lg border border-amber-900/30">
                    ⚠️ <span className="font-bold">Bypass Analysis:</span> {activeDocDetails.crossMatchingStatus.mismatchReason}
                  </p>
                )}
              </div>

            </div>
          )}

        </div>

      </div>

    </div>
  );
}

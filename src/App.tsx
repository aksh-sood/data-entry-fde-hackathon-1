import { useEffect, useState, FormEvent } from "react";
import {
  Trash2,
  Plus,
  Database,
  Download,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  Sparkles,
  Filter,
  Copy,
  ChevronRight,
  X,
  Search,
  Calendar,
  DollarSign,
  TrendingUp,
  Tag,
  BookOpen,
  RefreshCw,
  SlidersHorizontal,
  Info,
  Pencil
} from "lucide-react";
import { Receipt, DbStatus } from "./types";

const emailPresets = [
  {
    label: "Combine All 4 Emails",
    text: `Email 1 – Corporate Finance Style
Subject: Invoice INV-2451 | Alpha Cloud Solutions
Hi Accounts Team,
Please find the invoice details for our February cloud subscription.
Vendor: Alpha Cloud Solutions
Invoice #: INV-2451
Invoice Date: 03 February 2026
Amount Due: ₹18,450.00
Expense Category: Software Subscription
Please process before the due date.
Regards,
Neha Sharma
 Finance Executive

Email 2 – Startup Founder
Subject: Can someone clear this today?
Hey Team,
Just received this from Airtel.
Internet bill for January is ₹2,899.
Vendor is Airtel Business.
Need this cleared today if possible.
Thanks!
Rohit
(Category missing, no invoice date)

Email 3 – Cleaning Contractor
Subject: February Cleaning Invoice
Good Morning,
Attached is our monthly invoice.
Company:
 SparkClean Facility Services
Invoice Date:
 01-Feb-2026
Monthly Charges:
 INR 14,750
GST Included.
Facility Management
Thank you.

Email 4 – Friendly Vendor
Subject: Thanks for your business!
Hi Neha,
Hope you're doing well. Just wanted to send over the invoice for the website hosting renewal that we discussed last week. The total payable comes to ₹14,800, and the invoice was raised on 4 February 2026. This is for the annual hosting services provided by BlueStack Hosting, so it should fall under your IT Infrastructure expenses. Let me know if you need anything else from our side.
Thanks,
 Arjun`
  },
  {
    label: "Email 1 – Corporate",
    text: `Subject: Invoice INV-2451 | Alpha Cloud Solutions
Hi Accounts Team,
Please find the invoice details for our February cloud subscription.
Vendor: Alpha Cloud Solutions
Invoice #: INV-2451
Invoice Date: 03 February 2026
Amount Due: ₹18,450.00
Expense Category: Software Subscription`
  },
  {
    label: "Email 2 – founder",
    text: `Subject: Can someone clear this today?
Hey Team,
Just received this from Airtel.
Internet bill for January is ₹2,899.
Vendor is Airtel Business.
Need this cleared today if possible.
Thanks!`
  },
  {
    label: "Email 3 – cleaning",
    text: `Subject: February Cleaning Invoice
Good Morning,
Attached is our monthly invoice.
Company: SparkClean Facility Services
Invoice Date: 01-Feb-2026
Monthly Charges: INR 14,750
GST Included.
Facility Management`
  },
  {
    label: "Email 4 – friendly",
    text: `Subject: Thanks for your business!
Hi Neha,
Hope you're doing well. Just wanted to send over invoice for website hosting renewal. The total payable comes to ₹14,800, and invoice was raised on 4 February 2026. This is for annual hosting services provided by BlueStack Hosting (IT Infrastructure).`
  }
];

export default function App() {
  // Navigation State: 'dashboard' | 'history' | 'reports'
  const [activeTab, setActiveTab] = useState<"dashboard" | "history" | "reports">("dashboard");

  // Core Data States
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [dbStatus, setDbStatus] = useState<DbStatus>({
    configured: false,
    connected: false,
    error: null,
    url: "",
    sql: ""
  });

  // UI Interactive States
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [showSqlModal, setShowSqlModal] = useState<boolean>(false);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);

  // Edit Receipt Modal State
  const [editingReceipt, setEditingReceipt] = useState<Receipt | null>(null);
  const [editFormVendor, setEditFormVendor] = useState<string>("");
  const [editFormAmount, setEditFormAmount] = useState<string>("");
  const [editFormDate, setEditFormDate] = useState<string>("");
  const [editFormCategory, setEditFormCategory] = useState<string>("Food & Dining");
  const [isUpdatingReceipt, setIsUpdatingReceipt] = useState<boolean>(false);
  
  // Custom interactive chart helper State
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  // Quick Entry Form state
  const [vendor, setVendor] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [date, setDate] = useState<string>(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  });
  const [category, setCategory] = useState<string>("Food & Dining");

  // Gemini AI Extraction States
  const [formTab, setFormTab] = useState<"ai" | "manual">("ai");
  const [aiMailText, setAiMailText] = useState<string>("");
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [extractedDataList, setExtractedDataList] = useState<{
    amount: number;
    vendor: string;
    date: string;
    category: string;
    selected?: boolean;
  }[]>([]);

  // Notification Banner State
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  // Trigger brief alert banners
  const showBanner = (type: "success" | "error" | "info", msg: string) => {
    setNotification({ type, message: msg });
    setTimeout(() => {
      setNotification((prev) => (prev?.message === msg ? null : prev));
    }, 4500);
  };

  // Fetch receipts and Database connection status from local Express server
  const loadData = async () => {
    try {
      setIsLoading(true);
      const [receiptsRes, dbStatusRes] = await Promise.all([
        fetch("/api/receipts"),
        fetch("/api/db-status")
      ]);

      if (receiptsRes.ok) {
        const receiptsData = await receiptsRes.json();
        setReceipts(receiptsData);
      }
      if (dbStatusRes.ok) {
        const dbStatusData = await dbStatusRes.json();
        setDbStatus(dbStatusData);
      }
    } catch (error) {
      console.error("Error loading application data:", error);
      showBanner("error", "Failed to connect to backend server APIs.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Sync receipts to Supabase
  const handleSyncToSupabase = async () => {
    if (!dbStatus.configured) {
      setShowSqlModal(true);
      return;
    }

    try {
      setIsSyncing(true);
      showBanner("info", "Synchronizing pending receipts with Supabase Postgres...");

      const res = await fetch("/api/sync", {
        method: "POST"
      });

      const data = await res.json();

      if (res.ok) {
        setReceipts(data.receipts || []);
        // Refresh db-status to confirm table checks are passing
        const statusRes = await fetch("/api/db-status");
        if (statusRes.ok) {
          const statusVal = await statusRes.json();
          setDbStatus(statusVal);
        }

        if (data.syncedCount > 0) {
          showBanner("success", `Sync Completed! ${data.syncedCount} entries exported successfully.`);
        } else {
          showBanner("success", "All receipts are already up-to-date.");
        }
      } else {
        showBanner("error", data.error || "Sync session failed. Verify database table credentials.");
        // Reload in case some status updated
        loadData();
      }
    } catch (err) {
      console.error("Sync error:", err);
      showBanner("error", "Network error occurred during synchronization.");
    } finally {
      setIsSyncing(false);
    }
  };

  // Create receipt
  const handleSubmitReceipt = async (e: FormEvent) => {
    e.preventDefault();
    if (!vendor.trim() || !amount || !date || !category) {
      showBanner("error", "Please fill in all receipt inputs.");
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      showBanner("error", "Please specify a positive numerical amount.");
      return;
    }

    try {
      const res = await fetch("/api/receipts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          amount: parsedAmount,
          vendor: vendor.trim(),
          date,
          category
        })
      });

      if (res.ok) {
        const newReceipt = await res.json();
        setReceipts((prev) => [newReceipt, ...prev]);
        setVendor("");
        setAmount("");
        showBanner("success", "Ledger entry recorded locally!");
      } else {
        const errData = await res.json();
        showBanner("error", errData.error || "Failed to save receipt.");
      }
    } catch (error) {
      console.error("Save error:", error);
      showBanner("error", "Failed to reach the database server.");
    }
  };

  // Extract Structured features via Gemini AI
  const handleAIExtract = async () => {
    if (!aiMailText.trim()) {
      showBanner("error", "Please paste or select an email body text first.");
      return;
    }

    try {
      setIsExtracting(true);
      showBanner("info", "Gemini reading and structuring layout parameters...");
      
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: aiMailText })
      });

      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        const enriched = data.map((item) => ({
          ...item,
          selected: true
        }));
        setExtractedDataList(enriched);
        showBanner("success", `AI Extraction succeeded! Parsed ${data.length} invoice(s).`);
      } else {
        showBanner("error", data.error || "Failed doing batch text extraction.");
      }
    } catch (error) {
      console.error(error);
      showBanner("error", "Network error when communicating with Gemini extractor.");
    } finally {
      setIsExtracting(false);
    }
  };

  // Save the extracted result(s) to local list and DB
  const handleSaveExtracted = async () => {
    const selectedItems = extractedDataList.filter((item) => item.selected);
    if (selectedItems.length === 0) {
      showBanner("error", "Please select at least one extracted invoice to save.");
      return;
    }

    try {
      showBanner("info", `Saving ${selectedItems.length} AI structured receipts to Ledger...`);
      let successCount = 0;
      const newlySaved: Receipt[] = [];

      for (const item of selectedItems) {
        try {
          const res = await fetch("/api/receipts", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              amount: item.amount,
              vendor: item.vendor,
              date: item.date,
              category: item.category
            })
          });

          if (res.ok) {
            const newReceipt = await res.json();
            newlySaved.push(newReceipt);
            successCount++;
          }
        } catch (err) {
          console.error("Individual save error:", err);
        }
      }

      if (successCount > 0) {
        setReceipts((prev) => [...newlySaved, ...prev]);
        showBanner("success", `Logged ${successCount} entries to Postgres ledger!`);
        // Filter out the successfully saved items
        setExtractedDataList((prev) => prev.filter((item) => !item.selected));
        setAiMailText("");
      } else {
        showBanner("error", "Failed to save the extracted receipts.");
      }
    } catch (error) {
      console.error(error);
      showBanner("error", "Error connecting to backend database server.");
    }
  };

  // Delete receipt
  const handleDeleteReceipt = async (id: string) => {
    if (!confirm("Are you sure you want to delete this receipt entry?")) {
      return;
    }

    try {
      const res = await fetch(`/api/receipts/${id}`, {
        method: "DELETE"
      });

      if (res.ok) {
        setReceipts((prev) => prev.filter((r) => r.id !== id));
        showBanner("success", "Ledger entry removed.");
      } else {
        const errData = await res.json();
        showBanner("error", errData.error || "Failed to delete receipt.");
      }
    } catch (error) {
      console.error("Delete error:", error);
      showBanner("error", "Error connecting to backend delete route.");
    }
  };

  // Populate edit state to begin editing
  const startEditingReceipt = (r: Receipt) => {
    setEditingReceipt(r);
    setEditFormVendor(r.vendor);
    setEditFormAmount(r.amount.toString());
    setEditFormDate(r.date);
    setEditFormCategory(r.category);
  };

  // Submit the update to the server
  const handleUpdateReceipt = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingReceipt) return;

    if (!editFormVendor.trim() || !editFormAmount.trim() || !editFormDate || !editFormCategory) {
      showBanner("error", "Please fill in all receipt details.");
      return;
    }

    const amt = parseFloat(editFormAmount);
    if (isNaN(amt) || amt <= 0) {
      showBanner("error", "Amount must be a valid positive number.");
      return;
    }

    try {
      setIsUpdatingReceipt(true);
      const res = await fetch(`/api/receipts/${editingReceipt.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          vendor: editFormVendor.trim(),
          amount: amt,
          date: editFormDate,
          category: editFormCategory
        })
      });

      if (res.ok) {
        const updated = await res.json();
        // Update local state
        setReceipts((prev) => prev.map((r) => r.id === updated.id ? updated : r));
        showBanner("success", "Receipt entry successfully updated!");
        setEditingReceipt(null);
      } else {
        const errData = await res.json();
        showBanner("error", errData.error || "Failed to update receipt.");
      }
    } catch (err) {
      console.error("Update error:", err);
      showBanner("error", "Error connecting to backend update route.");
    } finally {
      setIsUpdatingReceipt(false);
    }
  };

  // Export Receipts to CSV
  const handleExportCSV = () => {
    if (receipts.length === 0) {
      showBanner("info", "No receipts available to export.");
      return;
    }

    const headers = ["ID", "Vendor", "Amount", "Date", "Category", "Sync Status", "Created At"];
    const rows = receipts.map((r) => [
      r.id,
      `"${r.vendor.replace(/"/g, '""')}"`,
      r.amount,
      r.date,
      r.category,
      r.status,
      r.created_at
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `LedgerFlow_Receipts_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showBanner("success", "Receipts successfully compiled and downloaded as CSV!");
  };

  // Copy SQL script to clipboard helper
  const handleCopySql = () => {
    navigator.clipboard.writeText(dbStatus.sql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  // Dynamic Date Metrics
  const currentMonthName = "June 2026"; // Context-specific display title

  // Calculated Aggregations
  const totalSpending = receipts.reduce((sum, r) => sum + r.amount, 0);
  const totalReceiptsCount = receipts.length;

  const averageSpending = totalReceiptsCount > 0 ? totalSpending / totalReceiptsCount : 0;

  // Breakdown by Category
  const categorySummary = receipts.reduce((acc, r) => {
    acc[r.category] = (acc[r.category] || 0) + r.amount;
    return acc;
  }, {} as Record<string, number>);

  // Determine top category
  let topCategoryName = "None";
  let topCategorySpend = 0;
  (Object.entries(categorySummary) as [string, number][]).forEach(([cat, val]) => {
    if (val > topCategorySpend) {
      topCategorySpend = val;
      topCategoryName = cat;
    }
  });
  const topCategoryPct = totalSpending > 0 ? (topCategorySpend / totalSpending) * 100 : 0;

  // Standard category list to guarantee layout colors
  const categoriesMap: Record<string, { color: string; border: string; bg: string; text: string }> = {
    "Food & Dining": {
      color: "bg-indigo-500",
      border: "border-indigo-100",
      bg: "bg-indigo-50",
      text: "text-indigo-700"
    },
    Technology: {
      color: "bg-sky-500",
      border: "border-sky-100",
      bg: "bg-sky-50",
      text: "text-sky-700"
    },
    Travel: {
      color: "bg-amber-500",
      border: "border-amber-100",
      bg: "bg-amber-50",
      text: "text-amber-700"
    },
    "Office Supplies": {
      color: "bg-rose-500",
      border: "border-rose-100",
      bg: "bg-rose-50",
      text: "text-rose-700"
    },
    General: {
      color: "bg-slate-500",
      border: "border-slate-100",
      bg: "bg-slate-50",
      text: "text-slate-700"
    }
  };

  const getCategoryTheme = (cat: string) => {
    return (
      categoriesMap[cat] || {
        color: "bg-slate-500",
        border: "border-slate-200",
        bg: "bg-slate-50",
        text: "text-slate-700"
      }
    );
  };

  // Filter logic for "History List"
  const filteredReceipts = receipts.filter((r) => {
    const matchesSearch =
      r.vendor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "All" || r.category === categoryFilter;
    const matchesStatus =
      statusFilter === "All" ||
      (statusFilter === "synced" && r.status === "synced") ||
      (statusFilter === "pending" && (r.status === "pending" || r.status === "failed"));
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Calculate unique months for reports tab
  const getMonthlyBreakdown = () => {
    const monthsGroup: Record<string, { total: number; count: number; categories: Record<string, number> }> = {};
    receipts.forEach((r) => {
      const monthKey = r.date.substring(0, 7); // "YYYY-MM"
      if (!monthsGroup[monthKey]) {
        monthsGroup[monthKey] = { total: 0, count: 0, categories: {} };
      }
      monthsGroup[monthKey].total += r.amount;
      monthsGroup[monthKey].count += 1;
      monthsGroup[monthKey].categories[r.category] = (monthsGroup[monthKey].categories[r.category] || 0) + r.amount;
    });
    return Object.entries(monthsGroup).sort((a, b) => b[0].localeCompare(a[0]));
  };

  const monthlyReportEntries = getMonthlyBreakdown();

  return (
    <div id="ledger_app_container" className="w-full min-h-screen bg-slate-50 flex overflow-hidden font-sans text-slate-900">
      
      {/* Toast Alert Notice Banner Overlay */}
      {notification && (
        <div
          id="toast_banner"
          className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-5 py-4 rounded-xl shadow-xl transition-all duration-300 animate-slide-in-right border ${
            notification.type === "success"
              ? "bg-emerald-50 text-emerald-900 border-emerald-200"
              : notification.type === "error"
              ? "bg-rose-50 text-rose-900 border-rose-200"
              : "bg-indigo-50 text-indigo-900 border-indigo-200"
          }`}
        >
          {notification.type === "success" && <CheckCircle className="w-5 h-5 text-emerald-600 animate-pulse" />}
          {notification.type === "error" && <AlertCircle className="w-5 h-5 text-rose-600" />}
          {notification.type === "info" && <RefreshCw className="w-5 h-5 text-indigo-600 animate-spin" />}
          <div className="text-sm font-medium">{notification.message}</div>
          <button onClick={() => setNotification(null)} className="p-1 hover:bg-slate-200/50 rounded duration-150">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>
      )}

      {/* Side-sidebar Panel */}
      <aside id="aside_sidebar" className="w-64 bg-slate-900 flex flex-col border-r border-slate-800 shrink-0">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-10">
            <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center font-extrabold text-white text-base">
              L
            </div>
            <span className="text-xl font-bold tracking-tight text-white italic">LedgerFlow</span>
          </div>

          <nav id="sidebar_nav" className="space-y-1">
            <button
              id="tab_btn_dashboard"
              onClick={() => setActiveTab("dashboard")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all duration-200 ${
                activeTab === "dashboard"
                  ? "bg-slate-800 text-white font-semibold"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                  activeTab === "dashboard" ? "bg-indigo-400 scale-125" : "bg-slate-600"
                }`}
              ></span>
              <span className="text-sm">Dashboard</span>
            </button>

            <button
              id="tab_btn_history"
              onClick={() => setActiveTab("history")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all duration-200 ${
                activeTab === "history"
                  ? "bg-slate-800 text-white font-semibold"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                  activeTab === "history" ? "bg-indigo-400 scale-125" : "bg-slate-600"
                }`}
              ></span>
              <span className="text-sm">Receipt History</span>
            </button>

            <button
              id="tab_btn_reports"
              onClick={() => setActiveTab("reports")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all duration-200 ${
                activeTab === "reports"
                  ? "bg-slate-800 text-white font-semibold"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                  activeTab === "reports" ? "bg-indigo-400 scale-125" : "bg-slate-600"
                }`}
              ></span>
              <span className="text-sm">Monthly Reports</span>
            </button>
          </nav>
        </div>

        {/* Database Sync Status Component */}
        <div className="mt-auto p-6">
          <div
            id="db-sync-card"
            onClick={() => setShowSqlModal(true)}
            className="p-4 bg-slate-800/50 rounded-xl border border-slate-700 hover:border-slate-600 cursor-pointer transition-all hover:bg-slate-800/80 duration-200 group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Database Sync</span>
              <Info className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 transition-colors" />
            </div>
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  dbStatus.connected
                    ? "bg-emerald-500 animate-pulse"
                    : dbStatus.configured
                    ? "bg-amber-400 animate-pulse"
                    : "bg-slate-500"
                }`}
              ></div>
              <span className="text-xs text-slate-300 hover:text-white transition-colors duration-150">
                {dbStatus.connected
                  ? "Supabase Connected"
                  : dbStatus.configured
                  ? "Configured (Error)"
                  : "Not Configured"}
              </span>
            </div>
            <span className="block text-[9px] mt-1 text-slate-500">
              {dbStatus.connected ? "Postgres Sync Active" : "Click for Setup instructions"}
            </span>
          </div>
        </div>
      </aside>

      {/* Main Container Content */}
      <main id="main_content" className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Header */}
        <header id="header_top" className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              Financial Overview 
              <span className="text-xs font-semibold px-2 py-0.5 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-md">
                {currentMonthName}
              </span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              id="export_csv_btn"
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-lg shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 cursor-pointer"
            >
              <Download className="w-4 h-4 text-slate-400" />
              Export CSV
            </button>
            <button
              id="sync_supabase_btn"
              disabled={isSyncing}
              onClick={handleSyncToSupabase}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg shadow-sm hover:bg-indigo-700 transition-all disabled:bg-indigo-400 cursor-pointer hover:shadow-indigo-500/10 active:scale-95 duration-200"
            >
              <Database className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
              {isSyncing ? "Syncing..." : "Sync Postgres"}
            </button>
          </div>
        </header>

        {/* Content Wrapper */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="h-96 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
              <p className="text-sm font-medium text-slate-500">Retrieving ledger details...</p>
            </div>
          ) : (
            <>
              {/* VIEW 1: DASHBOARD TAB */}
              {activeTab === "dashboard" && (
                <div id="dashboard_bento_grid" className="grid grid-cols-12 gap-4 pb-6">
                  
                  {/* METRIC 1: Total Spending */}
                  <div className="col-span-12 sm:col-span-6 lg:col-span-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-colors duration-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Spending</span>
                      <DollarSign className="w-4 h-4 text-slate-400" />
                    </div>
                    <div>
                      <div className="text-3xl font-extrabold text-slate-900 tracking-tight text-ellipsis overflow-hidden">
                        ${totalSpending.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-xs text-indigo-600 flex items-center gap-1 font-semibold mt-1">
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span>All logged records</span>
                      </div>
                    </div>
                  </div>

                  {/* METRIC 2: Total Receipts */}
                  <div className="col-span-12 sm:col-span-6 lg:col-span-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-colors duration-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Receipts</span>
                      <FileText className="w-4 h-4 text-slate-400" />
                    </div>
                    <div>
                      <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
                        {totalReceiptsCount}
                      </div>
                      <div className="text-xs text-slate-500 font-semibold mt-1">
                        Avg. ${averageSpending.toFixed(2)} per entry
                      </div>
                    </div>
                  </div>

                  {/* METRIC 3: Top Category */}
                  <div className="col-span-12 sm:col-span-6 lg:col-span-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-colors duration-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Top Category</span>
                      <Tag className="w-4 h-4 text-slate-400" />
                    </div>
                    <div>
                      <div className="text-3xl font-extrabold text-slate-900 tracking-tight truncate">
                        {topCategoryName}
                      </div>
                      <div className="text-xs text-slate-500 font-semibold mt-1">
                        {topCategoryName !== "None" ? `${topCategoryPct.toFixed(1)}% of total spends` : "No spends yet"}
                      </div>
                    </div>
                  </div>

                  {/* STAT 4: Supabase Connection Badge */}
                  <div className="col-span-12 sm:col-span-6 lg:col-span-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-colors duration-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Supabase Sync</span>
                      <Database className="w-4 h-4 text-slate-400" />
                    </div>
                    <div>
                      <div className={`text-xl font-bold tracking-tight ${dbStatus.connected ? "text-emerald-600" : "text-amber-500"}`}>
                        {dbStatus.connected ? "Live System Active" : "Pending Setup"}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 truncate">
                        {dbStatus.connected ? "Postgres table reachable" : "JSON file fallback running"}
                      </div>
                    </div>
                  </div>

                  {/* BENTO ROW: Graph on left, Receipt Form on right (which occupies col-span-3 row-span-6 in mockup) */}
                  
                  {/* Category Spend Graph Card (Col span 12 or 8) */}
                  <div className="col-span-12 lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Category Distribution</h2>
                        <p className="text-xs text-slate-400 mt-0.5">Interactive breakdown of historical spend share</p>
                      </div>
                      <span className="text-[10px] bg-slate-50 text-slate-500 border border-slate-200 px-2 py-0.5 rounded-md uppercase font-bold">
                        Distribution percentage
                      </span>
                    </div>

                    {/* Highly polished interactive custom layout bar list which has absolute safety & beauty */}
                    {totalSpending === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 h-64">
                        <SlidersHorizontal className="w-8 h-8 text-slate-300 mb-2" />
                        <p className="text-xs text-slate-400 text-center font-medium">
                          No transaction records logged. Submit an entry to render interactive analytics.
                        </p>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col justify-center space-y-5 h-64">
                        {["Food & Dining", "Technology", "Travel", "Office Supplies", "General"].map((cat) => {
                          const catAmount = categorySummary[cat] || 0;
                          const percentage = totalSpending > 0 ? (catAmount / totalSpending) * 100 : 0;
                          const catTheme = getCategoryTheme(cat);
                          const isHovered = hoveredCategory === cat;

                          return (
                            <div
                              key={cat}
                              onMouseEnter={() => setHoveredCategory(cat)}
                              onMouseLeave={() => setHoveredCategory(null)}
                              className="group cursor-pointer transition-all duration-150 relative"
                            >
                              <div className="flex items-center justify-between mb-1.5 text-xs">
                                <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${catTheme.color}`} />
                                  <span className={`font-medium ${isHovered ? "text-indigo-600 font-bold" : "text-slate-700"}`}>
                                    {cat}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="font-bold text-slate-900">${catAmount.toFixed(2)}</span>
                                  <span className="text-slate-400 text-[11px] bg-slate-100 rounded px-1">{percentage.toFixed(1)}%</span>
                                </div>
                              </div>
                              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50 relative">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ease-out ${catTheme.color}`}
                                  style={{ width: `${percentage}%` }}
                                />
                                {isHovered && (
                                  <div className="absolute inset-0 bg-white/20 animate-pulse" />
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                              {/* FORM CARD: Quick Entry AI Scraper & Manual (Col span 12 or 4) */}
                  <div className="col-span-12 lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                    <div className="flex border-b border-slate-100 mb-4 pb-2 justify-between items-center">
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => { setFormTab("ai"); setExtractedDataList([]); }}
                          className={`flex items-center gap-1.5 pb-2 text-xs font-black uppercase border-b-2 transition-all ${
                            formTab === "ai"
                              ? "border-indigo-500 text-indigo-600"
                              : "border-transparent text-slate-400 hover:text-slate-600"
                          }`}
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          AI Scraper
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormTab("manual")}
                          className={`flex items-center gap-1.5 pb-2 text-xs font-black uppercase border-b-2 transition-all ${
                            formTab === "manual"
                              ? "border-indigo-500 text-indigo-600"
                              : "border-transparent text-slate-400 hover:text-slate-600"
                          }`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Manual Form
                        </button>
                      </div>
                      <span className="text-[9px] font-extrabold uppercase bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100">
                        {formTab === "ai" ? "Gemini 3.5" : "Quick entry"}
                      </span>
                    </div>

                    {formTab === "ai" ? (
                      <div className="space-y-4 flex-1 flex flex-col">
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase">
                              Paste Custom Email or Select Preset below
                            </label>
                          </div>
                          <textarea
                            id="ai_email_textarea"
                            rows={6}
                            value={aiMailText}
                            onChange={(e) => setAiMailText(e.target.value)}
                            placeholder="Paste your receipt, invoice email details, or friendly vendor messages here..."
                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono text-slate-700"
                          />
                        </div>

                        {/* Presets Grid */}
                        <div>
                          <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">
                            Click to Load Sample Email Inputs
                          </span>
                          <div className="grid grid-cols-2 gap-2">
                            {emailPresets.map((preset, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                  setAiMailText(preset.text);
                                  setExtractedDataList([]);
                                  showBanner("info", `Preset loaded! Click 'AI Structuring Extract' to run Gemini.`);
                                }}
                                className="px-2.5 py-1.5 text-left border border-slate-200 hover:border-indigo-300 hover:bg-slate-50 text-[10px] font-bold rounded-lg truncate transition-colors duration-150 text-slate-700"
                              >
                                ⚡ {preset.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {extractedDataList.length === 0 ? (
                          <div className="pt-2">
                            <button
                              id="btn_ai_extract"
                              type="button"
                              onClick={handleAIExtract}
                              disabled={isExtracting}
                              className={`w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-xl font-bold text-sm shadow-md hover:bg-indigo-750 active:scale-95 transition-all cursor-pointer ${
                                isExtracting ? "opacity-70 cursor-wait" : ""
                              }`}
                            >
                              {isExtracting ? (
                                <>
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                  Gemini is analyzing...
                                </>
                              ) : (
                                <>
                                  <Sparkles className="w-4 h-4" />
                                  AI Structuring Extract
                                </>
                              )}
                            </button>
                          </div>
                        ) : (
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-3 animate-fade-in flex flex-col max-h-[380px] overflow-y-auto">
                            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                              <span className="text-[10px] font-black uppercase text-indigo-600 flex items-center gap-1">
                                <CheckCircle className="w-3.5 h-3.5 text-indigo-500" />
                                Extraction Results ({extractedDataList.length})
                              </span>
                              <button
                                type="button"
                                onClick={() => setExtractedDataList([])}
                                className="text-[10px] text-slate-400 hover:text-slate-600 uppercase font-bold"
                              >
                                Clear
                              </button>
                            </div>

                            <div className="space-y-2.5 max-h-[250px] overflow-y-auto pr-1">
                              {extractedDataList.map((item, index) => (
                                <div
                                  key={index}
                                  className={`p-2.5 rounded-lg border bg-white transition-all ${
                                    item.selected
                                      ? "border-indigo-400 bg-indigo-50/10 shadow-sm"
                                      : "border-slate-200 opacity-60"
                                  }`}
                                >
                                  <div className="flex items-start gap-2.5">
                                    <input
                                      type="checkbox"
                                      checked={!!item.selected}
                                      onChange={() => {
                                        setExtractedDataList((prev) =>
                                          prev.map((it, idx) =>
                                            idx === index ? { ...it, selected: !it.selected } : it
                                          )
                                        );
                                      }}
                                      className="mt-1 h-3.5 w-3.5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                                    />
                                    <div className="flex-1 min-w-0 text-xs">
                                      <div className="flex justify-between items-center gap-2">
                                        <input
                                          type="text"
                                          value={item.vendor}
                                          onChange={(e) => {
                                            const val = e.target.value;
                                            setExtractedDataList((prev) =>
                                              prev.map((it, idx) =>
                                                idx === index ? { ...it, vendor: val } : it
                                              )
                                            );
                                          }}
                                          className="font-bold text-slate-900 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-indigo-300 focus:bg-white px-1 py-0.5 rounded outline-none w-2/3 truncate"
                                        />
                                        <span className="font-extrabold text-slate-900 text-right whitespace-nowrap">
                                          ₹
                                          <input
                                            type="number"
                                            value={item.amount}
                                            onChange={(e) => {
                                              const val = parseFloat(e.target.value) || 0;
                                              setExtractedDataList((prev) =>
                                                prev.map((it, idx) =>
                                                  idx === index ? { ...it, amount: val } : it
                                                )
                                              );
                                            }}
                                            className="font-extrabold text-slate-900 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-indigo-300 focus:bg-white px-1 py-0.5 rounded outline-none w-16 inline-block text-right"
                                          />
                                        </span>
                                      </div>

                                      <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-500">
                                        <select
                                          value={item.category}
                                          onChange={(e) => {
                                            const val = e.target.value;
                                            setExtractedDataList((prev) =>
                                              prev.map((it, idx) =>
                                                idx === index ? { ...it, category: val } : it
                                              )
                                            );
                                          }}
                                          className="text-[10px] text-slate-600 font-black bg-transparent hover:border-slate-200 focus:bg-white rounded outline-none cursor-pointer"
                                        >
                                          <option value="Food & Dining">Food & Dining</option>
                                          <option value="Technology">Technology</option>
                                          <option value="Travel">Travel</option>
                                          <option value="Office Supplies">Office Supplies</option>
                                          <option value="General">General</option>
                                        </select>
                                        <input
                                          type="date"
                                          value={item.date}
                                          onChange={(e) => {
                                            const val = e.target.value;
                                            setExtractedDataList((prev) =>
                                              prev.map((it, idx) =>
                                                idx === index ? { ...it, date: val } : it
                                              )
                                            );
                                          }}
                                          className="text-[10px] font-bold text-slate-500 bg-transparent hover:border-slate-200 focus:bg-white rounded outline-none cursor-pointer"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>

                            <button
                              type="button"
                              onClick={handleSaveExtracted}
                              className="w-full bg-emerald-600 text-white py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-emerald-700 active:scale-95 transition-all shadow-md cursor-pointer mt-1"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Save Selected ({extractedDataList.filter((it) => it.selected).length}) to Postgres
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <form onSubmit={handleSubmitReceipt} className="space-y-4 flex-1">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">
                            Vendor Name
                          </label>
                          <input
                            id="form_vendor_input"
                            type="text"
                            required
                            value={vendor}
                            onChange={(e) => setVendor(e.target.value)}
                            placeholder="e.g. Amazon, Starbucks..."
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">
                              Amount ($)
                            </label>
                            <div className="relative">
                              <span className="absolute left-3.5 top-2.5 text-slate-400 text-sm font-medium">$</span>
                              <input
                                id="form_amount_input"
                                type="number"
                                step="0.01"
                                required
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
                                className="w-full pl-8 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-semibold"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">
                              Date
                            </label>
                            <input
                              id="form_date_input"
                              type="date"
                              required
                              value={date}
                              onChange={(e) => setDate(e.target.value)}
                              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">
                            Category
                          </label>
                          <select
                            id="form_category_select"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm appearance-none font-medium text-slate-705 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                          >
                            <option value="Food & Dining">Food & Dining</option>
                            <option value="Technology">Technology</option>
                            <option value="Travel">Travel</option>
                            <option value="Office Supplies">Office Supplies</option>
                            <option value="General">General</option>
                          </select>
                        </div>

                        <div className="pt-2">
                          <button
                            id="form_process_btn"
                            type="submit"
                            className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-bold text-sm shadow-md hover:bg-slate-800 active:scale-95 transition-all cursor-pointer"
                          >
                            Log Receipt Entry
                          </button>
                        </div>
                      </form>
                    )}

                    <div className="mt-4 p-3.5 bg-indigo-50 rounded-xl border border-indigo-100">
                      <p className="text-[11px] leading-relaxed text-indigo-700 font-medium">
                        <span className="font-extrabold pr-1">Pro Tip:</span> 
                        Connect to Supabase, then click <b>Sync Postgres</b> to securely upload pending offline entries.
                      </p>
                    </div>
                  </div>        </div>

                  {/* BOTTOM RECENT TRANSACTIONS TABLE PANEL (Col span 12) */}
                  <div className="col-span-12 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                      <div>
                        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Recent Ledger Entries</h2>
                        <p className="text-xs text-slate-400 mt-0.5">Showing latest transactions stored on cache server</p>
                      </div>
                      <button
                        onClick={() => setActiveTab("history")}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 hover:underline"
                      >
                        View All
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                            <th className="px-6 py-3">Date</th>
                            <th className="px-6 py-3">Vendor</th>
                            <th className="px-6 py-3">Category</th>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3 text-right">Amount</th>
                            <th className="px-6 py-3 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="text-xs divide-y divide-slate-100">
                          {receipts.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-medium bg-white">
                                <BookOpen className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                                No receipts recorded.
                              </td>
                            </tr>
                          ) : (
                            receipts.slice(0, 5).map((r) => {
                              const theme = getCategoryTheme(r.category);
                              return (
                                <tr key={r.id} className="hover:bg-slate-50/80 transition-colors duration-150">
                                  <td className="px-6 py-4 text-slate-500 font-medium truncate">
                                    {new Date(r.date).toLocaleDateString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric"
                                    })}
                                  </td>
                                  <td className="px-6 py-4 font-bold text-slate-950 font-sans truncate">{r.vendor}</td>
                                  <td className="px-6 py-4">
                                    <span className={`px-2.5 py-1 text-[9px] font-bold rounded-lg uppercase ${theme.bg} ${theme.text} border ${theme.border}`}>
                                      {r.category}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4">
                                    {r.status === "synced" ? (
                                      <span className="flex items-center gap-1.5 text-emerald-600 font-semibold text-[11px]">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                        Synced
                                      </span>
                                    ) : (
                                      <span
                                        className={`flex items-center gap-1.5 font-semibold text-[11px] ${
                                          r.status === "failed" ? "text-rose-500" : "text-amber-500"
                                        }`}
                                        title={r.error_message || "Pending sync with supabase"}
                                      >
                                        <span className={`w-1.5 h-1.5 rounded-full ${r.status === "failed" ? "bg-rose-500" : "bg-amber-400 animate-pulse"}`}></span>
                                        {r.status === "failed" ? "Failed" : "Pending"}
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-6 py-4 text-right font-extrabold text-slate-950">
                                    ${r.amount.toFixed(2)}
                                  </td>
                                  <td className="px-6 py-4 text-center">
                                    <div className="flex items-center justify-center gap-1.5">
                                      <button
                                        onClick={() => startEditingReceipt(r)}
                                        className="p-1.5 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 text-slate-400 rounded-lg border border-slate-100 hover:border-indigo-100 transition-colors duration-150 cursor-pointer"
                                        title="Edit receipt"
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteReceipt(r.id)}
                                        className="p-1.5 bg-slate-50 hover:bg-rose-50 hover:text-rose-600 text-slate-400 rounded-lg border border-slate-100 hover:border-rose-100 transition-colors duration-150 cursor-pointer"
                                        title="Delete receipt"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              )}

              {/* VIEW 2: RECEIPT HISTORY TAB */}
              {activeTab === "history" && (
                <div id="receipt_history_panel" className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col p-6 animate-fade-in">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-100 pb-5 mb-5 shrink-0">
                    <div>
                      <h2 className="text-base font-bold text-slate-900 uppercase tracking-wider">Historical Receipts Ledger</h2>
                      <p className="text-xs text-slate-400 mt-0.5">Filter, search, and manage secure record synchronization</p>
                    </div>
                    <span className="text-xs bg-slate-50 border border-slate-200 text-slate-600 px-3 py-1 rounded-full font-semibold">
                      Total records: {filteredReceipts.length}
                    </span>
                  </div>

                  {/* Inputs and filters row */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-5">
                    {/* Search Field */}
                    <div className="md:col-span-5 relative">
                      <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                      <input
                        id="history_search"
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search vendor or receipt ID..."
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-all font-medium text-slate-800"
                      />
                    </div>

                    {/* Category Filter */}
                    <div className="md:col-span-3">
                      <select
                        id="history_category_filter"
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/25"
                      >
                        <option value="All">All Categories</option>
                        <option value="Food & Dining">Food & Dining</option>
                        <option value="Technology">Technology</option>
                        <option value="Travel">Travel</option>
                        <option value="Office Supplies">Office Supplies</option>
                        <option value="General">General</option>
                      </select>
                    </div>

                    {/* Sync Status Filter */}
                    <div className="md:col-span-3">
                      <select
                        id="history_status_filter"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/25"
                      >
                        <option value="All">All Sync Statuses</option>
                        <option value="synced">Synced (Postgres)</option>
                        <option value="pending">Pending Sync</option>
                      </select>
                    </div>

                    {/* Reset Button */}
                    <div className="md:col-span-1">
                      <button
                        onClick={() => {
                          setSearchQuery("");
                          setCategoryFilter("All");
                          setStatusFilter("All");
                        }}
                        className="w-full h-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-xs transition-colors duration-150 cursor-pointer flex items-center justify-center"
                        title="Clear Filters"
                      >
                        Reset
                      </button>
                    </div>
                  </div>

                  {/* Main Table Content */}
                  <div className="overflow-x-auto min-h-96">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-400 font-extrabold">
                          <th className="px-6 py-3">Receipt ID</th>
                          <th className="px-6 py-3">Date</th>
                          <th className="px-6 py-3">Vendor Name</th>
                          <th className="px-6 py-3">Category</th>
                          <th className="px-6 py-3">Status</th>
                          <th className="px-6 py-3 text-right">Amount</th>
                          <th className="px-6 py-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="text-xs divide-y divide-slate-100">
                        {filteredReceipts.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-6 py-16 text-center text-slate-400 font-medium">
                              <Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                              No matching transaction receipts found. Try resetting filters.
                            </td>
                          </tr>
                        ) : (
                          filteredReceipts.map((r) => {
                            const theme = getCategoryTheme(r.category);
                            return (
                              <tr key={r.id} className="hover:bg-slate-50/80 transition-colors duration-150">
                                <td className="px-6 py-4 font-mono text-slate-400 text-[11px] truncate" style={{ maxWidth: "110px" }} title={r.id}>
                                  {r.id}
                                </td>
                                <td className="px-6 py-4 text-slate-500 font-medium">
                                  {new Date(r.date).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric"
                                  })}
                                </td>
                                <td className="px-6 py-4 font-bold text-slate-900 truncate" style={{ maxWidth: "160px" }}>
                                  {r.vendor}
                                </td>
                                <td className="px-6 py-4">
                                  <span className={`px-2.5 py-1 text-[9px] font-bold rounded-lg uppercase ${theme.bg} ${theme.text} border ${theme.border}`}>
                                    {r.category}
                                  </span>
                                </td>
                                <td className="px-6 py-4">
                                  {r.status === "synced" ? (
                                    <span className="flex items-center gap-1.5 text-emerald-600 font-semibold text-[11px]">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                      Synced to Postgres
                                    </span>
                                  ) : (
                                    <span
                                      className={`flex items-center gap-1.5 font-semibold text-[11px] cursor-help ${
                                        r.status === "failed" ? "text-rose-500 animate-pulse" : "text-amber-500"
                                      }`}
                                      title={r.error_message || "Stored in active system cache memory. Needs Sync."}
                                    >
                                      <span className={`w-1.5 h-1.5 rounded-full ${r.status === "failed" ? "bg-rose-500" : "bg-amber-400 animate-pulse"}`}></span>
                                      {r.status === "failed" ? "Sync Error" : "Pending Sync"}
                                    </span>
                                  )}
                                </td>
                                <td className="px-6 py-4 text-right font-extrabold text-slate-950">
                                  ${r.amount.toFixed(2)}
                                </td>
                                <td className="px-6 py-3 text-center">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button
                                      onClick={() => startEditingReceipt(r)}
                                      className="p-1.5 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 text-slate-400 rounded-lg border border-slate-100 hover:border-indigo-100 transition-colors duration-150 cursor-pointer"
                                      title="Edit Entry"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteReceipt(r.id)}
                                      className="p-1.5 bg-slate-50 hover:bg-rose-50 hover:text-rose-600 text-slate-400 rounded-lg border border-slate-100 hover:border-rose-100 transition-colors duration-150 cursor-pointer"
                                      title="Delete Entry"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* VIEW 3: MONTHLY REPORTS TAB */}
              {activeTab === "reports" && (
                <div id="monthly_reports_panel" className="space-y-6 animate-fade-in pb-10">
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                    <div className="border-b border-slate-100 pb-4 mb-4">
                      <h2 className="text-base font-bold text-slate-900 uppercase tracking-wider">Monthly Spending Analyses</h2>
                      <p className="text-xs text-slate-400 mt-0.5">Chronological summary reporting on categories and budget metrics</p>
                    </div>

                    {monthlyReportEntries.length === 0 ? (
                      <div className="text-center py-20 text-slate-400 font-medium">
                        <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                        No transaction data available to compile reports. Log a receipt to begin.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {monthlyReportEntries.map(([monthString, monthData]) => {
                          const [year, monthNum] = monthString.split("-");
                          const displayedName = new Date(parseInt(year), parseInt(monthNum) - 1, 1).toLocaleDateString("en-US", {
                            month: "long",
                            year: "numeric"
                          });

                          return (
                            <div key={monthString} className="bg-slate-50 rounded-xl border border-slate-200/60 p-5 hover:shadow-md transition-all duration-200">
                              <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
                                <span className="font-extrabold text-slate-900 tracking-tight text-sm">{displayedName}</span>
                                <span className="text-[11px] bg-slate-900 text-slate-100 px-2.5 py-0.5 rounded-full font-bold">
                                  {monthData.count} receipts
                                </span>
                              </div>

                              <div className="space-y-3">
                                <div>
                                  <label className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Aggregate spend</label>
                                  <div className="text-2xl font-black text-indigo-700">${monthData.total.toFixed(2)}</div>
                                </div>

                                <div className="space-y-2 pt-2 border-t border-slate-200/50">
                                  <label className="block text-[9px] text-slate-400 uppercase tracking-wider font-extrabold mb-1">
                                    Category share
                                  </label>
                                  {Object.entries(monthData.categories).map(([cat, amount]) => {
                                    const percent = (amount / monthData.total) * 100;
                                    const theme = getCategoryTheme(cat);
                                    return (
                                      <div key={cat} className="space-y-1">
                                        <div className="flex justify-between items-center text-[11px] text-slate-700 font-medium">
                                          <div className="flex items-center gap-1.5">
                                            <span className={`w-1.5 h-1.5 rounded-full ${theme.color}`}></span>
                                            <span>{cat}</span>
                                          </div>
                                          <div className="font-bold">
                                            ${amount.toFixed(2)} <span className="text-slate-400 text-[9px] font-normal">({percent.toFixed(0)}%)</span>
                                          </div>
                                        </div>
                                        <div className="w-full h-1.5 bg-slate-200/80 rounded-full overflow-hidden">
                                          <div className={`h-full rounded-full ${theme.color}`} style={{ width: `${percent}%` }} />
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* MODAL OVERLAY: Supabase Connection & SQL Setup Helper */}
      {showSqlModal && (
        <div id="setup-modal-overlay" className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-scale-up-in">
            {/* Modal Header */}
            <div className="px-6 py-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-indigo-400 animate-pulse" />
                <h3 className="font-bold tracking-tight text-base">Setup Supabase Postgres Synchronization</h3>
              </div>
              <button
                onClick={() => setShowSqlModal(false)}
                className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
              
              {/* Step 1: Environment details */}
              <div className="space-y-2">
                <h4 className="text-xs font-extrabold uppercase tracking-widest text-indigo-600">
                  Step 1: Save Environment Credentials
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Go to the <b>Secrets manager panel</b> in the AI Studio sidebar configuration and enter these two values so the backend server engine can authenticate:
                </p>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between text-slate-700">
                    <div>
                      <span className="font-extrabold text-indigo-700">SUPABASE_URL</span> = <span className="text-slate-500">"your-project-url"</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-slate-700">
                    <div>
                      <span className="font-extrabold text-indigo-700">SUPABASE_PUBLISHABLE_KEY</span> = <span className="text-slate-500">"your-public-anon-or-publishable-key"</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 2: Database setup instructions */}
              <div className="space-y-2">
                <h4 className="text-xs font-extrabold uppercase tracking-widest text-indigo-600">
                  Step 2: Create receipts Postgres table
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Enter your Supabase dashboard, select the <b>SQL Editor</b> panel, and execute this query to bootstrap the destination table structure:
                </p>

                <div className="relative">
                  <pre className="p-4 bg-slate-900 text-emerald-400 text-[11px] font-mono rounded-xl overflow-x-auto leading-relaxed border border-slate-800">
                    {dbStatus.sql}
                  </pre>
                  <button
                    onClick={handleCopySql}
                    className="absolute top-3 right-3 flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs px-3 py-1.5 rounded-lg border border-slate-700 transition-all cursor-pointer hover:shadow-indigo-500/10 active:scale-95 duration-100"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    {copiedSql ? "Copied!" : "Copy SQL"}
                  </button>
                </div>
              </div>

              {/* Step 3: Current status debugging help */}
              <div className="pt-3 border-t border-slate-200 space-y-2">
                <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-700 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  Live Sync Status Check Report
                </h4>
                <div className={`p-4 rounded-xl border text-xs leading-relaxed ${
                  dbStatus.connected 
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
                    : "bg-amber-50 text-amber-800 border-amber-200"
                }`}>
                  {dbStatus.connected ? (
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4.5 h-4.5 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <b>Fully Connected!</b> Supabase is reachable and the <code>receipts</code> database table was verified successfully. Dynamic exports are fully active.
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4.5 h-4.5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <b>Integration Pending:</b> {dbStatus.error || "Please supply Supabase URL and key credentials inside the environment."}
                        <br />
                        <span className="block mt-1 bg-white/60 p-2 rounded border border-amber-200/50 mt-1.5 text-[11px]">
                          <b>Offline State is active:</b> You can continue logging receipt entries right away. They are securely cached locally and can be synchronized with one click down the line!
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Close Button */}
              <div className="pt-4 flex justify-end">
                <button
                  onClick={() => setShowSqlModal(false)}
                  className="px-5 py-2.5 bg-slate-900 text-white text-xs font-extrabold rounded-xl hover:bg-slate-800 cursor-pointer"
                >
                  Close Setup Guide
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* MODAL OVERLAY: Edit Receipt Entry */}
      {editingReceipt && (
        <div id="edit-modal-overlay" className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden animate-scale-up-in">
            {/* Modal Header */}
            <div className="px-6 py-5 bg-indigo-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Pencil className="w-5 h-5 text-indigo-200" />
                <h3 className="font-bold tracking-tight text-base">Edit Receipt Details</h3>
              </div>
              <button
                onClick={() => setEditingReceipt(null)}
                className="p-1.5 hover:bg-indigo-700 text-indigo-200 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleUpdateReceipt} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Vendor Name</label>
                <input
                  type="text"
                  value={editFormVendor}
                  onChange={(e) => setEditFormVendor(e.target.value)}
                  placeholder="e.g. Starbucks, Amazon"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-all"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={editFormAmount}
                    onChange={(e) => setEditFormAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-all"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Date</label>
                  <input
                    type="date"
                    value={editFormDate}
                    onChange={(e) => setEditFormDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-all cursor-pointer"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Category</label>
                <select
                  value={editFormCategory}
                  onChange={(e) => setEditFormCategory(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-all cursor-pointer"
                >
                  <option value="Food & Dining">Food & Dining</option>
                  <option value="Technology">Technology</option>
                  <option value="Travel">Travel</option>
                  <option value="Office Supplies">Office Supplies</option>
                  <option value="General">General</option>
                </select>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingReceipt(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingReceipt}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold rounded-xl hover:shadow-indigo-500/10 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {isUpdatingReceipt ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

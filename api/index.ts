import express from "express";
import path from "path";
import fs from "fs";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

function logEnvironmentVariables() {
  console.log("\n========================================================");
  console.log("[LedgerFlow] INITIALIZING ENVIRONMENT VARIABLES...");
  console.log("========================================================");
  
  const envVarsToCheck = [
    { name: "NODE_ENV", isSecret: false },
    { name: "VERCEL", isSecret: false },
    { name: "PORT", isSecret: false },
    { name: "GEMINI_API_KEY", isSecret: true },
    { name: "SUPABASE_URL", isSecret: false },
    { name: "SUPABASE_PUBLISHABLE_KEY", isSecret: true },
    { name: "SUPABASE_ANON_KEY", isSecret: true },
  ];

  envVarsToCheck.forEach(({ name, isSecret }) => {
    const val = process.env[name];
    if (val === undefined) {
      console.log(`📡 ${name.padEnd(25)}: NOT DEFINED ❌`);
    } else if (val.trim() === "") {
      console.log(`📡 ${name.padEnd(25)}: EMPTY/WHITESPACE ⚠️`);
    } else {
      if (isSecret) {
        const trimmed = val.trim();
        // Secure mask: show first 4 and last 4 characters if long enough
        const displayVal = trimmed.length > 8 
          ? `${trimmed.substring(0, 4)}...${trimmed.substring(trimmed.length - 4)}` 
          : "***";
        console.log(`📡 ${name.padEnd(25)}: DEFINED ✅ [Length: ${trimmed.length}] (${displayVal})`);
      } else {
        console.log(`📡 ${name.padEnd(25)}: "${val}" ✅`);
      }
    }
  });
  console.log("========================================================\n");
}

logEnvironmentVariables();

const app = express();
const PORT = 3000;

// Dynamic data file location for deployment resiliency (Vercel provides a writable /tmp directory)
const isVercel = !!process.env.VERCEL;
const DATA_FILE = isVercel ? "/tmp/receipts.json" : path.join(process.cwd(), "receipts.json");

app.use(express.json());

// Initialize GoogleGenAI SDK safely and lazily to avoid startup crashes when keys are missing or loaded late
let gGenAI: GoogleGenAI | null = null;
function getGeminiAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.includes("placeholder")) {
    throw new Error("Gemini API Key is not set or is a placeholder. If you are hosting on Vercel, please make sure you have added GEMINI_API_KEY as an Environment Variable in your Vercel Project Dashboard (Settings > Environment Variables) and re-deployed your app.");
  }
  if (!gGenAI) {
    gGenAI = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  return gGenAI;
}

// Fallback Supabase credentials
const DEFAULT_SUPABASE_URL = "https://vwzfnvtljxgxrkxgbulr.supabase.co";
const DEFAULT_SUPABASE_KEY = "sb_publishable_HvbQNs74YEKp1J-w3NZDxA_N2JBKiNL";

// Type definition for Receipt
interface Receipt {
  id: string;
  amount: number;
  vendor: string;
  date: string; // YYYY-MM-DD
  category: string;
  status: "synced" | "pending" | "failed";
  created_at: string;
  error_message?: string;
}

// Initial mockup seed data so the user sees a beautiful, fully functional dashboard immediately
const defaultReceipts: Receipt[] = [
  {
    id: "rec_1",
    amount: 18450.00,
    vendor: "Alpha Cloud Solutions",
    date: "2026-02-03",
    category: "Technology",
    status: "pending",
    created_at: "2026-02-03T10:00:00.000Z"
  },
  {
    id: "rec_2",
    amount: 2899.00,
    vendor: "Airtel Business",
    date: "2026-01-31",
    category: "General",
    status: "pending",
    created_at: "2026-01-31T12:30:00.000Z"
  },
  {
    id: "rec_3",
    amount: 14750.00,
    vendor: "SparkClean Facility Services",
    date: "2026-02-01",
    category: "Office Supplies",
    status: "pending",
    created_at: "2026-02-01T08:15:00.000Z"
  },
  {
    id: "rec_4",
    amount: 14800.00,
    vendor: "BlueStack Hosting",
    date: "2026-02-04",
    category: "Technology",
    status: "pending",
    created_at: "2026-02-04T09:00:00.000Z"
  },
  {
    id: "rec_5",
    amount: 84.50,
    vendor: "Fresh Market",
    date: "2026-06-15",
    category: "Food & Dining",
    status: "pending",
    created_at: "2026-06-15T12:30:00.000Z"
  }
];

// Load receipts from local file, create if missing with template data
function getReceipts(): Receipt[] {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, "utf-8");
      return JSON.parse(content);
    } else {
      fs.writeFileSync(DATA_FILE, JSON.stringify(defaultReceipts, null, 2), "utf-8");
      return defaultReceipts;
    }
  } catch (error) {
    console.error("Error reading data file:", error);
    return defaultReceipts;
  }
}

// Write receipts to local file
function saveReceipts(receipts: Receipt[]): void {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(receipts, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing data file:", error);
  }
}

// Initialize Supabase client if credentials are provided or fall back to user's supplied ones
function getSupabaseClient() {
  const url = process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_KEY;
  if (url && key) {
    return createClient(url, key, {
      auth: {
        persistSession: false
      }
    });
  }
  return null;
}

const TABLE_CREATION_SQL = `create table if not exists receipts (
  id uuid default gen_random_uuid() primary key,
  amount decimal(10,2) not null,
  vendor text not null,
  date date not null,
  category text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Turn off Row Level Security (RLS) if you want easy public database inserts:
alter table receipts disable row level security;`;

// --- API ROUTES ---

// 1. Get database configuration and connection status
app.get("/api/db-status", async (req, res) => {
  const url = process.env.SUPABASE_URL || "";
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || "";
  const hasConfig = !!(url && key);

  if (!hasConfig) {
    return res.json({
      configured: false,
      connected: false,
      error: "Supabase environment variables (SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY) are not set. If hosting on Vercel, please add SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY in your Vercel Project Settings (Settings > Environment Variables) and re-deploy.",
      url: "",
      sql: TABLE_CREATION_SQL
    });
  }

  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error("Failed to initialize Supabase client.");
    }

    // Try a simple head count to see if the table exists and is accessible
    const { error } = await supabase
      .from("receipts")
      .select("count", { count: "exact", head: true });

    if (error) {
      return res.json({
        configured: true,
        connected: false,
        error: `Supabase variables set, but table 'receipts' query failed: ${error.message}. Make sure your 'receipts' table exists in your Supabase DB.`,
        url: url,
        sql: TABLE_CREATION_SQL
      });
    }

    return res.json({
      configured: true,
      connected: true,
      error: null,
      url: url,
      sql: TABLE_CREATION_SQL
    });
  } catch (err: any) {
    return res.json({
      configured: true,
      connected: false,
      error: `Connection error: ${err?.message || String(err)}`,
      url: url,
      sql: TABLE_CREATION_SQL
    });
  }
});

// 2. Fetch receipts
app.get("/api/receipts", (req, res) => {
  const receipts = getReceipts();
  res.json(receipts);
});

// 3. Create active manual receipt
app.post("/api/receipts", (req, res) => {
  const { amount, vendor, date, category } = req.body;
  if (!amount || !vendor || !date || !category) {
    return res.status(400).json({ error: "Missing required receipt parameters (amount, vendor, date, category)." });
  }

  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount)) {
    return res.status(400).json({ error: "Amount must be a valid number." });
  }

  const receipts = getReceipts();
  const newReceipt: Receipt = {
    id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    amount: parsedAmount,
    vendor: vendor.trim(),
    date: date,
    category: category,
    status: "pending",
    created_at: new Date().toISOString()
  };

  receipts.unshift(newReceipt);
  saveReceipts(receipts);

  res.status(201).json(newReceipt);
});

// 3b. AI Receipt Text Extraction via Gemini (Supports multiple invoices)
app.post("/api/extract", async (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ error: "No input text provided for extraction." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.includes("placeholder")) {
    return res.status(400).json({
      error: "Gemini API Key is not set. If hosting on Vercel, please define GEMINI_API_KEY as an Environment Variable in your Vercel Project Dashboard (Settings > Environment Variables) and re-deploy. If in AI Studio, ensure GEMINI_API_KEY is configured in your Secrets settings."
    });
  }

  try {
    const systemPrompt = `You are an expert financial extraction assistant. Extract ALL receipt/invoice data from the user's raw text. The text may contain MULTIPLE independent emails, invoices, or receipts. Scan the entire input carefully and extract details for EACH invoice/receipt found.
For each item, extract:
- Amount (numerical value, representing the total cost. Strip symbols like ₹, $, INR, etc. and output as a simple decimal number like 18450.00 or 2899.00.)
- Vendor (e.g. "Alpha Cloud Solutions", "Airtel Business", "SparkClean Facility Services", "BlueStack Hosting")
- Date (Format: YYYY-MM-DD. Estimate based on text clues if explicitly stated in text like '03 February 2026' -> '2026-02-03', '01-Feb-2026' -> '2026-02-01', or january internet bill -> '2026-01-31'. If not specified, default to the current date '2026-06-20'.)
- Category (Map strictly to one of: "Food & Dining", "Technology", "Travel", "Office Supplies", "General")`;

    const response = await getGeminiAI().models.generateContent({
      model: "gemini-2.5-flash",
      contents: text,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: "ARRAY",
          description: "List of all extracted receipts/invoices found in the text.",
          items: {
            type: "OBJECT",
            properties: {
              amount: {
                type: "NUMBER",
                description: "The numerical total spend amount extracted. Remove currency characters."
              },
              vendor: {
                type: "STRING",
                description: "Clear vendor name specified."
              },
              date: {
                type: "STRING",
                description: "Estimated or parsed date strictly in YYYY-MM-DD format."
              },
              category: {
                type: "STRING",
                description: "One of: 'Food & Dining', 'Technology', 'Travel', 'Office Supplies', 'General'."
              }
            },
            required: ["amount", "vendor", "date", "category"]
          }
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("No structured text output returned from Gemini AI model.");
    }

    const structuredData = JSON.parse(resultText);
    res.json(structuredData);
  } catch (error: any) {
    console.error("AI text extraction error:", error);
    res.status(500).json({
      error: `Gemini extraction failed: ${error.message || String(error)}`
    });
  }
});

// 4. Delete receipt
app.delete("/api/receipts/:id", async (req, res) => {
  const { id } = req.params;
  const receipts = getReceipts();
  const index = receipts.findIndex((r) => r.id === id);

  if (index === -1) {
    return res.status(404).json({ error: "Receipt not found." });
  }

  const receiptToDelete = receipts[index];

  // Try to clean up from Supabase Postgres database if configured
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      // Delete matching entry from Supabase using details (vendor, amount, date)
      const { error } = await supabase
        .from("receipts")
        .delete()
        .match({
          vendor: receiptToDelete.vendor,
          amount: receiptToDelete.amount,
          date: receiptToDelete.date
        });
      if (error) {
        console.warn("Supabase clean up match failed:", error.message);
      }
    } catch (dbErr: any) {
      console.warn("Error during Supabase matching delete:", dbErr?.message || dbErr);
    }
  }

  receipts.splice(index, 1);
  saveReceipts(receipts);

  res.json({ success: true, message: `Receipt ${id} deleted successfully.` });
});

// Update receipt (Vendor, Amount, Date, Category)
app.put("/api/receipts/:id", async (req, res) => {
  const { id } = req.params;
  const { amount, vendor, date, category } = req.body;

  const receipts = getReceipts();
  const index = receipts.findIndex((r) => r.id === id);

  if (index === -1) {
    return res.status(404).json({ error: "Receipt not found in ledger." });
  }

  const oldReceipt = receipts[index];
  
  let parsedAmount = oldReceipt.amount;
  if (amount !== undefined) {
    parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount)) {
      return res.status(400).json({ error: "Amount must be a valid number." });
    }
  }

  const updatedReceipt: Receipt = {
    ...oldReceipt,
    vendor: vendor !== undefined ? vendor.trim() : oldReceipt.vendor,
    amount: parsedAmount,
    date: date !== undefined ? date : oldReceipt.date,
    category: category !== undefined ? category : oldReceipt.category,
    // Reset status to pending so the user can re-sync the updated record, or if sync is local
    status: oldReceipt.status === "synced" ? "pending" : oldReceipt.status,
  };

  // If connected to Supabase and was synced before or is syncing, let's update it in Supabase
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { error } = await supabase
        .from("receipts")
        .update({
          vendor: updatedReceipt.vendor,
          amount: updatedReceipt.amount,
          date: updatedReceipt.date,
          category: updatedReceipt.category
        })
        .match({
          vendor: oldReceipt.vendor,
          amount: oldReceipt.amount,
          date: oldReceipt.date
        });
      if (error) {
        console.warn("Supabase matching update failed:", error.message);
      } else {
        // If successfully updated in Supabase, we can keep status as synced or whatever is desired
        updatedReceipt.status = "synced";
      }
    } catch (dbErr: any) {
      console.warn("Error during Supabase matching update operation:", dbErr?.message || dbErr);
    }
  }

  receipts[index] = updatedReceipt;
  saveReceipts(receipts);

  res.json(updatedReceipt);
});

// 5. Sync pending receipts to Supabase Postgres
app.post("/api/sync", async (req, res) => {
  const receipts = getReceipts();
  const pendingReceipts = receipts.filter((r) => r.status === "pending" || r.status === "failed");

  if (pendingReceipts.length === 0) {
    return res.json({
      success: true,
      syncedCount: 0,
      message: "All receipts are already synced.",
      receipts
    });
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return res.status(400).json({
      error: "Supabase integration is not configured. Please supply SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY in your secrets settings."
    });
  }

  // Format data specifically for Postgres insertion
  // We exclude local id as Supabase will map or generate uuid, but let's pass amount, vendor, date, category
  const insertData = pendingReceipts.map((r) => ({
    amount: r.amount,
    vendor: r.vendor,
    date: r.date,
    category: r.category,
    created_at: r.created_at
  }));

  try {
    const { error, data } = await supabase
      .from("receipts")
      .insert(insertData)
      .select();

    if (error) {
      console.error("Supabase insert error:", JSON.stringify(error, null, 2));
      const detailedErrorMessage = `${error.message || "Failed to insert."} (Code: ${error.code || "N/A"}. Detail: ${error.details || "None"}. Hint: ${error.hint || "None"}. If you see code 42501, you must run "alter table receipts disable row level security" in your Supabase SQL Editor)`;
      
      // Update local storage status to failed and append the message
      const updatedReceipts = receipts.map((r) => {
        if (r.status === "pending" || r.status === "failed") {
          return { ...r, status: "failed" as const, error_message: detailedErrorMessage };
        }
        return r;
      });
      saveReceipts(updatedReceipts);
      return res.status(500).json({
        error: `Supabase insert failed: ${detailedErrorMessage}`,
        receipts: updatedReceipts
      });
    }

    // Success! Update synced status in local JSON database
    const updatedReceipts = receipts.map((r) => {
      if (r.status === "pending" || r.status === "failed") {
        return { ...r, status: "synced" as const, error_message: undefined };
      }
      return r;
    });

    saveReceipts(updatedReceipts);

    res.json({
      success: true,
      syncedCount: pendingReceipts.length,
      message: `Successfully synced ${pendingReceipts.length} entries to Supabase Postgres!`,
      receipts: updatedReceipts
    });
  } catch (err: any) {
    console.error("Sync catch error:", err);
    return res.status(500).json({
      error: `Sync crashed with error: ${err?.message || String(err)}`
    });
  }
});


// --- VITE DEV / PROD SERVER INTEGRATION ---

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Development server with HMR routing through Express
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production serving of built assets
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[LedgerFlow] Server successfully booted and listening on http://localhost:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;

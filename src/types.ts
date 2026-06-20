export interface Receipt {
  id: string;
  amount: number;
  vendor: string;
  date: string; // YYYY-MM-DD
  category: string;
  status: "synced" | "pending" | "failed";
  created_at: string;
  error_message?: string;
}

export interface DbStatus {
  configured: boolean;
  connected: boolean;
  error: string | null;
  url: string;
  sql: string;
}

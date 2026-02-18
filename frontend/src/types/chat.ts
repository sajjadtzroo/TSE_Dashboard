/**
 * Type definitions for the RAG chat system.
 * Matches ChatMessage/ChatResponse schemas in api/schemas.py
 * and the frontend chat component state.
 */

// ── Tool Names ───────────────────────────────────────────────────────────────

export type ChatToolName =
  | 'search_documents'
  | 'get_stock_price'
  | 'get_stock_history'
  | 'get_order_book'
  | 'get_market_indices'
  | 'get_sector_stocks'
  | 'get_market_prices'
  | 'get_etf_nav'
  | 'get_client_type_data'
  | 'get_shareholders'
  | 'get_codal_announcements'
  | 'compute_technical_indicators'
  | 'get_support_resistance'
  | 'compare_stocks'
  | 'screen_stocks'
  | 'search_loan_products'
  | 'get_loan_details'
  | 'list_banks'
  | 'calculate_loan_installment';

// ── RAG Source ────────────────────────────────────────────────────────────────

export interface RAGSource {
  title: string | null;
  symbol: string | null;
  page_numbers: string | null;
  similarity: number;
  source_url: string | null;
  content_preview: string | null;
}

// ── API Request / Response ───────────────────────────────────────────────────

export interface ChatRequestMessage {
  role: 'user' | 'assistant';
  content: string | null;
}

export interface ChatRequest {
  messages: ChatRequestMessage[];
  model?: string;
  symbol?: string;
  top_k?: number;
}

export interface ChatResponse {
  answer: string;
  sources: RAGSource[];
  tools_used: string[];
  model: string;
}

// ── Frontend Local Message ───────────────────────────────────────────────────

export interface ChatMessageLocal {
  role: 'user' | 'assistant';
  content: string;
  sources: RAGSource[];
  tools_used: string[];
  model?: string;
  timestamp: number;
  error?: boolean;
}

// ── Persisted Chat Sessions ──────────────────────────────────────────────────

export interface ChatSession {
  id: number;
  title: string;
  model: string | null;
  symbol: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChatMessageOut {
  id: number;
  role: 'user' | 'assistant';
  content: string | null;
  sources: RAGSource[] | null;
  tools_used: string[] | null;
  model: string | null;
  created_at: string;
}

export interface ChatSessionDetail extends ChatSession {
  messages: ChatMessageOut[];
}

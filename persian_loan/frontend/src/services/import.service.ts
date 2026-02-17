/**
 * Import Service - OCR and Web Scraping
 */

import api from './api';
import {
  validateData,
  apiResponseSchema,
  ocrResultSchema,
  importStatusSchema,
  importListSchema,
  importStatsSchema,
} from '../schemas';
import { z } from 'zod';

export interface FileUploadResponse {
  fileId: string;
  filename: string;
  contentType: string;
  size: number;
}

export interface OCRResult {
  fileId: string;
  language: string;
  text: string;
  confidence: number;
  pageCount: number;
}

export interface WebScrapingRequest {
  urls: string[];
  bankId?: string;
  deepScrape?: boolean;
}

export interface WebScrapingResult {
  url: string;
  status: string;
  data?: any;
  error?: string;
}

export interface ImportStatus {
  importId: string;
  importType: 'ocr' | 'web_scraping' | 'manual';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  source: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  error?: string;
  data?: any;
}

export interface ImportListResponse {
  total: number;
  imports: ImportStatus[];
}

export interface ImportStatsResponse {
  total: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
}

const importService = {
  /**
   * Upload a file for OCR processing
   */
  uploadFile: async (file: File): Promise<FileUploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/import/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    const fileUploadSchema = z.object({
      fileId: z.string(),
      filename: z.string(),
      contentType: z.string(),
      size: z.number(),
    }).passthrough();
    const validated = validateData(
      apiResponseSchema(fileUploadSchema),
      response.data,
      'import.uploadFile'
    );
    return validated.data;
  },

  /**
   * Process uploaded file with OCR
   */
  processOCR: async (
    fileId: string,
    language: 'fas' | 'eng' | 'fas+eng' = 'fas+eng'
  ): Promise<OCRResult> => {
    const formData = new FormData();
    formData.append('language', language);

    const response = await api.post(`/import/ocr/${fileId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    const validated = validateData(
      apiResponseSchema(ocrResultSchema),
      response.data,
      'import.processOCR'
    );
    // Map snake_case to camelCase
    return {
      fileId: validated.data.file_id,
      language: validated.data.language,
      text: validated.data.text,
      confidence: validated.data.confidence || 0,
      pageCount: validated.data.page_count || 0,
    };
  },

  /**
   * Trigger web scraping
   */
  scrapeWeb: async (
    request: WebScrapingRequest
  ): Promise<{ importId: string; results: WebScrapingResult[] }> => {
    const response = await api.post('/import/web', request);
    const webScrapingSchema = z.object({
      importId: z.string(),
      results: z.array(z.any()),
    }).passthrough();
    const validated = validateData(
      apiResponseSchema(webScrapingSchema),
      response.data,
      'import.scrapeWeb'
    );
    return validated.data;
  },

  /**
   * Get import status by ID
   */
  getImportStatus: async (importId: string): Promise<ImportStatus> => {
    const response = await api.get(`/import/status/${importId}`);
    const validated = validateData(
      apiResponseSchema(importStatusSchema),
      response.data,
      'import.getImportStatus'
    );
    // Map backend format to frontend format
    return {
      importId: validated.data.id,
      importType: validated.data.type as any,
      status: validated.data.status as any,
      source: validated.data.source || '',
      createdAt: '',
      updatedAt: '',
      error: validated.data.error,
      data: validated.data.results,
    };
  },

  /**
   * Get list of all imports
   */
  getImportList: async (
    limit: number = 50,
    importType?: 'ocr' | 'web_scraping' | 'manual'
  ): Promise<ImportListResponse> => {
    const params: Record<string, string | number> = { limit };
    if (importType) {
      params.import_type = importType;
    }

    const response = await api.get('/import/list', { params });
    const validated = validateData(
      apiResponseSchema(importListSchema),
      response.data,
      'import.getImportList'
    );
    // Map backend format to frontend format
    return {
      total: validated.data.total,
      imports: validated.data.imports.map((imp: any) => ({
        importId: imp.id,
        importType: imp.type,
        status: imp.status,
        source: imp.source || '',
        createdAt: '',
        updatedAt: '',
        error: imp.error,
        data: imp.results,
      })),
    };
  },

  /**
   * Get import statistics
   */
  getImportStats: async (): Promise<ImportStatsResponse> => {
    const response = await api.get('/import/stats');
    const validated = validateData(
      apiResponseSchema(importStatsSchema),
      response.data,
      'import.getImportStats'
    );
    return {
      total: validated.data.total,
      byType: validated.data.byType || {},
      byStatus: validated.data.byStatus || {},
    };
  },
};

export default importService;

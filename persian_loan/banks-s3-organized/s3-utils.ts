/**
 * Iranian Banks Data - S3 Utilities
 *
 * This file provides utilities for managing bank data in AWS S3.
 *
 * @version 1.0.0
 * @author Generated for S3 Migration
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
  CopyObjectCommand
} from "@aws-sdk/client-s3";
import * as fs from "fs";
import * as path from "path";

// =============================================================================
// CONFIGURATION
// =============================================================================

interface S3Config {
  region: string;
  bucket: string;
  prefix: string;
}

const defaultConfig: S3Config = {
  region: "me-south-1",        // Middle East region (Bahrain)
  bucket: "iranian-banks-data", // Your bucket name
  prefix: "banks/"              // Base prefix for all bank data
};

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

/** Bank category type */
type BankCategory = "traditional-banks" | "digital-banks";

/** Loan product metadata */
interface LoanMetadata {
  id: string;
  nameFA: string;
  nameEN?: string;
  bankId: string;
  category: BankCategory;
  creditScore?: string;
  interestRate?: string;
  maxAmount?: string;
  duration?: string;
  requirements?: string[];
  sourceUrl?: string;
  lastUpdated: string;
}

/** Bank metadata */
interface BankMetadata {
  id: string;
  nameFA: string;
  nameEN: string;
  category: BankCategory;
  website?: string;
  loans: string[];  // Array of loan IDs
}

/** File upload result */
interface UploadResult {
  success: boolean;
  key: string;
  error?: string;
}

// =============================================================================
// S3 CLIENT INITIALIZATION
// =============================================================================

/**
 * Create S3 client with configuration
 */
function createS3Client(config: Partial<S3Config> = {}): S3Client {
  const finalConfig = { ...defaultConfig, ...config };
  return new S3Client({ region: finalConfig.region });
}

// =============================================================================
// CORE S3 OPERATIONS
// =============================================================================

/**
 * Upload a file to S3
 *
 * @param client - S3 client instance
 * @param bucket - Target bucket name
 * @param key - S3 object key (path)
 * @param body - File content
 * @param contentType - MIME type (optional)
 */
async function uploadFile(
  client: S3Client,
  bucket: string,
  key: string,
  body: Buffer | string,
  contentType?: string
): Promise<UploadResult> {
  try {
    await client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType
    }));
    return { success: true, key };
  } catch (error) {
    return {
      success: false,
      key,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

/**
 * Upload a local file to S3
 */
async function uploadLocalFile(
  client: S3Client,
  bucket: string,
  localPath: string,
  s3Key: string
): Promise<UploadResult> {
  const content = fs.readFileSync(localPath);
  const ext = path.extname(localPath).toLowerCase();

  const contentTypes: Record<string, string> = {
    ".json": "application/json",
    ".txt": "text/plain",
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".md": "text/markdown"
  };

  return uploadFile(client, bucket, s3Key, content, contentTypes[ext]);
}

/**
 * Download a file from S3
 */
async function downloadFile(
  client: S3Client,
  bucket: string,
  key: string
): Promise<Buffer | null> {
  try {
    const response = await client.send(new GetObjectCommand({
      Bucket: bucket,
      Key: key
    }));

    if (response.Body) {
      const chunks: Uint8Array[] = [];
      for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
        chunks.push(chunk);
      }
      return Buffer.concat(chunks);
    }
    return null;
  } catch (error) {
    console.error(`Failed to download ${key}:`, error);
    return null;
  }
}

/**
 * List objects in S3 with a specific prefix
 */
async function listObjects(
  client: S3Client,
  bucket: string,
  prefix: string
): Promise<string[]> {
  const keys: string[] = [];
  let continuationToken: string | undefined;

  do {
    const response = await client.send(new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      ContinuationToken: continuationToken
    }));

    if (response.Contents) {
      keys.push(...response.Contents.map(obj => obj.Key!).filter(Boolean));
    }

    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  return keys;
}

// =============================================================================
// BANK-SPECIFIC OPERATIONS
// =============================================================================

/**
 * Build S3 key for a bank
 */
function getBankKey(category: BankCategory, bankId: string): string {
  return `${defaultConfig.prefix}${category}/${bankId}/`;
}

/**
 * Build S3 key for a loan
 */
function getLoanKey(category: BankCategory, bankId: string, loanId: string): string {
  return `${defaultConfig.prefix}${category}/${bankId}/loans/${loanId}/`;
}

/**
 * Upload bank metadata
 */
async function uploadBankMetadata(
  client: S3Client,
  bucket: string,
  metadata: BankMetadata
): Promise<UploadResult> {
  const key = `${getBankKey(metadata.category, metadata.id)}metadata.json`;
  const body = JSON.stringify(metadata, null, 2);
  return uploadFile(client, bucket, key, body, "application/json");
}

/**
 * Upload loan metadata
 */
async function uploadLoanMetadata(
  client: S3Client,
  bucket: string,
  metadata: LoanMetadata
): Promise<UploadResult> {
  const key = `${getLoanKey(metadata.category, metadata.bankId, metadata.id)}metadata.json`;
  const body = JSON.stringify(metadata, null, 2);
  return uploadFile(client, bucket, key, body, "application/json");
}

/**
 * Get all banks in a category
 */
async function getBanksInCategory(
  client: S3Client,
  bucket: string,
  category: BankCategory
): Promise<string[]> {
  const prefix = `${defaultConfig.prefix}${category}/`;
  const objects = await listObjects(client, bucket, prefix);

  // Extract unique bank IDs from paths
  const bankIds = new Set<string>();
  for (const key of objects) {
    const match = key.match(new RegExp(`${prefix}([^/]+)/`));
    if (match) {
      bankIds.add(match[1]);
    }
  }

  return Array.from(bankIds);
}

/**
 * Get all loans for a bank
 */
async function getLoansForBank(
  client: S3Client,
  bucket: string,
  category: BankCategory,
  bankId: string
): Promise<string[]> {
  const prefix = `${getBankKey(category, bankId)}loans/`;
  const objects = await listObjects(client, bucket, prefix);

  const loanIds = new Set<string>();
  for (const key of objects) {
    const match = key.match(new RegExp(`${prefix}([^/]+)/`));
    if (match) {
      loanIds.add(match[1]);
    }
  }

  return Array.from(loanIds);
}

// =============================================================================
// BATCH OPERATIONS
// =============================================================================

/**
 * Upload entire local directory to S3
 */
async function uploadDirectory(
  client: S3Client,
  bucket: string,
  localDir: string,
  s3Prefix: string
): Promise<UploadResult[]> {
  const results: UploadResult[] = [];

  function walkDir(dir: string, basePrefix: string) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
      if (file.startsWith(".")) continue; // Skip hidden files

      const localPath = path.join(dir, file);
      const stat = fs.statSync(localPath);

      if (stat.isDirectory()) {
        walkDir(localPath, `${basePrefix}${file}/`);
      } else {
        const s3Key = `${basePrefix}${file}`;
        results.push({ success: true, key: s3Key }); // Placeholder
      }
    }
  }

  walkDir(localDir, s3Prefix);

  // Actually upload files
  for (let i = 0; i < results.length; i++) {
    const localPath = results[i].key.replace(s3Prefix, localDir + "/");
    results[i] = await uploadLocalFile(client, bucket, localPath, results[i].key);
  }

  return results;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Generate S3 public URL (if bucket has public access)
 */
function getPublicUrl(bucket: string, key: string, region: string): string {
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

/**
 * Validate bank ID format
 */
function isValidBankId(id: string): boolean {
  return /^[a-z0-9-]+$/.test(id);
}

/**
 * Convert Persian name to S3-friendly ID
 */
function toS3FriendlyId(name: string): string {
  // This is a basic transliteration - customize as needed
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  // Types
  S3Config,
  BankCategory,
  LoanMetadata,
  BankMetadata,
  UploadResult,

  // Client
  createS3Client,
  defaultConfig,

  // Core operations
  uploadFile,
  uploadLocalFile,
  downloadFile,
  listObjects,

  // Bank operations
  getBankKey,
  getLoanKey,
  uploadBankMetadata,
  uploadLoanMetadata,
  getBanksInCategory,
  getLoansForBank,

  // Batch operations
  uploadDirectory,

  // Utilities
  getPublicUrl,
  isValidBankId,
  toS3FriendlyId
};

// =============================================================================
// USAGE EXAMPLE
// =============================================================================

/*
// Example: Upload all bank data to S3

import { createS3Client, uploadDirectory, defaultConfig } from "./s3-utils";

async function main() {
  const client = createS3Client({ region: "me-south-1" });
  const bucket = "your-bucket-name";

  // Upload traditional banks
  const results = await uploadDirectory(
    client,
    bucket,
    "./banks-s3-organized/traditional-banks",
    "banks/traditional-banks/"
  );

  console.log(`Uploaded ${results.filter(r => r.success).length} files`);
}

main();
*/

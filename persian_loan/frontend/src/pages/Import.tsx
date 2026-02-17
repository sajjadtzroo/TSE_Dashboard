/**
 * Import Page - OCR and Web Scraping
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Upload, Globe, FileText, CheckCircle, XCircle, Clock, TrendingUp } from 'lucide-react';
import importService, { ImportStatus } from '../services/import.service';
import { showError, showSuccess } from '../utils/toast';

const Import: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'ocr' | 'web'>('ocr');

  // Fetch import list
  const { data: importList, refetch: refetchImports } = useQuery({
    queryKey: ['imports'],
    queryFn: () => importService.getImportList(20),
  });

  // Fetch import stats
  const { data: stats } = useQuery({
    queryKey: ['import-stats'],
    queryFn: () => importService.getImportStats(),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-100">واردات داده</h1>
        <p className="text-gray-400 mt-2">
          آپلود فایل برای OCR یا دریافت داده از وب‌سایت‌های بانک
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="bg-blue-500/10 p-2 rounded-lg">
                <TrendingUp className="text-blue-400" size={20} />
              </div>
              <div>
                <p className="text-gray-400 text-sm">کل واردات</p>
                <p className="text-2xl font-bold text-gray-100">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="bg-green-500/10 p-2 rounded-lg">
                <CheckCircle className="text-green-400" size={20} />
              </div>
              <div>
                <p className="text-gray-400 text-sm">موفق</p>
                <p className="text-2xl font-bold text-gray-100">
                  {stats.byStatus?.completed || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="bg-red-500/10 p-2 rounded-lg">
                <XCircle className="text-red-400" size={20} />
              </div>
              <div>
                <p className="text-gray-400 text-sm">ناموفق</p>
                <p className="text-2xl font-bold text-gray-100">
                  {stats.byStatus?.failed || 0}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-gray-800">
        <button
          onClick={() => setActiveTab('ocr')}
          className={`px-4 py-2 font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'ocr'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          <Upload size={18} />
          آپلود فایل (OCR)
        </button>
        <button
          onClick={() => setActiveTab('web')}
          className={`px-4 py-2 font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'web'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          <Globe size={18} />
          وب‌اسکرپینگ
        </button>
      </div>

      {/* Tab Content */}
      <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-6">
        {activeTab === 'ocr' ? (
          <OCRUploadSection onSuccess={refetchImports} />
        ) : (
          <WebScrapingSection onSuccess={refetchImports} />
        )}
      </div>

      {/* Import History */}
      <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-bold text-gray-100 mb-4">تاریخچه واردات</h2>
        <ImportHistoryList imports={importList?.imports || []} />
      </div>
    </div>
  );
};

// OCR Upload Section Component
const OCRUploadSection: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUploadAndProcess = async () => {
    if (!file) return;

    try {
      setUploading(true);
      const uploadResponse = await importService.uploadFile(file);

      setUploading(false);
      setProcessing(true);
      const ocrResult = await importService.processOCR(uploadResponse.fileId);

      setProcessing(false);
      setResult(ocrResult);
      onSuccess();
      showSuccess('فایل با موفقیت پردازش شد');
    } catch (error) {
      console.error('OCR processing failed:', error);
      showError('پردازش ناموفق بود. لطفا دوباره تلاش کنید.');
      setUploading(false);
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive
            ? 'border-blue-400 bg-blue-500/5'
            : 'border-gray-700 hover:border-gray-600'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <Upload className="mx-auto mb-4 text-gray-500" size={48} />
        <p className="text-gray-300 mb-2">فایل را اینجا بکشید یا کلیک کنید</p>
        <p className="text-gray-500 text-sm mb-4">PNG, JPEG, PDF (حداکثر 10MB)</p>
        <input
          type="file"
          accept="image/png,image/jpeg,application/pdf"
          onChange={handleFileChange}
          className="hidden"
          id="file-upload"
        />
        <label
          htmlFor="file-upload"
          className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer transition-colors"
        >
          انتخاب فایل
        </label>
      </div>

      {file && (
        <div className="flex items-center justify-between bg-gray-800/50 p-4 rounded-lg">
          <div className="flex items-center gap-3">
            <FileText className="text-blue-400" size={20} />
            <div>
              <p className="text-gray-200 font-medium">{file.name}</p>
              <p className="text-gray-500 text-sm">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
          <button
            onClick={handleUploadAndProcess}
            disabled={uploading || processing}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 text-white rounded-lg transition-colors"
          >
            {uploading ? 'در حال آپلود...' : processing ? 'در حال پردازش...' : 'پردازش OCR'}
          </button>
        </div>
      )}

      {result && (
        <div className="bg-gray-800/50 p-4 rounded-lg space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="text-green-400" size={20} />
            <h3 className="text-lg font-bold text-gray-100">نتیجه OCR</h3>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-400">زبان</p>
              <p className="text-gray-200">{result.language}</p>
            </div>
            <div>
              <p className="text-gray-400">دقت</p>
              <p className="text-gray-200">{result.confidence?.toFixed(2)}%</p>
            </div>
          </div>
          <div>
            <p className="text-gray-400 mb-2">متن استخراج شده:</p>
            <div className="bg-[#0f0f0f] p-4 rounded-lg max-h-64 overflow-y-auto text-right">
              <pre className="text-gray-300 text-sm whitespace-pre-wrap">{result.text}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Web Scraping Section Component
const WebScrapingSection: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const [urls, setUrls] = useState('');
  const [deepScrape, setDeepScrape] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [results, setResults] = useState<any>(null);

  const handleScrape = async () => {
    const urlList = urls
      .split('\n')
      .map((url) => url.trim())
      .filter((url) => url.length > 0);

    if (urlList.length === 0) {
      showError('لطفا حداقل یک URL وارد کنید');
      return;
    }

    try {
      setScraping(true);
      const result = await importService.scrapeWeb({
        urls: urlList,
        deepScrape,
      });
      setScraping(false);
      setResults(result);
      onSuccess();
      showSuccess('وب‌اسکرپینگ با موفقیت انجام شد');
    } catch (error) {
      console.error('Web scraping failed:', error);
      showError('وب‌اسکرپینگ ناموفق بود. لطفا دوباره تلاش کنید.');
      setScraping(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-gray-300 mb-2">آدرس URL (هر خط یک آدرس)</label>
        <textarea
          value={urls}
          onChange={(e) => setUrls(e.target.value)}
          placeholder="https://example.com/loans&#10;https://bank.ir/facilities"
          className="w-full bg-[#0f0f0f] border border-gray-700 rounded-lg p-3 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500"
          rows={5}
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="deep-scrape"
          checked={deepScrape}
          onChange={(e) => setDeepScrape(e.target.checked)}
          className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
        />
        <label htmlFor="deep-scrape" className="text-gray-300">
          اسکرپ عمیق (دنبال کردن لینک‌های مرتبط)
        </label>
      </div>

      <button
        onClick={handleScrape}
        disabled={scraping}
        className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white rounded-lg transition-colors font-medium"
      >
        {scraping ? 'در حال اسکرپ...' : 'شروع وب‌اسکرپینگ'}
      </button>

      {results && (
        <div className="bg-gray-800/50 p-4 rounded-lg space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="text-green-400" size={20} />
            <h3 className="text-lg font-bold text-gray-100">نتایج وب‌اسکرپینگ</h3>
          </div>
          <p className="text-gray-400">
            تعداد صفحات اسکرپ شده: {results.results?.length || 0}
          </p>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {results.results?.map((result: any, index: number) => (
              <div
                key={result.url || index}
                className="bg-[#0f0f0f] p-3 rounded-lg border border-gray-800"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-gray-300 text-sm truncate">{result.url}</p>
                  {result.status === 'success' ? (
                    <CheckCircle className="text-green-400" size={16} />
                  ) : (
                    <XCircle className="text-red-400" size={16} />
                  )}
                </div>
                {result.error && (
                  <p className="text-red-400 text-xs">{result.error}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Import History List Component
const ImportHistoryList: React.FC<{ imports: ImportStatus[] }> = ({ imports }) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="text-green-400" size={18} />;
      case 'failed':
        return <XCircle className="text-red-400" size={18} />;
      case 'processing':
        return <Clock className="text-yellow-400 animate-spin" size={18} />;
      default:
        return <Clock className="text-gray-400" size={18} />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'تکمیل شده';
      case 'failed':
        return 'ناموفق';
      case 'processing':
        return 'در حال پردازش';
      default:
        return 'در انتظار';
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'ocr':
        return 'OCR';
      case 'web_scraping':
        return 'وب‌اسکرپینگ';
      default:
        return 'دستی';
    }
  };

  if (imports.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        هنوز واردات انجام نشده است
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {imports.map((item) => (
        <div
          key={item.importId}
          className="bg-gray-800/30 border border-gray-800 p-4 rounded-lg hover:bg-gray-800/50 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getStatusIcon(item.status)}
              <div>
                <p className="text-gray-200 font-medium">{item.source}</p>
                <p className="text-gray-500 text-sm">
                  {getTypeText(item.importType)} • {new Date(item.createdAt).toLocaleDateString('fa-IR')}
                </p>
              </div>
            </div>
            <span className="text-sm px-3 py-1 rounded-full bg-gray-800 text-gray-300">
              {getStatusText(item.status)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Import;

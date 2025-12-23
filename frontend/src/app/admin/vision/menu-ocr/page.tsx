'use client';

import { useState, useRef } from 'react';
import {
  Upload,
  FileText,
  Loader2,
  Download,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Search,
  Package,
  Tag,
  Sparkles,
  FileSpreadsheet,
  Eye,
  Copy,
  Check,
  X,
  FileJson,
  FileCode,
  Table,
  Utensils,
  DollarSign,
  Clock,
  Layers,
  BarChart3,
  RefreshCw,
} from 'lucide-react';

interface MenuItem {
  name: string;
  price: number | string | null;
  original_text?: string;
  category?: string;
  dietary?: string;
  matched_category?: {
    id: number;
    name: string;
    confidence: number;
    similar_product?: string;
    source: string;
  };
}

interface CategorySummary {
  category_id: number;
  category_name: string;
  item_count: number;
  items: string[];
}

interface OCRResult {
  success: boolean;
  menu_items?: MenuItem[];
  items?: MenuItem[];
  menu?: {
    restaurant_name?: string;
    currency?: string;
    categories?: string[];
    items?: MenuItem[];
  };
  total_items?: number;
  category_summary?: CategorySummary[];
  bulk_import?: {
    format: string;
    csv_data: string;
    total_items: number;
    categories_matched: number;
  };
  processing_time?: string;
  latency_ms?: number;
  pages_processed?: number;
  pages?: number;
  confidence?: number;
  raw_text?: string;
  method?: string;
}

type OutputFormat = 'json' | 'csv' | 'table' | 'bulk';

export default function MenuOCRPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<OCRResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());
  const [copiedCSV, setCopiedCSV] = useState(false);
  const [copiedJSON, setCopiedJSON] = useState(false);
  const [activeTab, setActiveTab] = useState<'items' | 'categories' | 'raw' | 'json'>('items');
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('table');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (selectedFile: File) => {
    if (selectedFile.type === 'application/pdf' || selectedFile.type.startsWith('image/')) {
      setFile(selectedFile);
      setResult(null);
      setError(null);
    } else {
      setError('Please upload a PDF or image file');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const processMenu = async () => {
    if (!file) return;

    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/vision/menu-ocr?format=${outputFormat}`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || `Processing failed: ${response.statusText}`);
      }

      const data: OCRResult = await response.json();
      setResult(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to process menu';
      setError(message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Get menu items from various response formats
  const getMenuItems = (): MenuItem[] => {
    if (!result) return [];
    return result.menu_items || result.items || result.menu?.items || [];
  };

  const getTotalItems = (): number => {
    return result?.total_items || getMenuItems().length;
  };

  const downloadCSV = () => {
    const items = getMenuItems();
    if (!items.length) return;

    const headers = ['Name', 'Price', 'Category', 'Dietary', 'Confidence'];
    const rows = items.map((item) => [
      item.name,
      item.price?.toString() || '',
      item.matched_category?.name || item.category || 'Uncategorized',
      item.dietary || '',
      item.matched_category?.confidence ? `${Math.round(item.matched_category.confidence * 100)}%` : '',
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `menu-ocr-${file?.name.replace(/\.[^/.]+$/, '')}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadJSON = () => {
    if (!result) return;
    
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `menu-ocr-${file?.name.replace(/\.[^/.]+$/, '')}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyJSON = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(result, null, 2));
      setCopiedJSON(true);
      setTimeout(() => setCopiedJSON(false), 2000);
    } catch {
      setError('Failed to copy to clipboard');
    }
  };

  const copyCSV = async () => {
    const items = getMenuItems();
    if (!items.length) return;

    const headers = ['Name', 'Price', 'Category'];
    const rows = items.map((item) => [
      item.name,
      item.price?.toString() || '',
      item.matched_category?.name || item.category || '',
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    try {
      await navigator.clipboard.writeText(csvContent);
      setCopiedCSV(true);
      setTimeout(() => setCopiedCSV(false), 2000);
    } catch {
      setError('Failed to copy to clipboard');
    }
  };

  const toggleCategory = (categoryId: number) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.9) {
      return <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700 font-medium">High ({Math.round(confidence * 100)}%)</span>;
    } else if (confidence >= 0.7) {
      return <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-700 font-medium">Medium ({Math.round(confidence * 100)}%)</span>;
    } else {
      return <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700 font-medium">Low ({Math.round(confidence * 100)}%)</span>;
    }
  };

  const getDietaryBadge = (dietary?: string) => {
    if (!dietary || dietary === 'unknown') return null;
    if (dietary === 'veg') {
      return <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700 font-medium">🟢 Veg</span>;
    } else if (dietary === 'non-veg') {
      return <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700 font-medium">🔴 Non-Veg</span>;
    }
    return null;
  };

  const menuItems = getMenuItems();
  const totalItems = getTotalItems();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl text-white">
                <Sparkles className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Menu OCR Scanner</h1>
                <p className="text-gray-500">Extract menu items from PDF or images with AI-powered recognition</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full font-medium">
                ✓ AI Powered
              </span>
              <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full font-medium">
                📄 PDF Support
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upload Section */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border p-6">
              <div className="flex items-center gap-2 mb-4">
                <Upload className="h-5 w-5 text-purple-600" />
                <h2 className="text-lg font-semibold text-gray-900">Upload Menu</h2>
              </div>

              <div
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`
                  border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
                  transition-all duration-200
                  ${isDragging ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-400 hover:bg-purple-50/50'}
                  ${file ? 'bg-purple-50 border-purple-400' : ''}
                `}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.png,.jpg,.jpeg,.webp"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                />
                {file ? (
                  <div className="space-y-3">
                    <div className="w-16 h-16 mx-auto bg-purple-100 rounded-xl flex items-center justify-center">
                      <FileText className="h-8 w-8 text-purple-600" />
                    </div>
                    <p className="font-medium text-gray-900 truncate">{file.name}</p>
                    <p className="text-sm text-gray-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                        setResult(null);
                      }}
                      className="inline-flex items-center gap-1 text-sm text-red-500 hover:text-red-700"
                    >
                      <X className="h-4 w-4" /> Remove file
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="w-16 h-16 mx-auto bg-gray-100 rounded-xl flex items-center justify-center">
                      <Upload className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="text-gray-600">
                      {isDragging ? 'Drop your file here' : 'Drag & drop or click to upload'}
                    </p>
                    <p className="text-xs text-gray-400">
                      Supports PDF, PNG, JPG up to 20MB
                    </p>
                  </div>
                )}
              </div>

              {/* Output Format Selection */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Output Format</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setOutputFormat('table')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all ${
                      outputFormat === 'table' 
                        ? 'border-purple-500 bg-purple-50 text-purple-700' 
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                  >
                    <Table className="h-4 w-4" />
                    <span className="text-sm font-medium">Table</span>
                  </button>
                  <button
                    onClick={() => setOutputFormat('json')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all ${
                      outputFormat === 'json' 
                        ? 'border-blue-500 bg-blue-50 text-blue-700' 
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                  >
                    <FileJson className="h-4 w-4" />
                    <span className="text-sm font-medium">JSON</span>
                  </button>
                  <button
                    onClick={() => setOutputFormat('csv')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all ${
                      outputFormat === 'csv' 
                        ? 'border-green-500 bg-green-50 text-green-700' 
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    <span className="text-sm font-medium">CSV</span>
                  </button>
                  <button
                    onClick={() => setOutputFormat('bulk')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all ${
                      outputFormat === 'bulk' 
                        ? 'border-orange-500 bg-orange-50 text-orange-700' 
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                  >
                    <Layers className="h-4 w-4" />
                    <span className="text-sm font-medium">Bulk Import</span>
                  </button>
                </div>
              </div>

              {/* Process Button */}
              <button
                onClick={processMenu}
                disabled={!file || isProcessing}
                className={`
                  w-full mt-4 py-3 px-4 rounded-xl font-semibold text-white
                  flex items-center justify-center gap-2 transition-all
                  ${!file || isProcessing 
                    ? 'bg-gray-300 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg shadow-purple-500/25'
                  }
                `}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Processing Menu...
                  </>
                ) : (
                  <>
                    <Search className="h-5 w-5" />
                    Extract Menu Items
                  </>
                )}
              </button>

              {/* Error Message */}
              {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-800">Processing Error</p>
                    <p className="text-sm text-red-600 mt-1">{error}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Stats Card */}
            {result && (
              <div className="bg-white rounded-2xl shadow-sm border p-6">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Processing Stats</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-xl">
                    <div className="flex items-center gap-2">
                      <Utensils className="h-5 w-5 text-purple-600" />
                      <span className="text-sm text-gray-600">Items Found</span>
                    </div>
                    <span className="text-lg font-bold text-purple-700">{totalItems}</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl">
                    <div className="flex items-center gap-2">
                      <Layers className="h-5 w-5 text-blue-600" />
                      <span className="text-sm text-gray-600">Pages</span>
                    </div>
                    <span className="text-lg font-bold text-blue-700">{result.pages || result.pages_processed || 1}</span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-green-600" />
                      <span className="text-sm text-gray-600">Processing Time</span>
                    </div>
                    <span className="text-lg font-bold text-green-700">
                      {result.latency_ms ? `${(result.latency_ms / 1000).toFixed(1)}s` : result.processing_time || '-'}
                    </span>
                  </div>

                  {result.method && (
                    <div className="flex items-center justify-between p-3 bg-orange-50 rounded-xl">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-orange-600" />
                        <span className="text-sm text-gray-600">OCR Method</span>
                      </div>
                      <span className="text-sm font-bold text-orange-700 capitalize">{result.method}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Results Section */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
              <div className="p-6 border-b bg-gradient-to-r from-gray-50 to-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Package className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">Extracted Items</h2>
                      <p className="text-sm text-gray-500">
                        {result ? `Found ${totalItems} menu items` : 'Upload a menu to get started'}
                      </p>
                    </div>
                  </div>
                  {result && menuItems.length > 0 && (
                    <div className="flex gap-2">
                      <button 
                        onClick={copyCSV}
                        className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                      >
                        {copiedCSV ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                        {copiedCSV ? 'Copied!' : 'Copy CSV'}
                      </button>
                      <button 
                        onClick={downloadCSV}
                        className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        <Download className="h-4 w-4" />
                        CSV
                      </button>
                      <button 
                        onClick={downloadJSON}
                        className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        <FileJson className="h-4 w-4" />
                        JSON
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {!result ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <FileText className="h-10 w-10" />
                  </div>
                  <p className="text-lg font-medium text-gray-500">No menu uploaded yet</p>
                  <p className="text-sm text-gray-400 mt-1">Upload a PDF or image to extract menu items</p>
                </div>
              ) : (
                <div>
                  {/* Tabs */}
                  <div className="flex border-b bg-gray-50/50">
                    <button
                      onClick={() => setActiveTab('items')}
                      className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                        activeTab === 'items'
                          ? 'border-purple-600 text-purple-600 bg-white'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <Package className="h-4 w-4" />
                      All Items ({menuItems.length})
                    </button>
                    <button
                      onClick={() => setActiveTab('categories')}
                      className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                        activeTab === 'categories'
                          ? 'border-purple-600 text-purple-600 bg-white'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <Tag className="h-4 w-4" />
                      By Category
                    </button>
                    <button
                      onClick={() => setActiveTab('raw')}
                      className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                        activeTab === 'raw'
                          ? 'border-purple-600 text-purple-600 bg-white'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <FileCode className="h-4 w-4" />
                      Raw Text
                    </button>
                    <button
                      onClick={() => setActiveTab('json')}
                      className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                        activeTab === 'json'
                          ? 'border-purple-600 text-purple-600 bg-white'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <FileJson className="h-4 w-4" />
                      JSON
                    </button>
                  </div>

                  {/* Tab Content */}
                  <div className="p-4">
                    {/* Items Tab */}
                    {activeTab === 'items' && (
                      <div className="rounded-xl border overflow-hidden max-h-[600px] overflow-auto">
                        <table className="w-full text-sm">
                          <thead className="sticky top-0 bg-gray-100">
                            <tr>
                              <th className="text-left py-3 px-4 font-semibold text-gray-700">#</th>
                              <th className="text-left py-3 px-4 font-semibold text-gray-700">Item Name</th>
                              <th className="text-left py-3 px-4 font-semibold text-gray-700">Price</th>
                              <th className="text-left py-3 px-4 font-semibold text-gray-700">Category</th>
                              <th className="text-left py-3 px-4 font-semibold text-gray-700">Type</th>
                            </tr>
                          </thead>
                          <tbody>
                            {menuItems.map((item, index) => (
                              <tr key={index} className="border-t hover:bg-gray-50 transition-colors">
                                <td className="py-3 px-4 text-gray-400">{index + 1}</td>
                                <td className="py-3 px-4 font-medium text-gray-900">{item.name}</td>
                                <td className="py-3 px-4">
                                  {item.price ? (
                                    <span className="inline-flex items-center gap-1 text-green-700 font-medium">
                                      <DollarSign className="h-3 w-3" />
                                      ₹{item.price}
                                    </span>
                                  ) : (
                                    <span className="text-gray-400">-</span>
                                  )}
                                </td>
                                <td className="py-3 px-4">
                                  {item.matched_category ? (
                                    <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">
                                      {item.matched_category.name}
                                    </span>
                                  ) : item.category ? (
                                    <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full font-medium">
                                      {item.category}
                                    </span>
                                  ) : (
                                    <span className="text-gray-400">-</span>
                                  )}
                                </td>
                                <td className="py-3 px-4">
                                  {getDietaryBadge(item.dietary)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {menuItems.length === 0 && (
                          <div className="p-8 text-center text-gray-500">
                            No items extracted. Try a different image or PDF.
                          </div>
                        )}
                      </div>
                    )}

                    {/* Categories Tab */}
                    {activeTab === 'categories' && (
                      <div className="space-y-3 max-h-[600px] overflow-auto">
                        {result.category_summary && result.category_summary.length > 0 ? (
                          result.category_summary.map((category) => (
                            <div key={category.category_id} className="rounded-xl border overflow-hidden">
                              <button
                                onClick={() => toggleCategory(category.category_id)}
                                className="flex items-center justify-between w-full p-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-purple-100 rounded-lg">
                                    <Tag className="h-5 w-5 text-purple-600" />
                                  </div>
                                  <div>
                                    <p className="font-medium text-gray-900">{category.category_name}</p>
                                    <p className="text-sm text-gray-500">ID: {category.category_id}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="px-3 py-1 bg-purple-100 text-purple-700 text-sm rounded-full font-medium">
                                    {category.item_count} items
                                  </span>
                                  {expandedCategories.has(category.category_id) ? (
                                    <ChevronUp className="h-5 w-5 text-gray-400" />
                                  ) : (
                                    <ChevronDown className="h-5 w-5 text-gray-400" />
                                  )}
                                </div>
                              </button>
                              {expandedCategories.has(category.category_id) && (
                                <div className="p-4 border-t bg-white space-y-2">
                                  {category.items.map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-2 text-sm p-2 bg-gray-50 rounded-lg">
                                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                                      <span className="text-gray-700">{item}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-12 text-gray-500">
                            <Tag className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                            <p>Category grouping not available</p>
                            <p className="text-sm mt-1">Try using &quot;Bulk Import&quot; format for category matching</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Raw Text Tab */}
                    {activeTab === 'raw' && (
                      <div className="rounded-xl border overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 bg-gray-100 border-b">
                          <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                            <FileCode className="h-4 w-4" />
                            Raw OCR Output
                          </span>
                        </div>
                        <pre className="p-4 text-sm font-mono bg-gray-50 max-h-[500px] overflow-auto whitespace-pre-wrap text-gray-700">
                          {result.raw_text || 'No raw text available'}
                        </pre>
                      </div>
                    )}

                    {/* JSON Tab */}
                    {activeTab === 'json' && (
                      <div className="rounded-xl border overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 bg-gray-100 border-b">
                          <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                            <FileJson className="h-4 w-4" />
                            JSON Response
                          </span>
                          <button
                            onClick={copyJSON}
                            className="flex items-center gap-1 px-3 py-1 bg-white border rounded-lg text-sm hover:bg-gray-50 transition-colors"
                          >
                            {copiedJSON ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                            {copiedJSON ? 'Copied!' : 'Copy'}
                          </button>
                        </div>
                        <pre className="p-4 text-xs font-mono bg-gray-900 text-green-400 max-h-[500px] overflow-auto">
                          {JSON.stringify(result, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        {result && menuItems.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button
                onClick={downloadCSV}
                className="flex flex-col items-center gap-2 p-4 bg-green-50 hover:bg-green-100 rounded-xl transition-colors group"
              >
                <div className="p-3 bg-green-100 group-hover:bg-green-200 rounded-lg transition-colors">
                  <FileSpreadsheet className="h-6 w-6 text-green-600" />
                </div>
                <span className="text-sm font-medium text-green-700">Download CSV</span>
              </button>
              <button
                onClick={downloadJSON}
                className="flex flex-col items-center gap-2 p-4 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors group"
              >
                <div className="p-3 bg-blue-100 group-hover:bg-blue-200 rounded-lg transition-colors">
                  <FileJson className="h-6 w-6 text-blue-600" />
                </div>
                <span className="text-sm font-medium text-blue-700">Download JSON</span>
              </button>
              <button
                onClick={copyCSV}
                className="flex flex-col items-center gap-2 p-4 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors group"
              >
                <div className="p-3 bg-purple-100 group-hover:bg-purple-200 rounded-lg transition-colors">
                  <Copy className="h-6 w-6 text-purple-600" />
                </div>
                <span className="text-sm font-medium text-purple-700">Copy to Clipboard</span>
              </button>
              <button
                onClick={() => { setFile(null); setResult(null); }}
                className="flex flex-col items-center gap-2 p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors group"
              >
                <div className="p-3 bg-gray-100 group-hover:bg-gray-200 rounded-lg transition-colors">
                  <RefreshCw className="h-6 w-6 text-gray-600" />
                </div>
                <span className="text-sm font-medium text-gray-700">Start New Scan</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

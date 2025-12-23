'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  FileText,
  Upload,
  Search,
  RefreshCw,
  Trash2,
  Eye,
  Download,
  Plus,
  Filter,
  AlertCircle,
  CheckCircle,
  File,
  FolderOpen,
  Database,
  Tag,
  Clock,
  Layers,
  X,
} from 'lucide-react';

interface RagDocument {
  document_id: string;
  title: string;
  source: string;
  category: string | null;
  tags: string[] | null;
  chunks_count: number;
  created_at: string;
  file_type: string | null;
  file_size: number | null;
}

interface RagStats {
  totalDocuments: number;
  totalChunks: number;
  categoryCounts: Record<string, number>;
  avgChunksPerDoc: number;
  recentDocuments: number;
}

interface SearchResult {
  chunk_id: string;
  document_id: string;
  content: string;
  score: number;
  metadata: any;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3200';

export default function RagDocumentsPage() {
  const [documents, setDocuments] = useState<RagDocument[]>([]);
  const [stats, setStats] = useState<RagStats | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showTextModal, setShowTextModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload form state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState('');
  const [uploadTags, setUploadTags] = useState('');

  // Text ingestion state
  const [textContent, setTextContent] = useState('');
  const [textTitle, setTextTitle] = useState('');
  const [textCategory, setTextCategory] = useState('');
  const [textTags, setTextTags] = useState('');

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/rag/documents/stats`);
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      // Note: This would need a list endpoint in the backend
      // For now, we'll use stats and show sample data
      await fetchStats();
      
      // Sample documents for UI demonstration
      setDocuments([
        {
          document_id: 'doc-1',
          title: 'Restaurant Menu Guidelines',
          source: 'admin-upload',
          category: 'operations',
          tags: ['menu', 'guidelines'],
          chunks_count: 12,
          created_at: '2025-12-15T10:30:00Z',
          file_type: 'pdf',
          file_size: 245000,
        },
        {
          document_id: 'doc-2',
          title: 'Food Safety Standards',
          source: 'admin-upload',
          category: 'compliance',
          tags: ['safety', 'fssai'],
          chunks_count: 25,
          created_at: '2025-12-14T14:20:00Z',
          file_type: 'docx',
          file_size: 128000,
        },
        {
          document_id: 'doc-3',
          title: 'Delivery SOP',
          source: 'admin-upload',
          category: 'operations',
          tags: ['delivery', 'sop'],
          chunks_count: 8,
          created_at: '2025-12-13T09:15:00Z',
          file_type: 'txt',
          file_size: 32000,
        },
      ]);
      
      setError(null);
    } catch (err) {
      console.error('Failed to fetch documents:', err);
      setError('Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      const response = await fetch(`${API_BASE}/api/rag/documents/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          limit: 10,
          useEmbedding: true,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.chunks || []);
      }
    } catch (err) {
      console.error('Search failed:', err);
    }
  };

  const handleFileUpload = async () => {
    if (!uploadFile) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      if (uploadTitle) formData.append('title', uploadTitle);
      if (uploadCategory) formData.append('category', uploadCategory);
      if (uploadTags) formData.append('tags', uploadTags);

      const response = await fetch(`${API_BASE}/api/rag/documents/upload`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Document uploaded successfully! Created ${data.chunksCreated} chunks.`);
        setShowUploadModal(false);
        setUploadFile(null);
        setUploadTitle('');
        setUploadCategory('');
        setUploadTags('');
        fetchDocuments();
      } else {
        const err = await response.json();
        alert(`Upload failed: ${err.message || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleTextIngest = async () => {
    if (!textContent.trim() || !textTitle.trim()) return;

    setUploading(true);
    try {
      const response = await fetch(`${API_BASE}/api/rag/documents/ingest/text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: textContent,
          title: textTitle,
          category: textCategory || undefined,
          tags: textTags ? textTags.split(',').map(t => t.trim()) : undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Text ingested successfully! Created ${data.chunksCreated} chunks.`);
        setShowTextModal(false);
        setTextContent('');
        setTextTitle('');
        setTextCategory('');
        setTextTags('');
        fetchDocuments();
      } else {
        const err = await response.json();
        alert(`Ingestion failed: ${err.message || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Ingestion failed:', err);
      alert('Ingestion failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document and all its chunks?')) return;

    try {
      const response = await fetch(`${API_BASE}/api/rag/documents/${documentId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('Document deleted successfully');
        fetchDocuments();
      } else {
        alert('Failed to delete document');
      }
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Failed to delete document');
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Database className="h-7 w-7 text-blue-600" />
            RAG Documents
          </h1>
          <p className="text-gray-500 mt-1">
            Manage knowledge base documents for AI-powered question answering
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowTextModal(true)}
            className="px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            Add Text
          </button>
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            Upload File
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Documents</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalDocuments}</p>
              </div>
              <FolderOpen className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Chunks</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalChunks}</p>
              </div>
              <Layers className="h-8 w-8 text-purple-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Avg Chunks/Doc</p>
                <p className="text-2xl font-bold text-gray-900">{stats.avgChunksPerDoc.toFixed(1)}</p>
              </div>
              <Database className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Recent (7 days)</p>
                <p className="text-2xl font-bold text-gray-900">{stats.recentDocuments}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search knowledge base..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Search
          </button>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Categories</option>
            <option value="operations">Operations</option>
            <option value="compliance">Compliance</option>
            <option value="menu">Menu</option>
            <option value="general">General</option>
          </select>
        </div>
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
            <Search className="h-4 w-4" />
            Search Results ({searchResults.length})
          </h3>
          <div className="space-y-3">
            {searchResults.map((result) => (
              <div key={result.chunk_id} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">Score: {(result.score * 100).toFixed(1)}%</span>
                  <span className="text-xs text-gray-400">{result.document_id}</span>
                </div>
                <p className="text-gray-700 text-sm">{result.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 text-blue-600 animate-spin" />
        </div>
      )}

      {/* Documents List */}
      {!loading && documents.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Document</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Category</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Chunks</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Size</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Added</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {documents.map((doc) => (
                <tr key={doc.document_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <File className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{doc.title}</p>
                        <p className="text-xs text-gray-500">{doc.source}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {doc.category && (
                      <span className="inline-flex px-2 py-1 text-xs font-medium bg-purple-100 text-purple-700 rounded-full">
                        {doc.category}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-gray-900">{doc.chunks_count}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-sm">
                    {formatFileSize(doc.file_size)}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-sm">
                    {new Date(doc.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                        title="Preview"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(doc.document_id)}
                        className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State */}
      {!loading && documents.length === 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No documents yet</h3>
          <p className="text-gray-500 mb-4">
            Upload documents to build your knowledge base for AI-powered answers.
          </p>
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            Upload First Document
          </button>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Upload Document</h2>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              {/* File Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">File</label>
                <div 
                  className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploadFile ? (
                    <div className="flex items-center justify-center gap-2">
                      <File className="h-6 w-6 text-blue-600" />
                      <span className="text-gray-900">{uploadFile.name}</span>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500">Click to select a file</p>
                      <p className="text-xs text-gray-400 mt-1">PDF, DOCX, TXT supported</p>
                    </>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.txt,.md"
                  className="hidden"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                />
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title (optional)</label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="Document title"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select category</option>
                  <option value="operations">Operations</option>
                  <option value="compliance">Compliance</option>
                  <option value="menu">Menu</option>
                  <option value="general">General</option>
                </select>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={uploadTags}
                  onChange={(e) => setUploadTags(e.target.value)}
                  placeholder="e.g., safety, guidelines, delivery"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-2">
              <button
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleFileUpload}
                disabled={!uploadFile || uploading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {uploading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Upload
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Text Ingestion Modal */}
      {showTextModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Add Text Content</h2>
                <button
                  onClick={() => setShowTextModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                <input
                  type="text"
                  value={textTitle}
                  onChange={(e) => setTextTitle(e.target.value)}
                  placeholder="Document title"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Content *</label>
                <textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="Paste or type your content here..."
                  rows={10}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">{textContent.length} characters</p>
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={textCategory}
                  onChange={(e) => setTextCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select category</option>
                  <option value="operations">Operations</option>
                  <option value="compliance">Compliance</option>
                  <option value="menu">Menu</option>
                  <option value="general">General</option>
                </select>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={textTags}
                  onChange={(e) => setTextTags(e.target.value)}
                  placeholder="e.g., faq, policy, procedure"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-2">
              <button
                onClick={() => setShowTextModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleTextIngest}
                disabled={!textContent.trim() || !textTitle.trim() || uploading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {uploading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Add Content
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

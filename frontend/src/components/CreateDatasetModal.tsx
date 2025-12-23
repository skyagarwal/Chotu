'use client';

import { useState } from 'react';
import { X, Upload, FileText, AlertCircle } from 'lucide-react';

interface CreateDatasetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: DatasetFormData) => void;
}

export interface DatasetFormData {
  name: string;
  type: 'NLU' | 'ASR' | 'TTS';
  module: string;
  description: string;
  file: File | null;
}

export default function CreateDatasetModal({
  isOpen,
  onClose,
  onSubmit,
}: CreateDatasetModalProps) {
  const [formData, setFormData] = useState<DatasetFormData>({
    name: '',
    type: 'NLU',
    module: 'food',
    description: '',
    file: null,
  });
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string>('');

  if (!isOpen) return null;

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
    setError('');

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (
        file.type === 'text/csv' ||
        file.type === 'application/json' ||
        file.name.endsWith('.csv') ||
        file.name.endsWith('.json')
      ) {
        setFormData({ ...formData, file });
      } else {
        setError('Please upload a CSV or JSON file');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (
        file.type === 'text/csv' ||
        file.type === 'application/json' ||
        file.name.endsWith('.csv') ||
        file.name.endsWith('.json')
      ) {
        setFormData({ ...formData, file });
      } else {
        setError('Please upload a CSV or JSON file');
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Dataset name is required');
      return;
    }
    if (!formData.file) {
      setError('Please upload a dataset file');
      return;
    }
    onSubmit(formData);
    // Reset form
    setFormData({
      name: '',
      type: 'NLU',
      module: 'food',
      description: '',
      file: null,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            Create New Dataset
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <AlertCircle size={20} />
              {error}
            </div>
          )}

          {/* Dataset Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dataset Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="e.g., Food NLU v3"
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[#059211] focus:outline-none"
              required
            />
          </div>

          {/* Type and Module */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type *
              </label>
              <select
                value={formData.type}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    type: e.target.value as 'NLU' | 'ASR' | 'TTS',
                  })
                }
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[#059211] focus:outline-none"
              >
                <option value="NLU">NLU (Intent Classification)</option>
                <option value="ASR">ASR (Speech Recognition)</option>
                <option value="TTS">TTS (Text-to-Speech)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Module *
              </label>
              <select
                value={formData.module}
                onChange={(e) =>
                  setFormData({ ...formData, module: e.target.value })
                }
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[#059211] focus:outline-none"
              >
                <option value="food">Food</option>
                <option value="ecom">E-Commerce</option>
                <option value="parcel">Parcel Delivery</option>
                <option value="ride">Ride Booking</option>
                <option value="health">Health Services</option>
                <option value="rooms">Room Booking</option>
                <option value="movies">Movies</option>
                <option value="services">Services</option>
                <option value="payment">Payment</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Brief description of this dataset..."
              rows={3}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[#059211] focus:outline-none resize-none"
            />
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload Dataset File *
            </label>
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                dragActive
                  ? 'border-[#059211] bg-green-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              {formData.file ? (
                <div className="flex items-center justify-center gap-3">
                  <FileText className="text-[#059211]" size={32} />
                  <div className="text-left">
                    <div className="font-medium text-gray-900">
                      {formData.file.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {(formData.file.size / 1024).toFixed(2)} KB
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, file: null })}
                    className="ml-4 p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <X size={20} />
                  </button>
                </div>
              ) : (
                <>
                  <Upload className="mx-auto text-gray-400 mb-4" size={48} />
                  <div className="text-gray-700 mb-2">
                    Drag and drop your file here, or{' '}
                    <label className="text-[#059211] hover:text-[#047a0e] cursor-pointer font-medium">
                      browse
                      <input
                        type="file"
                        accept=".csv,.json"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <div className="text-sm text-gray-500">
                    Supported formats: CSV, JSON
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Format Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">
              Expected File Format:
            </h4>
            <div className="text-sm text-blue-700 space-y-1">
              <p>
                <strong>CSV:</strong> text, intent, entities (JSON string)
              </p>
              <p>
                <strong>JSON:</strong> Array of {`{text, intent, entities}`}{' '}
                objects
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-gradient-to-r from-[#059211] to-[#047a0e] hover:from-[#047a0e] hover:to-[#036809] text-white rounded-lg font-medium transition-all shadow-lg"
            >
              Create Dataset
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

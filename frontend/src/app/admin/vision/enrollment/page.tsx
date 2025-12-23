'use client';

import { useState } from 'react';
import Link from 'next/link';
import { UserPlus, CheckCircle2, AlertCircle, XCircle, Image as ImageIcon, Trash2, Camera } from 'lucide-react';
import Image from 'next/image';

interface EnrollmentFormData {
  employeeCode: string;
  name: string;
  email: string;
  phone: string;
  storeId: string;
  department: string;
  position: string;
}

interface EnrollmentResult {
  success: boolean;
  employee?: {
    id: string;
    employeeCode: string;
    name: string;
    storeId: string;
    department: string;
    faceCount: number;
  };
  message?: string;
  qualityScore?: number;
  faceCount?: number;
}

export default function EmployeeEnrollmentPage() {
  const [formData, setFormData] = useState<EnrollmentFormData>({
    employeeCode: '',
    name: '',
    email: '',
    phone: '',
    storeId: '',
    department: '',
    position: '',
  });

  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EnrollmentResult | null>(null);
  const [error, setError] = useState<string>('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length === 0) return;

    // Limit to 10 images total
    const availableSlots = 10 - selectedImages.length;
    const filesToAdd = files.slice(0, availableSlots);

    if (filesToAdd.length < files.length) {
      setError('Maximum 10 images allowed. Only first ' + availableSlots + ' images were added.');
    } else {
      setError('');
    }

    // Add new files and create preview URLs
    setSelectedImages(prev => [...prev, ...filesToAdd]);
    
    const newPreviewUrls = filesToAdd.map(file => URL.createObjectURL(file));
    setPreviewUrls(prev => [...prev, ...newPreviewUrls]);
    
    setResult(null);
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    
    // Revoke the object URL to prevent memory leaks
    URL.revokeObjectURL(previewUrls[index]);
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
    
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (selectedImages.length < 3) {
      setError('Please upload at least 3 face images for accurate recognition');
      return;
    }

    if (!formData.employeeCode || !formData.name || !formData.storeId) {
      setError('Employee Code, Name, and Store ID are required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formDataToSend = new FormData();
      
      // Add employee details
      formDataToSend.append('employeeCode', formData.employeeCode);
      formDataToSend.append('name', formData.name);
      formDataToSend.append('email', formData.email);
      formDataToSend.append('phone', formData.phone);
      formDataToSend.append('storeId', formData.storeId);
      formDataToSend.append('department', formData.department);
      formDataToSend.append('position', formData.position);
      
      // Add all images
      selectedImages.forEach((image) => {
        formDataToSend.append('image', image);
      });

      const response = await fetch('/api/vision/enroll-employee', {
        method: 'POST',
        body: formDataToSend,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to enroll employee');
      }

      const data = await response.json();
      setResult(data);

      // Clear form on success
      if (data.success) {
        setFormData({
          employeeCode: '',
          name: '',
          email: '',
          phone: '',
          storeId: '',
          department: '',
          position: '',
        });
        setSelectedImages([]);
        previewUrls.forEach(url => URL.revokeObjectURL(url));
        setPreviewUrls([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enroll employee');
      console.error('Enrollment error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Employee Enrollment</h1>
          <p className="text-gray-600 mt-1">
            Register new employees for face recognition system
          </p>
        </div>
        <UserPlus className="text-blue-600" size={48} />
      </div>

      {/* Quick Access to Camera Enrollment */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <Camera className="w-6 h-6 text-white" />
              <h3 className="text-xl font-bold text-white">Try Camera Enrollment</h3>
            </div>
            <p className="text-blue-100 mb-4">
              Quick, guided photo capture with automatic quality checks - perfect for mobile devices!
            </p>
            <div className="flex flex-wrap gap-4 text-sm text-blue-100">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Step-by-step guidance
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Real-time quality validation
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Mobile & desktop ready
              </span>
            </div>
          </div>
          <Link
            href="/admin/vision/camera-enrollment"
            className="ml-6 px-6 py-3 bg-white text-blue-600 rounded-lg hover:bg-blue-50 font-semibold shadow-md flex items-center gap-2 transition-colors"
          >
            <Camera className="w-5 h-5" />
            Use Camera
          </Link>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Enrollment Form */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Employee Details</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Employee Code */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Employee Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="employeeCode"
                  value={formData.employeeCode}
                  onChange={handleInputChange}
                  placeholder="e.g., EMP001"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g., John Doe"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="john.doe@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Store ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Store ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="storeId"
                  value={formData.storeId}
                  onChange={handleInputChange}
                  placeholder="e.g., STORE-123"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              {/* Department */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department
                </label>
                <select
                  name="department"
                  value={formData.department}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Department</option>
                  <option value="Kitchen">Kitchen</option>
                  <option value="Service">Service</option>
                  <option value="Delivery">Delivery</option>
                  <option value="Management">Management</option>
                  <option value="Operations">Operations</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Position */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Position
                </label>
                <input
                  type="text"
                  name="position"
                  value={formData.position}
                  onChange={handleInputChange}
                  placeholder="e.g., Delivery Rider"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Face Images <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Upload 3-10 clear face photos from different angles
                </p>
                <label className="block">
                  <span className="sr-only">Choose face images</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageSelect}
                    disabled={selectedImages.length >= 10}
                    className="block w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-lg file:border-0
                      file:text-sm file:font-semibold
                      file:bg-blue-50 file:text-blue-700
                      hover:file:bg-blue-100
                      disabled:opacity-50 disabled:cursor-not-allowed
                      cursor-pointer"
                  />
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  {selectedImages.length} / 10 images selected
                  {selectedImages.length < 3 && (
                    <span className="text-orange-600 ml-2">
                      (Minimum 3 required)
                    </span>
                  )}
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || selectedImages.length < 3}
                className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-semibold
                  hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed
                  transition-colors duration-200"
              >
                {loading ? 'Enrolling Employee...' : 'Enroll Employee'}
              </button>
            </form>

            {/* Error Display */}
            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <p className="font-semibold text-red-900">Error</p>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Image Preview & Results */}
        <div className="space-y-4">
          {/* Image Preview Grid */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">
              Face Images Preview ({selectedImages.length}/10)
            </h2>

            {selectedImages.length === 0 ? (
              <div className="text-center py-12 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                <ImageIcon className="mx-auto mb-3 text-gray-400" size={48} />
                <p>No images uploaded yet</p>
                <p className="text-sm mt-1">Upload at least 3 face photos</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {previewUrls.map((url, index) => (
                  <div key={index} className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden group">
                    <Image
                      src={url}
                      alt={`Face ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                    <button
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full
                        opacity-0 group-hover:opacity-100 transition-opacity duration-200
                        hover:bg-red-700"
                      type="button"
                    >
                      <Trash2 size={16} />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs py-1 px-2">
                      Image {index + 1}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Enrollment Result */}
          {result && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Enrollment Result</h2>

              {result.success ? (
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 border-2 border-green-300 rounded-lg">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="text-green-700" size={32} />
                      <div>
                        <h3 className="font-bold text-lg text-green-900">
                          Enrollment Successful!
                        </h3>
                        <p className="text-sm text-green-700">
                          Employee registered for face recognition
                        </p>
                      </div>
                    </div>
                  </div>

                  {result.employee && (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Employee ID:</span>
                        <span className="font-semibold">{result.employee.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Employee Code:</span>
                        <span className="font-semibold">{result.employee.employeeCode}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Name:</span>
                        <span className="font-semibold">{result.employee.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Store ID:</span>
                        <span className="font-semibold">{result.employee.storeId}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Department:</span>
                        <span className="font-semibold">{result.employee.department || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Face Embeddings:</span>
                        <span className="font-semibold text-green-600">
                          {result.employee.faceCount || result.faceCount} faces registered
                        </span>
                      </div>
                      {result.qualityScore && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Quality Score:</span>
                          <span className="font-semibold">
                            {(result.qualityScore * 100).toFixed(1)}%
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="pt-4 border-t">
                    <p className="text-sm text-gray-600">
                      ✓ Face embeddings generated and stored
                    </p>
                    <p className="text-sm text-gray-600">
                      ✓ Employee can now be identified in compliance checks
                    </p>
                    <p className="text-sm text-gray-600">
                      ✓ Ready for facial recognition in all Vision modules
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-red-50 border-2 border-red-300 rounded-lg">
                  <div className="flex items-center gap-3">
                    <XCircle className="text-red-700" size={32} />
                    <div>
                      <h3 className="font-bold text-lg text-red-900">
                        Enrollment Failed
                      </h3>
                      <p className="text-sm text-red-700">
                        {result.message || 'An error occurred during enrollment'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tips */}
          {!result && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                <AlertCircle size={18} />
                Photo Tips for Best Results
              </h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Upload 3-10 clear photos from different angles</li>
                <li>• Ensure good lighting and face is clearly visible</li>
                <li>• Capture front view, left profile, right profile</li>
                <li>• Avoid sunglasses, masks, or heavy shadows</li>
                <li>• Include photos with and without helmet if possible</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

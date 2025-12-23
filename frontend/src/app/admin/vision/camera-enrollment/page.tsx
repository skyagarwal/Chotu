'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import GuidedFaceCapture, { CapturedPhoto, FacePosition } from '@/components/vision/GuidedFaceCapture';
import { Camera, UserPlus, ArrowLeft } from 'lucide-react';

interface EnrollmentData {
  employeeCode: string;
  name: string;
  email: string;
  phone: string;
  storeId: string;
  department: string;
  position: string;
}

export default function CameraEnrollmentPage() {
  const router = useRouter();
  const [step, setStep] = useState<'info' | 'capture' | 'submitting' | 'success'>('info');
  const [enrollmentData, setEnrollmentData] = useState<EnrollmentData>({
    employeeCode: '',
    name: '',
    email: '',
    phone: '',
    storeId: '',
    department: '',
    position: '',
  });
  const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhoto[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate required fields
    if (!enrollmentData.employeeCode || !enrollmentData.name || !enrollmentData.email) {
      setError('Please fill in all required fields');
      return;
    }

    // Move to camera capture
    setStep('capture');
  };

  const handlePhotosComplete = async (photos: CapturedPhoto[]) => {
    setCapturedPhotos(photos);
    setStep('submitting');

    try {
      // Convert base64 to File objects
      const photoFiles = await Promise.all(
        photos.map(async (photo, index) => {
          const response = await fetch(photo.dataUrl);
          const blob = await response.blob();
          return new File([blob], `photo_${photo.position}_${index}.jpg`, { type: 'image/jpeg' });
        })
      );

      // Create FormData
      const formData = new FormData();
      formData.append('employeeCode', enrollmentData.employeeCode);
      formData.append('name', enrollmentData.name);
      formData.append('email', enrollmentData.email);
      formData.append('phone', enrollmentData.phone);
      formData.append('storeId', enrollmentData.storeId);
      formData.append('department', enrollmentData.department);
      formData.append('position', enrollmentData.position);

      // Add photos (backend expects 'faces' field name)
      photoFiles.forEach((file) => {
        formData.append('faces', file);
      });

      // Submit enrollment
      const response = await fetch('/api/vision/employees/enroll', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Enrollment failed');
      }

      setStep('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit enrollment');
      setStep('info');
    }
  };

  const handleCaptureCancel = () => {
    setStep('info');
  };

  const handleStartOver = () => {
    setEnrollmentData({
      employeeCode: '',
      name: '',
      email: '',
      phone: '',
      storeId: '',
      department: '',
      position: '',
    });
    setCapturedPhotos([]);
    setError(null);
    setStep('info');
  };

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserPlus className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Enrollment Complete!</h1>
          <p className="text-gray-600 mb-6">
            {enrollmentData.name} has been successfully enrolled with {capturedPhotos.length} photos.
          </p>
          <div className="space-y-3">
            <button
              onClick={handleStartOver}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Enroll Another Employee
            </button>
            <button
              onClick={() => router.push('/admin/vision/employees')}
              className="w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
            >
              View All Employees
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'capture') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
        <div className="max-w-6xl mx-auto py-8">
          <div className="mb-6">
            <button
              onClick={handleCaptureCancel}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Info
            </button>
          </div>
          <GuidedFaceCapture
            onPhotosComplete={handlePhotosComplete}
            onCancel={handleCaptureCancel}
            requiredPositions={['front', 'left', 'right'] as FacePosition[]}
          />
        </div>
      </div>
    );
  }

  if (step === 'submitting') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <div className="animate-spin w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Submitting Enrollment...</h2>
          <p className="text-gray-600">Please wait while we process your photos.</p>
        </div>
      </div>
    );
  }

  // Info Step
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <div className="max-w-2xl mx-auto py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Camera className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Camera Enrollment</h1>
          <p className="text-gray-600">
            Quick and easy employee enrollment using your device camera
          </p>
        </div>

        {/* Info Form */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Employee Information</h2>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleInfoSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Employee Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={enrollmentData.employeeCode}
                  onChange={(e) => setEnrollmentData({ ...enrollmentData, employeeCode: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., EMP001"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={enrollmentData.name}
                  onChange={(e) => setEnrollmentData({ ...enrollmentData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="John Doe"
                  required
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={enrollmentData.email}
                  onChange={(e) => setEnrollmentData({ ...enrollmentData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="john@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={enrollmentData.phone}
                  onChange={(e) => setEnrollmentData({ ...enrollmentData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="+1234567890"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Store ID
                </label>
                <input
                  type="text"
                  value={enrollmentData.storeId}
                  onChange={(e) => setEnrollmentData({ ...enrollmentData, storeId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="STORE-001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department
                </label>
                <select
                  value={enrollmentData.department}
                  onChange={(e) => setEnrollmentData({ ...enrollmentData, department: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select...</option>
                  <option value="Delivery">Delivery</option>
                  <option value="Kitchen">Kitchen</option>
                  <option value="Management">Management</option>
                  <option value="Customer Service">Customer Service</option>
                  <option value="Warehouse">Warehouse</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Position
                </label>
                <input
                  type="text"
                  value={enrollmentData.position}
                  onChange={(e) => setEnrollmentData({ ...enrollmentData, position: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Delivery Rider"
                />
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
              <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <Camera className="w-5 h-5 text-blue-600" />
                Next: Photo Capture
              </h3>
              <p className="text-sm text-gray-700 mb-3">
                After submitting this form, you&apos;ll be guided to capture 3 photos:
              </p>
              <ul className="space-y-1 text-sm text-gray-700">
                <li className="flex items-center gap-2">
                  <span className="text-blue-600">✓</span>
                  Front-facing view
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-blue-600">✓</span>
                  Left profile view
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-blue-600">✓</span>
                  Right profile view
                </li>
              </ul>
              <p className="text-sm text-gray-600 mt-3">
                The camera will automatically check lighting and photo quality to ensure the best results.
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center justify-center gap-2"
              >
                <Camera className="w-5 h-5" />
                Start Photo Capture
              </button>
            </div>
          </form>
        </div>

        {/* Features */}
        <div className="mt-8 grid md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4 shadow">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-3">
              <Camera className="w-5 h-5 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Guided Capture</h3>
            <p className="text-sm text-gray-600">
              Step-by-step instructions ensure optimal photo quality
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 shadow">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
              <UserPlus className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Quality Checks</h3>
            <p className="text-sm text-gray-600">
              Automatic validation of lighting, sharpness, and face detection
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 shadow">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-3">
              <Camera className="w-5 h-5 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Mobile Ready</h3>
            <p className="text-sm text-gray-600">
              Works seamlessly on smartphones and tablets
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

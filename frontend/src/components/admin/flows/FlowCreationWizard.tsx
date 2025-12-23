'use client';

import { useState } from 'react';
import { X, ArrowRight, ArrowLeft, Check, Plus, Trash2, GripVertical, Info } from 'lucide-react';
import { useToast } from '@/components/shared';
import { mangwaleAIClient } from '@/lib/api/mangwale-ai';

interface FlowStep {
  id: string;
  type: 'text' | 'number' | 'choice' | 'location' | 'phone' | 'email';
  label: string;
  validation?: string;
  required: boolean;
  options?: string[];
  placeholder?: string;
}

interface FlowData {
  name: string;
  description: string;
  module: string;
  steps: FlowStep[];
  systemPrompt?: string;
  enabled: boolean;
}

interface FlowCreationWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const MODULES = [
  { value: 'food', label: 'Food & Restaurants', description: 'Restaurant ordering and food delivery' },
  { value: 'ecom', label: 'E-Commerce', description: 'Online shopping and product ordering' },
  { value: 'parcel', label: 'Parcel Delivery', description: 'Package delivery and tracking' },
  { value: 'ride', label: 'Ride Booking', description: 'Transportation and ride-hailing' },
  { value: 'health', label: 'Healthcare', description: 'Medical appointments and services' },
  { value: 'rooms', label: 'Room Booking', description: 'Hotel and accommodation booking' },
  { value: 'movies', label: 'Movie Tickets', description: 'Cinema bookings and tickets' },
  { value: 'services', label: 'Services', description: 'General service bookings' },
  { value: 'general', label: 'General', description: 'Multi-purpose conversations' },
];

const STEP_TYPES = [
  { value: 'text', label: 'Text Input', description: 'Free text response' },
  { value: 'number', label: 'Number Input', description: 'Numeric value only' },
  { value: 'choice', label: 'Multiple Choice', description: 'Select from options' },
  { value: 'location', label: 'Location', description: 'Address or coordinates' },
  { value: 'phone', label: 'Phone Number', description: 'Phone number validation' },
  { value: 'email', label: 'Email', description: 'Email address validation' },
];

export function FlowCreationWizard({ isOpen, onClose, onSuccess }: FlowCreationWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [flowData, setFlowData] = useState<FlowData>({
    name: '',
    description: '',
    module: 'food',
    steps: [],
    systemPrompt: '',
    enabled: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

  const totalSteps = 5;

  const handleNext = () => {
    // Validation for each step
    if (currentStep === 1 && !flowData.module) {
      toast.error('Please select a module');
      return;
    }
    if (currentStep === 2 && (!flowData.name || !flowData.description)) {
      toast.error('Please provide flow name and description');
      return;
    }
    if (currentStep === 3 && flowData.steps.length === 0) {
      toast.error('Please add at least one step');
      return;
    }
    
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await mangwaleAIClient.createFlow({
        name: flowData.name,
        description: flowData.description,
        module: flowData.module,
        steps: flowData.steps.map((step, index) => ({
          order: index + 1,
          type: step.type,
          label: step.label,
          validation: step.validation,
          required: step.required,
          options: step.options,
          placeholder: step.placeholder,
        })),
        systemPrompt: flowData.systemPrompt,
        enabled: flowData.enabled,
      });

      toast.success('Flow created successfully!');
      onSuccess();
      onClose();
      
      // Reset form
      setFlowData({
        name: '',
        description: '',
        module: 'food',
        steps: [],
        systemPrompt: '',
        enabled: true,
      });
      setCurrentStep(1);
    } catch (error) {
      console.error('Failed to create flow:', error);
      toast.error('Failed to create flow. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addStep = () => {
    const newStep: FlowStep = {
      id: `step-${Date.now()}`,
      type: 'text',
      label: '',
      required: true,
      placeholder: '',
    };
    setFlowData(prev => ({
      ...prev,
      steps: [...prev.steps, newStep],
    }));
  };

  const updateStep = (id: string, updates: Partial<FlowStep>) => {
    setFlowData(prev => ({
      ...prev,
      steps: prev.steps.map(step => 
        step.id === id ? { ...step, ...updates } : step
      ),
    }));
  };

  const deleteStep = (id: string) => {
    setFlowData(prev => ({
      ...prev,
      steps: prev.steps.filter(step => step.id !== id),
    }));
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    const newSteps = [...flowData.steps];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= newSteps.length) return;
    
    [newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]];
    
    setFlowData(prev => ({
      ...prev,
      steps: newSteps,
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Create New Flow</h2>
              <p className="text-indigo-100 text-sm mt-1">
                Step {currentStep} of {totalSteps}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="mt-6 bg-white bg-opacity-20 rounded-full h-2">
            <div
              className="bg-white rounded-full h-2 transition-all duration-300"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Choose Module */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Choose Module</h3>
                <p className="text-gray-600">Select the business domain for this flow</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {MODULES.map(module => (
                  <button
                    key={module.value}
                    onClick={() => setFlowData(prev => ({ ...prev, module: module.value }))}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      flowData.module === module.value
                        ? 'border-indigo-600 bg-indigo-50'
                        : 'border-gray-200 hover:border-indigo-300'
                    }`}
                  >
                    <div className="font-semibold text-gray-900 mb-1">{module.label}</div>
                    <div className="text-sm text-gray-600">{module.description}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Name & Description */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Name Your Flow</h3>
                <p className="text-gray-600">Provide a clear name and description</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Flow Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={flowData.name}
                  onChange={(e) => setFlowData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Restaurant Order Flow"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={flowData.description}
                  onChange={(e) => setFlowData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what this flow does and when it should be used..."
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex gap-2">
                  <Info size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900">
                    <strong>Tip:</strong> Give your flow a descriptive name that clearly indicates its purpose. 
                    The description helps other team members understand when to use this flow.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Add Steps */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Add Flow Steps</h3>
                <p className="text-gray-600">Define the conversation steps in sequence</p>
              </div>

              {flowData.steps.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                  <p className="text-gray-600 mb-4">No steps added yet</p>
                  <button
                    onClick={addStep}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    <Plus size={20} />
                    Add First Step
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {flowData.steps.map((step, index) => (
                    <div key={step.id} className="border-2 border-gray-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex flex-col gap-1 pt-2">
                          <button
                            onClick={() => moveStep(index, 'up')}
                            disabled={index === 0}
                            className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"
                          >
                            <GripVertical size={16} className="text-gray-400" />
                          </button>
                          <span className="text-xs font-bold text-gray-500">{index + 1}</span>
                        </div>

                        <div className="flex-1 space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Step Type
                              </label>
                              <select
                                value={step.type}
                                onChange={(e) => updateStep(step.id, { type: e.target.value as FlowStep['type'] })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                              >
                                {STEP_TYPES.map(type => (
                                  <option key={type.value} value={type.value}>
                                    {type.label}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Label/Question
                              </label>
                              <input
                                type="text"
                                value={step.label}
                                onChange={(e) => updateStep(step.id, { label: e.target.value })}
                                placeholder="What to ask the user?"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                              />
                            </div>
                          </div>

                          {step.type === 'choice' && (
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Options (comma-separated)
                              </label>
                              <input
                                type="text"
                                value={step.options?.join(', ') || ''}
                                onChange={(e) => updateStep(step.id, { 
                                  options: e.target.value.split(',').map(o => o.trim()).filter(Boolean) 
                                })}
                                placeholder="Option 1, Option 2, Option 3"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                              />
                            </div>
                          )}

                          <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={step.required}
                                onChange={(e) => updateStep(step.id, { required: e.target.checked })}
                                className="rounded border-gray-300"
                              />
                              <span className="text-sm text-gray-700">Required</span>
                            </label>
                          </div>
                        </div>

                        <button
                          onClick={() => deleteStep(step.id)}
                          className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} className="text-red-600" />
                        </button>
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={addStep}
                    className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-indigo-600 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus size={20} />
                    Add Another Step
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Configuration */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Configure Flow</h3>
                <p className="text-gray-600">Optional settings and customization</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  System Prompt (Optional)
                </label>
                <textarea
                  value={flowData.systemPrompt}
                  onChange={(e) => setFlowData(prev => ({ ...prev, systemPrompt: e.target.value }))}
                  placeholder="Provide additional instructions for the AI agent when executing this flow..."
                  rows={6}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
                />
              </div>

              <div>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={flowData.enabled}
                    onChange={(e) => setFlowData(prev => ({ ...prev, enabled: e.target.checked }))}
                    className="w-5 h-5 rounded border-gray-300"
                  />
                  <div>
                    <div className="font-medium text-gray-900">Enable flow immediately</div>
                    <div className="text-sm text-gray-600">
                      Activate this flow as soon as it's created
                    </div>
                  </div>
                </label>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex gap-2">
                  <Info size={20} className="text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-900">
                    <strong>Note:</strong> You can always edit these settings later from the flow management page.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Preview & Confirm */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Preview & Confirm</h3>
                <p className="text-gray-600">Review your flow before creating</p>
              </div>

              <div className="space-y-4">
                {/* Flow Info */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs font-medium text-gray-500 mb-1">Flow Name</div>
                      <div className="font-semibold text-gray-900">{flowData.name}</div>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-gray-500 mb-1">Module</div>
                      <div className="font-semibold text-gray-900">
                        {MODULES.find(m => m.value === flowData.module)?.label}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-xs font-medium text-gray-500 mb-1">Description</div>
                      <div className="text-sm text-gray-900">{flowData.description}</div>
                    </div>
                  </div>
                </div>

                {/* Steps Preview */}
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-3">
                    Flow Steps ({flowData.steps.length})
                  </div>
                  <div className="space-y-2">
                    {flowData.steps.map((step, index) => (
                      <div key={step.id} className="flex items-start gap-3 p-3 bg-white border border-gray-200 rounded-lg">
                        <div className="flex-shrink-0 w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{step.label || 'Untitled Step'}</div>
                          <div className="text-xs text-gray-600">
                            Type: {STEP_TYPES.find(t => t.value === step.type)?.label}
                            {step.required && ' • Required'}
                            {step.options && ` • ${step.options.length} options`}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Status */}
                <div className="flex items-center gap-2 text-sm">
                  <span className={`px-3 py-1 rounded-full ${
                    flowData.enabled 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {flowData.enabled ? 'Will be enabled' : 'Will be disabled'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 bg-gray-50">
          <div className="flex items-center justify-between">
            <button
              onClick={handleBack}
              disabled={currentStep === 1}
              className="flex items-center gap-2 px-6 py-3 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowLeft size={20} />
              Back
            </button>

            <div className="flex gap-2">
              {[...Array(totalSteps)].map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full ${
                    i + 1 === currentStep ? 'bg-indigo-600' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>

            {currentStep < totalSteps ? (
              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Next
                <ArrowRight size={20} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>Creating...</>
                ) : (
                  <>
                    <Check size={20} />
                    Create Flow
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

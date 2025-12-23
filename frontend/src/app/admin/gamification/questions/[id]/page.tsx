'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Save, Plus, X, AlertCircle } from 'lucide-react';
import { mangwaleAIClient } from '@/lib/api/mangwale-ai';
import Link from 'next/link';

interface QuestionFormData {
  gameType: 'intent_quest' | 'language_master' | 'tone_detective' | 'profile_builder';
  questionText: string;
  correctAnswer: string;
  answerOptions: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  rewardAmount: number;
  category: string;
  tags: string[];
  contextRequired: boolean;
  enabled: boolean;
}

export default function QuestionFormPage() {
  const router = useRouter();
  const params = useParams();
  const isEdit = params?.id && params.id !== 'new';
  const questionId = isEdit ? parseInt(params.id as string) : null;

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<QuestionFormData>({
    gameType: 'intent_quest',
    questionText: '',
    correctAnswer: '',
    answerOptions: ['', '', '', ''],
    difficulty: 'medium',
    rewardAmount: 3.0,
    category: '',
    tags: [],
    contextRequired: false,
    enabled: true,
  });

  const [newTag, setNewTag] = useState('');
  const [newOption, setNewOption] = useState('');

  useEffect(() => {
    if (isEdit && questionId) {
      loadQuestion();
    }
  }, [isEdit, questionId]);

  const loadQuestion = async () => {
    try {
      setLoading(true);
      const response = await mangwaleAIClient.get(`/gamification/questions/${questionId}`);
      const question = response.data.data;
      
      setFormData({
        gameType: question.gameType,
        questionText: question.questionText,
        correctAnswer: question.correctAnswer,
        answerOptions: question.answerOptions || ['', '', '', ''],
        difficulty: question.difficulty,
        rewardAmount: question.rewardAmount,
        category: question.category || '',
        tags: question.tags || [],
        contextRequired: question.contextRequired || false,
        enabled: question.enabled,
      });
    } catch (error) {
      console.error('Failed to load question:', error);
      setError('Failed to load question');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.questionText.trim()) {
      setError('Question text is required');
      return;
    }
    if (!formData.correctAnswer.trim()) {
      setError('Correct answer is required');
      return;
    }
    if (formData.answerOptions.filter(o => o.trim()).length < 2) {
      setError('At least 2 answer options are required');
      return;
    }

    try {
      setSaving(true);

      const payload = {
        ...formData,
        answerOptions: formData.answerOptions.filter(o => o.trim()),
        tags: formData.tags.filter(t => t.trim()),
      };

      if (isEdit && questionId) {
        await mangwaleAIClient.put(`/gamification/questions/${questionId}`, payload);
      } else {
        await mangwaleAIClient.post('/gamification/questions', payload);
      }

      router.push('/admin/gamification/questions');
    } catch (error: any) {
      console.error('Failed to save question:', error);
      setError(error.response?.data?.message || 'Failed to save question');
    } finally {
      setSaving(false);
    }
  };

  const handleAddOption = () => {
    if (newOption.trim()) {
      setFormData({
        ...formData,
        answerOptions: [...formData.answerOptions, newOption.trim()],
      });
      setNewOption('');
    }
  };

  const handleRemoveOption = (index: number) => {
    setFormData({
      ...formData,
      answerOptions: formData.answerOptions.filter((_, i) => i !== index),
    });
  };

  const handleUpdateOption = (index: number, value: string) => {
    const updated = [...formData.answerOptions];
    updated[index] = value;
    setFormData({ ...formData, answerOptions: updated });
  };

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, newTag.trim()],
      });
      setNewTag('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(t => t !== tag),
    });
  };

  const gameTypeInfo = {
    intent_quest: {
      label: 'Intent Quest',
      icon: '🎯',
      description: 'Users identify the intent behind messages',
      examples: ['order_food', 'cancel_parcel', 'search_product', 'track_order'],
    },
    language_master: {
      label: 'Language Master',
      icon: '🌍',
      description: 'Users detect the language of text',
      examples: ['english', 'hindi', 'marathi', 'mixed'],
    },
    tone_detective: {
      label: 'Tone Detective',
      icon: '😊',
      description: 'Users identify the emotional tone',
      examples: ['happy', 'frustrated', 'urgent', 'polite', 'neutral'],
    },
    profile_builder: {
      label: 'Profile Builder',
      icon: '📝',
      description: 'Yes/No questions about user preferences',
      examples: ['yes', 'no'],
    },
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="max-w-3xl mx-auto">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-center text-gray-600 mt-4">Loading question...</p>
        </div>
      </div>
    );
  }

  const selectedGameType = gameTypeInfo[formData.gameType];

  return (
    <div className="p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/admin/gamification/questions"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Questions
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Edit Question' : 'Add New Question'}
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {isEdit ? `Editing question #${questionId}` : 'Create a new game question'}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-red-600 hover:text-red-700">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Game Type */}
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Game Type *
            </label>
            <select
              value={formData.gameType}
              onChange={(e) => setFormData({ ...formData, gameType: e.target.value as any })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            >
              {Object.entries(gameTypeInfo).map(([key, info]) => (
                <option key={key} value={key}>
                  {info.icon} {info.label}
                </option>
              ))}
            </select>
            <p className="text-sm text-gray-600 mt-2">
              {selectedGameType.description}
            </p>
          </div>

          {/* Question Text */}
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Question Text *
            </label>
            <textarea
              value={formData.questionText}
              onChange={(e) => setFormData({ ...formData, questionText: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Enter the question text..."
              required
            />
            <p className="text-xs text-gray-500 mt-2">
              {formData.questionText.length} characters
            </p>
          </div>

          {/* Correct Answer */}
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Correct Answer *
            </label>
            <input
              type="text"
              value={formData.correctAnswer}
              onChange={(e) => setFormData({ ...formData, correctAnswer: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., order_food"
              required
            />
            <p className="text-sm text-gray-600 mt-2">
              Common answers: {selectedGameType.examples.join(', ')}
            </p>
          </div>

          {/* Answer Options */}
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Answer Options * (at least 2 required)
            </label>
            
            <div className="space-y-2 mb-3">
              {formData.answerOptions.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => handleUpdateOption(index, e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder={`Option ${index + 1}`}
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveOption(index)}
                    className="p-2 text-red-600 hover:text-red-700"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newOption}
                onChange={(e) => setNewOption(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddOption())}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Add new option..."
              />
              <button
                type="button"
                onClick={handleAddOption}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>
          </div>

          {/* Settings Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Difficulty */}
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Difficulty *
              </label>
              <select
                value={formData.difficulty}
                onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as any })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            {/* Reward Amount */}
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reward (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.rewardAmount}
                onChange={(e) => setFormData({ ...formData, rewardAmount: parseFloat(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
                min="0"
              />
            </div>

            {/* Category */}
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., food_ordering"
              />
            </div>
          </div>

          {/* Tags */}
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Tags (optional)
            </label>
            
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {formData.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Add tag..."
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>
          </div>

          {/* Toggles */}
          <div className="bg-white p-6 rounded-lg border border-gray-200 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Context Required</label>
                <p className="text-xs text-gray-500">Question requires additional context to answer</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.contextRequired}
                  onChange={(e) => setFormData({ ...formData, contextRequired: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Enabled</label>
                <p className="text-xs text-gray-500">Question is active and can be played</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.enabled}
                  onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
              </label>
            </div>
          </div>

          {/* Preview */}
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Preview</h3>
            <div className="bg-white p-4 rounded-lg border border-gray-300">
              <p className="text-sm text-gray-900 mb-3">{formData.questionText || 'Question text will appear here...'}</p>
              <div className="space-y-2">
                {formData.answerOptions.filter(o => o.trim()).map((option, idx) => (
                  <div
                    key={idx}
                    className={`px-4 py-2 border-2 rounded-lg ${
                      option === formData.correctAnswer
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200'
                    }`}
                  >
                    {option}
                    {option === formData.correctAnswer && (
                      <span className="ml-2 text-xs text-green-600 font-medium">✓ Correct</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {isEdit ? 'Update Question' : 'Create Question'}
                </>
              )}
            </button>
            <Link
              href="/admin/gamification/questions"
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

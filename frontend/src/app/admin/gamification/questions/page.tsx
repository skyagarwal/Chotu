'use client';

import { useState, useEffect } from 'react';
import { 
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  Download,
  Upload,
  RefreshCw,
  Eye,
  EyeOff,
  BarChart3,
  Save
} from 'lucide-react';
import { mangwaleAIClient } from '@/lib/api/mangwale-ai';
import Link from 'next/link';

interface GameQuestion {
  id: number;
  gameType: 'intent_quest' | 'language_master' | 'tone_detective' | 'profile_builder';
  questionText: string;
  correctAnswer: string;
  answerOptions: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  rewardAmount: number;
  category?: string;
  tags: string[];
  contextRequired: boolean;
  enabled: boolean;
  createdAt: string;
  usageCount?: number;
  successRate?: number;
}

interface QuestionStats {
  totalQuestions: number;
  enabledQuestions: number;
  disabledQuestions: number;
  byGameType: Record<string, number>;
  byDifficulty: Record<string, number>;
}

export default function QuestionsPage() {
  const [questions, setQuestions] = useState<GameQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<QuestionStats | null>(null);
  
  // Filters
  const [gameTypeFilter, setGameTypeFilter] = useState<string>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  
  // Inline edit
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<GameQuestion>>({});

  useEffect(() => {
    loadQuestions();
    loadStats();
  }, []);

  const loadQuestions = async () => {
    try {
      setLoading(true);
      const response = await mangwaleAIClient.get('/gamification/questions');
      setQuestions(response.data.data || []);
    } catch (error) {
      console.error('Failed to load questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await mangwaleAIClient.get('/gamification/questions/stats');
      setStats(response.data.data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this question?')) return;
    
    try {
      await mangwaleAIClient.delete(`/gamification/questions/${id}`);
      await loadQuestions();
      await loadStats();
    } catch (error) {
      console.error('Failed to delete question:', error);
      alert('Failed to delete question');
    }
  };

  const handleToggleEnabled = async (id: number, currentStatus: boolean) => {
    try {
      await mangwaleAIClient.patch(`/gamification/questions/${id}`, {
        enabled: !currentStatus
      });
      await loadQuestions();
    } catch (error) {
      console.error('Failed to toggle question:', error);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} selected questions?`)) return;

    try {
      await Promise.all(
        Array.from(selectedIds).map(id => 
          mangwaleAIClient.delete(`/gamification/questions/${id}`)
        )
      );
      setSelectedIds(new Set());
      await loadQuestions();
      await loadStats();
    } catch (error) {
      console.error('Failed to bulk delete:', error);
      alert('Failed to delete some questions');
    }
  };

  const handleBulkToggle = async (enabled: boolean) => {
    if (selectedIds.size === 0) return;

    try {
      await Promise.all(
        Array.from(selectedIds).map(id =>
          mangwaleAIClient.patch(`/gamification/questions/${id}`, { enabled })
        )
      );
      setSelectedIds(new Set());
      await loadQuestions();
    } catch (error) {
      console.error('Failed to bulk toggle:', error);
    }
  };

  const startInlineEdit = (question: GameQuestion) => {
    setEditingId(question.id);
    setEditData({
      questionText: question.questionText,
      correctAnswer: question.correctAnswer,
      difficulty: question.difficulty,
      rewardAmount: question.rewardAmount,
    });
  };

  const saveInlineEdit = async () => {
    if (!editingId) return;

    try {
      await mangwaleAIClient.patch(`/gamification/questions/${editingId}`, editData);
      setEditingId(null);
      setEditData({});
      await loadQuestions();
    } catch (error) {
      console.error('Failed to save edit:', error);
      alert('Failed to save changes');
    }
  };

  const cancelInlineEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  // Filtering
  const filteredQuestions = questions.filter(q => {
    if (gameTypeFilter !== 'all' && q.gameType !== gameTypeFilter) return false;
    if (difficultyFilter !== 'all' && q.difficulty !== difficultyFilter) return false;
    if (statusFilter === 'enabled' && !q.enabled) return false;
    if (statusFilter === 'disabled' && q.enabled) return false;
    if (searchQuery && !q.questionText.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredQuestions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredQuestions.map(q => q.id)));
    }
  };

  const gameTypeLabels = {
    intent_quest: { label: 'Intent Quest', icon: '🎯', color: 'blue' },
    language_master: { label: 'Language Master', icon: '🌍', color: 'green' },
    tone_detective: { label: 'Tone Detective', icon: '😊', color: 'purple' },
    profile_builder: { label: 'Profile Builder', icon: '📝', color: 'orange' },
  };

  const difficultyColors = {
    easy: 'green',
    medium: 'yellow',
    hard: 'red',
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Game Questions</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage questions for all game types
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/gamification/questions/analytics"
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <BarChart3 className="w-4 h-4" />
            Analytics
          </Link>
          <Link
            href="/admin/gamification/questions/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Question
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600">Total Questions</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">
              {stats.totalQuestions}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600">Enabled</div>
            <div className="text-2xl font-bold text-green-600 mt-1">
              {stats.enabledQuestions}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600">Disabled</div>
            <div className="text-2xl font-bold text-red-600 mt-1">
              {stats.disabledQuestions}
            </div>
          </div>
          {Object.entries(stats.byGameType).slice(0, 2).map(([type, count]) => (
            <div key={type} className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="text-sm text-gray-600">{gameTypeLabels[type as keyof typeof gameTypeLabels]?.label || type}</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">{count}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters & Actions */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 mb-4">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search questions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Game Type Filter */}
          <select
            value={gameTypeFilter}
            onChange={(e) => setGameTypeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Game Types</option>
            <option value="intent_quest">🎯 Intent Quest</option>
            <option value="language_master">🌍 Language Master</option>
            <option value="tone_detective">😊 Tone Detective</option>
            <option value="profile_builder">📝 Profile Builder</option>
          </select>

          {/* Difficulty Filter */}
          <select
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="enabled">Enabled Only</option>
            <option value="disabled">Disabled Only</option>
          </select>

          <button
            onClick={loadQuestions}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Bulk Actions */}
        {selectedIds.size > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200 flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {selectedIds.size} selected
            </span>
            <button
              onClick={() => handleBulkToggle(true)}
              className="text-sm text-green-600 hover:text-green-700 flex items-center gap-1"
            >
              <Eye className="w-4 h-4" />
              Enable
            </button>
            <button
              onClick={() => handleBulkToggle(false)}
              className="text-sm text-gray-600 hover:text-gray-700 flex items-center gap-1"
            >
              <EyeOff className="w-4 h-4" />
              Disable
            </button>
            <button
              onClick={handleBulkDelete}
              className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Questions Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading questions...</p>
          </div>
        ) : filteredQuestions.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-600">No questions found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === filteredQuestions.length}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Game Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Question</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Correct Answer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Difficulty</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reward</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredQuestions.map((question) => {
                  const isEditing = editingId === question.id;
                  const gameType = gameTypeLabels[question.gameType];

                  return (
                    <tr key={question.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(question.id)}
                          onChange={(e) => {
                            const newSelected = new Set(selectedIds);
                            if (e.target.checked) {
                              newSelected.add(question.id);
                            } else {
                              newSelected.delete(question.id);
                            }
                            setSelectedIds(newSelected);
                          }}
                          className="rounded border-gray-300"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{question.id}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-${gameType.color}-100 text-${gameType.color}-800`}>
                          {gameType.icon} {gameType.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 max-w-md">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editData.questionText || ''}
                            onChange={(e) => setEditData({ ...editData, questionText: e.target.value })}
                            className="w-full px-2 py-1 border border-gray-300 rounded"
                          />
                        ) : (
                          <div className="truncate" title={question.questionText}>
                            {question.questionText.substring(0, 100)}...
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editData.correctAnswer || ''}
                            onChange={(e) => setEditData({ ...editData, correctAnswer: e.target.value })}
                            className="w-full px-2 py-1 border border-gray-300 rounded"
                          />
                        ) : (
                          <span className="font-mono text-gray-900">{question.correctAnswer}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <select
                            value={editData.difficulty || question.difficulty}
                            onChange={(e) => setEditData({ ...editData, difficulty: e.target.value as any })}
                            className="px-2 py-1 border border-gray-300 rounded text-sm"
                          >
                            <option value="easy">Easy</option>
                            <option value="medium">Medium</option>
                            <option value="hard">Hard</option>
                          </select>
                        ) : (
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium bg-${difficultyColors[question.difficulty]}-100 text-${difficultyColors[question.difficulty]}-800`}>
                            {question.difficulty}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editData.rewardAmount || ''}
                            onChange={(e) => setEditData({ ...editData, rewardAmount: parseFloat(e.target.value) })}
                            className="w-20 px-2 py-1 border border-gray-300 rounded"
                            step="0.01"
                          />
                        ) : (
                          `₹${question.rewardAmount}`
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggleEnabled(question.id, question.enabled)}
                          className="flex items-center gap-1"
                        >
                          {question.enabled ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <Eye className="w-3 h-3" />
                              Enabled
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              <EyeOff className="w-3 h-3" />
                              Disabled
                            </span>
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isEditing ? (
                            <>
                              <button
                                onClick={saveInlineEdit}
                                className="p-1 text-green-600 hover:text-green-700"
                                title="Save"
                              >
                                <Save className="w-4 h-4" />
                              </button>
                              <button
                                onClick={cancelInlineEdit}
                                className="p-1 text-gray-600 hover:text-gray-700"
                                title="Cancel"
                              >
                                ✕
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => startInlineEdit(question)}
                                className="p-1 text-blue-600 hover:text-blue-700"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <Link
                                href={`/admin/gamification/questions/${question.id}`}
                                className="p-1 text-gray-600 hover:text-gray-700"
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </Link>
                              <button
                                onClick={() => handleDelete(question.id)}
                                className="p-1 text-red-600 hover:text-red-700"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Results Summary */}
      <div className="mt-4 text-sm text-gray-600 text-center">
        Showing {filteredQuestions.length} of {questions.length} questions
      </div>
    </div>
  );
}

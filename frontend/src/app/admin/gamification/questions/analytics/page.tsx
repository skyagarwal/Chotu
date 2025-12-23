'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, TrendingUp, TrendingDown, BarChart3, Users, Target, Award } from 'lucide-react';
import { mangwaleAIClient } from '@/lib/api/mangwale-ai';
import Link from 'next/link';

interface QuestionAnalytics {
  id: number;
  questionText: string;
  gameType: string;
  difficulty: string;
  timesPlayed: number;
  correctAnswers: number;
  incorrectAnswers: number;
  successRate: number;
  avgTimeSpent: number;
  lastPlayed?: string;
}

interface OverallStats {
  totalGamesPlayed: number;
  totalQuestionsAnswered: number;
  overallSuccessRate: number;
  mostPlayedGameType: string;
  hardestQuestion: QuestionAnalytics;
  easiestQuestion: QuestionAnalytics;
}

export default function QuestionAnalyticsPage() {
  const [analytics, setAnalytics] = useState<QuestionAnalytics[]>([]);
  const [overallStats, setOverallStats] = useState<OverallStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'successRate' | 'timesPlayed' | 'avgTimeSpent'>('timesPlayed');
  const [filterGameType, setFilterGameType] = useState<string>('all');

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const [analyticsRes, statsRes] = await Promise.all([
        mangwaleAIClient.get('/gamification/questions/analytics'),
        mangwaleAIClient.get('/gamification/questions/analytics/overall'),
      ]);
      
      setAnalytics(analyticsRes.data.data || []);
      setOverallStats(statsRes.data.data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 75) return 'text-green-600';
    if (rate >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSuccessRateBg = (rate: number) => {
    if (rate >= 75) return 'bg-green-100';
    if (rate >= 50) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  const getDifficultyRecommendation = (question: QuestionAnalytics) => {
    if (question.timesPlayed < 10) return null;
    
    if (question.successRate >= 85 && question.difficulty !== 'easy') {
      return { suggestion: 'Consider marking as Easy', color: 'text-blue-600' };
    }
    if (question.successRate <= 35 && question.difficulty !== 'hard') {
      return { suggestion: 'Consider marking as Hard', color: 'text-red-600' };
    }
    if (question.successRate >= 50 && question.successRate <= 70 && question.difficulty !== 'medium') {
      return { suggestion: 'Consider marking as Medium', color: 'text-yellow-600' };
    }
    return null;
  };

  const filteredAnalytics = analytics
    .filter(q => filterGameType === 'all' || q.gameType === filterGameType)
    .sort((a, b) => {
      if (sortBy === 'successRate') return b.successRate - a.successRate;
      if (sortBy === 'timesPlayed') return b.timesPlayed - a.timesPlayed;
      return b.avgTimeSpent - a.avgTimeSpent;
    });

  const gameTypeLabels: Record<string, any> = {
    intent_quest: { label: 'Intent Quest', icon: '🎯' },
    language_master: { label: 'Language Master', icon: '🌍' },
    tone_detective: { label: 'Tone Detective', icon: '😊' },
    profile_builder: { label: 'Profile Builder', icon: '📝' },
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/admin/gamification/questions"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Questions
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Question Analytics</h1>
        <p className="text-sm text-gray-600 mt-1">
          Performance metrics and difficulty recommendations
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading analytics...</p>
        </div>
      ) : (
        <>
          {/* Overall Stats */}
          {overallStats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Games Played</span>
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {overallStats.totalGamesPlayed.toLocaleString()}
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Questions Answered</span>
                  <Target className="w-5 h-5 text-green-600" />
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {overallStats.totalQuestionsAnswered.toLocaleString()}
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Overall Success Rate</span>
                  <Award className="w-5 h-5 text-purple-600" />
                </div>
                <div className={`text-2xl font-bold ${getSuccessRateColor(overallStats.overallSuccessRate)}`}>
                  {overallStats.overallSuccessRate.toFixed(1)}%
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Most Played</span>
                  <BarChart3 className="w-5 h-5 text-orange-600" />
                </div>
                <div className="text-lg font-bold text-gray-900">
                  {gameTypeLabels[overallStats.mostPlayedGameType]?.icon}{' '}
                  {gameTypeLabels[overallStats.mostPlayedGameType]?.label}
                </div>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="bg-white p-4 rounded-lg border border-gray-200 mb-4 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Game Type:</label>
              <select
                value={filterGameType}
                onChange={(e) => setFilterGameType(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="all">All Types</option>
                <option value="intent_quest">🎯 Intent Quest</option>
                <option value="language_master">🌍 Language Master</option>
                <option value="tone_detective">😊 Tone Detective</option>
                <option value="profile_builder">📝 Profile Builder</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Sort By:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="timesPlayed">Most Played</option>
                <option value="successRate">Success Rate</option>
                <option value="avgTimeSpent">Avg Time</option>
              </select>
            </div>
          </div>

          {/* Analytics Table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {filteredAnalytics.length === 0 ? (
              <div className="p-12 text-center text-gray-600">
                No analytics data available yet. Questions need to be played first.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Question
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Game Type
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Difficulty
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        Times Played
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        Success Rate
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        Avg Time
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Recommendation
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredAnalytics.map((question) => {
                      const recommendation = getDifficultyRecommendation(question);
                      const gameType = gameTypeLabels[question.gameType];

                      return (
                        <tr key={question.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900 max-w-md">
                            <div className="truncate" title={question.questionText}>
                              {question.questionText.substring(0, 80)}...
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              ID: {question.id}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className="inline-flex items-center gap-1">
                              {gameType?.icon} {gameType?.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                              question.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                              question.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {question.difficulty}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="text-sm font-medium text-gray-900">
                              {question.timesPlayed}
                            </div>
                            <div className="text-xs text-gray-500">
                              {question.correctAnswers}✓ {question.incorrectAnswers}✗
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className={`text-lg font-bold ${getSuccessRateColor(question.successRate)}`}>
                              {question.successRate.toFixed(1)}%
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                              <div
                                className={`h-1.5 rounded-full ${
                                  question.successRate >= 75 ? 'bg-green-600' :
                                  question.successRate >= 50 ? 'bg-yellow-600' :
                                  'bg-red-600'
                                }`}
                                style={{ width: `${question.successRate}%` }}
                              ></div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center text-sm text-gray-900">
                            {question.avgTimeSpent.toFixed(1)}s
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {recommendation ? (
                              <div className="flex items-center gap-2">
                                {question.successRate >= 85 ? (
                                  <TrendingDown className="w-4 h-4 text-blue-600" />
                                ) : question.successRate <= 35 ? (
                                  <TrendingUp className="w-4 h-4 text-red-600" />
                                ) : null}
                                <span className={recommendation.color}>
                                  {recommendation.suggestion}
                                </span>
                              </div>
                            ) : question.timesPlayed < 10 ? (
                              <span className="text-gray-400 text-xs">
                                Need more plays ({question.timesPlayed}/10)
                              </span>
                            ) : (
                              <span className="text-green-600 text-sm">✓ Balanced</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Insights */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h3 className="text-sm font-medium text-blue-900 mb-2">💡 Insight: Easy Questions</h3>
              <p className="text-sm text-blue-700">
                {filteredAnalytics.filter(q => q.successRate >= 85 && q.timesPlayed >= 10).length} questions
                have success rates above 85%. Consider increasing difficulty or rewording them.
              </p>
            </div>

            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <h3 className="text-sm font-medium text-red-900 mb-2">⚠️ Insight: Hard Questions</h3>
              <p className="text-sm text-red-700">
                {filteredAnalytics.filter(q => q.successRate <= 35 && q.timesPlayed >= 10).length} questions
                have success rates below 35%. Consider simplifying or providing more context.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

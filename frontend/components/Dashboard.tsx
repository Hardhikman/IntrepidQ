"use client";
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { getUserStats } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

interface DashboardProps {
  onNavigateToGenerator: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigateToGenerator }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getUserStats();
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchStats();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <Card className="max-w-4xl mx-auto mt-8">
        <CardContent className="text-center py-8">
          <p className="text-gray-500">Failed to load dashboard data.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="min-h-screen p-4">
      <Card className="max-w-4xl mx-auto mb-6">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">📊 User Dashboard</CardTitle>
          <p className="text-lg">
            Welcome back, <strong>{user?.user_metadata?.full_name || user?.email}</strong>!
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="text-center py-6">
                <p className="text-3xl font-bold text-blue-600">{stats.total_generations || 0}</p>
                <p className="text-gray-600">Total Generations</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="text-center py-6">
                <p className="text-3xl font-bold text-green-600">{stats.total_questions || 0}</p>
                <p className="text-gray-600">Total Questions</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="text-center py-6">
                <p className="text-3xl font-bold text-purple-600">{stats.feedback_count || 0}</p>
                <p className="text-gray-600">Feedback Received</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="text-center py-6">
                <p className="text-3xl font-bold text-yellow-600">
                  {stats.average_rating ? stats.average_rating.toFixed(1) : '0.0'}
                </p>
                <p className="text-gray-600">Average Rating</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Subject Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                {Object.entries(stats.subject_breakdown || {}).map(([subject, count]) => (
                  <div key={subject} className="mb-4">
                    <div className="flex justify-between mb-1">
                      <span className="font-medium">{subject}</span>
                      <span>{count as number}</span>
                    </div>
                    <Progress
                      value={(count as number / (stats.total_generations || 1)) * 100}
                      className="h-2"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Mode Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="flex justify-between mb-1">
                    <span className="font-medium">Topic-wise</span>
                    <span>{stats.mode_breakdown?.topic || 0}</span>
                  </div>
                  <Progress 
                    value={((stats.mode_breakdown?.topic || 0) / (stats.total_generations || 1)) * 100} 
                    className="h-2" 
                  />
                </div>
                <div className="mb-4">
                  <div className="flex justify-between mb-1">
                    <span className="font-medium">Whole Paper</span>
                    <span>{stats.mode_breakdown?.paper || 0}</span>
                  </div>
                  <Progress 
                    value={((stats.mode_breakdown?.paper || 0) / (stats.total_generations || 1)) * 100} 
                    className="h-2" 
                  />
                </div>
                <div className="mb-4">
                  <div className="flex justify-between mb-1">
                    <span className="font-medium">Current Affairs Usage</span>
                    <span>{stats.current_affairs_usage || 0}</span>
                  </div>
                  <Progress 
                    value={((stats.current_affairs_usage || 0) / (stats.total_generations || 1)) * 100} 
                    className="h-2" 
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-8 text-center">
            <Button onClick={onNavigateToGenerator} className="text-lg py-6 px-8">
              🚀 Generate New Questions
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

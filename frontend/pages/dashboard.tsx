"use client";
import { useAuth } from '@/hooks/useAuth';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const DashboardPage = () => {
  const { user, loading } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [recentFeedback, setRecentFeedback] = useState<any[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    setStatsLoading(true);
    try {
      const sessionResponse = await supabase.auth.getSession();
      const token = sessionResponse.data.session?.access_token;

      if (!token) {
        throw new Error("Not authenticated");
      }

      const [statsResponse, feedbackResponse] = await Promise.all([
        fetch('/api/analytics/summary', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/feedback/recent', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!statsResponse.ok || !feedbackResponse.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const statsData = await statsResponse.json();
      const feedbackData = await feedbackResponse.json();

      setStats(statsData);
      setRecentFeedback(feedbackData.feedback);
    } catch (error) {
      console.error(error);
    } finally {
      setStatsLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center p-8">Loading...</div>;
  }

  if (!user) {
    return <div className="text-center p-8">Please log in to view the dashboard.</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Total Questions Generated</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{stats?.total_questions || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Good Feedback</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-green-500">{stats?.feedback_summary?.good || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Bad Feedback</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-red-500">{stats?.feedback_summary?.bad || 0}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Feedback</CardTitle>
        </CardHeader>
        <CardContent>
          {statsLoading ? (
            <p>Loading feedback...</p>
          ) : recentFeedback.length > 0 ? (
            <ul>
              {recentFeedback.map((fb) => (
                <li key={fb.id} className="border-b last:border-b-0 py-2">
                  <p><strong>Question:</strong> {fb.generated_questions?.questions || 'N/A'}</p>
                  <p><strong>Rating:</strong> {fb.rating} / 5</p>
                  {fb.comment && <p><strong>Comment:</strong> {fb.comment}</p>}
                  <p className="text-sm text-gray-500">by {fb.user_profiles?.full_name || fb.user_profiles?.email || 'Anonymous'} on {new Date(fb.created_at).toLocaleDateString()}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p>No recent feedback.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardPage;

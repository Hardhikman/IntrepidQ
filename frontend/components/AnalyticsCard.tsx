"use client";
import React from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

interface AnalyticsCardProps {
  stats: {
    subject_breakdown: Record<string, number>;
    mode_breakdown: {
      topic: number;
      paper: number;
    };
    current_affairs_usage: number;
    total_generations: number;
  } | null;
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#AF19FF", "#FF1919"];

export const AnalyticsCard: React.FC<AnalyticsCardProps> = ({ stats }) => {
  if (!stats) {
    return null;
  }

  const subjectData = Object.entries(stats.subject_breakdown).map(([name, value]) => ({ name, value }));
  const modeData = [
    { name: "Topic", value: stats.mode_breakdown.topic },
    { name: "Paper", value: stats.mode_breakdown.paper },
    { name: "Current Affairs", value: stats.current_affairs_usage },
  ];

  return (
    <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Subject Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {subjectData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={subjectData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} fill="#8884d8" label>
                  {subjectData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-sm text-gray-500">No subject data yet.</div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Mode Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={modeData}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};
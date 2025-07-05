'use client';

import useSWR from 'swr';
import { Card } from '@/components/ui/card';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend);

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function AdminDashboard() {
  const { data } = useSWR('/api/admin/summary', fetcher);

  if (!data) return <p>Loading...</p>;

  const { total, active, admins, userChartData } = data;

  const chartData = {
    labels: userChartData.map((d: any) => d.date),
    datasets: [
      {
        label: 'Users Created',
        data: userChartData.map((d: any) => d.count),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        fill: true,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
    },
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-sm text-gray-500">Total Users</p>
          <p className="text-xl font-bold">{total}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Active Users</p>
          <p className="text-xl font-bold">{active}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Admins</p>
          <p className="text-xl font-bold">{admins}</p>
        </Card>
      </div>

      <div className="mt-6">
        <h2 className="text-lg font-semibold mb-2">User Growth (last 30 days)</h2>
        <Card className="p-4">
          <Line data={chartData} options={chartOptions} />
        </Card>
      </div>
    </div>
  );
}

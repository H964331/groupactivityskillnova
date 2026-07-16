// ════════════════════════════════════════════════════════════
//  ADMIN — pages/Dashboard.jsx (API-driven)
// ════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react';
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { FileText, CalendarCheck, HelpCircle, AlertCircle, Star, Shield, Loader2, Users, CheckCircle, Activity, Briefcase } from 'lucide-react';
import { Card, StatCard } from '../../shared/components/UI';
import api from '../../lib/api';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#FF6D34'];

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [interns, setInterns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [s, i] = await Promise.all([
          api.get('/analytics/platform'),
          api.get('/analytics/interns'),
        ]);
        setStats(s.data);
        setInterns(i.data.items);
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading || !stats) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="animate-spin" size={28} style={{ color: 'var(--muted)' }} /></div>;
  }

  const totalCompletedTasks = interns.reduce((acc, intern) => acc + (intern.completedTasks || 0), 0);
  
  // Calculate Department Statistics
  const deptCount = interns.reduce((acc, intern) => {
    const dept = intern.department || 'Unknown';
    acc[dept] = (acc[dept] || 0) + 1;
    return acc;
  }, {});
  
  const departmentData = Object.keys(deptCount).map(key => ({
    name: key,
    value: deptCount[key]
  }));

  // Performance Summary Data (Top 5 interns by score)
  const performanceData = [...interns]
    .sort((a, b) => (b.avgScore || 0) - (a.avgScore || 0))
    .slice(0, 5)
    .map(i => ({ name: i.name.split(' ')[0], score: i.avgScore || 0 }));

  // Mocked Recent Activity derived from interns
  const recentActivity = interns.slice(0, 5).map((i, index) => ({
    id: i.id || index,
    user: i.name,
    action: `completed a task with score ${i.avgScore || 0}/10`,
    time: index === 0 ? 'Just now' : `${index * 15} mins ago`,
    color: '#00bea3'
  }));

  return (
    <div className="space-y-6">
      <div className="relative rounded-xl overflow-hidden shadow-lg" style={{ background: 'linear-gradient(135deg, #1a1f20 0%, #2D3436 100%)' }}>
        <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899)' }} />
        <div className="relative p-5 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold mb-1 tracking-widest uppercase" style={{ color: '#ec4899' }}>Analytics Overview</p>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Platform Dashboard</h1>
              <p className="text-sm mt-1 opacity-80 text-gray-300">Comprehensive analytics for team performance and tasks</p>
            </div>
            <div className="rounded-xl p-3 self-start shadow-inner bg-white/10 backdrop-blur-md border border-white/20">
              <Activity size={28} className="text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Cards Section */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Interns" value={stats.totalInterns} icon={Users} color="#3b82f6" />
        <StatCard title="Active Interns" value={stats.activeUsers} icon={Activity} color="#10b981" />
        <StatCard title="Completed Tasks" value={totalCompletedTasks} icon={CheckCircle} color="#8b5cf6" />
        <StatCard title="Pending Tasks" value={stats.pendingReports} icon={AlertCircle} color="#f59e0b" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Charts Section */}
        <Card className="p-5 flex flex-col shadow-sm border border-[var(--border)]">
          <h3 className="text-md font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text)' }}>
            <Briefcase size={18} className="text-blue-500" />
            Department Statistics
          </h3>
          <div className="flex-1 min-h-[250px]">
            {departmentData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={departmentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {departmentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', background: 'var(--card)', color: 'var(--text)' }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-[var(--muted)] text-sm">No department data available</div>
            )}
          </div>
        </Card>

        <Card className="p-5 flex flex-col shadow-sm border border-[var(--border)]">
          <h3 className="text-md font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text)' }}>
            <Star size={18} className="text-yellow-500" />
            Performance Summary (Top Scores)
          </h3>
          <div className="flex-1 min-h-[250px]">
             {performanceData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={performanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: 'var(--muted)' }} axisLine={false} tickLine={false} domain={[0, 10]} />
                    <Tooltip cursor={{ fill: 'var(--input-bg)' }} contentStyle={{ borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)' }} />
                    <Bar dataKey="score" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
             ) : (
                <div className="flex items-center justify-center h-full text-[var(--muted)] text-sm">No performance data available</div>
             )}
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="p-5 lg:col-span-2 shadow-sm border border-[var(--border)]">
          <h3 className="text-md font-bold mb-4" style={{ color: 'var(--text)' }}>Platform Activity (Logins)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={stats.loginsByDay || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorLogins" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)' }} />
              <Area type="monotone" dataKey="count" stroke="#3b82f6" fill="url(#colorLogins)" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5 shadow-sm border border-[var(--border)]">
          <h3 className="text-md font-bold mb-4" style={{ color: 'var(--text)' }}>Recent Activity</h3>
          <div className="space-y-4 overflow-y-auto max-h-[250px] pr-2 sn-table-scroll">
            {recentActivity.length > 0 ? recentActivity.map((activity) => (
              <div key={activity.id} className="relative flex gap-4">
                <div className="absolute left-2.5 top-8 -bottom-4 w-px bg-[var(--border)]"></div>
                <div className="relative z-10 w-5 h-5 rounded-full border-4 border-[var(--card)] bg-emerald-500 flex-shrink-0 mt-1"></div>
                <div className="flex-1 min-w-0 pb-2">
                  <p className="text-sm leading-tight" style={{ color: 'var(--text)' }}>
                    <span className="font-bold">{activity.user}</span> {activity.action}
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>{activity.time}</p>
                </div>
              </div>
            )) : (
              <div className="text-[var(--muted)] text-sm flex items-center justify-center h-full">No recent activity</div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;

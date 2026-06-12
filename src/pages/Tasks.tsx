import { ArrowLeft, ListTodo } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import TaskPanel from '../components/TaskPanel.js';
import useAppStore from '../store/index.js';

export default function Tasks() {
  const navigate = useNavigate();
  const { tasks } = useAppStore();

  const stats = [
    { label: '总任务数', value: tasks.length, color: 'from-blue-500' },
    { label: '处理中', value: tasks.filter(t => t.status === 'processing').length, color: 'from-amber-500' },
    { label: '已完成', value: tasks.filter(t => t.status === 'completed').length, color: 'from-emerald-500' },
    { label: '失败', value: tasks.filter(t => t.status === 'failed').length, color: 'from-red-500' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl" />
      </div>

      <header className="relative z-10 border-b border-white/10 backdrop-blur-xl bg-slate-900/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-white">任务管理中心</h1>
                <p className="text-xs text-slate-500">查看和管理所有翻译任务</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 container mx-auto px-4 py-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="p-4 rounded-2xl bg-gradient-to-br from-slate-800/50 to-slate-700/50 backdrop-blur-xl border border-white/10"
            >
              <p className="text-sm text-slate-400 mb-1">{stat.label}</p>
              <p className={`text-3xl font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        <div className="h-[calc(100vh-280px)]">
          <TaskPanel />
        </div>
      </main>
    </div>
  );
}

import { useState, useEffect } from 'react';
import {
  ListTodo, Clock, CheckCircle, XCircle, PauseCircle, RotateCw, Trash2, AlertTriangle, ArrowUp, ArrowDown, Download
} from 'lucide-react';
import useAppStore from '../store/index.js';
import { useAudioUpload } from '../hooks/useAudioUpload.js';
import { TranslationTask, TaskStatus } from '../../shared/types.js';

export const TaskPanel = () => {
  const { tasks, setTasks, removeTask, showNotification } = useAppStore();
  const { fetchTasks, cancelTask, retryTask, deleteTask, updateTaskPriority } = useAudioUpload();
  const [filter, setFilter] = useState<TaskStatus | 'all'>('all');

  useEffect(() => {
    loadTasks();
    const interval = setInterval(loadTasks, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadTasks = async () => {
    try {
      await fetchTasks();
    } catch {
      // Silent fail
    }
  };

  const handleCancel = async (taskId: string) => {
    try {
      await cancelTask(taskId);
      showNotification('info', '任务已取消');
      loadTasks();
    } catch (err) {
      showNotification('error', '取消失败');
    }
  };

  const handleRetry = async (taskId: string) => {
    try {
      await retryTask(taskId);
      showNotification('info', '任务已重新加入队列');
      loadTasks();
    } catch (err) {
      showNotification('error', '重试失败');
    }
  };

  const handleDelete = async (taskId: string) => {
    if (!confirm('确定要删除这个任务吗？')) return;
    try {
      await deleteTask(taskId);
      removeTask(taskId);
      showNotification('success', '任务已删除');
    } catch (err) {
      showNotification('error', '删除失败');
    }
  };

  const handlePriority = async (taskId: string, delta: number) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        const newPriority = Math.max(1, Math.min(10, task.priority + delta));
        await updateTaskPriority(taskId, newPriority);
        loadTasks();
      }
    } catch (err) {
      showNotification('error', '调整优先级失败');
    }
  };

  const handleDownload = (task: TranslationTask) => {
    if (!task.audioUrl) {
      showNotification('error', '音频尚未生成');
      return;
    }
    const link = document.createElement('a');
    link.href = task.audioUrl;
    link.download = `translation_${task.id}.wav`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusConfig = (status: TaskStatus) => {
    const configs = {
      queued: { icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/20', label: '等待中' },
      processing: { icon: RotateCw, color: 'text-amber-400', bg: 'bg-amber-500/20', label: '处理中' },
      completed: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/20', label: '已完成' },
      failed: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/20', label: '失败' },
      cancelled: { icon: PauseCircle, color: 'text-slate-400', bg: 'bg-slate-500/20', label: '已取消' },
    };
    return configs[status];
  };

  const filteredTasks = filter === 'all' ? tasks : tasks.filter((t) => t.status === filter);

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPriorityColor = (priority: number): string => {
    if (priority >= 8) return 'text-red-400';
    if (priority >= 5) return 'text-amber-400';
    return 'text-blue-400';
  };

  const filterOptions: (TaskStatus | 'all')[] = ['all', 'queued', 'processing', 'completed', 'failed', 'cancelled'];

  return (
    <div className="flex flex-col h-full rounded-2xl bg-gradient-to-br from-slate-800/50 to-slate-700/50 backdrop-blur-xl border border-white/10 overflow-hidden">
      <div className="flex flex-col p-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
              <ListTodo className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-white font-medium">任务队列</h3>
              <p className="text-sm text-slate-400">
                共 {tasks.length} 个任务
              </p>
            </div>
          </div>
          <button
            onClick={loadTasks}
            className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            title="刷新"
          >
            <RotateCw className="w-5 h-5" />
          </button>
        </div>

        <div className="flex gap-2 flex-wrap">
          {filterOptions.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 ${
                filter === f
                  ? 'bg-purple-500/20 text-purple-400'
                  : 'text-slate-400 hover:bg-white/10'
              }`}
            >
              {f === 'all' ? '全部' : getStatusConfig(f as TaskStatus).label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-slate-700/50 to-slate-600/50 flex items-center justify-center mb-4">
              <ListTodo className="w-10 h-10 text-slate-500" />
            </div>
            <p className="text-slate-400 mb-2">暂无任务</p>
            <p className="text-sm text-slate-500">
              上传音频文件以创建翻译任务
            </p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const statusConfig = getStatusConfig(task.status);
            const StatusIcon = statusConfig.icon;

            return (
              <div
                key={task.id}
                className="p-4 rounded-xl bg-slate-700/50 border border-white/10 hover:border-white/20 transition-all duration-300"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusConfig.bg} ${statusConfig.color}`}>
                        <StatusIcon className="w-3 h-3 inline mr-1" />
                        {statusConfig.label}
                      </span>
                      <span className="text-xs text-slate-500">
                        {formatDate(task.createdAt)}
                      </span>
                    </div>
                    <p className="text-white font-medium mb-1">
                      {task.type === 'realtime' ? '实时翻译' : '文件翻译'}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      <span>{task.sourceLanguage} → {task.targetLanguage}</span>
                      {task.segments?.length && (
                        <span>{task.segments.length} 个片段</span>
                      )}
                    </div>
                  </div>

                  {task.status === 'processing' && (
                    <div className="w-20 h-2 rounded-full bg-slate-700/50 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                        style={{ width: `${task.progress || 0}%` }}
                      />
                    </div>
                  )}
                </div>

                {task.error && (
                  <div className="flex items-center gap-2 mt-3 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                    <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <span className="text-xs text-red-400">{task.error}</span>
                  </div>
                )}

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/10">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">优先级:</span>
                    <span className={`text-xs font-mono ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                    {task.status === 'queued' && (
                      <>
                        <button
                          onClick={() => handlePriority(task.id, 1)}
                          className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                          title="提高优先级"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handlePriority(task.id, -1)}
                          className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                          title="降低优先级"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {task.status === 'queued' && (
                      <button
                        onClick={() => handleCancel(task.id)}
                        className="p-2 rounded-lg hover:bg-amber-500/20 text-slate-400 hover:text-amber-400 transition-colors"
                        title="取消任务"
                      >
                        <PauseCircle className="w-4 h-4" />
                      </button>
                    )}
                    {task.status === 'failed' && (
                      <button
                        onClick={() => handleRetry(task.id)}
                        className="p-2 rounded-lg hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400 transition-colors"
                        title="重试任务"
                      >
                        <RotateCw className="w-4 h-4" />
                      </button>
                    )}
                    {task.status === 'completed' && task.audioUrl && (
                      <button
                        onClick={() => handleDownload(task)}
                        className="p-2 rounded-lg hover:bg-blue-500/20 text-slate-400 hover:text-blue-400 transition-colors"
                        title="下载音频"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(task.id)}
                      className="p-2 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
                      title="删除任务"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default TaskPanel;

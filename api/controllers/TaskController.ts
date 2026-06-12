import { Request, Response } from 'express';
import logger from '../utils/logger.js';
import { ApiResponse, TranslationTask } from '../../shared/types.js';
import taskRepository from '../repositories/TaskRepository.js';
import taskQueueService from '../services/TaskQueueService.js';

export class TaskController {
  async getTasks(req: Request, res: Response<ApiResponse<TranslationTask[]>>) {
    try {
      const { limit = 100, offset = 0, status } = req.query;

      let tasks: TranslationTask[];

      if (status && typeof status === 'string') {
        tasks = taskRepository.getTasksByStatus(status as any);
      } else {
        tasks = taskRepository.getTasks(
          parseInt(limit as string),
          parseInt(offset as string)
        );
      }

      res.json({
        code: 0,
        message: 'success',
        data: tasks,
      });
    } catch (error) {
      logger.error('Get tasks failed:', error);
      res.status(500).json({
        code: 500,
        message: '获取任务列表失败',
      });
    }
  }

  async getTaskById(req: Request, res: Response<ApiResponse<TranslationTask>>) {
    try {
      const { id } = req.params;

      const task = taskRepository.getTaskById(id);

      if (!task) {
        return res.status(404).json({
          code: 404,
          message: '任务不存在',
        });
      }

      res.json({
        code: 0,
        message: 'success',
        data: task,
      });
    } catch (error) {
      logger.error('Get task failed:', error);
      res.status(500).json({
        code: 500,
        message: '获取任务详情失败',
      });
    }
  }

  async cancelTask(req: Request, res: Response<ApiResponse>) {
    try {
      const { id } = req.params;

      const success = taskQueueService.cancelTask(id);

      if (!success) {
        return res.status(404).json({
          code: 404,
          message: '任务不存在或无法取消',
        });
      }

      res.json({
        code: 0,
        message: '任务已取消',
      });
    } catch (error) {
      logger.error('Cancel task failed:', error);
      res.status(500).json({
        code: 500,
        message: '取消任务失败',
      });
    }
  }

  async retryTask(req: Request, res: Response<ApiResponse>) {
    try {
      const { id } = req.params;

      const success = taskQueueService.retryTask(id);

      if (!success) {
        return res.status(400).json({
          code: 400,
          message: '任务不存在或状态不允许重试',
        });
      }

      const task = taskRepository.getTaskById(id);

      res.json({
        code: 0,
        message: '任务已重新提交',
        data: {
          taskId: id,
          status: task?.status,
        },
      });
    } catch (error) {
      logger.error('Retry task failed:', error);
      res.status(500).json({
        code: 500,
        message: '重试任务失败',
      });
    }
  }

  async updatePriority(req: Request, res: Response<ApiResponse>) {
    try {
      const { id } = req.params;
      const { priority } = req.body;

      if (priority === undefined || priority < 1 || priority > 10) {
        return res.status(400).json({
          code: 400,
          message: '优先级必须在1-10之间',
        });
      }

      const success = taskQueueService.updateTaskPriority(id, parseInt(priority));

      if (!success) {
        return res.status(404).json({
          code: 404,
          message: '任务不存在',
        });
      }

      res.json({
        code: 0,
        message: '优先级已更新',
        data: {
          taskId: id,
          priority: parseInt(priority),
        },
      });
    } catch (error) {
      logger.error('Update priority failed:', error);
      res.status(500).json({
        code: 500,
        message: '更新优先级失败',
      });
    }
  }

  async getQueueStatus(req: Request, res: Response<ApiResponse>) {
    try {
      const status = taskQueueService.getQueueStatus();

      res.json({
        code: 0,
        message: 'success',
        data: status,
      });
    } catch (error) {
      logger.error('Get queue status failed:', error);
      res.status(500).json({
        code: 500,
        message: '获取队列状态失败',
      });
    }
  }

  async deleteTask(req: Request, res: Response<ApiResponse>) {
    try {
      const { id } = req.params;

      const task = taskRepository.getTaskById(id);
      if (!task) {
        return res.status(404).json({
          code: 404,
          message: '任务不存在',
        });
      }

      if (task.status === 'processing') {
        taskQueueService.cancelTask(id);
      }

      taskRepository.deleteTask(id);

      res.json({
        code: 0,
        message: '任务已删除',
      });
    } catch (error) {
      logger.error('Delete task failed:', error);
      res.status(500).json({
        code: 500,
        message: '删除任务失败',
      });
    }
  }
}

export default new TaskController();

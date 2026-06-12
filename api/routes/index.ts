import { Router } from 'express';
import translationController, { upload } from '../controllers/TranslationController.js';
import taskController from '../controllers/TaskController.js';
import { apiLimiter, uploadLimiter, strictLimiter } from '../middleware/rateLimit.js';
import securityFilterMiddleware from '../middleware/securityFilter.js';

const router = Router();

router.get('/health', apiLimiter, translationController.healthCheck);

router.get('/languages', apiLimiter, translationController.getLanguages);
router.get('/voices', apiLimiter, translationController.getVoices);

router.post('/translate/upload',
  uploadLimiter,
  upload.single('file'),
  securityFilterMiddleware,
  translationController.uploadAudio
);

router.post('/translate/text',
  strictLimiter,
  securityFilterMiddleware,
  translationController.translateText
);

router.post('/translate/preview',
  strictLimiter,
  securityFilterMiddleware,
  translationController.previewVoice
);

router.get('/tasks', apiLimiter, taskController.getTasks);
router.get('/tasks/status', apiLimiter, taskController.getQueueStatus);
router.get('/tasks/:id', apiLimiter, taskController.getTaskById);
router.delete('/tasks/:id', apiLimiter, taskController.cancelTask);
router.delete('/tasks/:id/delete', apiLimiter, taskController.deleteTask);
router.post('/tasks/:id/retry', apiLimiter, taskController.retryTask);
router.put('/tasks/:id/priority', apiLimiter, taskController.updatePriority);

router.get('/audio/:taskId/:segmentId?', apiLimiter, translationController.getAudio);
router.delete('/cache/:taskId', apiLimiter, translationController.clearCache);

export default router;

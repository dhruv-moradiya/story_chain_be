import { ApiError } from './utils/apiResponse';
import { logger } from './utils/logger';

class BaseModule {
  protected logger = logger;

  async initialize() {
    // Override in subclasses if needed
  }

  async destroy() {
    // Override in subclasses if needed
  }

  protected logInfo(message: string, data: unknown) {
    this.logger.info(`[ChapterModule] ${message}`, data);
  }

  protected throwValidationError(message: string) {
    throw ApiError.validationError(message);
  }

  protected throwForbiddenError(message: string) {
    throw ApiError.forbidden(message);
  }
}

class BaseHandler extends BaseModule {
  constructor() {
    super();
    this.logInfo('BaseHandler initialized', {});
  }

  someFu() {
    this.logInfo('someFu called', { example: 'data' });
  }
}

const handler = new BaseHandler();
handler.someFu();

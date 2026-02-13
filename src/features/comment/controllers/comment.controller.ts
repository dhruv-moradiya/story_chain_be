import { BaseModule } from '@/utils/baseClass';
import { singleton } from 'tsyringe';

@singleton()
class CommentController extends BaseModule {
  constructor() {
    super();
  }
}

export { CommentController };

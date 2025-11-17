import mongoose from 'mongoose';
import { BaseValidator } from '../../../utils';
import { IChapterCreateInput } from '../chapter.types';
import { CHAPTER_LIMITS } from '../../../constants';

export class InputValidator extends BaseValidator {
  async validate(input: IChapterCreateInput) {
    const { storyId, parentChapterId, content } = input;

    this._validateObjectId(storyId, 'storyId');

    if (parentChapterId) this._validateObjectId(parentChapterId, 'parentChapterId');

    this._validateContent(content);
  }

  _validateObjectId(id: string, fieldName: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      this.throwValidationError(`${fieldName} is not a valid ObjectId`);
    }
  }

  _validateContent(content: string) {
    if (!content || typeof content !== 'string') {
      this.throwValidationError('Content is required');
    }

    const trimmed = content.trim();
    const { MIN_LENGTH, MAX_LENGTH } = CHAPTER_LIMITS.CONTENT;

    if (trimmed.length < MIN_LENGTH) {
      this.throwValidationError(`Content must be at least ${MIN_LENGTH} characters long.`);
    }

    if (trimmed.length > MAX_LENGTH) {
      this.throwValidationError(`Content must not exceed ${MAX_LENGTH} characters.`);
    }
  }
}

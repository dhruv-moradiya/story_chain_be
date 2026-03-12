import { TSubmitPRReviewSchema } from '@/schema/request/pr-review.schema';

interface ISubmitPRReviewDTO extends TSubmitPRReviewSchema {
  userId: string;
  pullRequestId: string;
}

interface IGetPRReviewsDTO {
  userId: string;
  pullRequestId: string;
}

export type { IGetPRReviewsDTO, ISubmitPRReviewDTO };

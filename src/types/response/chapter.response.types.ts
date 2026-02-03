export interface IChapterWithStoryResponse {
  _id: string;
  title: string;
  status: string;
  pullRequest: {
    isPR: boolean;
    prId?: string;
    status?: string;
    submittedAt?: Date;
    reviewedBy?: string;
    reviewedAt?: Date;
    rejectionReason?: string;
  };
  stats: {
    reads: number;
    comments: number;
    childBranches: number;
  };
  createdAt: Date;
  updatedAt: Date;
  storySlug: string;
  storyTitle: string;
  author: {
    clerkId: string;
    username: string;
    firstName: string;
    lastName: string;
    imageUrl?: string;
  };
}

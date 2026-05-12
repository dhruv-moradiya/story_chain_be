import { IPagination, IUserBasic } from '@/types';

export interface IPullRequestListItem {
  _id: string;
  title: string;
  description: string;
  prType: 'new_branch' | string;
  content: PRContent;
  status: 'open' | 'closed' | string;
  votes: PRVotes;
  commentCount: number;
  autoApprove: AutoApprove;
  labels: string[];
  isDraft: boolean;
  approvalsStatus: ApprovalsStatus;
  stats: PRStats;
  author: IUserBasic;
  story: Story;
  chapter: Chapter;
  approvers: IUserBasic[];
  blockers: IUserBasic[];
  createdAt: string;
  updatedAt: string;
}

export interface PRContent {
  proposed: string;
  wordCount: number;
  readingMinutes: number;
}

export interface PRVotes {
  upvotes: number;
  downvotes: number;
  score: number;
}

export interface AutoApprove {
  enabled: boolean;
  threshold: number;
  timeWindow: number;
}

export interface ApprovalsStatus {
  required: number;
  received: number;
  pending: number;
  approvers: string[];
  blockers: string[];
  canMerge: boolean;
}

export interface PRStats {
  views: number;
  discussions: number;
  reviewsReceived: number;
}

export interface Story {
  title: string;
  slug: string;
}

export interface Chapter {
  title: string;
  slug: string;
  parentChapter: ParentChapter;
}

export interface ParentChapter {
  title: string;
  slug: string;
}

export interface IPullRequestListResponse extends IPagination {
  docs: IPullRequestListItem[];
}

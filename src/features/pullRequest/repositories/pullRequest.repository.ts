import { IPullRequest, IPullRequestDoc } from '../types/pullRequest.types';
import { PullRequest } from '@models/pullRequest.model';
import { BaseRepository } from '@utils/baseClass';

export class PullRequestRepository extends BaseRepository<IPullRequest, IPullRequestDoc> {
  constructor() {
    super(PullRequest);
  }
}

import { QueryOptions, UpdateQuery } from 'mongoose';

import { BaseRepository } from '../../../utils';
import { IPullRequest, IPullRequestDoc } from '../pullRequest.types';
import { PullRequest } from '../../../models/pullRequest.model';

export class PullRequestRepository extends BaseRepository<IPullRequest, IPullRequestDoc> {
  constructor() {
    super(PullRequest);
  }
}

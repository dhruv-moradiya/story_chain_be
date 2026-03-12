interface ICastPRVoteDTO {
  userId: string;
  pullRequestId: string;
  vote: 1 | -1;
}

interface IRemovePRVoteDTO {
  userId: string;
  pullRequestId: string;
}

interface IGetPRVoteDTO {
  userId: string;
  pullRequestId: string;
}

export type { ICastPRVoteDTO, IGetPRVoteDTO, IRemovePRVoteDTO };

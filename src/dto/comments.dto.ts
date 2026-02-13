interface IAddCommentDTO {
  userId: string;
  chapterSlug: string;
  content: string;
  parentCommentId?: string;
}

interface IUpdateCommentDTO {
  commentId: string;
  content: string;
}

interface IDeleteCommentDTO {
  commentId: string;
}

interface IGetCommentDTO {
  commentId: string;
}

interface IGetCommentsDTO {
  chapterSlug: string;
  limit?: number;
  cursor?: string;
  parentCommentId?: string;
}

export type {
  IAddCommentDTO,
  IUpdateCommentDTO,
  IDeleteCommentDTO,
  IGetCommentDTO,
  IGetCommentsDTO,
};

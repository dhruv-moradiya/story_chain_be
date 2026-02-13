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
}

export type {
  IAddCommentDTO,
  IUpdateCommentDTO,
  IDeleteCommentDTO,
  IGetCommentDTO,
  IGetCommentsDTO,
};

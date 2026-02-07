import { IRecordHeartBeatDTO } from '@/dto/readingHistory.dto';
import { IReadingHistoryResponse } from '@/types/response/readingHistory.types';

interface IReadingHistoryService {
  upsert(input: IRecordHeartBeatDTO): Promise<IReadingHistoryResponse>;
}

export type { IReadingHistoryService };

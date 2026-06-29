import { TOKENS } from '@/container';
import { IChapterUnlockDTO } from '@/dto/chapter.dto';
import { BaseModule } from '@/utils/baseClass';
import { inject, singleton } from 'tsyringe';
import { ChapterRepository } from '../repositories/chapter.repository';
import { ChapterStatus } from '../types/chapter-enum';
import { ChapterUnlockRepository } from '@/features/chapterUnlock/respositories/chapterUnlock.repository';
import { withTransaction } from '@/utils/withTransaction';
import { WalletRepository } from '@/features/wallet/repositories/wallet.repository';
import { CoinTransactionRepository } from '@/features/coinTransaction/repositories/coinTransaction.repository';
import { CoinTxDirection, CoinTxType } from '@/features/coinTransaction/types/coinTransaction-enum';
import { StoryEarningsPool } from '@/models/storyEarningsPool.model';
import { PlatformCoinConfig } from '@/models/platformCoinConfig.model';
import { ApiError } from '@/utils/apiResponse';
import { PLATFORM_SYSTEM_USER_ID } from '@/features/platformCoinConfig/types/platformCoinConfig-enum';

@singleton()
export class ChapterUnlockService extends BaseModule {
  constructor(
    @inject(TOKENS.ChapterRepository)
    private readonly chapterRepo: ChapterRepository,
    @inject(TOKENS.ChapterUnlockRepository)
    private readonly chapterUnlockRepo: ChapterUnlockRepository,
    @inject(TOKENS.WalletRepository)
    private readonly walletRepo: WalletRepository,
    @inject(TOKENS.CoinTransactionRepository)
    private readonly coinTxRepo: CoinTransactionRepository
  ) {
    super();
  }

  async unlock(input: IChapterUnlockDTO) {
    const { userId, slug: chapterSlug } = input;

    // 1. Chapter must exist
    const chapter = await this.chapterRepo.findBySlug(chapterSlug);
    if (!chapter) throw this.throwNotFoundError('Chapter not found');

    // 2. Chapter must be published
    if (chapter.status !== ChapterStatus.PUBLISHED)
      throw this.throwForbiddenError(
        'CHAPTER_NOT_PUBLISHED',
        'Only published chapters can be unlocked'
      );

    // 3. Chapter must be paid
    if (chapter.coinPrice <= 0)
      throw this.throwBadRequest(
        'CHAPTER_IS_FREE',
        'This chapter is free and does not need to be unlocked'
      );

    // 4. Chapter must not be flagged/moderated
    if (chapter.isFlagged)
      throw this.throwForbiddenError('FORBIDDEN', 'This chapter is currently unavailable');

    // 5. Author reads their own chapter free
    if (chapter.authorId === userId)
      throw this.throwBadRequest(
        'AUTHOR_READS_FREE',
        'Authors can read their own chapters for free'
      );

    // 6. Prevent duplicate unlocks (checked before transaction)
    const alreadyUnlocked = await this.chapterUnlockRepo.findOne({
      filter: { userId, chapterSlug },
    });

    if (alreadyUnlocked)
      throw this.throwConflictError('ALREADY_UNLOCKED', 'You have already unlocked this chapter');

    // 7. Insufficient balance check
    const wallet = await this.walletRepo.findOne({ filter: { userId } });
    const currentBalance = wallet?.balance ?? 0;

    if (currentBalance < chapter.coinPrice)
      throw ApiError.badRequest(
        'INSUFFICIENT_COINS',
        `Insufficient coins. You need ${chapter.coinPrice} coins but have ${currentBalance}`
      );

    // Fetch live platform config
    const platformConfig = await PlatformCoinConfig.findOne({}).lean();
    const platformFeePercent = platformConfig?.earningDistribution?.platformFeePercent ?? 20;

    // Atomic transaction
    const result = await withTransaction(
      `chapterUnlock:userId=${userId},chapter=${chapterSlug}`,
      async (session) => {
        const { coinPrice, storySlug, authorId: storyOwnerId } = chapter;

        // 8. Debit reader wallet atomically
        const updatedWallet = await this.walletRepo.debitCoins(userId, coinPrice, { session });
        if (!updatedWallet) {
          // Race condition: concurrent request beat us; balance hit 0 after our pre-flight check.
          throw ApiError.badRequest('INSUFFICIENT_COINS', 'Insufficient coins. Please try again.');
        }

        const readerBalanceAfter = updatedWallet.balance;
        const readerBalanceBefore = readerBalanceAfter + coinPrice; // pre-debit snapshot

        // 9. Insert debit ledger entry (chapter_unlock, direction: debit)
        const debitTx = await this.coinTxRepo.appendLedgerEntry(
          {
            userId,
            type: CoinTxType.CHAPTER_UNLOCK,
            direction: CoinTxDirection.DEBIT,
            amount: coinPrice,
            balanceBefore: readerBalanceBefore,
            balanceAfter: readerBalanceAfter,
            chapterSlug,
            storySlug,
            note: `Unlocked chapter "${chapterSlug}" for ${coinPrice} coins`,
          },
          { session }
        );

        // 10. Insert ChapterUnlock record
        await this.chapterUnlockRepo.create({
          data: {
            userId,
            chapterSlug,
            storySlug,
            coinsPaid: coinPrice,
            transactionId: debitTx._id,
            unlockedAt: new Date(),
          },
          options: { session },
        });

        // 11. Platform fee calculation
        const platformFee = Math.floor(coinPrice * (platformFeePercent / 100));
        const poolCredit = coinPrice - platformFee;

        // 12. Credit StoryEarningsPool
        await StoryEarningsPool.findOneAndUpdate(
          { storySlug },
          {
            $inc: { balance: poolCredit, totalReceived: poolCredit },
            $setOnInsert: { storySlug, storyOwnerId },
          },
          { new: true, upsert: true, session }
        );

        // 13. story_pool_credit accounting entry
        await this.coinTxRepo.appendLedgerEntry(
          {
            userId: storyOwnerId,
            type: CoinTxType.STORY_POOL_CREDIT,
            direction: CoinTxDirection.CREDIT,
            amount: poolCredit,
            balanceBefore: 0, // pool is not a personal wallet — no real balance snapshot needed
            balanceAfter: 0,
            chapterSlug,
            storySlug,
            note: `Story pool credit from chapter unlock "${chapterSlug}"`,
          },
          { session }
        );

        // 14. platform_fee accounting entry
        if (platformFee > 0) {
          await this.coinTxRepo.appendLedgerEntry(
            {
              userId: PLATFORM_SYSTEM_USER_ID,
              type: CoinTxType.PLATFORM_FEE,
              direction: CoinTxDirection.CREDIT,
              amount: platformFee,
              balanceBefore: 0, // sentinel - platform has no real wallet
              balanceAfter: 0,
              chapterSlug,
              storySlug,
              note: `Platform fee (${platformFeePercent}%) from chapter unlock "${chapterSlug}"`,
            },
            { session }
          );
        }

        return {
          chapterSlug,
          coinsPaid: coinPrice,
          unlockedAt: new Date(),
          walletBalance: readerBalanceAfter,
        };
      }
    );

    this.logInfo(
      `[ChapterUnlock] userId=${userId}, chapterSlug=${chapterSlug}, coinsSpent=${result.coinsPaid}, walletBalance=${result.walletBalance}`
    );

    return result;
  }
}

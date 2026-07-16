import { TOKENS } from '@/container';
import { IDistributeCoinsDTO, IGetStoryEarningsPoolDTO } from '@/dto/storyEarningsPool.dto';
import { CollaboratorQueryService } from '@/features/storyCollaborator/services';
import { BaseModule } from '@/utils/baseClass';
import { inject, singleton } from 'tsyringe';
import { StoryEarningsPoolRepository } from '../repositories/storyEarningsPool.repository';
import { withTransaction } from '@/utils/withTransaction';
import { WalletRepository } from '@/features/wallet/repositories/wallet.repository';
import { CoinTransactionRepository } from '@/features/coinTransaction/repositories/coinTransaction.repository';
import { CoinTxDirection, CoinTxType } from '@/features/coinTransaction/types/coinTransaction-enum';
import { ApiError } from '@/utils/apiResponse';

@singleton()
export class StoryEarningsPoolService extends BaseModule {
  constructor(
    @inject(TOKENS.CollaboratorQueryService)
    private readonly collaboratorQueryService: CollaboratorQueryService,
    @inject(TOKENS.StoryEarningsPoolRepository)
    private readonly storyEarningsPoolRepo: StoryEarningsPoolRepository,
    @inject(TOKENS.WalletRepository)
    private readonly walletRepo: WalletRepository,
    @inject(TOKENS.CoinTransactionRepository)
    private readonly coinTxRepo: CoinTransactionRepository
  ) {
    super();
  }

  async getStoryEarningsPool(input: IGetStoryEarningsPoolDTO) {
    const { userId, slug } = input;

    // 1. User should be story's owner
    const isOwner = this.collaboratorQueryService.ensureOwner(slug, userId);

    if (!isOwner) {
      this.throwForbiddenError('Only the story owner can view earnings pool.');
    }

    // 2. Get story earnings pool
    const storyEarningsPool = await this.storyEarningsPoolRepo.getStoryEarningsPool(slug);

    if (!storyEarningsPool) {
      throw this.throwNotFoundError('No story earnings pool found for story');
    }

    return storyEarningsPool;
  }

  async distributeCoins(input: IDistributeCoinsDTO) {
    const { userId, slug, distributions } = input;

    // 1. User should be story's owner
    const isOwner = this.collaboratorQueryService.ensureOwner(slug, userId);

    if (!isOwner) {
      this.throwForbiddenError('Only the story owner can distribute coins.');
    }

    // 2. All the collaborator from payload should be story's collaborator
    const collaboratorIds = distributions.map((dis) => dis.collaboratorId);
    const storyCollaborators = await this.collaboratorQueryService.getCollaboratorsByStorySlug({
      slug,
    });

    const collaboratorIdsFound = storyCollaborators.filter((col) =>
      collaboratorIds.includes(col.user.clerkId)
    );

    if (collaboratorIdsFound.length !== collaboratorIds.length) {
      this.throwBadRequest('Some collaborators are not part of the story');
    }

    // 3. Total coins should not be greater than story's total earnings pool
    const storyEarningsPool = await this.storyEarningsPoolRepo.getStoryEarningsPool(slug);

    if (!storyEarningsPool) {
      throw this.throwNotFoundError('No story earnings pool found for story');
    }

    const totalCoinsToDistribute = distributions.reduce((prev, current) => prev + current.coin, 0);
    if (storyEarningsPool.balance < totalCoinsToDistribute) {
      throw this.throwBadRequest(
        'Total coins to distribute are greater than the available balance'
      );
    }

    // 4. Credit coins to story-collaborator wallet & create new earnings pool transactions
    return withTransaction('Distribution story earning coins', async (session) => {
      // Process each collaborator distribution in sequence to maintain correct balance snapshots
      for (const distribution of distributions) {
        const { collaboratorId, coin } = distribution;

        // Credit the collaborator's wallet
        const updatedWallet = await this.walletRepo.creditCoins(collaboratorId, coin, { session });

        if (!updatedWallet) {
          throw ApiError.internalError(
            'WALLET_UPDATE_FAILED',
            `Failed to update wallet for collaborator ${collaboratorId}`
          );
        }

        const balanceAfter = updatedWallet.balance;
        const balanceBefore = balanceAfter - coin;

        // Append an immutable ledger entry for this collaborator's payout
        await this.coinTxRepo.appendLedgerEntry(
          {
            userId: collaboratorId,
            type: CoinTxType.EARNINGS_DISTRIBUTION,
            direction: CoinTxDirection.CREDIT,
            amount: coin,
            balanceBefore,
            balanceAfter,
            storySlug: slug,
            note: `Story earnings distribution - ${coin} coins from story "${slug}"`,
          },
          { session }
        );
      }

      // Debit the story earnings pool by the total distributed amount
      await this.storyEarningsPoolRepo.debitBalance(slug, totalCoinsToDistribute, { session });

      this.logInfo(
        `Distributed ${totalCoinsToDistribute} coins from story "${slug}" earnings pool to ${distributions.length} collaborator(s)`
      );

      return { distributed: totalCoinsToDistribute, recipients: distributions.length };
    });
  }
}

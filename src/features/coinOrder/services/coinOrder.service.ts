import { TOKENS } from '@/container';
import { BaseModule } from '@/utils/baseClass';
import { inject, singleton } from 'tsyringe';
import { CoinOrderRepository } from '../repositories/coinOrder.repository';
import { WalletRepository } from '@/features/wallet/repositories/wallet.repository';
import { CoinTransactionRepository } from '@/features/coinTransaction/repositories/coinTransaction.repository';
import { RazorpayService } from '@infrastructure/payment/razorpay.service';
import { ICoinOrderCreateRequestDTO, ICoinOrderVerifyRequestDTO } from '@/dto/coinOrder.dto';
import { trySafe } from '@/utils/trySafe';
import { CoinBundleService } from '@/features/coinBundle/services/coinBundle.service';
import { ApiError } from '@/utils/apiResponse';
import { CoinOrderStatus } from '../types/coinOrder-enum';
import { CoinTxDirection, CoinTxType } from '@/features/coinTransaction/types/coinTransaction-enum';
import { withTransaction } from '@/utils/withTransaction';

@singleton()
export class CoinOrderService extends BaseModule {
  constructor(
    @inject(TOKENS.CoinOrderRepository) private readonly coinOrderRepo: CoinOrderRepository,
    @inject(TOKENS.WalletRepository) private readonly walletRepo: WalletRepository,
    @inject(TOKENS.CoinTransactionRepository)
    private readonly coinTxRepo: CoinTransactionRepository,
    @inject(TOKENS.CoinBundleService) private readonly coinBundleService: CoinBundleService,
    @inject(TOKENS.RazorpayService) private readonly razorpayService: RazorpayService
  ) {
    super();
  }

  async createOrder(input: ICoinOrderCreateRequestDTO) {
    // Fetch the bundle - validates existence & active state in one DB call
    const bundle = await this.coinBundleService.getActiveBundle(input.bundleSlug);

    // Determine price based on requested currency (stored in paise / cents)
    const originalAmount = input.currency === 'INR' ? bundle.inrPrice : bundle.usdPrice;

    // TODO: apply coupon discount when coupon feature is wired
    const discountAmount = 0;
    const finalAmount = originalAmount - discountAmount;

    // Create Razorpay order - wrap SDK errors as a 502 Bad Gateway
    const [rzpOrder, rzpError] = await trySafe(async () => {
      return this.razorpayService.client.orders.create({
        amount: finalAmount,
        currency: input.currency,
        notes: {
          userId: input.userId,
          bundleSlug: input.bundleSlug,
        },
      });
    });

    if (rzpError) {
      this.logError(`Razorpay order creation failed: ${rzpError.message}`);
      throw ApiError.badGateway(
        'EXTERNAL_SERVICE_ERROR',
        'Payment gateway error. Please try again later.'
      );
    }

    // Persist the order record with status = "pending"
    const coinOrder = await this.coinOrderRepo.create({
      data: {
        userId: input.userId,
        bundleSlug: input.bundleSlug,

        // Snapshot the coins from the bundle at purchase time
        baseCoins: bundle.baseCoins,
        bonusCoins: bundle.bonusCoins,
        totalCoins: bundle.totalCoins,

        // Pricing
        currency: input.currency,
        originalAmount,
        discountAmount,
        finalAmount,

        // Razorpay reference
        razorpayOrderId: rzpOrder.id,

        // Status starts as pending until payment is verified
        status: 'pending',
      },
    });

    this.logInfo(`CoinOrder created: ${coinOrder._id} | Razorpay: ${rzpOrder.id}`);

    return {
      coinOrderId: coinOrder._id,
      razorpayOrderId: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      bundle: {
        slug: bundle.slug,
        name: bundle.name,
        totalCoins: bundle.totalCoins,
        baseCoins: bundle.baseCoins,
        bonusCoins: bundle.bonusCoins,
      },
    };
  }

  async verifyPayment(input: ICoinOrderVerifyRequestDTO) {
    const { coinOrderId, razorpayOrderId, razorpayPaymentId, razorpaySignature, userId } = input;

    // Fetch order by id for user
    const order = await this.coinOrderRepo.findOne({
      filter: { _id: coinOrderId, userId },
    });

    if (!order) {
      this.logger.warn(`CoinOrder not found: ${coinOrderId}`);
      throw ApiError.notFound('ORDER_NOT_FOUND', 'Order not found');
    }

    // Check if order is already paid
    if (order.status === CoinOrderStatus.PAID) {
      this.logInfo(`CoinOrder already paid (idempotent): ${coinOrderId}`);
      const wallet = await this.walletRepo.findOne({ filter: { userId } });
      return { alreadyPaid: true, balance: wallet?.balance ?? 0 };
    }

    if (order.status === CoinOrderStatus.FAILED) {
      throw ApiError.badRequest(
        'ORDER_FAILED',
        'This order has already failed and cannot be retried'
      );
    }

    // Verify payment signature HMAC-SHA256
    const isValid = this.razorpayService.verifyPaymentSignature({
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    });

    if (!isValid) {
      this.logger.warn(`Invalid Razorpay signature for order: ${coinOrderId}`);
      throw ApiError.badRequest('INVALID_SIGNATURE', 'Payment signature verification failed');
    }

    // DB transaction
    const result = await withTransaction(
      `verifyPayment:coinOrder=${coinOrderId}`,
      async (session) => {
        // Mark order as paid
        await this.coinOrderRepo.markAsPaid(
          coinOrderId,
          { razorpayPaymentId, razorpaySignature },
          { session }
        );

        // Credit coins to wallet (upserts if wallet doesn't exist yet)
        const updatedWallet = await this.walletRepo.creditCoins(userId, order.totalCoins, {
          session,
        });

        if (!updatedWallet) {
          throw ApiError.internalError('WALLET_UPDATE_FAILED', 'Failed to update wallet');
        }

        const balanceAfter = updatedWallet.balance;
        const balanceBefore = balanceAfter - order.totalCoins;

        // Append immutable ledger entry (never update/delete - insert only)
        await this.coinTxRepo.appendLedgerEntry(
          {
            userId,
            type: CoinTxType.PURCHASE,
            amount: order.totalCoins,
            direction: CoinTxDirection.CREDIT,
            balanceBefore,
            balanceAfter,
            coinOrderId: order._id,
            note: `Purchased coin bundle - ${order.totalCoins} coins`,
          },
          { session }
        );

        return { balance: balanceAfter };
      }
    );

    this.logInfo(
      `Payment verified for CoinOrder ${coinOrderId} | +${order.totalCoins} coins | new balance: ${result.balance}`
    );

    // Return updated wallet balance
    return {
      alreadyPaid: false,
      balance: result.balance,
      coinsAdded: order.totalCoins,
    };
  }
}

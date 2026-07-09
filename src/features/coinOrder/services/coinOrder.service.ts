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

    // Check if order id matches with razorpay order id
    if (order.razorpayOrderId !== razorpayOrderId) {
      throw ApiError.badRequest('ORDER_MISMATCH', 'Payment details do not match the order');
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

    // Fix #5: Guard REFUNDED status — never credit coins for a refunded order
    if (order.status === CoinOrderStatus.REFUNDED) {
      throw ApiError.badRequest(
        'ORDER_REFUNDED',
        'This order has been refunded and cannot be verified'
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

  async verifyRazorpayWebHook(input: {
    rawBody: Buffer;
    signature: string;
  }): Promise<{ received: true }> {
    const { rawBody, signature } = input;

    // Fix #3a: Reject oversized payloads before any processing
    const MAX_WEBHOOK_BODY_BYTES = 1_048_576; // 1 MB
    if (rawBody.length > MAX_WEBHOOK_BODY_BYTES) {
      this.logger.warn(`[Webhook] Payload too large: ${rawBody.length} bytes — rejected`);
      throw ApiError.badRequest(
        'PAYLOAD_TOO_LARGE',
        'Webhook payload exceeds the allowed size limit'
      );
    }

    // 1. Verify Razorpay webhook signature
    const isValid = this.razorpayService.verifyWebhookSignature(rawBody, signature);

    if (!isValid) {
      this.logger.warn('[Webhook] Invalid Razorpay webhook signature — rejected');
      throw ApiError.unauthorized('INVALID_SIGNATURE', 'Webhook signature verification failed');
    }

    // Fix #3b: Validate payload structure before touching the DB
    const event = JSON.parse(rawBody.toString('utf8'));
    const eventType: string | undefined = event?.event;

    if (!eventType) {
      this.logger.warn('[Webhook] Malformed payload — missing event field, ignoring');
      return { received: true };
    }

    this.logInfo(`[Webhook] Received event: ${eventType}`);

    // 2. Dispatch by event type
    switch (eventType) {
      case 'payment.captured': {
        // Fix #3c: Guard against missing nested payment entity
        const payment = event.payload?.payment?.entity;
        if (!payment?.order_id || !payment?.id) {
          this.logger.warn('[Webhook] payment.captured event missing payment entity — skipping');
          break;
        }
        const razorpayOrderId: string = payment.order_id;
        const razorpayPaymentId: string = payment.id;

        // Find the CoinOrder linked to this Razorpay order
        const order = await this.coinOrderRepo.findByRazorpayOrderId(razorpayOrderId);

        if (!order) {
          // Unknown order — could be from a different product; safe to ignore
          this.logger.warn(`[Webhook] Unknown razorpayOrderId: ${razorpayOrderId} — skipping`);
          break;
        }

        if (order.status === CoinOrderStatus.PAID) {
          // Already credited by verify-payment (or a previous webhook delivery)
          this.logInfo(`[Webhook] Order ${order._id} already paid — idempotent skip`);
          break;
        }

        // Race-condition safe credit
        // markAsPaid uses { status: 'pending' } as an atomic filter.
        // If verify-payment already ran concurrently, markAsPaid returns null
        // and we skip — no double credit ever happens.
        await withTransaction(`webhook:coinOrder=${order._id}`, async (session) => {
          const updated = await this.coinOrderRepo.markAsPaid(
            order._id,
            { razorpayPaymentId },
            { session }
          );

          if (!updated) {
            // verify-payment won the race — nothing to do
            this.logInfo(`[Webhook] Order ${order._id} already transitioned — concurrent skip`);
            return;
          }

          // Credit coins to wallet
          const updatedWallet = await this.walletRepo.creditCoins(order.userId, order.totalCoins, {
            session,
          });

          if (!updatedWallet) {
            throw ApiError.internalError('WALLET_UPDATE_FAILED', 'Failed to update wallet');
          }

          const balanceAfter = updatedWallet.balance;
          const balanceBefore = balanceAfter - order.totalCoins;

          // Append immutable ledger entry
          await this.coinTxRepo.appendLedgerEntry(
            {
              userId: order.userId,
              type: CoinTxType.PURCHASE,
              amount: order.totalCoins,
              direction: CoinTxDirection.CREDIT,
              balanceBefore,
              balanceAfter,
              coinOrderId: order._id,
              note: `[Webhook] Purchased coin bundle - ${order.totalCoins} coins`,
            },
            { session }
          );

          this.logInfo(
            `[Webhook] Credited +${order.totalCoins} coins for order ${order._id} | new balance: ${balanceAfter}`
          );
        });
        break;
      }

      case 'payment.failed': {
        const payment = event.payload?.payment?.entity;
        if (!payment?.order_id) {
          this.logger.warn('[Webhook] payment.failed event missing payment entity — skipping');
          break;
        }
        const razorpayOrderId: string = payment.order_id;
        const rawFailureReason: string =
          payment.error_description ?? payment.error_code ?? 'Unknown failure';

        // Fix #8: Truncate to match the model's maxlength: 300 to avoid Mongoose ValidationError
        const failureReason = String(rawFailureReason).slice(0, 300);

        await this.coinOrderRepo.markAsFailed(razorpayOrderId, failureReason);
        this.logInfo(`[Webhook] Marked order ${razorpayOrderId} as failed: ${failureReason}`);
        break;
      }

      default: {
        // Unhandled event — log and ignore; always return 200 so Razorpay stops retrying
        this.logInfo(`[Webhook] Unhandled event type '${eventType}' — ignored`);
        break;
      }
    }

    return { received: true };
  }
}

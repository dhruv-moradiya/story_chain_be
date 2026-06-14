import { TOKENS } from '@/container';
import { BaseModule } from '@/utils/baseClass';
import { inject, singleton } from 'tsyringe';
import { CoinOrderRepository } from '../repositories/coinOrder.repository';
import { RazorpayService } from '@infrastructure/payment/razorpay.service';
import { ICoinOrderCreateRequestDTO } from '@/dto/coinOrder.dto';
import { trySafe } from '@/utils/trySafe';
import { CoinBundleService } from '@/features/coinBundle/services/coinBundle.service';
import { ApiError } from '@/utils/apiResponse';

@singleton()
export class CoinOrderService extends BaseModule {
  constructor(
    @inject(TOKENS.CoinOrderRepository) private readonly coinOrderRepo: CoinOrderRepository,
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
}

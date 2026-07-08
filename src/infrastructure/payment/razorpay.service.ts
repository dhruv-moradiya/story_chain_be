import Razorpay from 'razorpay';
import { singleton } from 'tsyringe';
import { env } from '@/config/env';
import { BaseModule } from '@/utils/baseClass';
import { createHmac, timingSafeEqual } from 'crypto';

/**
 * RazorpayService — thin wrapper around the Razorpay SDK client.
 *
 * Instantiated once as a singleton and injected via tsyringe DI into
 * any service that needs to interact with the Razorpay API
 * (e.g. CoinOrderService, WebhookService, RefundService).
 *
 * Switches between test and live credentials based on NODE_ENV.
 */
@singleton()
export class RazorpayService extends BaseModule {
  readonly client: Razorpay;
  private readonly keySecret: string;
  private readonly webhookSecret: string;

  constructor() {
    super();

    const isProduction = env.NODE_ENV === 'production';
    const hasLiveKeys = !!env.RAZORPAY_KEY_ID_LIVE && !!env.RAZORPAY_KEY_SECRET_LIVE;

    const keyId = isProduction && hasLiveKeys ? env.RAZORPAY_KEY_ID_LIVE : env.RAZORPAY_KEY_ID_TEST;
    const keySecret =
      isProduction && hasLiveKeys ? env.RAZORPAY_KEY_SECRET_LIVE : env.RAZORPAY_KEY_SECRET_TEST;

    this.client = new Razorpay({ key_id: keyId, key_secret: keySecret });
    this.keySecret = keySecret!;
    this.webhookSecret = env.RAZORPAY_WEBHOOK_SECRET;

    this.logInfo(
      `RazorpayService initialised in ${isProduction && hasLiveKeys ? 'LIVE' : 'TEST'} mode`
    );
  }

  /**
   * Verifies the HMAC-SHA256 payment signature returned by Razorpay.
   *
   * Expected signature = HMAC-SHA256(
   *   key  = RAZORPAY_KEY_SECRET,
   *   data = razorpayOrderId + "|" + razorpayPaymentId
   * )
   *
   * Uses timingSafeEqual to prevent timing-based attacks.
   */
  verifyPaymentSignature(params: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }): boolean {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = params;

    const body = `${razorpayOrderId}|${razorpayPaymentId}`;
    const expectedSignature = createHmac('sha256', this.keySecret).update(body).digest('hex');

    try {
      return timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(razorpaySignature, 'hex')
      );
    } catch {
      // Buffer lengths differ → invalid hex or length mismatch → always false
      return false;
    }
  }

  /**
   * Verifies the HMAC-SHA256 webhook signature from Razorpay.
   *
   * Razorpay signs the RAW request body using RAZORPAY_WEBHOOK_SECRET.
   * ⚠️  Always pass the raw Buffer/string body — never the parsed JSON object.
   */
  verifyWebhookSignature(rawBody: Buffer | string, razorpaySignatureHeader: string): boolean {
    const expectedSignature = createHmac('sha256', this.webhookSecret)
      .update(rawBody)
      .digest('hex');

    try {
      return timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(razorpaySignatureHeader, 'hex')
      );
    } catch {
      return false;
    }
  }
}

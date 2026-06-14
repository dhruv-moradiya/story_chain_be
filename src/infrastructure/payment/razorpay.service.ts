import Razorpay from 'razorpay';
import { singleton } from 'tsyringe';
import { env } from '@/config/env';
import { BaseModule } from '@/utils/baseClass';

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

  constructor() {
    super();

    const isProduction = env.NODE_ENV === 'production';

    const keyId = isProduction ? (env.RAZORPAY_KEY_ID_LIVE ?? '') : env.RAZORPAY_KEY_ID_TEST;

    const keySecret = isProduction
      ? (env.RAZORPAY_KEY_SECRET_LIVE ?? '')
      : env.RAZORPAY_KEY_SECRET_TEST;

    this.client = new Razorpay({ key_id: keyId, key_secret: keySecret });

    this.logInfo(`RazorpayService initialised in ${isProduction ? 'LIVE' : 'TEST'} mode`);
  }
}

import { BasePipelineBuilder } from '@/shared/pipelines/base.pipeline.builder';

export class CoinTransactionPipelineBuilder extends BasePipelineBuilder<CoinTransactionPipelineBuilder> {
  getTransactionList() {
    this.pipeline.push(
      ...[
        // {
        //   $lookup: {
        //     from: 'users',
        //     let: { userId: '$userId' },
        //     pipeline: [
        //       {
        //         $match: {
        //           $expr: {
        //             $eq: ['$clerkId', '$$userId'],
        //           },
        //         },
        //       },
        //       {
        //         $project: USER_WITH_EMAIL_PROJECTION,
        //       },
        //     ],
        //     as: 'user',
        //   },
        // },
        {
          $lookup: {
            from: 'coinorders',
            let: { orderId: '$coinOrderId' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ['$_id', '$$orderId'],
                  },
                },
              },
              {
                $project: {
                  _id: 1,
                  bundleslug: 1,
                  totalCoins: 1,
                  baseCoins: 1,
                  bonusCoins: 1,
                  currency: 1,
                  finalAmount: 1,
                  razorpayOrderId: 1,
                  status: 1,
                },
              },
            ],
            as: 'order',
          },
        },
        {
          $set: {
            order: {
              $ifNull: [{ $arrayElemAt: ['$order', 0] }, null],
            },
          },
        },
      ]
    );
  }
}

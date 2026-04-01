import { inject, singleton } from 'tsyringe';
import { BaseModule } from '@utils/baseClass';
import { TOKENS } from '@container/tokens';
import { PullRequestRules } from '@domain/pullRequest.rules';
import { CollaboratorQueryService } from '@features/storyCollaborator/services/collaborator-query.service';
import { PullRequestRepository } from '../repositories/pullRequest.repository';
import { PRTimelineRepository } from '@features/prTimeline/repositories/prTimeline.repository';
import { IPullRequest } from '../types/pullRequest.types';
import { IUpdatePRMetadataDTO, ITogglePRDraftDTO, IUpdatePRLabelsDTO } from '@dto/pullRequest.dto';
import { withTransaction } from '@utils/withTransaction';
import { PRTimelineAction } from '../types/pullRequest-enum';

@singleton()
export class PRUpdateService extends BaseModule {
  constructor(
    @inject(TOKENS.PullRequestRepository)
    private readonly prRepo: PullRequestRepository,

    @inject(TOKENS.PRTimelineRepository)
    private readonly timelineRepo: PRTimelineRepository,

    @inject(TOKENS.CollaboratorQueryService)
    private readonly collaboratorQueryService: CollaboratorQueryService
  ) {
    super();
  }

  // ─── private helpers ───────────────────────────────────────────────────────

  private async loadPROrThrow(prId: string): Promise<IPullRequest> {
    const pr = await this.prRepo.findById({ id: prId });
    if (!pr) this.throwNotFoundError(`Pull request "${prId}" not found.`);
    return pr;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 1. Update Title / Description
  // ─────────────────────────────────────────────────────────────────────────

  async updateMetadata(input: IUpdatePRMetadataDTO): Promise<IPullRequest> {
    const { prId, userId, title, description } = input;

    if (!title && description === undefined) {
      this.throwBadRequest('Provide at least one field to update (title or description).');
    }

    return withTransaction(`PR-UpdateMetadata-${prId}`, async (session) => {
      const pr = await this.loadPROrThrow(prId);

      const check = PullRequestRules.canUpdateMetadata(pr, userId);
      if (!check.allowed) this.throwForbiddenError(check.reason!);

      const updates: { title?: string; description?: string } = {};
      if (title) updates.title = title.trim();
      if (description !== undefined) updates.description = description.trim();

      const updated = await this.prRepo.updateMetadata(prId, updates, { session });
      if (!updated) this.throwInternalError('Failed to update pull request metadata.');

      await this.timelineRepo.appendEvent(
        {
          pullRequestId: pr._id,
          storySlug: pr.storySlug,
          action: PRTimelineAction.SUBMITTED, // nearest general event in the enum
          performedBy: userId,
          metadata: { updatedFields: Object.keys(updates) },
        },
        { session }
      );

      return updated;
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 2. Toggle Draft Status
  // ─────────────────────────────────────────────────────────────────────────

  async toggleDraft(input: ITogglePRDraftDTO): Promise<IPullRequest> {
    const { prId, userId, isDraft, draftReason } = input;

    return withTransaction(`PR-ToggleDraft-${prId}`, async (session) => {
      const pr = await this.loadPROrThrow(prId);

      const check = PullRequestRules.canToggleDraft(pr, userId);
      if (!check.allowed) this.throwForbiddenError(check.reason!);

      if (pr.isDraft === isDraft) {
        const label = isDraft ? 'draft' : 'ready for review';
        this.throwBadRequest(`Pull request is already marked as ${label}.`);
      }

      const updated = await this.prRepo.setDraftStatus(prId, isDraft, draftReason, { session });
      if (!updated) this.throwInternalError('Failed to update PR draft status.');

      const timelineAction = isDraft
        ? PRTimelineAction.MARKED_DRAFT
        : PRTimelineAction.READY_FOR_REVIEW;
      await this.timelineRepo.appendEvent(
        {
          pullRequestId: pr._id,
          storySlug: pr.storySlug,
          action: timelineAction,
          performedBy: userId,
          metadata: isDraft && draftReason ? { reason: draftReason } : {},
        },
        { session }
      );

      return updated;
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 3. Update Labels
  // ─────────────────────────────────────────────────────────────────────────

  async updateLabels(input: IUpdatePRLabelsDTO): Promise<IPullRequest> {
    const { prId, storySlug, userId, labels } = input;

    const pr = await this.loadPROrThrow(prId);

    if (PullRequestRules.isTerminal(pr)) {
      this.throwForbiddenError('Cannot update labels on a merged pull request.');
    }

    // Labels require moderator+ role
    const userRole = await this.collaboratorQueryService.getCollaboratorRole(userId, storySlug);
    const check = PullRequestRules.canManageLabels(userRole);
    if (!check.allowed) this.throwForbiddenError(check.reason!);

    const updated = await this.prRepo.setLabels(prId, labels);
    if (!updated) this.throwInternalError('Failed to update PR labels.');

    return updated;
  }
}

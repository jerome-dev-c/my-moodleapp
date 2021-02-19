// (C) Copyright 2015 Moodle Pty Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CoreError } from '@classes/errors/error';
import { CoreIonLoadingElement } from '@classes/ion-loading';
import { CoreFileUploaderHelper } from '@features/fileuploader/services/fileuploader-helper';
import { CoreNavigator } from '@services/navigator';
import { CoreSites, CoreSitesReadingStrategy } from '@services/sites';
import { CoreSync } from '@services/sync';
import { CoreDomUtils } from '@services/utils/dom';
import { Translate } from '@singletons';
import { CoreEventActivityDataSentData, CoreEvents } from '@singletons/events';
import {
    AddonModAssignAssign,
    AddonModAssignSubmission,
    AddonModAssignProvider,
    AddonModAssign,
    AddonModAssignSubmissionStatusOptions,
    AddonModAssignGetSubmissionStatusWSResponse,
    AddonModAssignSavePluginData,
    AddonModAssignSubmissionSavedEventData,
    AddonModAssignSubmittedForGradingEventData,
} from '../../services/assign';
import { AddonModAssignHelper } from '../../services/assign-helper';
import { AddonModAssignOffline } from '../../services/assign-offline';
import { AddonModAssignSync } from '../../services/assign-sync';

/**
 * Page that allows adding or editing an assigment submission.
 */
@Component({
    selector: 'page-addon-mod-assign-edit',
    templateUrl: 'edit.html',
})
export class AddonModAssignEditPage implements OnInit, OnDestroy {

    @ViewChild('editSubmissionForm') formElement?: ElementRef;

    title: string; // Title to display.
    assign?: AddonModAssignAssign; // Assignment.
    courseId!: number; // Course ID the assignment belongs to.
    moduleId!: number; // Module ID the submission belongs to.
    userSubmission?: AddonModAssignSubmission; // The user submission.
    allowOffline = false; // Whether offline is allowed.
    submissionStatement?: string; // The submission statement.
    submissionStatementAccepted = false; // Whether submission statement is accepted.
    loaded = false; // Whether data has been loaded.

    protected userId: number; // User doing the submission.
    protected isBlind = false; // Whether blind is used.
    protected editText: string; // "Edit submission" translated text.
    protected saveOffline = false; // Whether to save data in offline.
    protected hasOffline = false; // Whether the assignment has offline data.
    protected isDestroyed = false; // Whether the component has been destroyed.
    protected forceLeave = false; // To allow leaving the page without checking for changes.

    constructor(
        protected route: ActivatedRoute,
    ) {
        this.userId = CoreSites.instance.getCurrentSiteUserId(); // Right now we can only edit current user's submissions.
        this.editText = Translate.instance.instant('addon.mod_assign.editsubmission');
        this.title = this.editText;
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        this.moduleId = CoreNavigator.instance.getRouteNumberParam('cmId')!;
        this.courseId = CoreNavigator.instance.getRouteNumberParam('courseId')!;
        this.isBlind = !!CoreNavigator.instance.getRouteNumberParam('blindId');

        this.fetchAssignment().finally(() => {
            this.loaded = true;
        });
    }

    /**
     * Check if we can leave the page or not.
     *
     * @return Resolved if we can leave it, rejected if not.
     */
    async ionViewCanLeave(): Promise<void> {
        if (this.forceLeave) {
            return;
        }

        // Check if data has changed.
        const changed = await this.hasDataChanged();
        if (changed) {
            await CoreDomUtils.instance.showConfirm(Translate.instance.instant('core.confirmcanceledit'));
        }

        // Nothing has changed or user confirmed to leave. Clear temporary data from plugins.
        AddonModAssignHelper.instance.clearSubmissionPluginTmpData(this.assign!, this.userSubmission, this.getInputData());

        CoreDomUtils.instance.triggerFormCancelledEvent(this.formElement, CoreSites.instance.getCurrentSiteId());
    }

    /**
     * Fetch assignment data.
     *
     * @return Promise resolved when done.
     */
    protected async fetchAssignment(): Promise<void> {
        const currentUserId = CoreSites.instance.getCurrentSiteUserId();

        try {
            // Get assignment data.
            this.assign = await AddonModAssign.instance.getAssignment(this.courseId, this.moduleId);
            this.title = this.assign.name || this.title;

            if (!this.isDestroyed) {
                // Block the assignment.
                CoreSync.instance.blockOperation(AddonModAssignProvider.COMPONENT, this.assign.id);
            }

            // Wait for sync to be over (if any).
            await AddonModAssignSync.instance.waitForSync(this.assign.id);

            // Get submission status. Ignore cache to get the latest data.
            const options: AddonModAssignSubmissionStatusOptions = {
                userId: this.userId,
                isBlind: this.isBlind,
                cmId: this.assign.cmid,
                filter: false,
                readingStrategy: CoreSitesReadingStrategy.OnlyNetwork,
            };

            let submissionStatus: AddonModAssignGetSubmissionStatusWSResponse;
            try {
                submissionStatus = await AddonModAssign.instance.getSubmissionStatus(this.assign.id, options);
                this.userSubmission =
                    AddonModAssign.instance.getSubmissionObjectFromAttempt(this.assign, submissionStatus.lastattempt);
            } catch (error) {
                // Cannot connect. Get cached data.
                options.filter = true;
                options.readingStrategy = CoreSitesReadingStrategy.PreferCache;

                submissionStatus = await AddonModAssign.instance.getSubmissionStatus(this.assign.id, options);
                this.userSubmission =
                    AddonModAssign.instance.getSubmissionObjectFromAttempt(this.assign, submissionStatus.lastattempt);

                // Check if the user can edit it in offline.
                const canEditOffline =
                    await AddonModAssignHelper.instance.canEditSubmissionOffline(this.assign, this.userSubmission);
                if (!canEditOffline) {
                    // Submission cannot be edited in offline, reject.
                    this.allowOffline = false;
                    throw error;
                }
            }

            if (!submissionStatus.lastattempt?.canedit) {
                // Can't edit. Reject.
                throw new CoreError(Translate.instance.instant('core.nopermissions', { $a: this.editText }));
            }

            this.allowOffline = true; // If offline isn't allowed we shouldn't have reached this point.
            // Only show submission statement if we are editing our own submission.
            if (this.assign.requiresubmissionstatement && !this.assign.submissiondrafts && this.userId == currentUserId) {
                this.submissionStatement = this.assign.submissionstatement;
            } else {
                this.submissionStatement = undefined;
            }

            try {
                // Check if there's any offline data for this submission.
                const offlineData = await AddonModAssignOffline.instance.getSubmission(this.assign.id, this.userId);

                this.hasOffline = offlineData?.plugindata && Object.keys(offlineData.plugindata).length > 0;
            } catch {
                // No offline data found.
                this.hasOffline = false;
            }
        } catch (error) {
            CoreDomUtils.instance.showErrorModalDefault(error, 'Error getting assigment data.');

            // Leave the player.
            this.leaveWithoutCheck();
        }
    }

    /**
     * Get the input data.
     *
     * @return Input data.
     */
    protected getInputData(): Record<string, unknown> {
        return CoreDomUtils.instance.getDataFromForm(document.forms['addon-mod_assign-edit-form']);
    }

    /**
     * Check if data has changed.
     *
     * @return Promise resolved with boolean: whether data has changed.
     */
    protected hasDataChanged(): Promise<boolean> {
        // Usually the hasSubmissionDataChanged call will be resolved inmediately, causing the modal to be shown just an instant.
        // We'll wait a bit before showing it to prevent this "blink".
        let modal: CoreIonLoadingElement;
        let showModal = true;

        setTimeout(async () => {
            if (showModal) {
                modal = await CoreDomUtils.instance.showModalLoading();
            }
        }, 100);

        const data = this.getInputData();

        return AddonModAssignHelper.instance.hasSubmissionDataChanged(this.assign!, this.userSubmission, data).finally(() => {
            if (modal) {
                modal.dismiss();
            } else {
                showModal = false;
            }
        });
    }

    /**
     * Leave the view without checking for changes.
     */
    protected leaveWithoutCheck(): void {
        this.forceLeave = true;
        CoreNavigator.instance.back();
    }

    /**
     * Get data to submit based on the input data.
     *
     * @param inputData The input data.
     * @return Promise resolved with the data to submit.
     */
    protected prepareSubmissionData(inputData: Record<string, unknown>): Promise<AddonModAssignSavePluginData> {
        // If there's offline data, always save it in offline.
        this.saveOffline = this.hasOffline;

        try {
            return AddonModAssignHelper.instance.prepareSubmissionPluginData(
                this.assign!,
                this.userSubmission,
                inputData,
                this.hasOffline,
            );
        } catch (error) {
            if (this.allowOffline && !this.saveOffline) {
                // Cannot submit in online, prepare for offline usage.
                this.saveOffline = true;

                return AddonModAssignHelper.instance.prepareSubmissionPluginData(
                    this.assign!,
                    this.userSubmission,
                    inputData,
                    true,
                );
            }

            throw error;
        }
    }

    /**
     * Save the submission.
     */
    async save(): Promise<void> {
        // Check if data has changed.
        const changed = await this.hasDataChanged();
        if (!changed) {
            // Nothing to save, just go back.
            this.leaveWithoutCheck();

            return;
        }
        try {
            await this.saveSubmission();
            this.leaveWithoutCheck();
        } catch (error) {
            CoreDomUtils.instance.showErrorModalDefault(error, 'Error saving submission.');
        }
    }

    /**
     * Save the submission.
     *
     * @return Promise resolved when done.
     */
    protected async saveSubmission(): Promise<void> {
        const inputData = this.getInputData();

        if (this.submissionStatement && (!inputData.submissionstatement || inputData.submissionstatement === 'false')) {
            throw Translate.instance.instant('addon.mod_assign.acceptsubmissionstatement');
        }

        let modal = await CoreDomUtils.instance.showModalLoading();
        let size = -1;

        // Get size to ask for confirmation.
        try {
            size = await AddonModAssignHelper.instance.getSubmissionSizeForEdit(this.assign!, this.userSubmission!, inputData);
        } catch (error) {
            // Error calculating size, return -1.
            size = -1;
        }

        modal.dismiss();

        try {
            // Confirm action.
            await CoreFileUploaderHelper.instance.confirmUploadFile(size, true, this.allowOffline);

            modal = await CoreDomUtils.instance.showModalLoading('core.sending', true);

            const pluginData = await this.prepareSubmissionData(inputData);
            if (!Object.keys(pluginData).length) {
                // Nothing to save.
                return;
            }

            let sent: boolean;

            if (this.saveOffline) {
                // Save submission in offline.
                sent = false;
                await AddonModAssignOffline.instance.saveSubmission(
                    this.assign!.id,
                    this.courseId,
                    pluginData,
                    this.userSubmission!.timemodified,
                    !this.assign!.submissiondrafts,
                    this.userId,
                );
            } else {
                // Try to send it to server.
                sent = await AddonModAssign.instance.saveSubmission(
                    this.assign!.id,
                    this.courseId,
                    pluginData,
                    this.allowOffline,
                    this.userSubmission!.timemodified,
                    !!this.assign!.submissiondrafts,
                    this.userId,
                );
            }

            // Clear temporary data from plugins.
            AddonModAssignHelper.instance.clearSubmissionPluginTmpData(this.assign!, this.userSubmission, inputData);

            if (sent) {
                CoreEvents.trigger<CoreEventActivityDataSentData>(CoreEvents.ACTIVITY_DATA_SENT, { module: 'assign' });
            }

            // Submission saved, trigger events.
            CoreDomUtils.instance.triggerFormSubmittedEvent(this.formElement, sent, CoreSites.instance.getCurrentSiteId());

            CoreEvents.trigger<AddonModAssignSubmissionSavedEventData>(
                AddonModAssignProvider.SUBMISSION_SAVED_EVENT,
                {
                    assignmentId: this.assign!.id,
                    submissionId: this.userSubmission!.id,
                    userId: this.userId,
                },
                CoreSites.instance.getCurrentSiteId(),
            );

            if (!this.assign!.submissiondrafts) {
                // No drafts allowed, so it was submitted. Trigger event.
                CoreEvents.trigger<AddonModAssignSubmittedForGradingEventData>(
                    AddonModAssignProvider.SUBMITTED_FOR_GRADING_EVENT,
                    {
                        assignmentId: this.assign!.id,
                        submissionId: this.userSubmission!.id,
                        userId: this.userId,
                    },
                    CoreSites.instance.getCurrentSiteId(),
                );
            }
        } finally {
            modal.dismiss();
        }
    }

    /**
     * Component being destroyed.
     */
    ngOnDestroy(): void {
        this.isDestroyed = true;

        // Unblock the assignment.
        if (this.assign) {
            CoreSync.instance.unblockOperation(AddonModAssignProvider.COMPONENT, this.assign.id);
        }
    }

}

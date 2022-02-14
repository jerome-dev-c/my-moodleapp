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

import { CoreConstants } from '@/core/constants';
import { OnInit, OnDestroy, Input, Output, EventEmitter, Component, Optional, Inject } from '@angular/core';
import { CoreAnyError } from '@classes/errors/error';
import { IonRefresher } from '@ionic/angular';
import { CoreApp } from '@services/app';
import { CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';

import { CoreTextErrorObject, CoreTextUtils } from '@services/utils/text';
import { CoreUtils } from '@services/utils/utils';
import { Translate } from '@singletons';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { CoreLogger } from '@singletons/logger';
import { CoreCourseModuleSummaryComponent, CoreCourseModuleSummaryResult } from '../components/module-summary/module-summary';
import { CoreCourseContentsPage } from '../pages/contents/contents';
import { CoreCourse } from '../services/course';
import { CoreCourseHelper, CoreCourseModuleData } from '../services/course-helper';
import { CoreCourseModuleDelegate, CoreCourseModuleMainComponent } from '../services/module-delegate';
import { CoreCourseModulePrefetchDelegate } from '../services/module-prefetch-delegate';

/**
 * Result of a resource download.
 */
export type CoreCourseResourceDownloadResult = {
    failed?: boolean; // Whether the download has failed.
    error?: string | CoreTextErrorObject; // The error in case it failed.
};

/**
 * Template class to easily create CoreCourseModuleMainComponent of resources (or activities without syncing).
 */
@Component({
    template: '',
})
export class CoreCourseModuleMainResourceComponent implements OnInit, OnDestroy, CoreCourseModuleMainComponent {

    @Input() module!: CoreCourseModuleData; // The module of the component.
    @Input() courseId!: number; // Course ID the component belongs to.
    @Output() dataRetrieved = new EventEmitter<unknown>(); // Called to notify changes the index page from the main component.

    loaded = false; // If the component has been loaded.
    component?: string; // Component name.
    componentId?: number; // Component ID.
    hasOffline = false; // Resources don't have any data to sync.

    description?: string; // Module description.
    prefetchStatus?: string;
    downloadTimeReadable?: string; // Last download time in a readable format.
    isDestroyed = false; // Whether the component is destroyed.

    protected fetchContentDefaultError = 'core.course.errorgetmodule'; // Default error to show when loading contents.
    protected isCurrentView = false; // Whether the component is in the current view.
    protected siteId?: string; // Current Site ID.
    protected statusObserver?: CoreEventObserver; // Observer of package status. Only if setStatusListener is called.
    protected currentStatus?: string; // The current status of the module. Only if setStatusListener is called.
    protected completionObserver?: CoreEventObserver;
    protected logger: CoreLogger;
    protected debouncedUpdateModule?: () => void; // Update the module after a certain time.
    protected showCompletion = false; // Whether to show completion inside the activity.
    protected displayDescription = true; // Wether to show Module description on module page, and not on summary or the contrary.
    protected packageStatusObserver?: CoreEventObserver; // Observer of package status.

    constructor(
        @Optional() @Inject('') loggerName: string = 'CoreCourseModuleMainResourceComponent',
        protected courseContentsPage?: CoreCourseContentsPage,
    ) {
        this.logger = CoreLogger.getInstance(loggerName);
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        this.siteId = CoreSites.getCurrentSiteId();
        this.description = this.module.description;
        this.componentId = this.module.id;
        this.courseId = this.courseId || this.module.course;
        this.showCompletion = !!CoreSites.getRequiredCurrentSite().isVersionGreaterEqualThan('3.11');

        if (this.showCompletion) {
            CoreCourseHelper.loadModuleOfflineCompletion(this.courseId, this.module);

            this.completionObserver = CoreEvents.on(CoreEvents.COMPLETION_MODULE_VIEWED, async (data) => {
                if (data && data.cmId == this.module.id) {
                    await CoreCourse.invalidateModule(this.module.id);

                    this.fetchModule();
                }
            });

            this.debouncedUpdateModule = CoreUtils.debounce(() => {
                this.fetchModule();
            }, 10000);
        }

        this.packageStatusObserver = CoreEvents.on(
            CoreEvents.PACKAGE_STATUS_CHANGED,
            (data) => {
                if (data.componentId == module.id && data.component == this.component) {
                    this.getPackageStatus();
                }
            },
            this.siteId,
        );
    }

    /**
     * Refresh the data.
     *
     * @param refresher Refresher.
     * @param done Function to call when done. Never used.
     * @param showErrors If show errors to the user of hide them.
     * @return Promise resolved when done.
     */
    async doRefresh(refresher?: IonRefresher | null, done?: () => void, showErrors: boolean = false): Promise<void> {
        if (!this.loaded || !this.module) {
            // Module can be undefined if course format changes from single activity to weekly/topics.
            return;
        }

        // If it's a single activity course and the refresher is displayed within the component,
        // call doRefresh on the section page to refresh the course data.
        if (this.courseContentsPage && !CoreCourseModuleDelegate.displayRefresherInSingleActivity(this.module.modname)) {
            await CoreUtils.ignoreErrors(this.courseContentsPage.doRefresh());
        }

        await CoreUtils.ignoreErrors(this.refreshContent(true, showErrors));

        refresher?.complete();
    }

    /**
     * Perform the refresh content function.
     *
     * @param sync If the refresh needs syncing.
     * @param showErrors Wether to show errors to the user or hide them.
     * @return Resolved when done.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected async refreshContent(sync: boolean = false, showErrors: boolean = false): Promise<void> {
        if (!this.module) {
            // This can happen if course format changes from single activity to weekly/topics.
            return;
        }

        await CoreUtils.ignoreErrors(Promise.all([
            this.invalidateContent(),
            this.showCompletion ? CoreCourse.invalidateModule(this.module.id) : undefined,
        ]));

        if (this.showCompletion) {
            this.fetchModule();
        }

        await this.loadContent(true);
    }

    /**
     * Perform the invalidate content function.
     *
     * @return Resolved when done.
     */
    protected async invalidateContent(): Promise<void> {
        return;
    }

    /**
     * Download the component contents.
     *
     * @param refresh Whether we're refreshing data.
     * @return Promise resolved when done.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected async fetchContent(refresh?: boolean): Promise<void> {
        return;
    }

    /**
     * Loads the component contents and shows the corresponding error.
     *
     * @param refresh Whether we're refreshing data.
     * @return Promise resolved when done.
     */
    protected async loadContent(refresh?: boolean): Promise<void> {
        if (!this.module) {
            // This can happen if course format changes from single activity to weekly/topics.
            return;
        }

        try {
            await this.fetchContent(refresh);
            await this.getPackageStatus(refresh);
        } catch (error) {
            if (!refresh && !CoreSites.getCurrentSite()?.isOfflineDisabled() && this.isNotFoundError(error)) {
                // Module not found, retry without using cache.
                return await this.refreshContent();
            }

            CoreDomUtils.showErrorModalDefault(error, this.fetchContentDefaultError, true);
        } finally {
            this.loaded = true;
        }
    }

    /**
     * Check if an error is a "module not found" error.
     *
     * @param error Error.
     * @return Whether the error is a "module not found" error.
     */
    protected isNotFoundError(error: CoreAnyError): boolean {
        return CoreTextUtils.getErrorMessageFromError(error) === Translate.instant('core.course.modulenotfound');
    }

    /**
     * Updage package status.
     *
     * @param refresh If prefetch info has to be refreshed.
     */
    async getPackageStatus(refresh = false): Promise<void> {
        if (!this.module) {
            return;
        }

        const moduleInfo =
                await CoreCourseHelper.getModulePrefetchInfo(this.module, this.courseId, refresh, this.component);

        this.downloadTimeReadable = CoreTextUtils.ucFirst(moduleInfo.downloadTimeReadable);
        this.prefetchStatus = moduleInfo.status;
    }

    /**
     * Check if the module is prefetched or being prefetched. To make it faster, just use the data calculated by fillContextMenu.
     * This means that you need to call fillContextMenu to make this work.
     */
    protected isPrefetched(): boolean {
        return this.prefetchStatus != CoreConstants.NOT_DOWNLOADABLE && this.prefetchStatus != CoreConstants.NOT_DOWNLOADED;
    }

    /**
     * Get message about an error occurred while downloading files.
     *
     * @param error The specific error.
     * @param multiLine Whether to put each message in a different paragraph or in a single line.
     */
    protected getErrorDownloadingSomeFilesMessage(error: string | CoreTextErrorObject, multiLine?: boolean): string {
        if (multiLine) {
            return CoreTextUtils.buildSeveralParagraphsMessage([
                Translate.instant('core.errordownloadingsomefiles'),
                error,
            ]);
        } else {
            error = CoreTextUtils.getErrorMessageFromError(error) || '';

            return Translate.instant('core.errordownloadingsomefiles') + (error ? ' ' + error : '');
        }
    }

    /**
     * Show an error occurred while downloading files.
     *
     * @param error The specific error.
     */
    protected showErrorDownloadingSomeFiles(error: string | CoreTextErrorObject): void {
        CoreDomUtils.showErrorModal(this.getErrorDownloadingSomeFilesMessage(error, true));
    }

    /**
     * Displays some data based on the current status.
     *
     * @param status The current status.
     * @param previousStatus The previous status. If not defined, there is no previous status.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected showStatus(status: string, previousStatus?: string): void {
        // To be overridden.
    }

    /**
     * Watch for changes on the status.
     *
     * @param refresh Whether we're refreshing data.
     * @return Promise resolved when done.
     */
    protected async setStatusListener(refresh?: boolean): Promise<void> {
        if (this.statusObserver === undefined) {
            // Listen for changes on this module status.
            this.statusObserver = CoreEvents.on(CoreEvents.PACKAGE_STATUS_CHANGED, (data) => {
                if (data.componentId != this.module.id || data.component != this.component) {
                    return;
                }

                // The status has changed, update it.
                const previousStatus = this.currentStatus;
                this.currentStatus = data.status;

                this.showStatus(this.currentStatus, previousStatus);
            }, this.siteId);
        } else if (!refresh) {
            return;
        }

        if (refresh) {
            await CoreUtils.ignoreErrors(CoreCourseModulePrefetchDelegate.invalidateCourseUpdates(this.courseId));
        }

        // Also, get the current status.
        const status = await CoreCourseModulePrefetchDelegate.getModuleStatus(this.module, this.courseId, undefined, refresh);

        this.currentStatus = status;
        this.showStatus(status);
    }

    /**
     * Download a resource if needed.
     * If the download call fails the promise won't be rejected, but the error will be included in the returned object.
     * If module.contents cannot be loaded then the Promise will be rejected.
     *
     * @param refresh Whether we're refreshing data.
     * @return Promise resolved when done.
     */
    protected async downloadResourceIfNeeded(
        refresh?: boolean,
        contentsAlreadyLoaded?: boolean,
    ): Promise<CoreCourseResourceDownloadResult> {

        const result: CoreCourseResourceDownloadResult = {
            failed: false,
        };

        // Get module status to determine if it needs to be downloaded.
        await this.setStatusListener(refresh);

        if (this.currentStatus != CoreConstants.DOWNLOADED) {
            // Download content. This function also loads module contents if needed.
            try {
                await CoreCourseModulePrefetchDelegate.downloadModule(this.module, this.courseId);

                // If we reach here it means the download process already loaded the contents, no need to do it again.
                contentsAlreadyLoaded = true;
            } catch (error) {
                // Mark download as failed but go on since the main files could have been downloaded.
                result.failed = true;
                result.error = error;
            }
        }

        if (!this.module.contents?.length || (refresh && !contentsAlreadyLoaded)) {
            // Try to load the contents.
            const ignoreCache = refresh && CoreApp.isOnline();

            try {
                await CoreCourse.loadModuleContents(this.module, undefined, undefined, false, ignoreCache);
            } catch (error) {
                // Error loading contents. If we ignored cache, try to get the cached value.
                if (ignoreCache && !this.module.contents) {
                    await CoreCourse.loadModuleContents(this.module);
                } else if (!this.module.contents) {
                    // Not able to load contents, throw the error.
                    throw error;
                }
            }
        }

        return result;
    }

    /**
     * The completion of the modules has changed.
     *
     * @return Promise resolved when done.
     */
    async onCompletionChange(): Promise<void> {
        // Update the module data after a while.
        this.debouncedUpdateModule?.();
    }

    /**
     * Fetch module.
     *
     * @return Promise resolved when done.
     */
    protected async fetchModule(): Promise<void> {
        const module = await CoreCourse.getModule(this.module.id, this.courseId);

        await CoreCourseHelper.loadModuleOfflineCompletion(this.courseId, module);

        this.module = module;
    }

    /**
     * Opens a module summary page.
     */
    async openModuleSummary(): Promise<void> {
        if (!this.module) {
            return;
        }

        const data = await CoreDomUtils.openSideModal<CoreCourseModuleSummaryResult>({
            component: CoreCourseModuleSummaryComponent,
            componentProps: {
                moduleId: this.module.id,
                module: this.module,
                description: !this.displayDescription ? this.description : '',
                component: this.component,
                courseId: this.courseId,
                hasOffline: this.hasOffline,
            },
        });

        if (data) {
            if (data.action == 'refresh') {
                const modal = await CoreDomUtils.showModalLoading();

                try {
                    await this.doRefresh();
                } finally {
                    modal.dismiss();
                }
            } else if(data.action == 'sync') {
                const modal = await CoreDomUtils.showModalLoading();

                try {
                    await this.doRefresh( undefined, undefined, true);
                } finally {
                    modal.dismiss();
                }
            }

        }
    }

    /**
     * Component being destroyed.
     */
    ngOnDestroy(): void {
        this.isDestroyed = true;
        this.statusObserver?.off();
        this.completionObserver?.off();
        this.packageStatusObserver?.off();
    }

    /**
     * User entered the page that contains the component. This function should be called by the page that contains this component.
     */
    ionViewDidEnter(): void {
        this.isCurrentView = true;
    }

    /**
     * User left the page that contains the component. This function should be called by the page that contains this component.
     */
    ionViewDidLeave(): void {
        this.isCurrentView = false;
    }

    /**
     * User will enter the page that contains the component. This function should be called by the page that contains the component.
     */
    ionViewWillEnter(): void {
        // To be overridden.
    }

    /**
     * User will leave the page that contains the component. This function should be called by the page that contains the component.
     */
    ionViewWillLeave(): void {
        // To be overridden.
    }

}

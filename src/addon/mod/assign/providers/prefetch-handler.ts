// (C) Copyright 2015 Martin Dougiamas
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

import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { CoreAppProvider } from '@providers/app';
import { CoreFilepoolProvider } from '@providers/filepool';
import { CoreGroupsProvider } from '@providers/groups';
import { CoreSitesProvider } from '@providers/sites';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreCourseActivityPrefetchHandlerBase } from '@core/course/classes/activity-prefetch-handler';
import { CoreCourseProvider } from '@core/course/providers/course';
import { CoreCourseHelperProvider } from '@core/course/providers/helper';
import { CoreGradesHelperProvider } from '@core/grades/providers/helper';
import { CoreUserProvider } from '@core/user/providers/user';
import { AddonModAssignProvider } from './assign';
import { AddonModAssignHelperProvider } from './helper';
import { AddonModAssignSyncProvider } from './assign-sync';
import { AddonModAssignFeedbackDelegate } from './feedback-delegate';
import { AddonModAssignSubmissionDelegate } from './submission-delegate';

/**
 * Handler to prefetch assigns.
 */
@Injectable()
export class AddonModAssignPrefetchHandler extends CoreCourseActivityPrefetchHandlerBase {
    name = 'AddonModAssign';
    modName = 'assign';
    component = AddonModAssignProvider.COMPONENT;
    updatesNames = /^configuration$|^.*files$|^submissions$|^grades$|^gradeitems$|^outcomes$|^comments$/;

    constructor(translate: TranslateService, appProvider: CoreAppProvider, utils: CoreUtilsProvider,
            courseProvider: CoreCourseProvider, filepoolProvider: CoreFilepoolProvider, sitesProvider: CoreSitesProvider,
            domUtils: CoreDomUtilsProvider, protected assignProvider: AddonModAssignProvider,
            protected textUtils: CoreTextUtilsProvider, protected feedbackDelegate: AddonModAssignFeedbackDelegate,
            protected submissionDelegate: AddonModAssignSubmissionDelegate, protected courseHelper: CoreCourseHelperProvider,
            protected groupsProvider: CoreGroupsProvider, protected gradesHelper: CoreGradesHelperProvider,
            protected userProvider: CoreUserProvider, protected assignHelper: AddonModAssignHelperProvider,
            protected syncProvider: AddonModAssignSyncProvider) {

        super(translate, appProvider, utils, courseProvider, filepoolProvider, sitesProvider, domUtils);
    }

    /**
     * Check if a certain module can use core_course_check_updates to check if it has updates.
     * If not defined, it will assume all modules can be checked.
     * The modules that return false will always be shown as outdated when they're downloaded.
     *
     * @param {any} module Module.
     * @param {number} courseId Course ID the module belongs to.
     * @return {boolean|Promise<boolean>} Whether the module can use check_updates. The promise should never be rejected.
     */
    canUseCheckUpdates(module: any, courseId: number): boolean | Promise<boolean> {
        // Teachers cannot use the WS because it doesn't check student submissions.
        return this.assignProvider.getAssignment(courseId, module.id).then((assign) => {
            return this.assignProvider.getSubmissions(assign.id).then((data) => {
                if (data.canviewsubmissions) {
                    return false;
                }

                // Check if the user can view their own submission.
                return this.assignProvider.getSubmissionStatus(assign.id).then(() => {
                    return true;
                });
            });
        }).catch(() => {
            return false;
        });
    }

    /**
     * Get list of files. If not defined, we'll assume they're in module.contents.
     *
     * @param {any} module Module.
     * @param {Number} courseId Course ID the module belongs to.
     * @param {boolean} [single] True if we're downloading a single module, false if we're downloading a whole section.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any[]>} Promise resolved with the list of files.
     */
    getFiles(module: any, courseId: number, single?: boolean, siteId?: string): Promise<any[]> {

        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        return this.assignProvider.getAssignment(courseId, module.id, false, siteId).then((assign) => {
            // Get intro files and attachments.
            let files = assign.introattachments || [];
            files = files.concat(this.getIntroFilesFromInstance(module, assign));

            // Now get the files in the submissions.
            return this.assignProvider.getSubmissions(assign.id, false, siteId).then((data) => {
                const blindMarking = assign.blindmarking && !assign.revealidentities;

                if (data.canviewsubmissions) {
                    // Teacher, get all submissions.
                    return this.assignProvider.getSubmissionsUserData(data.submissions, courseId, assign.id, blindMarking,
                            undefined, false, siteId).then((submissions) => {

                        const promises = [];

                        // Get all the files in the submissions.
                        submissions.forEach((submission) => {
                            promises.push(this.getSubmissionFiles(assign, submission.submitid, !!submission.blindid, siteId)
                                    .then((submissionFiles) => {
                                files = files.concat(submissionFiles);
                            }).catch((error) => {
                                if (error && error.errorcode == 'nopermission') {
                                    // The user does not have persmission to view this submission, ignore it.
                                    return Promise.resolve();
                                }

                                return Promise.reject(error);
                            }));
                        });

                        return Promise.all(promises).then(() => {
                            return files;
                        });
                    });
                } else {
                    // Student, get only his/her submissions.
                    const userId = this.sitesProvider.getCurrentSiteUserId();

                    return this.getSubmissionFiles(assign, userId, blindMarking, siteId).then((submissionFiles) => {
                        files = files.concat(submissionFiles);

                        return files;
                    });
                }
            });
        }).catch(() => {
            // Error getting data, return empty list.
            return [];
        });
    }

    /**
     * Get submission files.
     *
     * @param {any} assign Assign.
     * @param {number} submitId User ID of the submission to get.
     * @param {boolean} blindMarking True if blind marking, false otherwise.
     * @param {string} siteId Site ID. If not defined, current site.
     * @return {Promise<any[]>} Promise resolved with array of files.
     */
    protected getSubmissionFiles(assign: any, submitId: number, blindMarking: boolean, siteId?: string)
            : Promise<any[]> {

        return this.assignProvider.getSubmissionStatusWithRetry(assign, submitId, undefined, blindMarking, true, false, siteId)
                .then((response) => {
            const promises = [];

            if (response.lastattempt) {
                const userSubmission = this.assignProvider.getSubmissionObjectFromAttempt(assign, response.lastattempt);
                if (userSubmission && userSubmission.plugins) {
                    // Add submission plugin files.
                    userSubmission.plugins.forEach((plugin) => {
                        promises.push(this.submissionDelegate.getPluginFiles(assign, userSubmission, plugin, siteId));
                    });
                }
            }

            if (response.feedback && response.feedback.plugins) {
                // Add feedback plugin files.
                response.feedback.plugins.forEach((plugin) => {
                    promises.push(this.feedbackDelegate.getPluginFiles(assign, response, plugin, siteId));
                });
            }

            return Promise.all(promises);

        }).then((filesLists) => {
            let files = [];

            filesLists.forEach((filesList) => {
                files = files.concat(filesList);
            });

            return files;
        });
    }

    /**
     * Invalidate the prefetched content.
     *
     * @param {number} moduleId The module ID.
     * @param {number} courseId The course ID the module belongs to.
     * @return {Promise<any>} Promise resolved when the data is invalidated.
     */
    invalidateContent(moduleId: number, courseId: number): Promise<any> {
        return this.assignProvider.invalidateContent(moduleId, courseId);
    }

    /**
     * Invalidate WS calls needed to determine module status.
     *
     * @param  {any}    module   Module.
     * @param  {number} courseId Course ID the module belongs to.
     * @return {Promise<any>} Promise resolved when invalidated.
     */
    invalidateModule(module: any, courseId: number): Promise<any> {
        return this.assignProvider.invalidateAssignmentData(courseId);
    }

    /**
     * Whether or not the handler is enabled on a site level.
     *
     * @return {boolean|Promise<boolean>} A boolean, or a promise resolved with a boolean, indicating if the handler is enabled.
     */
    isEnabled(): boolean | Promise<boolean> {
        return this.assignProvider.isPluginEnabled();
    }

    /**
     * Prefetch a module.
     *
     * @param {any} module Module.
     * @param {number} courseId Course ID the module belongs to.
     * @param {boolean} [single] True if we're downloading a single module, false if we're downloading a whole section.
     * @param {string} [dirPath] Path of the directory where to store all the content files.
     * @return {Promise<any>} Promise resolved when done.
     */
    prefetch(module: any, courseId?: number, single?: boolean, dirPath?: string): Promise<any> {
        return this.prefetchPackage(module, courseId, single, this.prefetchAssign.bind(this));
    }

    /**
     * Prefetch an assignment.
     *
     * @param {any} module Module.
     * @param {number} courseId Course ID the module belongs to.
     * @param {boolean} single True if we're downloading a single module, false if we're downloading a whole section.
     * @param {String} siteId Site ID.
     * @return {Promise<any>} Promise resolved when done.
     */
    protected prefetchAssign(module: any, courseId: number, single: boolean, siteId: string): Promise<any> {
        const userId = this.sitesProvider.getCurrentSiteUserId(),
            promises = [];

        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        // Get assignment to retrieve all its submissions.
        promises.push(this.assignProvider.getAssignment(courseId, module.id, true, siteId).then((assign) => {
            const subPromises = [],
                blindMarking = assign.blindmarking && !assign.revealidentities;

            if (blindMarking) {
                subPromises.push(this.assignProvider.getAssignmentUserMappings(assign.id, undefined, true, siteId).catch(() => {
                    // Ignore errors.
                }));
            }

            subPromises.push(this.prefetchSubmissions(assign, courseId, module.id, userId, siteId));

            subPromises.push(this.courseHelper.getModuleCourseIdByInstance(assign.id, 'assign', siteId));

            // Download intro files and attachments. Do not call getFiles because it'd call some WS twice.
            let files = assign.introattachments || [];
                files = files.concat(this.getIntroFilesFromInstance(module, assign));

            subPromises.push(this.filepoolProvider.addFilesToQueue(siteId, files, this.component, module.id));

            return Promise.all(subPromises);
        }));

        return Promise.all(promises);
    }

    /**
     * Prefetch assign submissions.
     *
     * @param {any} assign Assign.
     * @param {number} courseId Course ID.
     * @param {number} moduleId Module ID.
     * @param {number} userId User ID. If not defined, site's current user.
     * @param {string} siteId Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when prefetched, rejected otherwise.
     */
    protected prefetchSubmissions(assign: any, courseId: number, moduleId: number, userId: number, siteId: string): Promise<any> {
        // Get submissions.
        return this.assignProvider.getSubmissions(assign.id, true, siteId).then((data) => {
            const promises = [],
                blindMarking = assign.blindmarking && !assign.revealidentities;

            if (data.canviewsubmissions) {
                // Teacher. Do not send participants to getSubmissionsUserData to retrieve user profiles.
                promises.push(this.groupsProvider.getActivityGroupInfo(assign.cmid, false, undefined, siteId).then((groupInfo) => {
                    const groupProms = [];
                    if (!groupInfo.groups || groupInfo.groups.length == 0) {
                        groupInfo.groups = [{id: 0}];
                    }

                    groupInfo.groups.forEach((group) => {
                        groupProms.push(this.assignProvider.getSubmissionsUserData(data.submissions, courseId, assign.id,
                                blindMarking, undefined, true, siteId).then((submissions) => {

                            const subPromises = [];

                            submissions.forEach((submission) => {
                                subPromises.push(this.assignProvider.getSubmissionStatusWithRetry(assign, submission.submitid,
                                        group.id, !!submission.blindid, true, true, siteId).then((subm) => {
                                    return this.prefetchSubmission(assign, courseId, moduleId, subm, submission.submitid, siteId);
                                }).catch((error) => {
                                    if (error && error.errorcode == 'nopermission') {
                                        // The user does not have persmission to view this submission, ignore it.
                                        return Promise.resolve();
                                    }

                                    return Promise.reject(error);
                                }));
                            });

                            if (!assign.markingworkflow) {
                                // Get assignment grades only if workflow is not enabled to check grading date.
                                subPromises.push(this.assignProvider.getAssignmentGrades(assign.id, true, siteId));
                            }

                            // Prefetch the submission of the current user even if it does not exist, this will be create it.
                            if (!data.submissions || !data.submissions.find((subm) => subm.submitid == userId)) {
                                subPromises.push(this.assignProvider.getSubmissionStatusWithRetry(assign, userId, group.id,
                                        false, true, true, siteId).then((subm) => {
                                    return this.prefetchSubmission(assign, courseId, moduleId, subm, userId, siteId);
                                }));
                            }

                            return Promise.all(subPromises);
                        }));

                        // Get list participants.
                        groupProms.push(this.assignHelper.getParticipants(assign, group.id, true, siteId).then((participants) => {
                            participants.forEach((participant) => {
                                if (participant.profileimageurl) {
                                    this.filepoolProvider.addToQueueByUrl(siteId, participant.profileimageurl);
                                }
                            });
                        }).catch(() => {
                            // Fail silently (Moodle < 3.2).
                        }));
                    });

                    return Promise.all(groupProms);
                }));
            } else {
                // Student.
                promises.push(
                    this.assignProvider.getSubmissionStatusWithRetry(assign, userId, undefined, false, true, true, siteId)
                            .then((subm) => {
                        return this.prefetchSubmission(assign, courseId, moduleId, subm, userId, siteId);
                    }).catch((error) => {
                        // Ignore if the user can't view their own submission.
                        if (error.errorcode != 'nopermission') {
                            return Promise.reject(error);
                        }
                    })
                );
            }

            promises.push(this.groupsProvider.activityHasGroups(assign.cmid, siteId, true));
            promises.push(this.groupsProvider.getActivityAllowedGroups(assign.cmid, undefined, siteId, true));

            return Promise.all(promises);
        });
    }

    /**
     * Prefetch a submission.
     *
     * @param {any} assign Assign.
     * @param {number} courseId Course ID.
     * @param {number} moduleId Module ID.
     * @param {any} submission Data returned by AddonModAssignProvider.getSubmissionStatus.
     * @param {number} [userId] User ID. If not defined, site's current user.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when prefetched, rejected otherwise.
     */
    protected prefetchSubmission(assign: any, courseId: number, moduleId: number, submission: any, userId?: number,
            siteId?: string): Promise<any> {

        const promises = [],
            blindMarking = assign.blindmarking && !assign.revealidentities;
        let userIds = [];

        if (submission.lastattempt) {
            const userSubmission = this.assignProvider.getSubmissionObjectFromAttempt(assign, submission.lastattempt);

            // Get IDs of the members who need to submit.
            if (!blindMarking && submission.lastattempt.submissiongroupmemberswhoneedtosubmit) {
                userIds = userIds.concat(submission.lastattempt.submissiongroupmemberswhoneedtosubmit);
            }

            if (userSubmission && userSubmission.id) {
                // Prefetch submission plugins data.
                if (userSubmission.plugins) {
                    userSubmission.plugins.forEach((plugin) => {
                        // Prefetch the plugin WS data.
                        promises.push(this.submissionDelegate.prefetch(assign, userSubmission, plugin, siteId));

                        // Prefetch the plugin files.
                        promises.push(this.submissionDelegate.getPluginFiles(assign, userSubmission, plugin, siteId)
                                .then((files) => {
                            return this.filepoolProvider.addFilesToQueue(siteId, files, this.component, module.id);
                        }).catch(() => {
                            // Ignore errors.
                        }));
                    });
                }

                // Get ID of the user who did the submission.
                if (userSubmission.userid) {
                    userIds.push(userSubmission.userid);
                }
            }
        }

        // Prefetch feedback.
        if (submission.feedback) {
            // Get profile and image of the grader.
            if (submission.feedback.grade && submission.feedback.grade.grader > 0) {
                userIds.push(submission.feedback.grade.grader);
            }

            if (userId) {
                promises.push(this.gradesHelper.getGradeModuleItems(courseId, moduleId, userId, undefined, siteId, true));
            }

            // Prefetch feedback plugins data.
            if (submission.feedback.plugins) {
                submission.feedback.plugins.forEach((plugin) => {
                    // Prefetch the plugin WS data.
                    promises.push(this.feedbackDelegate.prefetch(assign, submission, plugin, siteId));

                    // Prefetch the plugin files.
                    promises.push(this.feedbackDelegate.getPluginFiles(assign, submission, plugin, siteId).then((files) => {
                        return this.filepoolProvider.addFilesToQueue(siteId, files, this.component, module.id);
                    }).catch(() => {
                        // Ignore errors.
                    }));
                });
            }
        }

        // Prefetch user profiles.
        promises.push(this.userProvider.prefetchProfiles(userIds, courseId, siteId));

        return Promise.all(promises);
    }

    /**
     * Sync a module.
     *
     * @param {any} module Module.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when done.
     */
    sync(module: any, siteId?: string): Promise<any> {
        return this.syncProvider.syncAssign(module.instance, siteId);
    }
}

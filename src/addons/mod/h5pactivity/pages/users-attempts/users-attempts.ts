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

import { Component, OnInit } from '@angular/core';
import { CoreUser, CoreUserProfile } from '@features/user/services/user';
import { IonRefresher } from '@ionic/angular';

import { CoreNavigator } from '@services/navigator';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreUtils } from '@services/utils/utils';
import {
    AddonModH5PActivity,
    AddonModH5PActivityData,
    AddonModH5PActivityProvider,
    AddonModH5PActivityUserAttempts,
} from '../../services/h5pactivity';

/**
 * Page that displays all users that can attempt an H5P activity.
 */
@Component({
    selector: 'page-addon-mod-h5pactivity-users-attempts',
    templateUrl: 'users-attempts.html',
})
export class AddonModH5PActivityUsersAttemptsPage implements OnInit {

    loaded = false;
    courseId!: number;
    cmId!: number;
    h5pActivity?: AddonModH5PActivityData;
    users: AddonModH5PActivityUserAttemptsFormatted[] = [];
    fetchMoreUsersFailed = false;
    canLoadMore = false;

    protected page = 0;

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        try {
            this.courseId = CoreNavigator.getRequiredRouteNumberParam('courseId');
            this.cmId = CoreNavigator.getRequiredRouteNumberParam('cmId');
        } catch (error) {
            CoreDomUtils.showErrorModal(error);

            CoreNavigator.back();

            return;
        }

        try {
            await this.fetchData();

            await AddonModH5PActivity.logViewReport(this.h5pActivity!.id, this.h5pActivity!.name);
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'Error loading attempts.');
        } finally {
            this.loaded = true;
        }
    }

    /**
     * Refresh the data.
     *
     * @param refresher Refresher.
     */
    doRefresh(refresher: IonRefresher): void {
        this.refreshData().finally(() => {
            refresher.complete();
        });
    }

    /**
     * Get quiz data and attempt data.
     *
     * @param refresh Whether user is refreshing data.
     * @return Promise resolved when done.
     */
    protected async fetchData(refresh?: boolean): Promise<void> {
        this.h5pActivity = await AddonModH5PActivity.getH5PActivity(this.courseId, this.cmId);

        await Promise.all([
            this.fetchUsers(refresh),
        ]);
    }

    /**
     * Get users.
     *
     * @param refresh Whether user is refreshing data.
     * @return Promise resolved when done.
     */
    protected async fetchUsers(refresh?: boolean): Promise<void> {
        if (refresh) {
            this.page = 0;
        }

        const result = await AddonModH5PActivity.getUsersAttempts(this.h5pActivity!.id, {
            cmId: this.cmId,
            page: this.page,
        });

        const formattedUsers = await this.formatUsers(result.users);

        if (this.page === 0) {
            this.users = formattedUsers;
        } else {
            this.users = this.users.concat(formattedUsers);
        }

        this.canLoadMore = result.canLoadMore;
        this.page++;
    }

    /**
     * Format users data.
     *
     * @param users Users to format.
     * @return Formatted users.
     */
    protected async formatUsers(users: AddonModH5PActivityUserAttempts[]): Promise<AddonModH5PActivityUserAttemptsFormatted[]> {
        return await Promise.all(users.map(async (user: AddonModH5PActivityUserAttemptsFormatted) => {
            user.user = await CoreUser.getProfile(user.userid, this.courseId, true);

            // Calculate the score of the user.
            if (this.h5pActivity!.grademethod === AddonModH5PActivityProvider.GRADEMANUAL) {
                // No score.
            } else if (this.h5pActivity!.grademethod === AddonModH5PActivityProvider.GRADEAVERAGEATTEMPT) {
                if (user.attempts.length) {
                    // Calculate the average.
                    const sumScores = user.attempts.reduce((sumScores, attempt) =>
                        sumScores + attempt.rawscore * 100 / attempt.maxscore, 0);

                    user.score = Math.round(sumScores / user.attempts.length);
                }
            } else if (user.scored?.attempts[0]) {
                // Only a single attempt used to calculate the grade. Use it.
                user.score = Math.round(user.scored.attempts[0].rawscore * 100 / user.scored.attempts[0].maxscore);
            }

            return user;
        }));
    }

    /**
     * Load a new batch of users.
     *
     * @param complete Completion callback.
     */
    async fetchMoreUsers(complete: () => void): Promise<void> {
        try {
            await this.fetchUsers(false);
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'Error loading more users');

            this.fetchMoreUsersFailed = true;
        }

        complete();
    }

    /**
     * Refresh the data.
     *
     * @return Promise resolved when done.
     */
    protected async refreshData(): Promise<void> {
        const promises = [
            AddonModH5PActivity.invalidateActivityData(this.courseId),
        ];

        if (this.h5pActivity) {
            promises.push(AddonModH5PActivity.invalidateAllUsersAttempts(this.h5pActivity.id));
        }

        await CoreUtils.ignoreErrors(Promise.all(promises));

        await this.fetchData(true);
    }

    /**
     * Open the page to view a user attempts.
     *
     * @param user User to open.
     */
    openUser(user: AddonModH5PActivityUserAttemptsFormatted): void {
        CoreNavigator.navigate(`../userattempts/${user.userid}`);
    }

}

/**
 * User attempts data with some calculated data.
 */
type AddonModH5PActivityUserAttemptsFormatted = AddonModH5PActivityUserAttempts & {
    user?: CoreUserProfile;
    score?: number;
};

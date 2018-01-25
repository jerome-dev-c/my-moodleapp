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
import { CoreContentLinksHandlerBase } from '../../contentlinks/classes/base-handler';
import { CoreContentLinksAction } from '../../contentlinks/providers/delegate';
import { CoreContentLinksHelperProvider } from '../../contentlinks/providers/helper';

/**
 * Handler to treat links to user profiles.
 */
@Injectable()
export class CoreUserProfileLinkHandler extends CoreContentLinksHandlerBase {
    name = 'CoreUserProfileLinkHandler';
    // Match user/view.php and user/profile.php but NOT grade/report/user/.
    pattern = /((\/user\/view\.php)|(\/user\/profile\.php)).*([\?\&]id=\d+)/;

    constructor(private linkHelper: CoreContentLinksHelperProvider) {
        super();
    }

    /**
     * Get the list of actions for a link (url).
     *
     * @param {string[]} siteIds List of sites the URL belongs to.
     * @param {string} url The URL to treat.
     * @param {any} params The params of the URL. E.g. 'mysite.com?id=1' -> {id: 1}
     * @param {number} [courseId] Course ID related to the URL. Optional but recommended.
     * @return {CoreContentLinksAction[]|Promise<CoreContentLinksAction[]>} List of (or promise resolved with list of) actions.
     */
    getActions(siteIds: string[], url: string, params: any, courseId?: number) :
            CoreContentLinksAction[]|Promise<CoreContentLinksAction[]> {
        return [{
            action: (siteId, navCtrl?) => {
                let pageParams = {
                    courseId: params.course,
                    userId: parseInt(params.id, 10)
                };
                // Always use redirect to make it the new history root (to avoid "loops" in history).
                this.linkHelper.goInSite(navCtrl, 'CoreUserProfilePage', pageParams, siteId);
            }
        }];
    }

    /**
     * Check if the handler is enabled for a certain site (site + user) and a URL.
     * If not defined, defaults to true.
     *
     * @param {string} siteId The site ID.
     * @param {string} url The URL to treat.
     * @param {any} params The params of the URL. E.g. 'mysite.com?id=1' -> {id: 1}
     * @param {number} [courseId] Course ID related to the URL. Optional but recommended.
     * @return {boolean|Promise<boolean>} Whether the handler is enabled for the URL and site.
     */
    isEnabled(siteId: string, url: string, params: any, courseId?: number) : boolean|Promise<boolean> {
        return url.indexOf('/grade/report/') == -1;
    }
}

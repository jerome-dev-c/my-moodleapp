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
import { NavController, NavOptions } from 'ionic-angular';
import { TranslateService } from '@ngx-translate/core';
import { AddonModForumIndexComponent } from '../components/index/index';
import { CoreCourseModuleHandler, CoreCourseModuleHandlerData } from '@core/course/providers/module-delegate';
import { CoreCourseProvider } from '@core/course/providers/course';
import { AddonModForumProvider } from './forum';

/**
 * Handler to support forum modules.
 */
@Injectable()
export class AddonModForumModuleHandler implements CoreCourseModuleHandler {
    name = 'AddonModForum';
    modName = 'forum';

    constructor(private courseProvider: CoreCourseProvider, private forumProvider: AddonModForumProvider,
        private translate: TranslateService) { }

    /**
     * Check if the handler is enabled on a site level.
     *
     * @return {boolean} Whether or not the handler is enabled on a site level.
     */
    isEnabled(): boolean {
        return true;
    }

    /**
     * Get the data required to display the module in the course contents view.
     *
     * @param {any} module The module object.
     * @param {number} courseId The course ID.
     * @param {number} sectionId The section ID.
     * @return {CoreCourseModuleHandlerData} Data to render the module.
     */
    getData(module: any, courseId: number, sectionId: number): CoreCourseModuleHandlerData {
       const data: CoreCourseModuleHandlerData = {
            icon: this.courseProvider.getModuleIconSrc('forum'),
            title: module.name,
            class: 'addon-mod_forum-handler',
            showDownloadButton: true,
            action(event: Event, navCtrl: NavController, module: any, courseId: number, options: NavOptions): void {
                navCtrl.push('AddonModForumIndexPage', {module: module, courseId: courseId}, options);
            }
        };

        // Handle unread posts.
        this.forumProvider.getForum(courseId, module.id).then((forumData) => {
            data.extraBadge = forumData.unreadpostscount ? this.translate.instant('addon.mod_forum.unreadpostsnumber',
                {$a : forumData.unreadpostscount }) : '';
        }).catch(() => {
            // Ignore errors.
        });

        return data;
    }

    /**
     * Get the component to render the module. This is needed to support singleactivity course format.
     * The component returned must implement CoreCourseModuleMainComponent.
     *
     * @param {any} course The course object.
     * @param {any} module The module object.
     * @return {any} The component to use, undefined if not found.
     */
    getMainComponent(course: any, module: any): any {
        return AddonModForumIndexComponent;
    }

    /**
     * Whether to display the course refresher in single activity course format. If it returns false, a refresher must be
     * included in the template that calls the doRefresh method of the component. Defaults to true.
     *
     * @return {boolean} Whether the refresher should be displayed.
     */
    displayRefresherInSingleActivity(): boolean {
        return false;
    }
}

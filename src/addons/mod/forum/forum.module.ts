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

import { APP_INITIALIZER, NgModule } from '@angular/core';
import { Routes } from '@angular/router';

import { conditionalRoutes } from '@/app/app-routing.module';
import { CORE_SITE_SCHEMAS } from '@services/sites';
import { CoreCourseContentsRoutingModule } from '@features/course/pages/contents/contents-routing.module';
import { CoreCourseModuleDelegate } from '@features/course/services/module-delegate';
import { CoreMainMenuTabRoutingModule } from '@features/mainmenu/mainmenu-tab-routing.module';
import { CoreScreen } from '@services/screen';

import { AddonModForumComponentsModule } from './components/components.module';
import { AddonModForumModuleHandler, AddonModForumModuleHandlerService } from './services/handlers/module';
import { SITE_SCHEMA } from './services/database/offline';
import { CoreCourseModulePrefetchDelegate } from '@features/course/services/module-prefetch-delegate';
import { AddonModForumPrefetchHandler } from './services/handlers/prefetch';
import { CoreCronDelegate } from '@services/cron';
import { AddonModForumSyncCronHandler } from './services/handlers/sync-cron';
import { CoreContentLinksDelegate } from '@features/contentlinks/services/contentlinks-delegate';
import { AddonModForumDiscussionLinkHandler } from './services/handlers/discussion-link';
import { AddonModForumIndexLinkHandler } from './services/handlers/index-link';
import { AddonModForumListLinkHandler } from './services/handlers/list-link';
import { AddonModForumPostLinkHandler } from './services/handlers/post-link';
import { CoreTagAreaDelegate } from '@features/tag/services/tag-area-delegate';
import { AddonModForumTagAreaHandler } from './services/handlers/tag-area';
import { CorePushNotificationsDelegate } from '@features/pushnotifications/services/push-delegate';
import { AddonModForumPushClickHandler } from './services/handlers/push-click';

const mainMenuRoutes: Routes = [
    {
        path: `${AddonModForumModuleHandlerService.PAGE_NAME}/discussion/:discussionId`,
        loadChildren: () => import('./pages/discussion/discussion.module').then(m => m.AddonForumDiscussionPageModule),
    },
    {
        path: AddonModForumModuleHandlerService.PAGE_NAME,
        loadChildren: () => import('./forum-lazy.module').then(m => m.AddonModForumLazyModule),
    },
    ...conditionalRoutes(
        [
            {
                path: `course/index/contents/${AddonModForumModuleHandlerService.PAGE_NAME}/new/:timeCreated`,
                loadChildren: () => import('./pages/new-discussion/new-discussion.module')
                    .then(m => m.AddonForumNewDiscussionPageModule),
            },
            {
                path: `course/index/contents/${AddonModForumModuleHandlerService.PAGE_NAME}/:discussionId`,
                loadChildren: () => import('./pages/discussion/discussion.module').then(m => m.AddonForumDiscussionPageModule),
            },
        ],
        () => CoreScreen.isMobile,
    ),
];

const courseContentsRoutes: Routes = conditionalRoutes(
    [
        {
            path: `${AddonModForumModuleHandlerService.PAGE_NAME}/new/:timeCreated`,
            loadChildren: () => import('./pages/new-discussion/new-discussion.module')
                .then(m => m.AddonForumNewDiscussionPageModule),
        },
        {
            path: `${AddonModForumModuleHandlerService.PAGE_NAME}/:discussionId`,
            loadChildren: () => import('./pages/discussion/discussion.module').then(m => m.AddonForumDiscussionPageModule),
        },
    ],
    () => CoreScreen.isTablet,
);

@NgModule({
    imports: [
        CoreMainMenuTabRoutingModule.forChild(mainMenuRoutes),
        CoreCourseContentsRoutingModule.forChild({ children: courseContentsRoutes }),
        AddonModForumComponentsModule,
    ],
    providers: [
        {
            provide: CORE_SITE_SCHEMAS,
            useValue: [SITE_SCHEMA],
            multi: true,
        },
        {
            provide: APP_INITIALIZER,
            multi: true,
            useValue: () => {
                CoreCourseModuleDelegate.registerHandler(AddonModForumModuleHandler.instance);
                CoreCourseModulePrefetchDelegate.registerHandler(AddonModForumPrefetchHandler.instance);
                CoreCronDelegate.register(AddonModForumSyncCronHandler.instance);
                CoreContentLinksDelegate.registerHandler(AddonModForumDiscussionLinkHandler.instance);
                CoreContentLinksDelegate.registerHandler(AddonModForumIndexLinkHandler.instance);
                CoreContentLinksDelegate.registerHandler(AddonModForumListLinkHandler.instance);
                CoreContentLinksDelegate.registerHandler(AddonModForumPostLinkHandler.instance);
                CoreTagAreaDelegate.registerHandler(AddonModForumTagAreaHandler.instance);
                CorePushNotificationsDelegate.registerClickHandler(AddonModForumPushClickHandler.instance);
            },
        },
    ],
})
export class AddonModForumModule {}

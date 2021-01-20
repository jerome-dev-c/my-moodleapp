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
import { CoreMainMenuRoutingModule } from '@features/mainmenu/mainmenu-routing.module';

import { CoreMainMenuDelegate } from '@features/mainmenu/services/mainmenu-delegate';
import { CoreCronDelegate } from '@services/cron';
import { CoreContentLinksDelegate } from '@features/contentlinks/services/contentlinks-delegate';
import { AddonCalendarViewLinkHandler } from './services/handlers/view-link';
import { AddonCalendarMainMenuHandler, AddonCalendarMainMenuHandlerService } from './services/handlers/mainmenu';
import { AddonCalendarSyncCronHandler } from './services/handlers/sync-cron';

import { CORE_SITE_SCHEMAS } from '@services/sites';
import { CALENDAR_SITE_SCHEMA } from './services/database/calendar';
import { CALENDAR_OFFLINE_SITE_SCHEMA } from './services/database/calendar-offline';
import { AddonCalendarComponentsModule } from './components/components.module';
import { AddonCalendar } from './services/calendar';

const mainMenuChildrenRoutes: Routes = [
    {
        path: AddonCalendarMainMenuHandlerService.PAGE_NAME,
        loadChildren: () => import('./calendar-lazy.module').then(m => m.AddonCalendarLazyModule),
    },
];

@NgModule({
    imports: [
        CoreMainMenuRoutingModule.forChild({ children: mainMenuChildrenRoutes }),
        AddonCalendarComponentsModule,
    ],
    exports: [CoreMainMenuRoutingModule],
    providers: [
        {
            provide: CORE_SITE_SCHEMAS,
            useValue: [CALENDAR_SITE_SCHEMA, CALENDAR_OFFLINE_SITE_SCHEMA],
            multi: true,
        },
        {
            provide: APP_INITIALIZER,
            multi: true,
            deps: [],
            useFactory: () => async () => {
                CoreContentLinksDelegate.instance.registerHandler(AddonCalendarViewLinkHandler.instance);
                CoreMainMenuDelegate.instance.registerHandler(AddonCalendarMainMenuHandler.instance);
                CoreCronDelegate.instance.register(AddonCalendarSyncCronHandler.instance);

                await AddonCalendar.instance.initialize();

                AddonCalendar.instance.scheduleAllSitesEventsNotifications();
            },
        },
    ],
})
export class AddonCalendarModule {}

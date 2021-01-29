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
import { CoreContentLinksDelegate } from '@features/contentlinks/services/contentlinks-delegate';
import { CoreCourseOptionsDelegate } from '@features/course/services/course-options-delegate';
import { CoreMainMenuRoutingModule } from '@features/mainmenu/mainmenu-routing.module';
import { CoreMainMenuTabRoutingModule } from '@features/mainmenu/mainmenu-tab-routing.module';
import { CoreMainMenuDelegate } from '@features/mainmenu/services/mainmenu-delegate';
import { CoreUserDelegate } from '@features/user/services/user-delegate';
import { CoreGradesCourseOptionHandler } from './services/handlers/course-option';
import CoreGradesMainMenuHandler, { CoreGradesMainMenuHandlerService } from './services/handlers/mainmenu';
import { CoreGradesOverviewLinkHandler } from './services/handlers/overview-link';
import { CoreGradesUserHandler } from './services/handlers/user';
import { CoreGradesUserLinkHandler } from './services/handlers/user-link';

const routes: Routes = [
    {
        path: CoreGradesMainMenuHandlerService.PAGE_NAME,
        loadChildren: () => import('@features/grades/grades-lazy.module').then(m => m.CoreGradesLazyModule),
    },
];

@NgModule({
    imports: [
        CoreMainMenuTabRoutingModule.forChild(routes),
        CoreMainMenuRoutingModule.forChild({ children: routes }),
    ],
    providers: [
        {
            provide: APP_INITIALIZER,
            multi: true,
            deps: [],
            useValue: () => {
                CoreMainMenuDelegate.instance.registerHandler(CoreGradesMainMenuHandler.instance);
                CoreUserDelegate.instance.registerHandler(CoreGradesUserHandler.instance);
                CoreContentLinksDelegate.instance.registerHandler(CoreGradesUserLinkHandler.instance);
                CoreContentLinksDelegate.instance.registerHandler(CoreGradesOverviewLinkHandler.instance);
                CoreCourseOptionsDelegate.instance.registerHandler(CoreGradesCourseOptionHandler.instance);
            },
        },
    ],
})
export class CoreGradesModule {}

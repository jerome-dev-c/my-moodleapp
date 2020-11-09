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

import { Injectable } from '@angular/core';
import { Params } from '@angular/router';

import { CoreDelegateDisplayHandler, CoreDelegateToDisplay } from '@classes/delegate';
import { CoreSortedDelegate } from '@classes/delegate-sorted';

/**
 * Interface that all settings handlers must implement.
 */
export type CoreSettingsHandler = CoreDelegateDisplayHandler<CoreSettingsHandlerToDisplay>;

/**
 * Data needed to render a setting handler. It's returned by the handler.
 */
export interface CoreSettingsHandlerData {
    /**
     * Name of the page to load for the handler.
     */
    page: string;

    /**
     * Params list of the page to load for the handler.
     */
    params?: Params;

    /**
     * Title to display for the handler.
     */
    title: string;

    /**
     * Name of the icon to display for the handler.
     */
    icon?: string; // Name of the icon to display in the menu.

    /**
     * Class to add to the displayed handler.
     */
    class?: string;
}

/**
 * Data returned by the delegate for each handler.
 */
export type CoreSettingsHandlerToDisplay = CoreDelegateToDisplay & CoreSettingsHandlerData;

/**
 * Service to interact with addons to be shown in app settings. Provides functions to register a plugin
 * and notify an update in the data.
 */
@Injectable({
    providedIn: 'root',
})
export class CoreSettingsDelegate extends CoreSortedDelegate<CoreSettingsHandlerToDisplay, CoreSettingsHandler> {

    constructor() {
        super('CoreSettingsDelegate');
    }

}

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

import { CoreSite } from '@classes/site';
import { CoreSites } from '@services/sites';
import { CoreUserSupportConfig } from './support-config';

/**
 * Support config for an authenticated user.
 */
export class CoreUserAuthenticatedSupportConfig extends CoreUserSupportConfig {

    /**
     * Get config for the current site.
     *
     * @returns Support config.
     */
    static forCurrentSite(): CoreUserAuthenticatedSupportConfig {
        return new CoreUserAuthenticatedSupportConfig(CoreSites.getRequiredCurrentSite());
    }

    private site: CoreSite;

    constructor(site: CoreSite) {
        super();

        this.site = site;
    }

    /**
     * @inheritdoc
     */
    canContactSupport(): boolean {
        return this.site.isVersionGreaterEqualThan('4.0')
            && !this.site.isFeatureDisabled('NoDelegate_CoreUserSupport');
    }

    /**
     * @inheritdoc
     */
    protected buildSupportPageUrl(): string {
        return this.site.config?.supportpage?.trim()
            || `${this.site.config?.httpswwwroot ?? this.site.config?.wwwroot ?? this.site.siteUrl}/user/contactsitesupport.php`;
    }

}

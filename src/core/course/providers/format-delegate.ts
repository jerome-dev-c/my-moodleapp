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
import { NavController } from 'ionic-angular';
import { CoreEventsProvider } from '../../../providers/events';
import { CoreLoggerProvider } from '../../../providers/logger';
import { CoreSitesProvider } from '../../../providers/sites';
import { CoreCourseProvider } from './course';

/**
 * Interface that all course format handlers should implement.
 */
export interface CoreCourseFormatHandler {
    /**
     * Name of the format. It should match the "format" returned in core_course_get_courses.
     * @type {string}
     */
    name: string;

    /**
     * Whether or not the handler is enabled on a site level.
     *
     * @return {boolean|Promise<boolean>} True or promise resolved with true if enabled.
     */
    isEnabled(): boolean|Promise<boolean>;

    /**
     * Get the title to use in course page. If not defined, course fullname.
     *
     * @param {any} course The course.
     * @return {string} Title.
     */
    getCourseTitle?(course: any) : string;

    /**
     * Whether it allows seeing all sections at the same time. Defaults to true.
     *
     * @param {any} course The course to check.
     * @type {boolean} Whether it can view all sections.
     */
    canViewAllSections?(course: any) : boolean;

    /**
     * Whether the default section selector should be displayed. Defaults to true.
     *
     * @param {any} course The course to check.
     * @type {boolean} Whether the default section selector should be displayed.
     */
    displaySectionSelector?(course: any) : boolean;

    /**
     * Given a list of sections, get the "current" section that should be displayed first. Defaults to first section.
     *
     * @param {any} course The course to get the title.
     * @param {any[]} sections List of sections.
     * @return {any} Current section.
     */
    getCurrentSection?(course: any, sections: any[]) : any;

    /**
     * Open the page to display a course. If not defined, the page CoreCourseSectionPage will be opened.
     * Implement it only if you want to create your own page to display the course. In general it's better to use the method
     * getCourseFormatComponent because it will display the course handlers at the top.
     * Your page should include the course handlers using CoreCoursesDelegate.
     *
     * @param {NavController} navCtrl The NavController instance to use.
     * @param {any} course The course to open. It should contain a "format" attribute.
     * @return {Promise<any>} Promise resolved when done.
     */
    openCourse?(navCtrl: NavController, course: any) : Promise<any>;

    /**
     * Return the Component to use to display the course format instead of using the default one.
     * Use it if you want to display a format completely different from the default one.
     * If you want to customize the default format there are several methods to customize parts of it.
     *
     * @param {any} course The course to render.
     * @return {any} The component to use, undefined if not found.
     */
    getCourseFormatComponent?(course: any) : any;

    /**
     * Return the Component to use to display the course summary inside the default course format.
     *
     * @param {any} course The course to render.
     * @return {any} The component to use, undefined if not found.
     */
    getCourseSummaryComponent?(course: any): any;

    /**
     * Return the Component to use to display the section selector inside the default course format.
     *
     * @param {any} course The course to render.
     * @return {any} The component to use, undefined if not found.
     */
    getSectionSelectorComponent?(course: any): any;

    /**
     * Return the Component to use to display a single section. This component will only be used if the user is viewing a
     * single section. If all the sections are displayed at once then it won't be used.
     *
     * @param {any} course The course to render.
     * @return {any} The component to use, undefined if not found.
     */
    getSingleSectionComponent?(course: any): any;

    /**
     * Return the Component to use to display all sections in a course.
     *
     * @param {any} course The course to render.
     * @return {any} The component to use, undefined if not found.
     */
    getAllSectionsComponent?(course: any): any;
};

/**
 * Service to interact with course formats. Provides the functions to register and interact with the addons.
 */
@Injectable()
export class CoreCourseFormatDelegate {
    protected logger;
    protected handlers: {[s: string]: CoreCourseFormatHandler} = {}; // All registered handlers.
    protected enabledHandlers: {[s: string]: CoreCourseFormatHandler} = {}; // Handlers enabled for the current site.
    protected lastUpdateHandlersStart: number;

    constructor(logger: CoreLoggerProvider, private sitesProvider: CoreSitesProvider, eventsProvider: CoreEventsProvider) {
        this.logger = logger.getInstance('CoreCoursesCourseFormatDelegate');

        eventsProvider.on(CoreEventsProvider.LOGIN, this.updateHandlers.bind(this));
        eventsProvider.on(CoreEventsProvider.SITE_UPDATED, this.updateHandlers.bind(this));
        eventsProvider.on(CoreEventsProvider.REMOTE_ADDONS_LOADED, this.updateHandlers.bind(this));
    }

    /**
     * Whether it allows seeing all sections at the same time. Defaults to true.
     *
     * @param {any} course The course to check.
     * @return {boolean} Whether it allows seeing all sections at the same time.
     */
    canViewAllSections(course: any) : boolean {
        return this.executeFunction(course.format, 'canViewAllSections', true, [course]);
    }

    /**
     * Whether the default section selector should be displayed. Defaults to true.
     *
     * @param {any} course The course to check.
     * @return {boolean} Whether the section selector should be displayed.
     */
    displaySectionSelector(course: any) : boolean {
        return this.executeFunction(course.format, 'displaySectionSelector', true, [course]);
    }

    /**
     * Execute a certain function in a course format handler. If the handler isn't found or function isn't defined,
     * return the default value.
     *
     * @param {string} format The format name.
     * @param {string} fnName Name of the function to execute.
     * @param {any} defaultValue Value to return if not found.
     * @param {any[]} params Parameters to pass to the function.
     * @return {any} Function returned value or default value.
     */
    protected executeFunction(format: string, fnName: string, defaultValue?: any, params?: any[]) : any {
        let handler = this.enabledHandlers[format];
        if (handler && handler[fnName]) {
            return handler[fnName].apply(handler, params);
        }
        return defaultValue;
    }

    /**
     * Get the component to use to display all sections in a course.
     *
     * @param {any} course The course to render.
     * @return {any} The component to use, undefined if not found.
     */
    getAllSectionsComponent(course: any) : any {
        return this.executeFunction(course.format, 'getAllSectionsComponent', undefined, [course]);
    }

    /**
     * Get the component to use to display a course format.
     *
     * @param {any} course The course to render.
     * @return {any} The component to use, undefined if not found.
     */
    getCourseFormatComponent(course: any) : any {
        return this.executeFunction(course.format, 'getCourseFormatComponent', undefined, [course]);
    }

    /**
     * Get the component to use to display the course summary in the default course format.
     *
     * @param {any} course The course to render.
     * @return {any} The component to use, undefined if not found.
     */
    getCourseSummaryComponent(course: any) : any {
        return this.executeFunction(course.format, 'getCourseSummaryComponent', undefined, [course]);
    }

    /**
     * Given a course, return the title to use in the course page.
     *
     * @param {any} course The course to get the title.
     * @return {string} Course title.
     */
    getCourseTitle(course: any) : string {
        return this.executeFunction(course.format, 'getCourseTitle', course.fullname || '', [course]);
    }

    /**
     * Given a course and a list of sections, return the current section that should be displayed first.
     *
     * @param {any} course The course to get the title.
     * @param {any[]} sections List of sections.
     * @return {any} Current section.
     */
    getCurrentSection(course: any, sections: any[]) : any {
        // Calculate default section (the first one that isn't all sections).
        let defaultSection;
        for (let i = 0; i < sections.length; i++) {
            let section = sections[i];
            if (section.id != CoreCourseProvider.ALL_SECTIONS_ID) {
                defaultSection = section;
                break;
            }
        }

        return this.executeFunction(course.format, 'getCurrentSection', defaultSection, [course, sections]);
    }

    /**
     * Get the component to use to display the section selector inside the default course format.
     *
     * @param {any} course The course to render.
     * @return {any} The component to use, undefined if not found.
     */
    getSectionSelectorComponent(course: any) : any {
        return this.executeFunction(course.format, 'getSectionSelectorComponent', undefined, [course]);
    }

    /**
     * Get the component to use to display a single section. This component will only be used if the user is viewing
     * a single section. If all the sections are displayed at once then it won't be used.
     *
     * @param {any} course The course to render.
     * @return {any} The component to use, undefined if not found.
     */
    getSingleSectionComponent(course: any) : any {
        return this.executeFunction(course.format, 'getSingleSectionComponent', undefined, [course]);
    }

    /**
     * Check if a time belongs to the last update handlers call.
     * This is to handle the cases where updateHandlers don't finish in the same order as they're called.
     *
     * @param {number} time Time to check.
     * @return {boolean} Whether it's the last call.
     */
    isLastUpdateCall(time: number) : boolean {
        if (!this.lastUpdateHandlersStart) {
            return true;
        }
        return time == this.lastUpdateHandlersStart;
    }

    /**
     * Open a course.
     *
     * @param {NavController} navCtrl The NavController instance to use.
     * @param {any} course The course to open. It should contain a "format" attribute.
     * @return {Promise<any>} Promise resolved when done.
     */
    openCourse(navCtrl: NavController, course: any) : Promise<any> {
        if (this.enabledHandlers[course.format] && this.enabledHandlers[course.format].openCourse) {
            return this.enabledHandlers[course.format].openCourse(navCtrl, course);
        }
        return navCtrl.push('CoreCourseSectionPage', {course: course});
    }

    /**
     * Register a handler.
     *
     * @param {CoreCourseFormatHandler} handler The handler to register.
     * @return {boolean} True if registered successfully, false otherwise.
     */
    registerHandler(handler: CoreCourseFormatHandler) : boolean {
        if (typeof this.handlers[handler.name] !== 'undefined') {
            this.logger.log(`Addon '${handler.name}' already registered`);
            return false;
        }
        this.logger.log(`Registered addon '${handler.name}'`);
        this.handlers[handler.name] = handler;
        return true;
    }

    /**
     * Update the handler for the current site.
     *
     * @param {CoreCourseFormatHandler} handler The handler to check.
     * @param {number} time Time this update process started.
     * @return {Promise<void>} Resolved when done.
     */
    protected updateHandler(handler: CoreCourseFormatHandler, time: number) : Promise<void> {
        let promise,
            siteId = this.sitesProvider.getCurrentSiteId(),
            currentSite = this.sitesProvider.getCurrentSite();

        if (!this.sitesProvider.isLoggedIn()) {
            promise = Promise.reject(null);
        } else if (currentSite.isFeatureDisabled('CoreCourseFormatHandler_' + handler.name)) {
            promise = Promise.resolve(false);
        } else {
            promise = Promise.resolve(handler.isEnabled());
        }

        // Checks if the handler is enabled.
        return promise.catch(() => {
            return false;
        }).then((enabled: boolean) => {
            // Verify that this call is the last one that was started.
            // Check that site hasn't changed since the check started.
            if (this.isLastUpdateCall(time) && this.sitesProvider.getCurrentSiteId() === siteId) {
                if (enabled) {
                    this.enabledHandlers[handler.name] = handler;
                } else {
                    delete this.enabledHandlers[handler.name];
                }
            }
        });
    }

    /**
     * Update the handlers for the current site.
     *
     * @return {Promise<any>} Resolved when done.
     */
    protected updateHandlers() : Promise<any> {
        let promises = [],
            now = Date.now();

        this.logger.debug('Updating handlers for current site.');

        this.lastUpdateHandlersStart = now;

        // Loop over all the handlers.
        for (let name in this.handlers) {
            promises.push(this.updateHandler(this.handlers[name], now));
        }

        return Promise.all(promises).catch(() => {
            // Never reject.
        });
    }
}

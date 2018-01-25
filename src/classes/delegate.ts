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
import { CoreLoggerProvider } from '../providers/logger';
import { CoreSitesProvider } from '../providers/sites';
import { CoreEventsProvider } from '../providers/events';

export interface CoreDelegateHandler {
    /**
     * Name of the handler, or name and sub context (mmaMessages, mmaMessage:blockContact, ...).
     * @type {string}
     */
    name: string;

    /**
     * Whether or not the handler is enabled on a site level.
     * @return {boolean|Promise<boolean>} Whether or not the handler is enabled on a site level.
     */
    isEnabled(): boolean|Promise<boolean>;
};

/**
 * Superclass to help creating delegates
 */
@Injectable()
export class CoreDelegate {

    /**
     * Logger instance get from CoreLoggerProvider.
     * @type {any}
     */
    protected logger;

    /**
     * List of registered handlers.
     * @type {any}
     */
    protected handlers: {[s: string]: CoreDelegateHandler} = {};

    /**
     * List of registered handlers enabled for the current site.
     * @type {any}
     */
    protected enabledHandlers: {[s: string]: CoreDelegateHandler} = {};

    /**
     * Default handler
     * @type {CoreDelegateHandler}
     */
    protected defaultHandler: CoreDelegateHandler;

    /**
     * Time when last updateHandler functions started.
     * @type {number}
     */
    protected lastUpdateHandlersStart: number;

    /**
     * Feature prefix to check is feature is enabled or disabled in site.
     * This check is only made if not false. Override on the subclass or override isFeatureDisabled function.
     * @type {string}
     */
    protected featurePrefix: string;

    /**
     * Constructor of the Delegate.
     *
     * @param {string} delegateName Delegate name used for logging purposes.
     * @param {CoreLoggerProvider}   loggerProvider CoreLoggerProvider instance, cannot be directly injected.
     * @param {CoreSitesProvider}    sitesProvider  CoreSitesProvider instance, cannot be directly injected.
     */
    constructor(delegateName: string, protected loggerProvider: CoreLoggerProvider, protected sitesProvider: CoreSitesProvider,
            protected eventsProvider: CoreEventsProvider) {
        this.logger = this.loggerProvider.getInstance(delegateName);

        // Update handlers on this cases.
        eventsProvider.on(CoreEventsProvider.LOGIN, this.updateHandlers.bind(this));
        eventsProvider.on(CoreEventsProvider.SITE_UPDATED, this.updateHandlers.bind(this));
        eventsProvider.on(CoreEventsProvider.REMOTE_ADDONS_LOADED, this.updateHandlers.bind(this));
    }

    /**
     * Execute a certain function in a enabled handler.
     * If the handler isn't found or function isn't defined, call the same function in the default handler.
     *
     * @param {string} handlerName The handler name.
     * @param {string} fnName Name of the function to execute.
     * @param {any[]} params Parameters to pass to the function.
     * @return {any} Function returned value or default value.
     */
    protected executeFunctionOnEnabled(handlerName: string, fnName: string, params?: any[]) : any {
        return this.execute(this.enabledHandlers[handlerName], fnName, params);
    }

    /**
     * Execute a certain function in a handler.
     * If the handler isn't found or function isn't defined, call the same function in the default handler.
     *
     * @param {string} handlerName The handler name.
     * @param {string} fnName Name of the function to execute.
     * @param {any[]} params Parameters to pass to the function.
     * @return {any} Function returned value or default value.
     */
    protected executeFunction(handlerName: string, fnName: string, params?: any[]) : any {
        return this.execute(this.handlers[handlerName], fnName, params);
    }

    /**
     * Execute a certain function in a handler.
     * If the handler isn't found or function isn't defined, call the same function in the default handler.
     *
     * @param {any} handler The handler.
     * @param {string} fnName Name of the function to execute.
     * @param {any[]} params Parameters to pass to the function.
     * @return {any} Function returned value or default value.
     */
    private execute(handler: any, fnName: string, params?: any[]) : any {
        if (handler && handler[fnName]) {
            return handler[fnName].apply(handler, params);
        } else if (this.defaultHandler && this.defaultHandler[fnName]) {
            return this.defaultHandler[fnName].apply(this, params);
        }
    }

    /**
     * Get a handler.
     *
     * @param  {string} handlerName The handler name.
     * @param  {boolean} [enabled]  Only enabled, or any.
     * @return {any}                Handler.
     */
    protected getHandler(handlerName: string, enabled = false): any {
        return enabled ? this.enabledHandlers[handlerName] : this.handlers[handlerName];
    }

    /**
     * Check if a handler name has a registered handler (not necessarily enabled).
     *
     * @param {string} name The handler name.
     * @param  {boolean} [enabled]  Only enabled, or any.
     * @return {boolean} If the handler is registered or not.
     */
    hasHandler(name: string, enabled = false): boolean {
        return enabled ? typeof this.enabledHandlers[name] !== 'undefined' : typeof this.handlers[name] !== 'undefined';
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
     * Register a handler.
     *
     * @param {CoreDelegateHandler} handler The handler delegate object to register.
     * @return {boolean} True when registered, false if already registered.
     */
    registerHandler(handler: CoreDelegateHandler): boolean {
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
     * @param {CoreDelegateHandler} handler The handler to check.
     * @param {number} time Time this update process started.
     * @return {Promise<void>} Resolved when done.
     */
    protected updateHandler(handler: CoreDelegateHandler, time: number) : Promise<void> {
        let promise,
            siteId = this.sitesProvider.getCurrentSiteId(),
            currentSite = this.sitesProvider.getCurrentSite();

        if (!this.sitesProvider.isLoggedIn()) {
            promise = Promise.reject(null);
        } else if (this.isFeatureDisabled(handler, currentSite)) {
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
     * Check if feature is enabled or disabled in the site, depending on the feature prefix and the handler name.
     *
     * @param  {CoreDelegateHandler} handler Handler to check.
     * @param  {any}                 site    Site to check.
     * @return {boolean}                     Whether is enabled or disabled in site.
     */
    protected isFeatureDisabled(handler: CoreDelegateHandler, site: any) : boolean{
        return typeof this.featurePrefix != "undefined" && site.isFeatureDisabled(this.featurePrefix + handler.name);
    }

    /**
     * Update the handlers for the current site.
     *
     * @return {Promise<void>} Resolved when done.
     */
    protected updateHandlers() : Promise<void> {
        let promises = [],
            now = Date.now();

        this.logger.debug('Updating handlers for current site.');

        this.lastUpdateHandlersStart = now;

        // Loop over all the handlers.
        for (let name in this.handlers) {
            promises.push(this.updateHandler(this.handlers[name], now));
        }

        return Promise.all(promises).then(() => {
            return true;
        }, () => {
            // Never reject.
            return true;
        }).then(() => {

            // Verify that this call is the last one that was started.
            if (this.isLastUpdateCall(now)) {
                this.updateData();
            }
        });
    }

    /**
     * Update handlers Data.
     * Override this function to update handlers data.
     */
    updateData() {

    }
}
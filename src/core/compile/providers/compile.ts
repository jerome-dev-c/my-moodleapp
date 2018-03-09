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

import { Injectable, Injector, Component, NgModule, Compiler, ComponentFactory, ComponentRef, NgModuleRef } from '@angular/core';
import {
    Platform, ActionSheetController, AlertController, LoadingController, ModalController, PopoverController, ToastController,
    IonicModule
} from 'ionic-angular';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { CoreLoggerProvider } from '../../../providers/logger';

// Import core providers.
import { CORE_PROVIDERS } from '../../../app/app.module';
import { CORE_CONTENTLINKS_PROVIDERS } from '../../contentlinks/contentlinks.module';
import { CORE_COURSE_PROVIDERS } from '../../course/course.module';
import { CORE_COURSES_PROVIDERS } from '../../courses/courses.module';
import { CORE_FILEUPLOADER_PROVIDERS } from '../../fileuploader/fileuploader.module';
import { CORE_GRADES_PROVIDERS } from '../../grades/grades.module';
import { CORE_LOGIN_PROVIDERS } from '../../login/login.module';
import { CORE_MAINMENU_PROVIDERS } from '../../mainmenu/mainmenu.module';
import { CORE_SHAREDFILES_PROVIDERS } from '../../sharedfiles/sharedfiles.module';
import { CORE_SITEHOME_PROVIDERS } from '../../sitehome/sitehome.module';
import { CORE_USER_PROVIDERS } from '../../user/user.module';
import { IONIC_NATIVE_PROVIDERS } from '../../emulator/emulator.module';

// Import only this provider to prevent circular dependencies.
import { CoreSitePluginsProvider } from '../../siteplugins/providers/siteplugins';

// Import other libraries and providers.
import { DomSanitizer } from '@angular/platform-browser';
import { FormBuilder, Validators } from '@angular/forms';
import { Http } from '@angular/http';
import { HttpClient } from '@angular/common/http';
import { CoreConfigConstants } from '../../../configconstants';
import { CoreConstants } from '../../constants';
import * as moment from 'moment';
import { Md5 } from 'ts-md5/dist/md5';

// Import core classes that can be useful for site plugins.
import { CoreSyncBaseProvider } from '../../../classes/base-sync';
import { CoreCache } from '../../../classes/cache';
import { CoreDelegate } from '../../../classes/delegate';
import { CoreContentLinksHandlerBase } from '../../contentlinks/classes/base-handler';
import { CoreContentLinksModuleGradeHandler } from '../../contentlinks/classes/module-grade-handler';
import { CoreContentLinksModuleIndexHandler } from '../../contentlinks/classes/module-index-handler';
import { CoreCourseModulePrefetchHandlerBase } from '../../course/classes/module-prefetch-handler';

// Import all modules that define components, directives and pipes.
import { CoreComponentsModule } from '../../../components/components.module';
import { CoreDirectivesModule } from '../../../directives/directives.module';
import { CorePipesModule } from '../../../pipes/pipes.module';
import { CoreCourseComponentsModule } from '../../course/components/components.module';
import { CoreCourseDirectivesModule } from '../../course/directives/directives.module';
import { CoreCoursesComponentsModule } from '../../courses/components/components.module';
import { CoreSitePluginsDirectivesModule } from '../../siteplugins/directives/directives.module';
import { CoreSiteHomeComponentsModule } from '../../sitehome/components/components.module';
import { CoreUserComponentsModule } from '../../user/components/components.module';

// Import some components listed in entryComponents so they can be injected dynamically.
import { CoreCourseUnsupportedModuleComponent } from '../../course/components/unsupported-module/unsupported-module';
import { CoreCourseFormatSingleActivityComponent } from '../../course/formats/singleactivity/components/singleactivity';
import { CoreSitePluginsModuleIndexComponent } from '../../siteplugins/components/module-index/module-index';
import { CoreSitePluginsCourseOptionComponent } from '../../siteplugins/components/course-option/course-option';
import { CoreSitePluginsCourseFormatComponent } from '../../siteplugins/components/course-format/course-format';

/**
 * Service to provide functionalities regarding compiling dynamic HTML and Javascript.
 */
@Injectable()
export class CoreCompileProvider {

    protected logger;

    // Other Ionic/Angular providers that don't depend on where they are injected.
    protected OTHER_PROVIDERS = [
        TranslateService, Http, HttpClient, Platform, DomSanitizer, ActionSheetController, AlertController, LoadingController,
        ModalController, PopoverController, ToastController, FormBuilder
    ];

    // List of imports for dynamic module. Since the template can have any component we need to import all core components modules.
    protected IMPORTS = [
        IonicModule, TranslateModule.forChild(), CoreComponentsModule, CoreDirectivesModule, CorePipesModule,
        CoreCourseComponentsModule, CoreCoursesComponentsModule, CoreSiteHomeComponentsModule, CoreUserComponentsModule,
        CoreCourseDirectivesModule, CoreSitePluginsDirectivesModule
    ];

    constructor(protected injector: Injector, logger: CoreLoggerProvider, protected compiler: Compiler) {
        this.logger = logger.getInstance('CoreCompileProvider');
    }

    /**
     * Create and compile a dynamic component.
     *
     * @param {string} template The template of the component.
     * @param {any} componentClass The JS class of the component.
     * @return {Promise<ComponentFactory<any>>} Promise resolved with the factory to instantiate the component.
     */
    createAndCompileComponent(template: string, componentClass: any): Promise<ComponentFactory<any>> {
        // Create the component using the template and the class.
        const component = Component({
            template: template
        })
        (componentClass);

        // Now create the module containing the component.
        const module = NgModule({imports: this.IMPORTS, declarations: [component]})(class {});

        // Compile the module and the component.
        return this.compiler.compileModuleAndAllComponentsAsync(module).then((factories) => {
            // Search and return the factory of the component we just created.
            for (const i in factories.componentFactories) {
                const factory = factories.componentFactories[i];
                if (factory.componentType == component) {
                    return factory;
                }
            }
        });
    }

    /**
     * Eval some javascript using the context of the function.
     *
     * @param {string} javascript The javascript to eval.
     * @return {any} Result of the eval.
     */
    protected evalInContext(javascript: string): any {
        // tslint:disable: no-eval
        return eval(javascript);
    }

    /**
     * Execute some javascript code, using a certain instance as the context.
     *
     * @param {any} instance Instance to use as the context. In the JS code, "this" will be this instance.
     * @param {string} javascript The javascript code to eval.
     * @return {any} Result of the javascript execution.
     */
    executeJavascript(instance: any, javascript: string): any {
        try {
            return this.evalInContext.call(instance, javascript);
        } catch (ex) {
            this.logger.error('Error evaluating javascript', ex);
        }
    }

    /**
     * Inject all the core libraries in a certain object.
     *
     * @param {any} instance The instance where to inject the libraries.
     */
    injectLibraries(instance: any): void {
        const providers = (<any[]> CORE_PROVIDERS).concat(CORE_CONTENTLINKS_PROVIDERS).concat(CORE_COURSE_PROVIDERS)
                .concat(CORE_COURSES_PROVIDERS).concat(CORE_FILEUPLOADER_PROVIDERS).concat(CORE_GRADES_PROVIDERS)
                .concat(CORE_LOGIN_PROVIDERS).concat(CORE_MAINMENU_PROVIDERS).concat(CORE_SHAREDFILES_PROVIDERS)
                .concat(CORE_SITEHOME_PROVIDERS).concat([CoreSitePluginsProvider]).concat(CORE_USER_PROVIDERS)
                .concat(IONIC_NATIVE_PROVIDERS).concat(this.OTHER_PROVIDERS);

        // We cannot inject anything to this constructor. Use the Injector to inject all the providers into the instance.
        for (const i in providers) {
            const providerDef = providers[i];
            if (typeof providerDef == 'function' && providerDef.name) {
                try {
                    // Inject the provider to the instance. We use the class name as the property name.
                    instance[providerDef.name] = this.injector.get(providerDef);
                } catch (ex) {
                    this.logger.warn('Error injecting provider', providerDef.name, ex);
                }
            }
        }

        // Inject current service.
        instance['CoreCompileProvider'] = this;

        // Add some final classes.
        instance['injector'] = this.injector;
        instance['Validators'] = Validators;
        instance['CoreConfigConstants'] = CoreConfigConstants;
        instance['CoreConstants'] = CoreConstants;
        instance['moment'] = moment;
        instance['Md5'] = Md5;
        instance['CoreSyncBaseProvider'] = CoreSyncBaseProvider;
        instance['CoreCache'] = CoreCache;
        instance['CoreDelegate'] = CoreDelegate;
        instance['CoreContentLinksHandlerBase'] = CoreContentLinksHandlerBase;
        instance['CoreContentLinksModuleGradeHandler'] = CoreContentLinksModuleGradeHandler;
        instance['CoreContentLinksModuleIndexHandler'] = CoreContentLinksModuleIndexHandler;
        instance['CoreCourseModulePrefetchHandlerBase'] = CoreCourseModulePrefetchHandlerBase;
        instance['CoreCourseUnsupportedModuleComponent'] = CoreCourseUnsupportedModuleComponent;
        instance['CoreCourseFormatSingleActivityComponent'] = CoreCourseFormatSingleActivityComponent;
        instance['CoreSitePluginsModuleIndexComponent'] = CoreSitePluginsModuleIndexComponent;
        instance['CoreSitePluginsCourseOptionComponent'] = CoreSitePluginsCourseOptionComponent;
        instance['CoreSitePluginsCourseFormatComponent'] = CoreSitePluginsCourseFormatComponent;
    }

    /**
     * Instantiate a dynamic component.
     *
     * @param {string} template The template of the component.
     * @param {any} componentClass The JS class of the component.
     * @param {Injector} [injector] The injector to use. It's recommended to pass it so NavController and similar can be injected.
     * @return {Promise<ComponentRef<any>>} Promise resolved with the component instance.
     */
    instantiateDynamicComponent(template: string, componentClass: any, injector?: Injector): Promise<ComponentRef<any>> {
        injector = injector || this.injector;

        return this.createAndCompileComponent(template, componentClass).then((factory) => {
            if (factory) {
                // Create and return the component.
                return factory.create(injector, undefined, undefined, injector.get(NgModuleRef));
            }
        });
    }
}

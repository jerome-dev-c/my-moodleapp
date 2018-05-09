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
import { Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { AddonModDataProvider } from '../../../providers/data';
import { AddonModDataFieldPluginComponent } from '../../../classes/field-plugin-component';

/**
 * Component to render data number field.
 */
@Component({
    selector: 'addon-mod-data-field-textarea',
    templateUrl: 'textarea.html'
})
export class AddonModDataFieldTextareaComponent extends AddonModDataFieldPluginComponent implements OnInit {

    component: string;
    componentId: number;

    constructor(protected fb: FormBuilder, protected textUtils: CoreTextUtilsProvider) {
        super(fb);
    }

    format(value: any): string {
        const files = (value && value.files) || [];

        return value ? this.textUtils.replacePluginfileUrls(value.content, files) : '';
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        this.mode = this.mode == 'list' ? 'show' : this.mode;
        this.render();
    }

    protected render(): void {
        if (this.mode == 'show') {
            this.component = AddonModDataProvider.COMPONENT;
            this.componentId = this.database.coursemodule;

            return;
        }

        // Check if rich text editor is enabled.
        if (this.mode == 'edit') {
            const files = (this.value && this.value.files) || [],
                text = this.value ? this.textUtils.replacePluginfileUrls(this.value.content, files) : '';
        }

        this.addControl('f_' + this.field.id, '');
    }
}

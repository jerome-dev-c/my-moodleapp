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

describe('User can manage course glossary', function() {

    it('Click All sections course glossary tabs', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            return MM.clickOn('Digital Literacy');
        }).then(function () {
            return MM.clickOn('All sections');
        }).then(function () {
            return MM.clickOn('Common terms used in digital literacy');
        }).then(function () {
            return MM.goBack();
        }).then(function() {
            done();
        });
    });

    it('View course glossary windows', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('Course overview')
        }).then(function () {
            return MM.clickOn('Digital Literacy');
        }).then(function () {
            return MM.clickOn('Background reading');
        }).then(function () {
            return MM.clickOn('Common terms used in digital literacy');
        }).then(function() {
            expect(MM.getView().getText()).toContain('Read through and add some common terms');
            expect(MM.getView().getText()).toContain('Accessibility');
        }).then(function () {
            return MM.goBack();
        }).then(function() {
            done();
        });
    });

    it('Click course glossary tabs', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('Course overview')
        }).then(function () {
            return MM.clickOn('Digital Literacy');
        }).then(function () {
            return MM.clickOn('Background reading');
        }).then(function () {
            return MM.clickOn('Common terms used in digital literacy');
        }).then(function () {
            return MM.clickOn('Accessibility');
        }).then(function () {
            return MM.goBack();
        }).then(function () {
            return MM.clickOn('Blended learning');
        }).then(function () {
            return MM.goBack();
        }).then(function () {
            return MM.goBack();
        }).then(function() {
            done();
        });
    });

    it('Search course glossary', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('Course overview')
        }).then(function () {
            return MM.clickOn('Digital Literacy');
        }).then(function () {
            return MM.clickOn('Background reading');
        }).then(function () {
            return MM.clickOn('Common terms used in digital literacy');
        }).then(function () {
            return $('[ng-click="pickMode($event)"]').click();
        }).then(function () {
            return MM.clickOn('Search');
        }).then(function () {
            return $('[ng-model="data.value"]').sendKeys('Accessibility');
        }).then(function () {
            return MM.clickOn('Search');
        }).then(function () {
            return MM.clickOn('Accessibility');
        }).then(function () {
            return MM.goBack();
        }).then(function() {
            done();
        });
    });

    it('Click secondary button', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('Course overview')
        }).then(function () {
            return MM.clickOn('Digital Literacy');
        }).then(function () {
            return MM.clickOn('Background reading');
        }).then(function () {
            return MM.clickOn('Common terms used in digital literacy');
        }).then(function () {
            browser.sleep(5000); //wait for button css to render
            return $('[ng-click="showContextMenu($event)"]').click();
        }).then(function() {
           browser.sleep(5000); //wait for css to render
           expect($('.popover-backdrop.active').isPresent()).toBeTruthy();
        }).then(function () {
            done();
        });
    });

});

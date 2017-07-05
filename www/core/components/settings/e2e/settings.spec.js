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

describe('User can change App settings', function() {

    it('User can click settings page tabs', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('App settings');
        }).then(function () {
            return MM.clickOn('General');
        }).then(function() {
           return MM.goBack();
        }).then(function () {
           return MM.clickOn('Space usage');
        }).then(function() {
            return MM.goBack();
        }).then(function () {
           return MM.clickOn('Synchronization');
        }).then(function() {
            return MM.goBack();
        }).then(function() {
            return MM.clickOn('About');
        }).then(function() {
            return MM.goBack();
        }).then(function () {
            done();
        });
    });

    /*it('Change general settings', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('App settings');
        }).then(function () {
            return MM.clickOnElement($('[mm-split-view-link="site.mm_settings-general"]'));
        /*}).then(function () {
            browser.sleep(10000);
            return element(by.model('selectedLanguage')).click();
        }).then(function () {
            return element(by.xpath('/html/body/ion-nav-view/ion-side-menus/ion-side-menu-content/ion-nav-view/ion-view[3]/ion-content/div[1]/ul/li[1]/select/option[9]')).click();
        }).then(function () {
            browser.sleep(10000);
            return element(by.model('selectedLanguage')).click();
        }).then(function () {
            return element(by.xpath('/html/body/ion-nav-view/ion-side-menus/ion-side-menu-content/ion-nav-view/ion-view[2]/ion-content/div[1]/ul/li[1]/select/option[7]')).click();*/
        /*}).then(function () {
            return MM.clickOnElement($('input[ng-model="richTextEditor"]'));
        }).then(function() {
            return MM.clickOnElement($('input[ng-model="richTextEditor"]'));
        }).then(function() {
            return MM.clickOnElement($('input[ng-model="reportInBackground"]'));
        }).then(function() {
            return MM.clickOnElement($('input[ng-model="reportInBackground"]'));
        }).then(function() {
            done();
        });
    });*/

    it('Change Space usage settings', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('App settings');
        }).then(function () {
            return MM.clickOn('Space usage');
        }).then(function() {
            return MM.goBack();
        }).then(function() {
            done();
        });
    });

    /*it('Change Synchronization settings', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('App settings');
        }).then(function () {
            return MM.clickOn('Synchronization');
        }).then(function () {
            MM.clickOnElement($('button[ng-click="synchronize(site.id)"]'));
            return expect(element.all(by.css('ion-spinner[ng-if="site.synchronizing"]')).isDisplayed()).toBeTruthy();
        }).then(function(){
            return MM.clickOnElement($('input[type="checkbox"]'));
        }).then(function() {
            done();
        });
    });*/

    it('Change About settings', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('App settings');
        }).then(function () {
            return MM.clickOn('About');
        }).then(function () {
            expect(MM.getView().getText()).toMatch('Moodle Mobile 3.3.0');
            return MM.goBack();
        }).then(function(){
            done();
        });
    });

});


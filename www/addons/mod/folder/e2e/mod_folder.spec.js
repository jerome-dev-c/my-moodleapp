/**
 * Created by Supun
 */

describe('User can manage course folder', function() {

    it('Click All sections course folder tabs', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My courses');
        }).then(function () {
            return MM.clickOn('Psychology in Cinema');
        }).then(function () {
            return MM.clickOn('All sections');
        }).then(function () {
            return MM.clickOn('Categories and Causes of Mental illness');
        }).then(function () {
            return MM.goBack();
        }).then(function() {
            done();
        });
    });

    it('View course folder windows', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My courses');
        }).then(function () {
            return MM.clickOn('Psychology in Cinema');
        }).then(function () {
            return MM.clickOn('Background information');
        }).then(function () {
            return MM.clickOn('Categories and Causes of Mental illness');
        }).then(function() {
            expect(MM.getView().getText()).toMatch('Classification of mental disorders.pdf');
            expect(MM.getView().getText()).toMatch('CausesMentalIllness.docx');
            expect(MM.getView().getText()).toMatch('PsychoDefinitions.odt');
        }).then(function() {
            done();
        });
    });

    it('Click folder tabs', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My courses');
        }).then(function () {
            return MM.clickOn('Psychology in Cinema');
        }).then(function () {
            return MM.clickOn('Background information');
        }).then(function () {
            return MM.clickOn('Categories and Causes of Mental illness');
        }).then(function () {
            return MM.clickOn('Classification of mental disorders.pdf');
        }).then(function () {
            return MM.clickOn('CausesMentalIllness.docx');
        }).then(function () {
            return MM.clickOn('PsychoDefinitions.odt');
        }).then(function () {
            return MM.goBack();
        }).then(function () {
            done();
        });
    });

    it('Click secondary button', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My courses');
        }).then(function () {
            return MM.clickOn('Psychology in Cinema');
        }).then(function () {
            return MM.clickOn('Background information');
        }).then(function () {
            return MM.clickOn('Categories and Causes of Mental illness');
        }).then(function () {
            return $('.secondary-buttons').click();
        }).then(function() {
            return MM.goBack();
        }).then(function () {
            done();
        });
    });

});


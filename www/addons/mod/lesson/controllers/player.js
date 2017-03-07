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

angular.module('mm.addons.mod_lesson')

/**
 * Lesson player controller.
 *
 * @module mm.addons.mod_lesson
 * @ngdoc controller
 * @name mmaModLessonPlayerCtrl
 */
.controller('mmaModLessonPlayerCtrl', function($scope, $stateParams, $mmaModLesson, $q, $ionicScrollDelegate, $mmUtil,
            mmaModLessonComponent, $mmSyncBlock, $mmaModLessonHelper) {

    var lessonId = $stateParams.lessonid,
        courseId = $stateParams.courseid,
        currentPage = $stateParams.pageid,
        lesson,
        accessInfo,
        offline = false,
        scrollView;

    // Block the lesson so it cannot be synced.
    $mmSyncBlock.blockOperation(mmaModLessonComponent, lessonId);

    // Block leaving the view, we want to save changes before leaving.
    blockData = $mmUtil.blockLeaveView($scope, leavePlayer);

    $scope.component = mmaModLessonComponent;

    // Convenience function to get Lesson data.
    function fetchLessonData() {
        return $mmaModLesson.getLessonById(courseId, lessonId).then(function(lessonData) {
            lesson = lessonData;
            $scope.lesson = lesson;
            $scope.title = lesson.name; // Temporary title.

            return $mmaModLesson.getAccessInformation(lesson.id, offline, true);
        }).then(function(info) {
            accessInfo = info;
            if (info.preventaccessreasons && info.preventaccessreasons.length) {
                // Lesson cannot be attempted, show message and go back.
                $mmUtil.showErrorModal(info.preventaccessreasons[0]);
                blockData && blockData.back();
                return;
            }

            return launchAttempt(currentPage);
        }).catch(function(message) {
            $mmUtil.showErrorModalDefault(message, 'mm.course.errorgetmodule', true);
            return $q.reject();
        });
    }

    // Start or continue an attempt.
    function launchAttempt(pageId) {
        return $mmaModLesson.launchAttempt(lesson.id, undefined, pageId).then(function() {
            currentPage = pageId || accessInfo.firstpageid;

            return loadPage(currentPage);
        });
    }

    // Load a certain page.
    function loadPage(pageId) {
        return $mmaModLesson.getPageData(lesson.id, pageId, undefined, false, true, offline, true).then(function(data) {
            $scope.title = data.page.title;
            $scope.pageContent = data.page.contents;
            $scope.pageLoaded = true;
            $scope.pageButtons = $mmaModLessonHelper.getPageButtonsFromHtml(data.pagecontent);
            currentPage = pageId;
        });
    }

    // Scroll top and show the spinner.
    function showLoading() {
        if (!scrollView) {
            scrollView = $ionicScrollDelegate.$getByHandle('mmaModLessonPlayerScroll');
        }
        scrollView.scrollTop();
        $scope.pageLoaded = false;
    }

    // Function called when the user wants to leave the player. Save the attempt before leaving.
    function leavePlayer() {
        // @todo
        return $q.when();
    }

    // Fetch the Lesson data.
    fetchLessonData().finally(function() {
        $scope.pageLoaded = true;
    });

    // A button was clicked.
    $scope.buttonClicked = function(button) {
        showLoading();

        return $mmaModLesson.processPage(lessonId, currentPage, button.data).then(function(result) {
            if (result.newpageid === 0) {
                // Not a valid page, return to entry view.
                // This happens, for example, when the user clicks to go to previous page and there is no previous page.
                blockData && blockData.back();
                return;
            } else if (result.newpageid == $mmaModLesson.LESSON_EOL) {
                // End of lesson reached.
                // @todo Show grade, progress bar, min questions, etc. in final page.
                $scope.endOfLesson = true;
                $scope.title = lesson.name;
                return;
            }

            $scope.endOfLesson = false;
            // Load new page.
            return loadPage(result.newpageid);
        }).catch(function(error) {
            $mmUtil.showErrorModalDefault(error, 'Error processing page');
            return $q.reject();
        }).finally(function() {
            $scope.pageLoaded = true;
        });
    };

});

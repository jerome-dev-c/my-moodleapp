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

angular.module('mm.addons.mod_workshop')

/**
 * Handler for comments assessment strategy plugin.
 *
 * @module mm.addons.mod_workshop
 * @ngdoc service
 * @name $mmaModWorkshopAssessmentStrategyCommentsHandler
 */
.factory('$mmaModWorkshopAssessmentStrategyCommentsHandler', function() {

    var self = {};

    /**
     * Whether or not the rule is enabled for the site.
     *
     * @return {Boolean}
     */
    self.isEnabled = function() {
        return true;
    };

    /**
     * Get the name of the directive to render this plugin.
     *
     * @return {String} Directive name.
     */
    self.getDirectiveName = function() {
        return 'mma-mod-workshop-assessment-strategy-comments';
    };

    return self;
})

.run(function($mmAddonManager) {
    // Use addon manager to inject $mmaModWorkshopAssessmentStrategyDelegate. This is to provide an example for remote addons,
    // since they cannot assume that the workshop addon will be packaged in custom apps.
    var $mmaModWorkshopAssessmentStrategyDelegate = $mmAddonManager.get('$mmaModWorkshopAssessmentStrategyDelegate');
    if ($mmaModWorkshopAssessmentStrategyDelegate) {
        $mmaModWorkshopAssessmentStrategyDelegate.registerHandler('mmaModWorkshopAssessmentStrategyComments', 'comments',
                '$mmaModWorkshopAssessmentStrategyCommentsHandler');
    }
});

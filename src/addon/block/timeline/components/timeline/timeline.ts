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

import { Component, OnInit, Injector } from '@angular/core';
import * as moment from 'moment';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreCoursesProvider } from '@core/courses/providers/courses';
import { CoreCoursesHelperProvider } from '@core/courses/providers/helper';
import { CoreCourseOptionsDelegate } from '@core/course/providers/options-delegate';
import { AddonBlockComponent } from '../../../classes/block-component';
import { AddonBlockTimelineProvider } from '../../providers/timeline';

/**
 * Component to render a timeline block.
 */
@Component({
    selector: 'addon-block-timeline',
    templateUrl: 'addon-block-timeline.html'
})
export class AddonBlockTimelineComponent extends AddonBlockComponent implements OnInit {
    sort = 'sortbydates';
    filter = 'next30days';
    timeline = {
        events: [],
        loaded: false,
        canLoadMore: undefined
    };
    timelineCourses = {
        courses: [],
        loaded: false,
        canLoadMore: false
    };
    dataFrom: number;
    dataTo: number;

    protected courseIds = [];
    protected fetchContentDefaultError = 'Error getting timeline data.';

    constructor(injector: Injector, private coursesProvider: CoreCoursesProvider, private utils: CoreUtilsProvider,
            private timelineProvider: AddonBlockTimelineProvider, private courseOptionsDelegate: CoreCourseOptionsDelegate,
            private coursesHelper: CoreCoursesHelperProvider) {

        super(injector, 'AddonBlockTimelineComponent');
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        this.switchFilter();
        super.ngOnInit();
    }

    /**
     * Perform the invalidate content function.
     *
     * @return {Promise<any>} Resolved when done.
     */
    protected invalidateContent(): Promise<any> {
        const promises = [];

        promises.push(this.timelineProvider.invalidateActionEventsByTimesort());
        promises.push(this.timelineProvider.invalidateActionEventsByCourses());
        promises.push(this.coursesProvider.invalidateUserCourses());
        promises.push(this.courseOptionsDelegate.clearAndInvalidateCoursesOptions());
        if (this.courseIds.length > 0) {
            promises.push(this.coursesProvider.invalidateCoursesByField('ids', this.courseIds.join(',')));
        }

        return this.utils.allPromises(promises);
    }

    /**
     * Fetch the courses for my overview.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    protected fetchContent(): Promise<any> {
        if (this.sort == 'sortbydates') {
            return this.fetchMyOverviewTimeline().finally(() => {
                this.timeline.loaded = true;
            });
        } else if (this.sort == 'sortbycourses') {
            return this.fetchMyOverviewTimelineByCourses().finally(() => {
                this.timelineCourses.loaded = true;
            });
        }
    }

    /**
     * Load more events.
     */
    loadMoreTimeline(): Promise<any> {
        return this.fetchMyOverviewTimeline(this.timeline.canLoadMore).catch((error) => {
            this.domUtils.showErrorModalDefault(error, this.fetchContentDefaultError);
        });
    }

    /**
     * Load more events.
     *
     * @param {any} course Course.
     * @return {Promise<any>} Promise resolved when done.
     */
    loadMoreCourse(course: any): Promise<any> {
        return this.timelineProvider.getActionEventsByCourse(course.id, course.canLoadMore).then((courseEvents) => {
            course.events = course.events.concat(courseEvents.events);
            course.canLoadMore = courseEvents.canLoadMore;
        }).catch((error) => {
            this.domUtils.showErrorModalDefault(error, this.fetchContentDefaultError);
        });
    }

    /**
     * Fetch the timeline.
     *
     * @param {number} [afterEventId] The last event id.
     * @return {Promise<any>} Promise resolved when done.
     */
    protected fetchMyOverviewTimeline(afterEventId?: number): Promise<any> {
        return this.timelineProvider.getActionEventsByTimesort(afterEventId).then((events) => {
            this.timeline.events = events.events;
            this.timeline.canLoadMore = events.canLoadMore;
        });
    }

    /**
     * Fetch the timeline by courses.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    protected fetchMyOverviewTimelineByCourses(): Promise<any> {
        return this.coursesHelper.getUserCoursesWithOptions().then((courses) => {
            const today = moment().unix();
            courses = courses.filter((course) => {
                return course.startdate <= today && (!course.enddate || course.enddate >= today);
            });

            this.timelineCourses.courses = courses;
            if (courses.length > 0) {
                this.courseIds = courses.map((course) => {
                    return course.id;
                });

                return this.timelineProvider.getActionEventsByCourses(this.courseIds).then((courseEvents) => {
                    this.timelineCourses.courses.forEach((course) => {
                        course.events = courseEvents[course.id].events;
                        course.canLoadMore = courseEvents[course.id].canLoadMore;
                    });
                });
            }
        });
    }

    /**
     * Change timeline filter being viewed.
     */
    switchFilter(): void {
        switch (this.filter) {
            case 'overdue':
                this.dataFrom = -14;
                this.dataTo = 0;
                break;
            case 'next7days':
                this.dataFrom = 0;
                this.dataTo = 7;
                break;
            case 'next30days':
                this.dataFrom = 0;
                this.dataTo = 30;
                break;
            case 'next3months':
                this.dataFrom = 0;
                this.dataTo = 90;
                break;
            case 'next6months':
                this.dataFrom = 0;
                this.dataTo = 180;
                break;
            default:
            case 'all':
                this.dataFrom = -14;
                this.dataTo = undefined;
                break;
        }
    }

    /**
     * Change timeline sort being viewed.
     */
    switchSort(): void {
        if (!this.timeline.loaded && this.sort == 'sortbydates') {
            this.fetchContent();
        } else if (!this.timelineCourses.loaded && this.sort == 'sortbycourses') {
            this.fetchContent();
        }
    }
}

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
import { NavController, ModalController } from 'ionic-angular';
import { TranslateService } from '@ngx-translate/core';
import { CoreLangProvider } from '../lang';

/*
 * "Utils" service with helper functions for text.
*/
@Injectable()
export class CoreTextUtilsProvider {
    element = document.createElement('div'); // Fake element to use in some functions, to prevent re-creating it each time.

    constructor(private translate: TranslateService, private langProvider: CoreLangProvider, private modalCtrl: ModalController) {}

    /**
     * Given a list of sentences, build a message with all of them wrapped in <p>.
     *
     * @param {string[]} messages Messages to show.
     * @return {string} Message with all the messages.
     */
    buildMessage(messages: string[]) : string {
        let result = '';
        messages.forEach((message) => {
            if (message) {
                result += `<p>${message}</p>`;
            }
        });
        return result;
    }

    /**
     * Convert size in bytes into human readable format
     *
     * @param {number} bytes Number of bytes to convert.
     * @param {number} [precision=2] Number of digits after the decimal separator.
     * @return {string} Size in human readable format.
     */
    bytesToSize(bytes: number, precision = 2) : string {

        if (typeof bytes == 'undefined' || bytes < 0) {
            return this.translate.instant('core.notapplicable');
        }

        if (precision < 0) {
            precision = 2;
        }

        let keys = ['core.sizeb', 'core.sizekb', 'core.sizemb', 'core.sizegb', 'core.sizetb'],
            units = this.translate.instant(keys),
            pos = 0;

        if (bytes >= 1024) {
            while (bytes >= 1024) {
                pos++;
                bytes = bytes / 1024;
            }
            // Round to "precision" decimals if needed.
            bytes = Number(Math.round(parseFloat(bytes + 'e+' + precision)) + 'e-' + precision);
        }
        return this.translate.instant('core.humanreadablesize', {size: bytes, unit: units[keys[pos]]});
    }

    /**
     * Clean HTML tags.
     *
     * @param {string} text The text to be cleaned.
     * @param {boolean} [singleLine] True if new lines should be removed (all the text in a single line).
     * @return {string} Clean text.
     */
    cleanTags(text: string, singleLine?: boolean) : string {
        if (!text) {
            return '';
        }

        // First, we use a regexpr.
        text = text.replace(/(<([^>]+)>)/ig,"");
        // Then, we rely on the browser. We need to wrap the text to be sure is HTML.
        this.element.innerHTML = text;
        text = this.element.textContent;
        // Recover or remove new lines.
        text = this.replaceNewLines(text, singleLine ? ' ' : '<br>');
        return text;
    }

    /**
     * Concatenate two paths, adding a slash between them if needed.
     *
     * @param {string} leftPath Left path.
     * @param {string} rightPath Right path.
     * @return {string} Concatenated path.
     */
    concatenatePaths(leftPath: string, rightPath: string) : string {
        if (!leftPath) {
            return rightPath;
        } else if (!rightPath) {
            return leftPath;
        }

        let lastCharLeft = leftPath.slice(-1),
            firstCharRight = rightPath.charAt(0);

        if (lastCharLeft === '/' && firstCharRight === '/') {
            return leftPath + rightPath.substr(1);
        } else if(lastCharLeft !== '/' && firstCharRight !== '/') {
            return leftPath + '/' + rightPath;
        } else {
            return leftPath + rightPath;
        }
    }

    /**
     * Count words in a text.
     *
     * @param {string} text Text to count.
     * @return {number} Number of words.
     */
    countWords(text: string) : number {
        // Clean HTML scripts and tags.
        text = text.replace(/<script[^>]*>([\S\s]*?)<\/script>/gmi, '');
        text = text.replace(/<\/?(?!\!)[^>]*>/gi, '');
        // Decode HTML entities.
        text = this.decodeHTMLEntities(text);
        // Replace underscores (which are classed as word characters) with spaces.
        text = text.replace(/_/gi, " ");

        // This RegEx will detect any word change including Unicode chars. Some languages without spaces won't be counted fine.
        return text.match(/\S+/gi).length;
    }

    /**
     * Decode an escaped HTML text. This implementation is based on PHP's htmlspecialchars_decode.
     *
     * @param {string|number} text Text to decode.
     * @return {string} Decoded text.
     */
    decodeHTML(text: string|number) : string {
        if (typeof text == 'undefined' || text === null || (typeof text == 'number' && isNaN(text))) {
            return '';
        } else if (typeof text != 'string') {
            return '' + text;
        }

        return text
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#039;/g, "'")
            .replace(/&nbsp;/g, ' ');
    }

    /**
     * Decode HTML entities in a text. Equivalent to PHP html_entity_decode.
     *
     * @param {string} text Text to decode.
     * @return {string} Decoded text.
     */
    decodeHTMLEntities(text: string) : string {
        if (text) {
            this.element.innerHTML = text;
            text = this.element.textContent;
            this.element.textContent = '';
        }

        return text;
    }

    /**
     * Same as Javascript's decodeURI, but if an exception is thrown it will return the original URI.
     *
     * @param {string} uri URI to decode.
     * @return {string} Decoded URI, or original URI if an exception is thrown.
     */
    decodeURI(uri: string) : string {
        try {
            return decodeURI(uri);
        } catch(ex) {
            // Error, use the original URI.
        }
        return uri;
    }

    /**
     * Same as Javascript's decodeURIComponent, but if an exception is thrown it will return the original URI.
     *
     * @param {string} uri URI to decode.
     * @return {string} Decoded URI, or original URI if an exception is thrown.
     */
    decodeURIComponent(uri: string) : string {
        try {
            return decodeURIComponent(uri);
        } catch(ex) {
            // Error, use the original URI.
        }
        return uri;
    }

    /**
     * Escapes some characters in a string to be used as a regular expression.
     *
     * @param {string} text Text to escape.
     * @return {string} Escaped text.
     */
    escapeForRegex(text: string) : string {
        if (!text) {
            return '';
        }
        return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    }

    /**
     * Escape an HTML text. This implementation is based on PHP's htmlspecialchars.
     *
     * @param {string|number} text Text to escape.
     * @return {string} Escaped text.
     */
    escapeHTML(text: string|number) : string {
        if (typeof text == 'undefined' || text === null || (typeof text == 'number' && isNaN(text))) {
            return '';
        } else if (typeof text != 'string') {
            return '' + text;
        }

        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    /**
     * Shows a text on a new page.
     *
     * @param {string} title Title of the new state.
     * @param {string} text Content of the text to be expanded.
     * @param {boolean} [isModal] Whether it should be opened in a modal (true) or in a new page (false).
     * @param {string} [component] Component to link the embedded files to.
     * @param {string|number} [componentId] An ID to use in conjunction with the component.
     * @param {NavController} [navCtrl] The NavController instance to use.
     */
    expandText(title: string, text: string, isModal?: boolean, component?: string, componentId?: string|number,
            navCtrl?: NavController) : void {
        if (text.length > 0) {
            let params: any = {
                title: title,
                content: text,
                component: component,
                componentId: componentId
            };

            if (isModal) {
                // Open a modal with the contents.
                params.isModal = true;

                let modal = this.modalCtrl.create('CoreViewerTextPage', params);
                modal.present();
            } else if (navCtrl) {
                // Open a new page with the contents.
                navCtrl.push('CoreViewerTextPage', params);
            }
        }

    }

    /**
     * Formats a text, in HTML replacing new lines by correct html new lines.
     *
     * @param {string} text Text to format.
     * @return {string} Formatted text.
     */
    formatHtmlLines(text: string) : string {
        let hasHTMLTags = this.hasHTMLTags(text);
        if (text.indexOf('<p>') == -1) {
            // Wrap the text in <p> tags.
            text = '<p>' + text + '</p>';
        }

        if (!hasHTMLTags) {
            // The text doesn't have HTML, replace new lines for <br>.
            return this.replaceNewLines(text, '<br>');
        }

        return text;
    }

    /**
     * Formats a text, treating multilang tags and cleaning HTML if needed.
     *
     * @param {string} text Text to format.
     * @param {boolean} [clean] Whether HTML tags should be removed.
     * @param {boolean} [singleLine] Whether new lines should be removed. Only valid if clean is true.
     * @param {number} [shortenLength] Number of characters to shorten the text.
     * @return {Promise<string>} Promise resolved with the formatted text.
     */
    formatText(text: string, clean?: boolean, singleLine?: boolean, shortenLength?: number) : Promise<string> {
        return this.treatMultilangTags(text).then((formatted) => {
            if (clean) {
                formatted = this.cleanTags(formatted, singleLine);
            }
            if (shortenLength > 0) {
                formatted = this.shortenText(formatted, shortenLength);
            }
            return formatted;
        });
    }

    /**
     * Get the pluginfile URL to replace @@PLUGINFILE@@ wildcards.
     *
     * @param {any[]} files Files to extract the URL from. They need to have the URL in a 'url' or 'fileurl' attribute.
     * @return {string} Pluginfile URL, undefined if no files found.
     */
    getTextPluginfileUrl(files: any[]) : string {
        if (files && files.length) {
            let fileURL = files[0].url || files[0].fileurl;
            // Remove text after last slash (encoded or not).
            return fileURL.substr(0, Math.max(fileURL.lastIndexOf('/'), fileURL.lastIndexOf('%2F')));
        }

        return undefined;
    }

    /**
     * Check if a text contains HTML tags.
     *
     * @param {string} text Text to check.
     * @return {boolean} Whether it has HTML tags.
     */
    hasHTMLTags(text: string) : boolean {
        return /<[a-z][\s\S]*>/i.test(text);
    }

    /**
     * Check if a text contains Unicode long chars.
     * Using as threshold Hex value D800
     *
     * @param {string} text Text to check.
     * @return {boolean} True if has Unicode chars, false otherwise.
     */
    hasUnicode(text: string) : boolean {
        for (let x = 0; x < text.length; x++) {
            if (text.charCodeAt(x) > 55295) {
                return true;
            }
        }
        return false;
    }

    /**
     * Check if an object has any long Unicode char.
     *
     * @param {object} data Object to be checked.
     * @return {boolean} If the data has any long Unicode char on it.
     */
    hasUnicodeData(data: object) : boolean {
        for (let el in data) {
            if (typeof data[el] == 'object') {
                if (this.hasUnicodeData(data[el])) {
                    return true;
                }
            } else if (typeof data[el] == 'string' && this.hasUnicode(data[el])) {
                return true;
            }
        }
        return false;
    }

    /**
     * Same as Javascript's JSON.parse, but if an exception is thrown it will return the original text.
     *
     * @param {string} json JSON text.
     * @return {any} JSON parsed as object or what it gets.
     */
    parseJSON(json: string) : any {
        try {
            return JSON.parse(json);
        } catch(ex) {
            // Error, use the json text.
        }
        return json;
    }

    /**
     * Replace all characters that cause problems with files in Android and iOS.
     *
     * @param {string} text Text to treat.
     * @return {string} Treated text.
     */
    removeSpecialCharactersForFiles(text: string) : string {
        return text.replace(/[#:\/\?\\]+/g, '_');
    }

    /**
     * Replace all the new lines on a certain text.
     *
     * @param {string} text The text to be treated.
     * @param {string} newValue Text to use instead of new lines.
     * @return {string} Treated text.
     */
    replaceNewLines(text: string, newValue: string) : string {
        return text.replace(/(?:\r\n|\r|\n)/g, newValue);
    }

    /**
     * Replace @@PLUGINFILE@@ wildcards with the real URL in a text.
     *
     * @param {string} Text to treat.
     * @param {any[]} files Files to extract the pluginfile URL from. They need to have the URL in a url or fileurl attribute.
     * @return {string} Treated text.
     */
    replacePluginfileUrls(text: string, files: any[]) : string {
        if (text) {
            let fileURL = this.getTextPluginfileUrl(files);
            if (fileURL) {
                return text.replace(/@@PLUGINFILE@@/g, fileURL);
            }
        }
        return text;
    }

    /**
     * Replace pluginfile URLs with @@PLUGINFILE@@ wildcards.
     *
     * @param {string} text Text to treat.
     * @param {any[]} files Files to extract the pluginfile URL from. They need to have the URL in a url or fileurl attribute.
     * @return {string} Treated text.
     */
    restorePluginfileUrls(text: string, files: any[]) : string {
        if (text) {
            let fileURL = this.getTextPluginfileUrl(files);
            if (fileURL) {
                return text.replace(new RegExp(this.escapeForRegex(fileURL), 'g'), '@@PLUGINFILE@@');
            }
        }
        return text;
    }

    /**
     * Rounds a number to use a certain amout of decimals or less.
     * Difference between this function and float's toFixed:
     * 7.toFixed(2) -> 7.00
     * roundToDecimals(7, 2) -> 7
     *
     * @param {number} number Number to round.
     * @param {number} [decimals=2] Number of decimals. By default, 2.
     * @return {number} Rounded number.
     */
    roundToDecimals(number: number, decimals = 2) : number {
        let multiplier = Math.pow(10, decimals);
        return Math.round(number * multiplier) / multiplier;
    }

    /**
     * Add quotes to HTML characters.
     *
     * Returns text with HTML characters (like "<", ">", etc.) properly quoted.
     * Based on Moodle's s() function.
     *
     * @param {string} text Text to treat.
     * @return {string} Treated text.
     */
    s(text: string) : string {
        if (!text) {
            return '';
        }

        return this.escapeHTML(text).replace(/&amp;#(\d+|x[0-9a-f]+);/i, '&#$1;');
    }

    /**
     * Shortens a text to length and adds an ellipsis.
     *
     * @param {string} text The text to be shortened.
     * @param {number} length The desired length.
     * @return {string} Shortened text.
     */
    shortenText(text: string, length: number) : string {
        if (text.length > length) {
            text = text.substr(0, length);

            // Now, truncate at the last word boundary (if exists).
            let lastWordPos = text.lastIndexOf(' ');
            if (lastWordPos > 0) {
                text = text.substr(0, lastWordPos);
            }
            text += '&hellip;';
        }
        return text;
    }

    /**
     * Strip Unicode long char of a given text.
     * Using as threshold Hex value D800
     *
     * @param {string} text Text to check.
     * @return {string} Without the Unicode chars.
     */
    stripUnicode(text: string) : string {
        let stripped = '';
        for (let x = 0; x < text.length; x++) {
            if (text.charCodeAt(x) <= 55295){
                stripped += text.charAt(x);
            }
        }
        return stripped;
    }

    /**
     * Treat the multilang tags from a HTML code, leaving only the current language.
     *
     * @param {string} text The text to be treated.
     * @return {Promise<string>} Promise resolved with the formatted text.
     */
    treatMultilangTags(text: string) : Promise<string> {
        if (!text) {
            return Promise.resolve('');
        }

        return this.langProvider.getCurrentLanguage().then((language) => {
            // Match the current language.
            let currentLangRegEx = new RegExp('<(?:lang|span)[^>]+lang="' + language + '"[^>]*>(.*?)<\/(?:lang|span)>', 'g'),
                anyLangRegEx = /<(?:lang|span)[^>]+lang="[a-zA-Z0-9_-]+"[^>]*>(.*?)<\/(?:lang|span)>/g;

            if (!text.match(currentLangRegEx)) {
                // Current lang not found. Try to find the first language.
                let matches = text.match(anyLangRegEx);
                if (matches && matches[0]) {
                    language = matches[0].match(/lang="([a-zA-Z0-9_-]+)"/)[1];
                    currentLangRegEx = new RegExp('<(?:lang|span)[^>]+lang="' + language + '"[^>]*>(.*?)<\/(?:lang|span)>', 'g');
                } else {
                    // No multi-lang tag found, stop.
                    return text;
                }
            }
            // Extract contents of current language.
            text = text.replace(currentLangRegEx, '$1');
            // Delete the rest of languages
            text = text.replace(anyLangRegEx, '');
            return text;
        });
    }

    /**
     * If a number has only 1 digit, add a leading zero to it.
     *
     * @param {string|number} num Number to convert.
     * @return {string} Number with leading zeros.
     */
    twoDigits(num: string|number) : string {
        if (num < 10) {
            return '0' + num;
        } else {
            return '' + num; // Convert to string for coherence.
        }
    }

    /**
     * Make a string's first character uppercase.
     *
     * @param {string} text Text to treat.
     * @return {string} Treated text.
     */
    ucFirst(text: string) : string {
        return text.charAt(0).toUpperCase() + text.slice(1);
    }
}

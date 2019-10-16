/*global tinymce */

;(function (tinymce) {
    'use strict';

    var noJQuery = function () { };

    noJQuery.prototype = {

        constructor: noJQuery,
        isIE: function () {
            var uA = navigator.userAgent;
            return (uA.indexOf('Trident') != -1 && uA.indexOf('rv:11') != -1) || (uA.indexOf('Trident') != -1 && uA.indexOf('MSIE') != -1);
        },
        extend: function () {
            for (var i = 1; i < arguments.length; i++)
                for (var key in arguments[i])
                    if (arguments[i].hasOwnProperty(key))
                        arguments[0][key] = arguments[i][key];
            return arguments[0];
        },
        inArray: function (elem, arr, i) {
            return arr == null ? -1 : arr.indexOf(elem, i);
        },
        trim: function (text) {
            return (text || "").trim();
        },
        grep: function (elems, callback, inv) {
            var ret = [];

            for (var i = 0, length = elems.length; i < length; i++) {
                if (!inv !== !callback(elems[i], i)) {
                    ret.push(elems[i]);
                }
            }

            return ret;
        },
        getText: function (elems) {
            var ret = "", elem;

            for (var i = 0; elems[i]; i++) {
                elem = elems[i];
                if (elem.nodeType === 3 || elem.nodeType === 4) {
                    ret += elem.nodeValue;
                } else if (elem.nodeType !== 8) {
                    ret += jsH.getText(elem.childNodes);
                }
            }

            return ret;
        },
        isFunction: function (obj) {
            return typeof obj === 'function';
        },
        offset: function (el) {
            var rect = el.getBoundingClientRect();

            return {
                top: rect.top + document.body.scrollTop,
                left: rect.left + document.body.scrollLeft
            };

        },
        innerHeight: function (el) {
            var style = window.getComputedStyle(el, null);
            var height = style.getPropertyValue("height");
            if (height === 'auto') {
                height = el.offsetHeight;
            }


            return height;
        },
        position: function (el) {
            return { left: el.offsetLeft, top: el.offsetTop };

        },
        each: function (obj, callback, args) {
            var value, i = 0,
                length = obj.length,
                isArray = Array.isArray(obj);

            if (args) {
                if (isArray) {
                    for (; i < length; i++) {
                        value = callback.apply(obj[i], args);

                        if (value === false) {
                            break;
                        }
                    }
                } else {
                    for (i in obj) {
                        value = callback.apply(obj[i], args);

                        if (value === false) {
                            break;
                        }
                    }
                }
            } else {
                if (isArray) {
                    for (; i < length; i++) {
                        value = callback.call(obj[i], i, obj[i]);

                        if (value === false) {
                            break;
                        }
                    }
                } else {
                    for (i in obj) {
                        value = callback.call(obj[i], i, obj[i]);

                        if (value === false) {
                            break;
                        }
                    }
                }
            }

            return obj;
        },
        removeClass: function (el, className) {
            if (el.classList)
                el.classList.remove(className);
            else
                el.className = el.className.replace(new RegExp('(^|\\b)' + className.split(' ').join('|') + '(\\b|$)', 'gi'), ' ');
        },
        addClass: function (el, className) {
            if (el) {
                if (el.classList)
                    el.classList.add(className);
                else {
                    el.className += ' ' + className;
                }
            }
        },
        data: function (item, attr) {
            var value = item.getAttribute('data-' + attr);
            var o = {};
            o[attr] = value;
            return o;
        },
        getAllDataAttributes: function (el) {
            var o = {};
            if (el.attributes) {
                Array.prototype.slice.call(el.attributes).forEach(function (at) {
                    if (/^data-/.test(at.name)) {
                        o[at.name.replace(/^data-/, "")] = at.value;
                    }
                });
            }
            return o;
        },
        closest: function (el, selector) {

            if (el.matches) {
                while (el.matches && !el.matches(selector)) {
                    el = el.parentNode
                }
            } else if (el.msMatchesSelector) {
                while (el.msMatchesSelector && !el.msMatchesSelector(selector)) {
                    el = el.parentNode
                }
            } else {
                el = null;
            }
            return el;

        },
        isEmptyObject: function (obj) {
            return Object.keys(obj).length === 0 && obj.constructor === Object;

        }
    };

    var AutoComplete = function (ed, options) {
        this.jsH = new noJQuery();

        this.editor = ed;

        this.options = this.jsH.extend({}, {
            source: [],
            delay: 500,
            queryBy: 'name',
            items: 10
        }, options);

        this.matcher = this.options.matcher || this.matcher;
        this.renderDropdown = this.options.renderDropdown || this.renderDropdown;
        this.render = this.options.render || this.render;
        this.insert = this.options.insert || this.insert;
        this.highlighter = this.options.highlighter || this.highlighter;
        this.onSearchAllProjectsClicked = this.options.onSearchAllProjectsClicked;
        this.onDropdownClose = this.options.onDropdownClose;
        this.areEmailDiscussionsEnabled = this.options.areEmailDiscussionsEnabled;
        this.sorter = this.options.sorter || this.sorter;

        this.query = '';
        this.hasFocus = true;
        this.artifactDropdownClassName = 'tinymce-inline-trace tinymce-inline-trace__dropdown dropdown-menu';
        this.glossaryDropdownClassName = 'tinymce-glossary-reference tinymce-glossary-reference__dropdown dropdown-menu';
        this.mentionDropdownClassName = 'rte-autocomplete tinymce-mention dropdown-menu';

        this.cleanUpEditor();

        this.renderInput();

        this.bindEvents();
    };

    AutoComplete.prototype = {

        constructor: AutoComplete,

        renderInput: function () {
            var rawHtml = '<span id="autocomplete">' +
                '<span id="autocomplete-delimiter">' + this.options.delimiter + '</span>' +
                '<span id="autocomplete-searchtext"><span class="dummy">\uFEFF</span></span>' +
                '</span>';

            this.editor.execCommand('mceInsertContent', false, rawHtml);
            this.editor.focus();
            this.editor.selection.select(this.editor.selection.dom.select('span#autocomplete-searchtext span')[0]);
            this.editor.selection.collapse(0);
        },

        bindEvents: function () {
            this.editor.on('keyup', this.editorKeyUpProxy = this.rteKeyUp.bind(this));
            this.editor.on('keydown', this.editorKeyDownProxy = this.rteKeyDown.bind(this), true);
            this.editor.on('click', this.editorClickProxy = this.rteClicked.bind(this));

            document.body.addEventListener('click', this.bodyClickProxy = this.rteLostFocus.bind(this));
            document.addEventListener('scroll', this.rteScroll = function (e) {
                if(e.target.className !== this.artifactDropdownClassName &&
                   e.target.className !== this.glossaryDropdownClassName &&
                   e.target.className !== this.mentionDropdownClassName) {
                    this.cleanUp(false, false);
                }
            }.bind(this), true);
            window.addEventListener('resize', this.rteResize = function (e) {
                this.cleanUp(false, false);
            }.bind(this), true);
        },

        unbindEvents: function () {
            this.editor.off('keyup', this.editorKeyUpProxy);
            this.editor.off('keydown', this.editorKeyDownProxy);
            this.editor.off('click', this.editorClickProxy);

            document.body.removeEventListener('click', this.bodyClickProxy);
            document.removeEventListener('scroll', this.rteScroll);
            window.removeEventListener('resize', this.rteResize);
        },

        rteKeyUp: function (e) {
            switch (e.which || e.keyCode) {
                //DOWN ARROW
                case 40:
                //UP ARROW
                case 38:
                //SHIFT
                case 16:
                //CTRL
                case 17:
                //ALT
                case 18:
                    break;

                //BACKSPACE
                case 8:
                    switch (this.query.length) {
                        case 0: // The user has removed the delimiter as well
                            this.cleanUp(true, false);
                            break;
                        case 1: // The user has removed everything except the delimiter. We need to remove some extra tags that TinyMce adds to keep the autocomplte working
                            var caret = this.editor.dom.select('span#autocomplete span#_mce_caret')[0];
                            var searchtext = this.editor.dom.select('span#autocomplete span#autocomplete-searchtext')[0];

                            if (caret && searchtext) {
                                this.editor.dom.add(caret.parentElement, searchtext);
                                this.editor.dom.remove(caret);
                            }

                            this.editor.selection.select(this.editor.selection.dom.select('span#autocomplete-searchtext span')[0]);
                            this.editor.selection.collapse(0);
                            this.lookup();
                            break;
                        default:
                            this.lookup();
                    }
                    break;

                //TAB
                case 9:
                //ENTER
                case 13:
                    var item = (this.dropdown !== undefined) ? (this.options.delimiter === '@') ? this.dropdown.querySelectorAll('li.active') : this.dropdown.firstChild.querySelectorAll('li.active') : [];
                    if (item.length) {
                        this.select(this.jsH.getAllDataAttributes(item[0]));
                        this.cleanUp(false, false);
                    } else {
                        this.cleanUp(true, false);
                    }
                    break;

                //ESC
                case 27:
                    this.cleanUp(true, false);
                    break;

                //SPACE
                case 32:
                    // First character after delimiter is a space
                    const editorBody = this.editor.getBody().querySelector('#autocomplete-searchtext');

                    if (!editorBody || !editorBody.innerText) {
                        break;
                    }

                    const innerText = editorBody.innerText.replace('\ufeff', '');

                    // SPACE (32) is automatically replaced by NO-BREAK SPACE (160) in Chrome
                    if (innerText.length === 1 && (innerText.charCodeAt(0) == 160 || innerText.charCodeAt(0) == 32)) {
                        this.query = '';
                        this.cleanUp(true, false);
                    }
                    break;

                default:
                    this.lookup();
            }
        },

        rteKeyDown: function (e) {
            switch (e.which || e.keyCode) {
                //TAB
                case 9:
                //ENTER
                case 13:
                //ESC
                case 27:
                    e.preventDefault();
                    break;

                //UP ARROW
                case 38:
                    e.preventDefault();
                    if (this.dropdown !== undefined) {
                        this.highlightPreviousResult();
                    }
                    break;
                //DOWN ARROW
                case 40:
                    e.preventDefault();
                    if (this.dropdown !== undefined) {
                        this.highlightNextResult();
                    }
                    break;
            }

            e.stopPropagation();
        },

        rteClicked: function (e) {
            var target = e.target,
                id;

            if (target.parentNode && target.parentNode.getAttribute) {
                id = target.parentNode.getAttribute("id");
            }

            if (this.hasFocus && id !== 'autocomplete-searchtext') {
                this.cleanUp(true, false);
            }
        },

        rteLostFocus: function () {
            if (this.hasFocus) {
                this.cleanUp(true, false);
            }
        },

        lookup: function () {
            var editorBody = this.editor.getBody().querySelector('#autocomplete-searchtext');

            if (!editorBody || !editorBody.innerText) {
                this.cleanUp(false, false);
                return ;
            }

            var delimiter = this.editor.getBody().querySelector('#autocomplete-delimiter');
            if (!delimiter || !delimiter.innerText || delimiter.innerText !== this.options.delimiter) {
                this.cleanUp(true, true);
                return ;
            }

            this.query = this.jsH.trim(editorBody.innerText).replace('\ufeff', '');

            if (this.dropdown === undefined) {
                this.show();
            }

            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(function () {
                // Added delimiter parameter as last argument for backwards compatibility.
                var items = this.jsH.isFunction(this.options.source) ? this.options.source(this.query, this.process.bind(this), this.options.delimiter) : this.options.source;
                if (items) {
                    this.process(items);
                }
            }.bind(this), this.options.delay);
        },

        matcher: function (item) {
            return ~item[this.options.queryBy].toLowerCase().indexOf(this.query.toLowerCase());
        },

        sorter: function (items) {
            var beginswith = [],
                caseSensitive = [],
                caseInsensitive = [],
                item;

            while ((item = items.shift()) !== undefined) {
                if (!item[this.options.queryBy].toLowerCase().indexOf(this.query.toLowerCase())) {
                    beginswith.push(item);
                } else if (~item[this.options.queryBy].indexOf(this.query)) {
                    caseSensitive.push(item);
                } else {
                    caseInsensitive.push(item);
                }
            }

            return beginswith.concat(caseSensitive, caseInsensitive);
        },

        highlighter: function (text) {
            return text.replace(new RegExp('(' + this.query.replace(/([.?*+^$[\]\\(){}|-])/g, '\\$1') + ')', 'ig'), function ($1, match) {
                return '<strong>' + match + '</strong>';
            });
        },

        // TODO: Will update dropdown look in STOR-19376 once search component dropdown completed
        show: function () {
            var offset = this.editor.inline ? this.offsetInline() : this.offset();

            var div = document.createElement("div");
            div.innerHTML = this.renderDropdown();
            this.dropdown = div.firstChild;
            if (offset.top !== null) {
                this.dropdown.style.top = offset.top + "px";
                this.dropdown.style.bottom = "auto";

                if (this.options.delimiter !== '@') {
                    this.dropdown.firstChild.style.top = "-4px";
                    this.dropdown.firstChild.style.bottom = "auto";
                }
            } else {
                this.dropdown.style.top = "auto";
                this.dropdown.style.bottom = offset.bottom + "px";

                if (this.options.delimiter !== '@') {
                    this.dropdown.firstChild.style.top = "auto";
                    this.dropdown.firstChild.style.bottom = "-2px";
                }
            }
            if (offset.left !== null) {
                this.dropdown.style.left = offset.left + "px";
                this.dropdown.style.right = "auto";

                if (this.options.delimiter !== '@') {
                    this.dropdown.firstChild.style.left = "0px";
                    this.dropdown.firstChild.style.right = "auto";
                }
            } else {
                this.dropdown.style.left = "auto";
                this.dropdown.style.right = offset.right + "px";

                if (this.options.delimiter !== '@') {
                    this.dropdown.firstChild.style.left = "auto";
                    this.dropdown.firstChild.style.right = "0px";
                }
            }
            this.dropdown.classList.add("arrow-" + offset.arrow.horizontal);
            this.dropdown.classList.add("arrow-" + offset.arrow.vertical);

            document.body.appendChild(this.dropdown);

            this.dropdown.addEventListener('click', this.autoCompleteClick.bind(this));
        },

        process: function (data, isFullSearch, keepTyping) {
            if (!this.hasFocus) {
                return;
            }

            var _this = this,
                result = [],
                items = this.jsH.grep(data, function (item) {
                    return _this.matcher(item);
                });

            items = _this.sorter(items);

            if (_this.options.delimiter === '@') {
                items = items.slice(0, this.options.items);
            }
            if (_this.options.delimiter === '@' && !_this.areEmailDiscussionsEnabled) { //this is needed for the warning message we display in the dropdown when email discussions are disabled.
                items.push({ id: "PlaceHolderEntry", name: "EmailDiscussionDisabled", email: "EmailDiscussionDisabled" });
            } else if (_this.options.delimiter === '^' && items.length === 0) {
                items.push({ termId: -1, termName: "NoResultsFound" });
            } else if (_this.options.delimiter === '#' && items.length === 0) {
                items.push({ itemId: -1, name: "NoResultsFound" });
                if (!isFullSearch) {
                    items.push({ itemId: -2, name: "SearchAllProjects" });
                }
            } else if (_this.options.delimiter === '#' && keepTyping) {
                items.push({ itemId: -3, name: "KeepTyping" });
            } else if (_this.options.delimiter === '#' && !isFullSearch) {
                items.push({ itemId: -2, name: "SearchAllProjects" });
            }

            const dropdown = (_this.options.delimiter === '@') ? this.dropdown : this.dropdown.firstChild;
            dropdown.innerHTML = '';

            for (var i = 0; i < items.length; i++) {
                var item = items[i];

                var li = this.render(item);

                this.jsH.each(item, function (key, val) {
                    li.setAttribute('data-' + key, val);
                });
                dropdown.appendChild(li);
            }

            if (dropdown.childNodes.length > 0) {
                dropdown.style.display = 'block';
            } else {
                dropdown.style.display = 'none';
            }
        },

        renderDropdown: function () {
            if (this.options.delimiter === '@') {
            return '<ul tabindex="0" class="' + this.mentionDropdownClassName + '"><li class="loading"></li></ul>'; //need to add a class starting with "mce-" to not make the inline editor disappear
            } else if (this.options.delimiter === '^') {
                return '<div tabindex="0" class="rte-autocomplete tinymce-glossary-reference"><ul class="' + this.glossaryDropdownClassName + '"><li class="loading"></li></ul></div>'; //need to add a class starting with "mce-" to not make the inline editor disappear
            } else if (this.options.delimiter === '#') {
                // TODO: Will update dropdown look in STOR-19376 once search component dropdown completed
                return '<div tabindex="0" class="rte-autocomplete tinymce-inline-trace"><ul class="' + this.artifactDropdownClassName + '"><li class="loading"></li></ul></div>'; //need to add a class starting with "mce-" to not make the inline editor disappear
            }
        },

        render: function (item) {
            return '<li>' +
                '<a href="javascript:;"><span>' + item[this.options.queryBy] + '</span></a>' +
                '</li>';
        },

        autoCompleteClick: function (e) {
            e.stopPropagation();
            e.preventDefault();

            if (e.target.className === "tinymce-inline-trace__show-all") {
                this.onSearchAllProjectsClicked();
                this.editor.focus();
                return;
            }

            var item = this.jsH.getAllDataAttributes(this.jsH.closest(e.target, 'li'));

            if (!this.jsH.isEmptyObject(item)) {
                this.select(item);
                this.cleanUp(false, false);
            }
        },

        highlightPreviousResult: function () {
            this.highlightResult(0);
        },

        highlightNextResult: function () {
            this.highlightResult(1);
        },

        highlightResult: function (direction) {
            const dropdown = (this.options.delimiter === '@') ? this.dropdown : this.dropdown.firstChild;

            var activeLi = dropdown.querySelector('li.active'),
                items = Array.prototype.slice.call(dropdown.children),
                length = items.length,
                currentIndex = 0,
                index = 0;

            if (direction === 0) {
                currentIndex = activeLi === null ? length : items.indexOf(activeLi);
                index = (currentIndex === 0) ? length - 1 : --currentIndex;
            } else {
                currentIndex = activeLi === null ? -1 : items.indexOf(activeLi);
                index = (currentIndex === length - 1) ? 0 : ++currentIndex;
            }

            var liArray = dropdown.querySelectorAll('li');
            for (var i = 0; i < liArray.length; i++) {
                this.jsH.removeClass(liArray[i], 'active');
            }

            this.jsH.addClass(items[index], 'active');
            this.keepHighlightedItemInView(items[index]);
        },

        keepHighlightedItemInView: function (item) {
            var dropdown = (this.options.delimiter === '@') ? this.dropdown : this.dropdown.firstChild;
            var dropdownTop = dropdown.scrollTop;
            var dropdownBottom = dropdownTop + dropdown.clientHeight;

            //Determine item top and bottom
            var itemTop = item.offsetTop;
            var itemBottom = itemTop + item.clientHeight;

            //Check if out of view
            if (itemTop < dropdownTop) {
                dropdown.scrollTop -= (dropdownTop - itemTop);
            } else if (itemBottom > dropdownBottom) {
                dropdown.scrollTop += (itemBottom - dropdownBottom);
            }
        },

        select: function (item) {
            this.editor.focus();
            var selection = this.editor.dom.select('span#autocomplete')[0];
            this.editor.dom.remove(selection);
            this.editor.execCommand('mceInsertContent', false, this.insert(item));
        },

        insert: function (item) {
            return '<span>' + item[this.options.queryBy] + '</span>&nbsp;';
        },

        cleanUp: function (rollback, delimiterDeleted) {
            this.unbindEvents();
            this.hasFocus = false;
            this.onDropdownClose();

            if (this.dropdown !== undefined) {
                this.dropdown.parentNode.removeChild(this.dropdown);

                delete this.dropdown;
            }

            if (rollback) {
                var text = this.query;
                var selection = this.editor.dom.select('span#autocomplete')[0];

                if (selection) {//is the tinymce editor still visible?
                    var p = document.createElement('p');
                    p.innerText = (delimiterDeleted) ? text : this.options.delimiter + text;
                    var replacement = p.firstChild;
                    var height = window.getComputedStyle(selection).getPropertyValue("height") === 'auto' ? selection.offsetHeight : window.getComputedStyle(selection).getPropertyValue("height");

                    var focus = this.jsH.offset(this.editor.selection.getNode()).top === (this.jsH.offset(selection).top + ((selection.offsetHeight - height) / 2));

                    this.editor.dom.replace(replacement, selection);

                    if (focus) {
                        this.editor.selection.select(replacement);
                        this.editor.selection.collapse();
                    }
                }
            }
        },

        cleanUpEditor: function () {
            var selection = this.editor.dom.select('span#autocomplete')[0];

            if (selection) {//is the tinymce editor still visible?
                var p = document.createElement('p');
                var delimiter = selection.firstChild.innerText;
                var text = selection.lastChild.innerText;
                p.innerText = delimiter + text;
                var replacement = p.firstChild;
                var height = window.getComputedStyle(selection).getPropertyValue("height") === 'auto' ? selection.offsetHeight : window.getComputedStyle(selection).getPropertyValue("height");

                var focus = this.jsH.offset(this.editor.selection.getNode()).top === (this.jsH.offset(selection).top + ((selection.offsetHeight - height) / 2));

                this.editor.dom.replace(replacement, selection);

                if (focus) {
                    this.editor.selection.select(replacement);
                    this.editor.selection.collapse();
                }
            }
        },

        offset: function () {
            var rtePosition = this.jsH.offset(this.editor.getContainer()),
                contentAreaPosition = this.jsH.position(this.editor.getContentAreaContainer()),
                node = this.editor.dom.select("span#autocomplete")[0],
                nodePosition = this.jsH.position(node),
                scrollTop = this.jsH.isIE() ? this.editor.getDoc().documentElement.scrollTop : this.editor.getDoc().body.scrollTop;

            var nodePositionTop = rtePosition.top + contentAreaPosition.top + nodePosition.top - scrollTop,
                nodePositionLeft = rtePosition.left + contentAreaPosition.left + nodePosition.left;

            var showBelow = nodePositionTop < window.innerHeight / 2,
                showRight = nodePositionLeft < window.innerWidth * .75;

            return {
                top: showBelow ? nodePositionTop + 8 + this.jsH.innerHeight(this.editor.selection.getNode()) : null,
                bottom: showBelow ? null : window.innerHeight - nodePositionTop + 5,
                left: showRight ? nodePositionLeft : null,
                right: showRight ? null : window.innerWidth - nodePositionLeft - node.offsetWidth - 13,
                arrow: {
                    vertical: (showBelow ? "top" : "bottom"),
                    horizontal: (showRight ? "left" : "right")
                }
            };
        },

        offsetInline: function () {
            var node = this.editor.dom.select("span#autocomplete")[0],
                nodePosition = this.jsH.offset(node);

            var showBelow = nodePosition.top < window.innerHeight / 2,
                showRight = nodePosition.left < window.innerWidth * .75;

            return {
                top: showBelow ? nodePosition.top + 8 + this.jsH.innerHeight(this.editor.selection.getNode()) : null,
                bottom: showBelow ? null : window.innerHeight - nodePosition.top + 5,
                left: showRight ? nodePosition.left : null,
                right: showRight ? null : window.innerWidth - nodePosition.left - node.offsetWidth - 13,
                arrow: {
                    vertical: (showBelow ? "top" : "bottom"),
                    horizontal: (showRight ? "left" : "right")
                }
            };
        }

    };

    tinymce.create('tinymce.plugins.Mention', {

        init: function (ed) {

            var autoComplete,
                autoCompleteData = ed.getParam('mentions');

            var jsH = new noJQuery();

            // If the delimiter is undefined set default value to ['@'].
            // If the delimiter is a string value convert it to an array. (backwards compatibility)
            autoCompleteData.delimiter = (autoCompleteData.delimiter !== undefined) ? !Array.isArray(autoCompleteData.delimiter) ? [autoCompleteData.delimiter] : autoCompleteData.delimiter : ['@'];

            function prevCharIsSpace() {
                var start = ed.selection.getRng(true).startOffset,
                    text = ed.selection.getRng(true).startContainer.data || '',
                    charachter = start > 0 ? text.substr(start - 1, 1) : '';

                return (!!jsH.trim(charachter).length) ? false : true;
            }

            ed.on('keypress', function (e) {
                var delimiterIndex = jsH.inArray(String.fromCharCode(e.which || e.keyCode), autoCompleteData.delimiter);
                if (delimiterIndex > -1 && prevCharIsSpace()) {
                    if (autoComplete === undefined || (autoComplete.hasFocus !== undefined && !autoComplete.hasFocus)) {
                        e.preventDefault();
                        // Clone options object and set the used delimiter.
                        autoComplete = new AutoComplete(ed, jsH.extend({}, autoCompleteData, { delimiter: autoCompleteData.delimiter[delimiterIndex] }));
                    }
                }
            });

        },

        getInfo: function () {
            return {
                longname: 'mention',
                author: 'Steven Devooght',
                version: tinymce.majorVersion + '.' + tinymce.minorVersion
            };
        }
    });

    tinymce.PluginManager.add('mention', tinymce.plugins.Mention);

}(tinymce));

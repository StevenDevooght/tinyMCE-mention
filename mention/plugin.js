/*global tinymce, jQuery */

(function (tinymce) {
    'use strict';

    var jsHelper = {
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

            // Go through the array, only saving the items
            // that pass the validator function
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

                // Get the text from text nodes and CDATA nodes
                if (elem.nodeType === 3 || elem.nodeType === 4) {
                    ret += elem.nodeValue;

                    // Traverse everything else, except comment nodes
                } else if (elem.nodeType !== 8) {
                    ret += jsHelper.getText(elem.childNodes);
                }
            }

            return ret;
        },
        isFunction: function (obj) {
            return toString.call(obj) === "[object Function]";
        },
        offset: function (el) {
            var rect = el.getBoundingClientRect();

            return {
                top: rect.top + document.body.scrollTop,
                left: rect.left + document.body.scrollLeft
            };

        },
        innerHeight: function (el) {
            let style = window.getComputedStyle(el, null);
            let height = style.getPropertyValue("height");
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

                // A special, fast, case for the most common use of each
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
            let value = item.getAttribute('data-' + attr);
            let o = {};
            o[attr] = value;
            return o;
        },
        getAllDataAttributes: function (el) {
            return Array.prototype.filter.call(el.attributes, function (at) {
                return /^data-/.test(at.name);
            });
        },
        closest: function (el, selector) {

            while (el.matches && !el.matches(selector)) {
                el = el.parentNode
            };
            return el.matches ? el : null;

        },
        isEmptyObject: function (obj) {
            return Object.keys(obj).length === 0 && obj.constructor === Object;

        }
    }

    var AutoComplete = function (ed, options) {
        this.editor = ed;

        this.options = jsHelper.extend({}, {
            source: [],
            delay: 500,
            queryBy: 'name',
            items: 10
        }, options);

        this.matcher = this.options.matcher || this.matcher;
        //  this.renderDropdown = this.options.renderDropdown || this.renderDropdown;   //TODO
        //  this.render = this.options.render || this.render;                           //TODO
        this.insert = this.options.insert || this.insert;
        this.highlighter = this.options.highlighter || this.highlighter;

        this.query = '';
        this.hasFocus = true;

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

            document.querySelector('body').addEventListener('click', this.bodyClickProxy = this.rteLostFocus.bind(this));

            this.editor.getWin().addEventListener('scroll', this.rteScroll = function () { this.cleanUp(true); }.bind(this));
        },

        unbindEvents: function () {
            this.editor.off('keyup', this.editorKeyUpProxy);
            this.editor.off('keydown', this.editorKeyDownProxy);
            this.editor.off('click', this.editorClickProxy);

            document.querySelector('body').removeEventListener('click', this.bodyClickProxy);

            this.editor.getWin().removeEventListener('scroll', this.rteScroll);
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
                    if (this.query === '') {
                        this.cleanUp(true);
                    } else {
                        this.lookup();
                    }
                    break;

                    //TAB
                case 9:
                    //ENTER
                case 13:
                    var item = (this.dropdown !== undefined) ? this.dropdown.querySelectorAll('li.active') : [];
                    if (item.length) {
                        this.select(jsHelper.data(item[0], this.options.queryBy));
                        this.cleanUp(false);
                    } else {
                        this.cleanUp(true);
                    }
                    break;

                    //ESC
                case 27:
                    this.cleanUp(true);
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
            let target = e.target;
            let id = target.parentNode.getAttribute("id");

            if (this.hasFocus && id !== 'autocomplete-searchtext') {
                this.cleanUp(true);
            }
        },


        rteLostFocus: function () {
            if (this.hasFocus) {
                this.cleanUp(true);
            }
        },

        lookup: function () {
            let editorBody = this.editor.getBody().querySelector('#autocomplete-searchtext');
            this.query = jsHelper.trim(editorBody.innerText).replace('\ufeff', '');

            if (this.dropdown === undefined) {
                this.show();
            }

            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(function () {
                // Added delimiter parameter as last argument for backwards compatibility.
                var items = jsHelper.isFunction(this.options.source) ? this.options.source(this.query, this.process.bind(this), this.options.delimiter) : this.options.source;
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

        show: function () {
            var offset = this.editor.inline ? this.offsetInline() : this.offset();

            this.dropdown = this.renderDropdown();
            this.dropdown.style.top = offset.top + "px";
            this.dropdown.style.left = offset.left + "px";

            document.querySelector('body').appendChild(this.dropdown);

            this.dropdown.addEventListener('click', this.autoCompleteClick.bind(this));
        },

        process: function (data) {
            if (!this.hasFocus) {
                return;
            }

            var _this = this,
                result = [],
                items = jsHelper.grep(data, function (item) {
                    return _this.matcher(item);
                });

            items = _this.sorter(items);

            items = items.slice(0, this.options.items);

            this.dropdown.innerHTML = '';

            items.forEach(function (item) {
                let li = _this.render(item);
                li.innerHTML = li.innerHTML.replace(li.innerText, _this.highlighter(li.innerText));

                jsHelper.each(item, function (key, val) {
                    li.setAttribute('data-' + key, val);
                });

                _this.dropdown.appendChild(li);
            });

            if (this.dropdown.childNodes.length > 0) {
                this.dropdown.style.display = '';


            } else {
                this.dropdown.style.display = 'none';

            }
        },

        renderDropdown: function () {
            let li = document.createElement('li');
            li.className = "loading";
            let ul = document.createElement('ul');
            ul.setAttribute('class', "rte-autocomplete dropdown-menu");
            ul.appendChild(li);

            return ul;
        },

        render: function (item) {
            let li = document.createElement('li');
            let a = document.createElement('a');
            a.setAttribute('href', "javascript:;");
            let span = document.createElement('span');
            span.innerText = item[this.options.queryBy];

            a.appendChild(span);
            li.appendChild(a);

            return li;
        },

        autoCompleteClick: function (e) {
            let item = jsHelper.data(jsHelper.closest(e.target, 'li'), this.options.queryBy);

            if (!jsHelper.isEmptyObject(item)) {
                this.select(item);
                this.cleanUp(false);
            }
            e.stopPropagation();
            e.preventDefault();
        },

        highlightPreviousResult: function () {
            this.highlightResult(0);
        },

        highlightNextResult: function () {
            this.highlightResult(1);
        },
        highlightResult: function (direction) {
            let activeLi = this.dropdown.querySelector('li.active'),
                items = Array.prototype.slice.call(this.dropdown.children),
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

            this.dropdown.querySelectorAll('li').forEach(function (item) {
                jsHelper.removeClass(item, 'active');
            });

            jsHelper.addClass(items[index], 'active');
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

        cleanUp: function (rollback) {
            this.unbindEvents();
            this.hasFocus = false;

            if (this.dropdown !== undefined) {
                this.dropdown.parentNode.removeChild(this.dropdown);

                delete this.dropdown;
            }

            if (rollback) {
                let text = this.query;
                let selection = this.editor.dom.select('span#autocomplete')[0];

                let p = document.createElement('p');
                p.innerText = this.options.delimiter + text;
                let replacement = p.firstChild;
                let focus = jsHelper.offset(this.editor.selection.getNode()).top === (jsHelper.offset(selection).top + ((selection.offsetHeigh - window.getComputedStyle(selection).getPropertyValue("height")) / 2));

                this.editor.dom.replace(replacement, selection);

                if (focus) {
                    this.editor.selection.select(replacement);
                    this.editor.selection.collapse();
                }
            }
        },

        offset: function () {
            let rtePosition = jsHelper.offset(this.editor.getContainer()),
                contentAreaPosition = jsHelper.position(this.editor.getContentAreaContainer()),
                nodePosition = jsHelper.position(this.editor.dom.select('span#autocomplete')[0]);

            return {
                top: rtePosition.top + contentAreaPosition.top + nodePosition.top + jsHelper.innerHeight(this.editor.selection.getNode()) - this.editor.getDoc().body.scrollTop + 5,
                left: rtePosition.left + contentAreaPosition.left + nodePosition.left
            };
        },

        offsetInline: function () {
            var nodePosition = jsHelper.offset(this.editor.dom.select('span#autocomplete')[0]);

            return {
                top: nodePosition.top + jsHelper.innerHeight(this.editor.selection.getNode()[0]) + 5, //TODO
                left: nodePosition.left
            };
        }

    };

    tinymce.create('tinymce.plugins.Mention', {

        init: function (ed) {

            var autoComplete,
                autoCompleteData = ed.getParam('mentions');

            // If the delimiter is undefined set default value to ['@'].
            // If the delimiter is a string value convert it to an array. (backwards compatibility)
            autoCompleteData.delimiter = (autoCompleteData.delimiter !== undefined) ? !jsHelper.isArray(autoCompleteData.delimiter) ? [autoCompleteData.delimiter] : autoCompleteData.delimiter : ['@'];

            function prevCharIsSpace() {
                var start = ed.selection.getRng(true).startOffset,
                      text = ed.selection.getRng(true).startContainer.data || '',
                      charachter = text.substr(start - 1, 1);

                return (!!jsHelper.trim(charachter).length) ? false : true;
            }

            ed.on('keypress', function (e) {
                var delimiterIndex = jsHelper.inArray(String.fromCharCode(e.which || e.keyCode), autoCompleteData.delimiter);
                if (delimiterIndex > -1 && prevCharIsSpace()) {
                    if (autoComplete === undefined || (autoComplete.hasFocus !== undefined && !autoComplete.hasFocus)) {
                        e.preventDefault();
                        // Clone options object and set the used delimiter.
                        autoComplete = new AutoComplete(ed, jsHelper.extend({}, autoCompleteData, { delimiter: autoCompleteData.delimiter[delimiterIndex] }));
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

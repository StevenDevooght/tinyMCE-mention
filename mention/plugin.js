/*global tinymce, module, require, define, global, self */

;(function (f) {
  'use strict';

  // CommonJS
  if (typeof exports === 'object' && typeof module !== 'undefined') {
    module.exports = f(require('jquery'));

  // RequireJS
  } else if (typeof define === 'function'  && define.amd) {
    define(['jquery'], f);

  // <script>
  } else {
    var g;
    if (typeof window !== 'undefined') {
      g = window;
    } else if (typeof global !== 'undefined') {
      g = global;
    } else if (typeof self !== 'undefined') {
      g = self;
    } else {
      g = this;
    }

    f(g.tinymce.dom.DomQuery);
  }

})(function ($) {
    'use strict';

    var AutoComplete = function (ed, options) {
        this.editor = ed;

        this.options = Object.assign({}, {
            source: [],
            delay: 500,
            queryBy: 'name',
            items: 10,
            closeOnScroll: true,
        }, options);

        this.matcher = this.options.matcher || this.matcher;
        this.renderDropdown = this.options.renderDropdown || this.renderDropdown;
        this.render = this.options.render || this.render;
        this.insert = this.options.insert || this.insert;
        this.highlighter = this.options.highlighter || this.highlighter;

        this.query = '';
        this.hasFocus = true;

        this.renderInput();

        this.bindEvents();
    };

    var helpers = {
    	offset: function (el) {
		    var rect = el.getBoundingClientRect();

		    return {
			    top: rect.top + document.body.scrollTop,
			    left: rect.left + document.body.scrollLeft
		    };
	    },

	    position: function (el) {
		    if(!el) return {top: 0, left: 0};
		    return {left: el.offsetLeft, top: el.offsetTop};
	    },

	    data: function (el) {
		    var data = {};
		    [].forEach.call(el.attributes, function(attr) {
			    if (/^data-/.test(attr.name)) {
				    var camelCaseName = attr.name.substr(5).replace(/-(.)/g, function ($0, $1) {
					    return $1.toUpperCase();
				    });
				    data[camelCaseName] = attr.value;
			    }
		    });
		    return data;
	    },

	    index: function(node) {
			var children = node.parentNode.childNodes;
			var num = 0;
			for (var i=0; i<children.length; i++) {
				if (children[i]==node) return num;
				if (children[i].nodeType==1) num++;
			}
			return -1;
		}
    };

    AutoComplete.prototype = {

        constructor: AutoComplete,

        renderInput: function () {
            var rawHtml =  '<span id="autocomplete">' +
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

            $('body').on('click', this.bodyClickProxy = this.rteLostFocus.bind(this));

	        if(this.options.closeOnScroll)
                $(this.editor.getWin()).on('scroll', this.rteScroll = function () { this.cleanUp(true); }.bind(this));
        },

        unbindEvents: function () {
            this.editor.off('keyup', this.editorKeyUpProxy);
            this.editor.off('keydown', this.editorKeyDownProxy);
            this.editor.off('click', this.editorClickProxy);

            $('body').off('click', this.bodyClickProxy);

	        if(this.options.closeOnScroll)
                $(this.editor.getWin()).off('scroll', this.rteScroll);
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
                var item = (this.$dropdown !== undefined) ? this.$dropdown.find('li.active') : [];
                if (item.length) {
                    this.select(helpers.data(item[0]));
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
                if (this.$dropdown !== undefined) {
                    this.highlightPreviousResult();
                }
                break;
            //DOWN ARROW
            case 40:
                e.preventDefault();
                if (this.$dropdown !== undefined) {
                    this.highlightNextResult();
                }
                break;
            }

            e.stopPropagation();
        },

        rteClicked: function (e) {
            var $target = $(e.target);

            if (this.hasFocus && $target.parent().attr('id') !== 'autocomplete-searchtext') {
                this.cleanUp(true);
            }
        },

        rteLostFocus: function () {
            if (this.hasFocus) {
                this.cleanUp(true);
            }
        },

        lookup: function () {
            this.query = $(this.editor.getBody()).find('#autocomplete-searchtext').text().trim().replace('\ufeff', '');

            if (this.$dropdown === undefined) {
                this.show();
            }

            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(function () {
                // Added delimiter parameter as last argument for backwards compatibility.
                var items = typeof this.options.source === 'function' ? this.options.source(this.query, this.process.bind(this), this.options.delimiter) : this.options.source;
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

            this.$dropdown = $(this.renderDropdown())
                                .css({ 'top': offset.top, 'left': offset.left });

            $('body').append(this.$dropdown);

            this.$dropdown.on('click', this.autoCompleteClick.bind(this));
        },

        process: function (data) {
            if (!this.hasFocus) {
                return;
            }

            var _this = this,
                result = [],
                items = data.filter(function (item) {
                    return _this.matcher(item);
                });

            items = _this.sorter(items);

            items = items.slice(0, this.options.items);

	        result = items.map(function(item) {
		        var $element = $(_this.render(item));

		        $element.html($element.html().replace($element.text(), _this.highlighter($element.text())));

		        for(var key in item) {
			        if (item.hasOwnProperty(key)) {
				        $element.attr('data-' + key, item[key]);
			        }
		        }

		        return $element[0].outerHTML;
	        });

            if (result.length) {
                this.$dropdown.html(result.join('')).show();
            } else {
                this.$dropdown.hide();
            }
        },

        renderDropdown: function () {
            return '<ul class="rte-autocomplete dropdown-menu"><li class="loading"></li></ul>';
        },

        render: function (item) {
            return '<li>' +
                        '<a href="javascript:;"><span>' + item[this.options.queryBy] + '</span></a>' +
                    '</li>';
        },

        autoCompleteClick: function (e) {
            var item = helpers.data($(e.target).closest('li')[0]);
            if (Object.getOwnPropertyNames(item).length > 0) {
                this.select(item);
                this.cleanUp(false);
            }
            e.stopPropagation();
            e.preventDefault();
        },

        highlightPreviousResult: function () {
            var activeLis = this.$dropdown.find('li.active'),
		        currentIndex = activeLis.length ? helpers.index(this.$dropdown.find('li.active')[0]) : 1,
                index = (currentIndex === 0) ? this.$dropdown.find('li').length - 1 : --currentIndex;

            this.$dropdown.find('li').removeClass('active').eq(index).addClass('active');
        },

        highlightNextResult: function () {
	        var activeLis = this.$dropdown.find('li.active'),
		        currentIndex = activeLis.length ? helpers.index(this.$dropdown.find('li.active')[0]) : -1,
                index = (currentIndex === this.$dropdown.find('li').length - 1) ? 0 : ++currentIndex;

            this.$dropdown.find('li').removeClass('active').eq(index).addClass('active');
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

            if (this.$dropdown !== undefined) {
                this.$dropdown.remove();
                delete this.$dropdown;
            }

            if (rollback) {
                var text = this.query,
                    selection = this.editor.dom.select('span#autocomplete')[0],
                    replacement = $('<p>' + this.options.delimiter + text + '</p>')[0].firstChild,
                    focus = helpers.offset(this.editor.selection.getNode()).top === (helpers.offset(selection).top + ((selection.offsetHeight - selection.clientHeight) / 2));

                this.editor.dom.replace(replacement, selection);

                if (focus) {
                    this.editor.selection.select(replacement);
                    this.editor.selection.collapse();
                }
            }
        },

        offset: function () {
            var //rtePosition = helpers.offset(this.editor.getContainer()),
                contentAreaPosition = helpers.position(this.editor.getContentAreaContainer()),
                nodePosition = helpers.position(this.editor.dom.select('span#autocomplete')[0]);

            return {
                top: /*rtePosition.top +*/ contentAreaPosition.top + nodePosition.top + this.editor.selection.getNode().offsetHeight - this.editor.getDoc().body.scrollTop + 5,
                left: /*rtePosition.left +*/ contentAreaPosition.left + nodePosition.left
            };
        },

        offsetInline: function () {
            var nodePosition = helpers.offset(this.editor.dom.select('span#autocomplete')[0]);

            return {
                top: nodePosition.top + this.editor.selection.getNode().clientHeight + 5,
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
            autoCompleteData.delimiter = (autoCompleteData.delimiter !== undefined) ? !$.isArray(autoCompleteData.delimiter) ? [autoCompleteData.delimiter] : autoCompleteData.delimiter : ['@'];

            function prevCharIsSpace() {
                var start = ed.selection.getRng(true).startOffset,
                      text = ed.selection.getRng(true).startContainer.data || '',
                      charachter = text.substr(start - 1, 1);

                return !charachter.trim().length;
            }

            ed.on('keypress', function (e) {
                var delimiterIndex = autoCompleteData.delimiter.indexOf(String.fromCharCode(e.which || e.keyCode));
                if (delimiterIndex > -1 && prevCharIsSpace()) {
                    if (autoComplete === undefined || (autoComplete.hasFocus !== undefined && !autoComplete.hasFocus)) {
                        e.preventDefault();
                        // Clone options object and set the used delimiter.
                        autoComplete = new AutoComplete(ed, Object.assign({}, autoCompleteData, { delimiter: autoCompleteData.delimiter[delimiterIndex] }));
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

});
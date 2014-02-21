#tinyMCE mention

Mentions plugin for tinyMCE WYSIWYG editor.

![preview](http://www.cognistreamer.com/shared/github/tinyMCE-mentions.png)

##Browser compatibility

* IE7+
* Chrome
* Safari
* Firefox
* Opera

##Dependencies

* [tinyMCE](http://www.tinymce.com/)
* [jQuery](http://jquery.com/)

> NOTE: Use v1.0.0 if you're using tinyMCE v3.5.x, use v2.0.0 if you're using tinyMCE v4.0.x

##Usage

Copy the source of the plugin to the plugins directory of your tinyMCE installation.
Add the mention plugin to your tinyMCE configuration.

```javascript
plugins : "advlink, paste, mention",
```

Add configuration options for the mention plugin. `source` is the only required setting.
> NOTE: `source` can also be a function. see the options section below.

```javascript
mentions: {
    source: [
        { name: 'Tyra Porcelli' }, 
        { name: 'Brigid Reddish' },
        { name: 'Ashely Buckler' },
        { name: 'Teddy Whelan' }
    ]
},
```

##Configuration

###source (required)

The source parameter can be configured as an array or a function.

####array

```javascript
source: [
    { name: 'Tyra Porcelli' }, 
    { name: 'Brigid Reddish' },
    { name: 'Ashely Buckler' },
    { name: 'Teddy Whelan' }
]
```

####function

```javascript
source: function (query, process, delimiter) {
    // Do your ajax call
    // When using multiple delimiters you can alter the query depending on the delimiter used
    if (delimiter === '@') {
       $.getJSON('ajax/users.json', function (data) {
          //call process to show the result
          process(data)
       }
    }
}
```

###queryBy

The name of the property used to do the lookup in the `source`.

**Default**: `'name'`.

###delimiter

Character that will trigger the mention plugin. Can be configured as a character or an array of characters.

####character

```javascript
delimiter: '@'
```

####array

```javascript
delimiter: ['@', '#']
```

**Default**: `'@'`.

###delay

Delay of the lookup in milliseconds when typing a new character.

**Default**: `500`.

###items

Maximum number of items displayed in the dropdown.

**Default**: `10`

###matcher

Checks for a match in the source collection.

```javascript
matcher: function(item) {
    //only match Peter Griffin
    if(item[this.options.queryBy] === 'Peter Griffin') {
        return true;
    }
}
```

###highlighter

Highlights the part of the query in the matched result.

```javascript
highlighter: function(text) {
    //make matched block italic
    return text.replace(new RegExp('(' + this.query + ')', 'ig'), function ($1, match) {
        return '<i>' + match + '</i>';
    });
}
```

###insert

Callback to set the content you want to insert in tinyMCE.

```javascript
insert: function(item) {
    return '<span>' + item.name + '</span>';
}
```

> NOTE: item parameter has all properties defined in the `source` option.

###render

Callback to set the HTML of an item in the autocomplete dropdown.

```javascript
render: function(item) {
    return '<li>' +
               '<a href="javascript:;"><span>' + item.name + '</span></a>' +
           '</li>';
}
```

> NOTE: item parameter has all properties defined in the `source` option.

###renderDropdown

Callback to set the wrapper HTML for the autocomplete dropdown.

```javascript
renderDropdown: function() {
    //add twitter bootstrap dropdown-menu class
    return '<ul class="rte-autocomplete dropdown-menu"></ul>';
}
```

###loadingUrl

If this image URL is set, the dropdown will render immediately and display the image to inform the user resources are loading. To be used most likely when source is remote. 

```javascript
    loadingUrl: 'http://www.mysite.com/images/ui-anim_basic_16x16.gif',
```


##License

MIT licensed

Copyright (C) 2013 Cognistreamer, [http://cognistreamer.com](http://cognistreamer.com)

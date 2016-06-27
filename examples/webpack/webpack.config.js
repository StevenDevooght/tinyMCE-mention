var webpack = require('webpack');
var path = require('path');

module.exports = {
	entry: './main.js',
    output: {
		filename: './dist/bundle.js'
    },
    module: {
        loaders: [
            {
				test: require.resolve('tinymce/tinymce'),
				loaders: [
				  'imports?this=>window',
				  'exports?window.tinymce'
				]
			  },
			  {
				test: /tinymce\/(themes|plugins)\//,
				loaders: [
				  'imports?this=>window'
				]
			  }    
        ]
    },
    debug: true,
    watch: false
};

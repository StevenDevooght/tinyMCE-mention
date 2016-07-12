var tinymce = require('tinymce/tinymce');

require('tinymce/themes/modern/theme');
require('./../../mention/plugin');

tinymce.init({
  selector: '#rte',
  skin: false,
  plugins: ['mention'],
  mentions: {
    source: [
      { name: 'Tyra Porcelli' }, 
      { name: 'Brigid Reddish' },
      { name: 'Ashely Buckler' },
      { name: 'Teddy Whelan' }
    ]
  }
});
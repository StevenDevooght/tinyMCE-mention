QUnit.config.autostart = false;

QUnit.module('Mention', {
    setup: function() {
        this.editor = tinymce.get('rte');
    }
});

test('basic test', function(assert) {
    expect(2);

    this.editor.fire('keypress', { which: 64 });
    this.editor.fire('keyup');

    ok($('.rte-autocomplete li.loading').length, 'Loading entries...');

    var done = assert.async();

    setTimeout(function(){
        equal($('.rte-autocomplete li').length, 10, 'First 10 entries loaded.');
        done();
    }, 600);
});
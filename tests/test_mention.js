var editor;

QUnit.config.autostart = false;

QUnit.module('Mention', {
    setup: function() {
        editor = tinymce.get('rte');
    }
});

QUnit.testDone(function(){
    editor.fire('keyup', { which: 8 });
    editor.setContent('');
});

test('basic test', function(assert) {
    expect(2);

    pressDelimiter();

    ok($('.rte-autocomplete li.loading').length, 'Loading entries...');

    var done = assert.async();

    setTimeout(function(){
        equal($('.rte-autocomplete li').length, 10, 'First 10 entries loaded.');
        done();
    }, 600);
});

test('keyboard navigation', function(assert) {
    expect(5);

    pressDelimiter();

    var done = assert.async();

    setTimeout(function(){
        pressArrowDown();

        ok($('.rte-autocomplete li:eq(0)').hasClass('active'), 'First entry highlighted.');
        ok(!$('.rte-autocomplete li:eq(1)').hasClass('active'), 'Second entry not highlighted.');

        pressArrowDown();

        ok(!$('.rte-autocomplete li:eq(0)').hasClass('active'), 'First entry not highlighted.');
        ok($('.rte-autocomplete li:eq(1)').hasClass('active'), 'Second entry highlighted.');

        pressArrowUp();
        pressArrowUp();

        ok($('.rte-autocomplete li:last').hasClass('active'), 'Last entry highlighted.');

        done();
    }, 600);
});

function pressDelimiter() {
    editor.fire('keypress', { which: 64 });
    editor.fire('keyup');
}

function pressArrowUp() {
    editor.fire('keydown', { which: 38 });
    editor.fire('keyup', { which: 38 });
}

function pressArrowDown() {
    editor.fire('keydown', { which: 40 });
    editor.fire('keyup', { which: 40 });
}
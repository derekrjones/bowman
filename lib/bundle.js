var _ = require('lodash')
    , wireAssets = require('gulpworks')

var DEFAULTS = {
    types: ['fonts', 'images', 'styles', 'templates', 'scripts']
};

module.exports = function(bow, opts, cb){
    opts = opts || {};
    _.defaults(opts, DEFAULTS);

    var types = opts.types;

    var assets = _.object(types, _.map(types, _.partial(_.invoke, bow)));

    var wire = wireAssets(opts);

    wire.init(types);

    _.each(assets,function(files,type){
        wire.emit(type,files);
    })

    wire.done();

    wire.on('done',cb);
}
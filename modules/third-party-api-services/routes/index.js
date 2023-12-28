'use strict';

function includeAllRoutes(app, passport) {
    require('./geo-spoc.route.js')(app, passport);
    require('./udyam.route.js')(app, passport);
    require('./face-match.route.js')(app, passport);
    require('./kz-company-data.route.js')(app, passport);
    require('./crime-check.route.js')(app, passport);
    require("./shareholding-parser.route.js")(app, passport);
    require('./gst-parser.route.js')(app, passport);
    require('./pdf-analyser.route.js')(app, passport);
    require('./json-analyser.route.js')(app,passport);
    require('./bureau-analyser.route.js')(app, passport);
    require('./colender-selector.route.js')(app, passport);
    require('./legality-esign.route.js')(app, passport);
    require('./scoreme.route.js')(app, passport);
    require('./passive-liveliness.route.js')(app, passport);
    require('./experian-hunter-check.route.js')(app, passport);
    require('./kz-mca-details.route.js')(app, passport);
}

module.exports = function (app, passport) {
    includeAllRoutes(app, passport);
};
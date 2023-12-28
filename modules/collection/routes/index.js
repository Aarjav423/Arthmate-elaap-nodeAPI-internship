'use strict';

function includeAllRoutes(app, passport) {
  require('./user.route.js')(app, passport);
  require('./activityLog.route.js')(app, passport);
  require('./case.route.js')(app, passport);
  require('./location.route.js')(app, passport);
  require('./dashboard.route.js')(app, passport);
  require('./agency.route.js')(app, passport);
}

module.exports = function (app, passport) {
  includeAllRoutes(app, passport);
};

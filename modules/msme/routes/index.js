// import all route here. For example:
function includeAllRoutes(app, passport) {
  require('./lead.route.js')(app, passport)
  require('./activityLog.route.js')(app, passport)
  require('./loan.route.js')(app, passport)
  require('./documentDelete.route.js')(app,passport)
  require('./amend.route.js')(app,passport)
  require('./documentUpload.route.js')(app,passport)

}

module.exports = function (app, passport) {
  includeAllRoutes(app, passport);
};

///<reference path="../node_modules/grafana-sdk-mocks/app/headers/common.d.ts" />
System.register([], function(exports_1) {
    var GoogleStackdriverLoggingCompleter;
    return {
        setters:[],
        execute: function() {
            GoogleStackdriverLoggingCompleter = (function () {
                function GoogleStackdriverLoggingCompleter(datasource, timeSrv, target) {
                    this.timeSrv = timeSrv;
                    this.datasource = datasource;
                }
                GoogleStackdriverLoggingCompleter.prototype.getCompletions = function (editor, session, pos, prefix, callback) {
                    callback(null, []);
                };
                return GoogleStackdriverLoggingCompleter;
            })();
            exports_1("default", GoogleStackdriverLoggingCompleter);
        }
    }
});
//# sourceMappingURL=completer.js.map
System.register(['./datasource', './query_ctrl', './annotations_query_ctrl'], function(exports_1) {
    var datasource_1, query_ctrl_1, annotations_query_ctrl_1;
    var GoogleStackdriverLoggingConfigCtrl;
    return {
        setters:[
            function (datasource_1_1) {
                datasource_1 = datasource_1_1;
            },
            function (query_ctrl_1_1) {
                query_ctrl_1 = query_ctrl_1_1;
            },
            function (annotations_query_ctrl_1_1) {
                annotations_query_ctrl_1 = annotations_query_ctrl_1_1;
            }],
        execute: function() {
            GoogleStackdriverLoggingConfigCtrl = (function () {
                function GoogleStackdriverLoggingConfigCtrl() {
                }
                GoogleStackdriverLoggingConfigCtrl.templateUrl = 'partials/config.html';
                return GoogleStackdriverLoggingConfigCtrl;
            })();
            exports_1("Datasource", datasource_1.default);
            exports_1("ConfigCtrl", GoogleStackdriverLoggingConfigCtrl);
            exports_1("QueryCtrl", query_ctrl_1.GoogleStackdriverLoggingQueryCtrl);
            exports_1("AnnotationsQueryCtrl", annotations_query_ctrl_1.GoogleStackdriverLoggingAnnotationsQueryCtrl);
        }
    }
});
//# sourceMappingURL=module.js.map
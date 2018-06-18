///<reference path="../node_modules/grafana-sdk-mocks/app/headers/common.d.ts" />
System.register(['./query_parameter_ctrl', './mode-stackdriver-logging', 'app/plugins/sdk'], function(exports_1) {
    var __extends = (this && this.__extends) || function (d, b) {
        for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
    var sdk_1;
    var GoogleStackdriverLoggingQueryCtrl;
    return {
        setters:[
            function (_1) {},
            function (_2) {},
            function (sdk_1_1) {
                sdk_1 = sdk_1_1;
            }],
        execute: function() {
            GoogleStackdriverLoggingQueryCtrl = (function (_super) {
                __extends(GoogleStackdriverLoggingQueryCtrl, _super);
                function GoogleStackdriverLoggingQueryCtrl($scope, $injector) {
                    _super.call(this, $scope, $injector);
                    var target = this.target;
                    target.format = target.format || this.getDefaultFormat();
                }
                GoogleStackdriverLoggingQueryCtrl.prototype.getDefaultFormat = function () {
                    if (this.panelCtrl.panel.type === 'table') {
                        return 'table';
                    }
                    return 'time_series';
                };
                GoogleStackdriverLoggingQueryCtrl.templateUrl = 'partials/query.editor.html';
                return GoogleStackdriverLoggingQueryCtrl;
            })(sdk_1.QueryCtrl);
            exports_1("GoogleStackdriverLoggingQueryCtrl", GoogleStackdriverLoggingQueryCtrl);
        }
    }
});
//# sourceMappingURL=query_ctrl.js.map
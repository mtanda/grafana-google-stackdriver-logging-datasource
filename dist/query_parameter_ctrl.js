///<reference path="../node_modules/grafana-sdk-mocks/app/headers/common.d.ts" />
System.register(['angular', './completer'], function(exports_1) {
    var angular_1, completer_1;
    return {
        setters:[
            function (angular_1_1) {
                angular_1 = angular_1_1;
            },
            function (completer_1_1) {
                completer_1 = completer_1_1;
            }],
        execute: function() {
            angular_1.default.module('grafana.directives').directive('googleStackdriverLoggingQueryParameter', function () {
                return {
                    templateUrl: 'public/plugins/mtanda-google-stackdriver-logging-datasource/partials/query.parameter.html',
                    controller: 'GoogleStackdriverLoggingQueryParameterCtrl',
                    restrict: 'E',
                    scope: {
                        target: "=",
                        datasource: "=",
                        isLastQuery: "=",
                        onChange: "&",
                    }
                };
            });
            angular_1.default.module('grafana.controllers').controller('GoogleStackdriverLoggingQueryParameterCtrl', function ($scope, templateSrv, uiSegmentSrv, datasourceSrv, timeSrv, $q) {
                $scope.init = function () {
                    var target = $scope.target;
                    target.projectId = target.projectId || '';
                    target.filter = target.filter || '';
                    target.alias = target.alias || '';
                    if (!$scope.onChange) {
                        $scope.onChange = function () { };
                    }
                };
                $scope.getCompleter = function (query) {
                    return new completer_1.default(this.datasource, timeSrv, $scope.target);
                };
                $scope.$on('typeahead-updated', function () {
                    $scope.$apply(function () {
                        $scope.onChange();
                    });
                });
                $scope.init();
            });
        }
    }
});
//# sourceMappingURL=query_parameter_ctrl.js.map
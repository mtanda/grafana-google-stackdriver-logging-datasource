///<reference path="../node_modules/grafana-sdk-mocks/app/headers/common.d.ts" />

import angular from 'angular';
import _ from 'lodash';
import GoogleStackdriverLoggingCompleter from './completer';

angular.module('grafana.directives').directive('googleStackdriverLoggingQueryParameter', () => {
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

angular.module('grafana.controllers').controller('GoogleStackdriverLoggingQueryParameterCtrl', ($scope, templateSrv, uiSegmentSrv, datasourceSrv, timeSrv, $q) => {
  $scope.init = function () {
    let target = $scope.target;
    target.projectId = target.projectId || '';
    target.filter = target.filter || '';
    target.alias = target.alias || '';

    if (!$scope.onChange) {
      $scope.onChange = function () { };
    }
  };

  $scope.getCompleter = function (query) {
    return new GoogleStackdriverLoggingCompleter(this.datasource, timeSrv, $scope.target);
  };

  $scope.$on('typeahead-updated', () => {
    $scope.$apply(() => {
      $scope.onChange();
    });
  });

  $scope.init();
});

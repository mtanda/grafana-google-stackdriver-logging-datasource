///<reference path="../node_modules/grafana-sdk-mocks/app/headers/common.d.ts" />

import _ from 'lodash';
import moment from 'moment';
import angular from 'angular';
import * as dateMath from 'app/core/utils/datemath';
import appEvents from 'app/core/app_events';
import TableModel from 'app/core/table_model';

System.config({
  meta: {
    'https://apis.google.com/js/api.js': {
      exports: 'gapi',
      format: 'global'
    }
  }
});

export default class GoogleStackdriverLoggingDatasource {
  type: string;
  name: string;
  id: string;
  access: string;
  clientId: string;
  defaultProjectId: string;
  maxAvailableToken: number;
  token: number;
  provideTokenInterval: number;
  tokenTimer: any;
  scopes: any;
  discoveryDocs: any;
  initialized: boolean;
  gapi: any;

  /** @ngInject */
  constructor(instanceSettings, private $q, private templateSrv, private timeSrv, private backendSrv) {
    this.type = instanceSettings.type;
    this.name = instanceSettings.name;
    this.id = instanceSettings.id;
    this.access = instanceSettings.jsonData.access;
    this.clientId = instanceSettings.jsonData.clientId;
    this.defaultProjectId = instanceSettings.jsonData.defaultProjectId;
    this.maxAvailableToken = ((instanceSettings.jsonData.quota && instanceSettings.jsonData.quota.requestsPerMinutePerUser) || 6000) / 60;
    this.token = this.maxAvailableToken;
    this.provideTokenInterval = 1000 / this.maxAvailableToken;
    this.tokenTimer = null;
    this.scopes = [
      'https://www.googleapis.com/auth/logging.read'
    ].join(' ');
    this.discoveryDocs = ["https://logging.googleapis.com/$discovery/rest?version=v2"];
    this.initialized = false;
  }

  query(options) {
    return this.initialize().then(() => {
      return Promise.all(options.targets
        .filter(target => !target.hide)
        .map(target => {
          target = angular.copy(target);
          target.filter = this.templateSrv.replace(target.filter, options.scopedVars || {});
          return this.performTimeSeriesQuery(target, options).then(response => {
            appEvents.emit('ds-request-response', response);
            response.timeSeries.forEach(series => {
              series.target = target;
            });
            return response;
          });
        })).then((responses: any) => {
          let timeSeries = _.flatten(responses.filter(response => {
            return !!response.timeSeries;
          }).map(response => {
            return response.timeSeries;
          }));
          if (options.targets[0].format === 'table') {
            return this.transformMetricDataToTable(timeSeries);
          }
        }, err => {
          console.log(err);
          err = JSON.parse(err.body);
          appEvents.emit('ds-request-error', err);
          throw err.error;
        });
    });
  }

  provideToken() {
    if (this.token < this.maxAvailableToken) {
      let tokenCount = 1;
      if (this.provideTokenInterval < 10) { // setInterval's minumum interval is 10
        tokenCount = Math.floor(10 / this.provideTokenInterval);
      }
      this.token += tokenCount;
      if (this.token === this.maxAvailableToken) {
        clearInterval(this.tokenTimer);
        this.tokenTimer = null;
      }
    }
  }

  delay(func, retryCount, wait) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        func(retryCount).then(resolve, reject);
      }, wait);
    });
  }

  retryable(retryCount, func) {
    let promise = Promise.reject({}).catch(() => func(retryCount));
    for (let i = 0; i < retryCount; i++) {
      ((i) => {
        promise = promise.catch(err => func(i + 1));
      })(i);
    }
    return promise;
  }

  calculateRetryWait(initialWait, retryCount) {
    return initialWait * Math.min(10, Math.pow(2, retryCount)) +
      Math.floor(Math.random() * 1000);
  }

  transformMetricDataToTable(md) {
    var table = new TableModel();
    var i, j;
    var metricLabels = {};

    if (md.length === 0) {
      return table;
    }

    // Collect all labels across all metrics
    metricLabels['metric.type'] = 1;
    metricLabels['resource.type'] = 1;
    _.each(md, function (series) {
      [
        'metric.labels',
        'resource.labels',
        'metadata.systemLabels',
        'metadata.userLabels',
      ].forEach(path => {
        _.map(md, _.property(path)).forEach(labels => {
          if (labels) {
            _.keys(labels).forEach(k => {
              let label = path + '.' + k;
              if (!metricLabels.hasOwnProperty(label)) {
                metricLabels[label] = 1;
              }
            });
          }
        });
      });
    });

    // Sort metric labels, create columns for them and record their index
    var sortedLabels = _.keys(metricLabels).sort();
    table.columns.push({ text: 'Time', type: 'time' });
    _.each(sortedLabels, function (label, labelIndex) {
      metricLabels[label] = labelIndex + 1;
      table.columns.push({ text: label });
    });
    table.columns.push({ text: 'Value' });

    // Populate rows, set value to empty string when label not present.
    _.each(md, function (series) {
      if (series.points) {
        for (i = 0; i < series.points.length; i++) {
          var point = series.points[i];
          var reordered: any = [Date.parse(point.interval.endTime).valueOf()];
          for (j = 0; j < sortedLabels.length; j++) {
            var label = sortedLabels[j];
            reordered.push(_.get(series, label) || '');
          }
          reordered.push(point.value[_.keys(point.value)[0]]);
          table.rows.push(reordered);
        }
      }
    });

    return { data: [table] };
  }

  metricFindQuery(query) {
    return this.initialize().then(() => {
      return Promise.reject(new Error('Invalid query, use one of: metrics(), label_values(), groups(), group_members()'));
    });
  }

  testDatasource() {
    return this.initialize().then(() => {
      if (this.access === 'proxy' && this.defaultProjectId) {
        let params = {
          projectId: this.defaultProjectId,
          filter: ''
        };
        //return this.performMetricDescriptorsQuery(params, {}).then(response => {
        return { status: 'success', message: 'Data source is working', title: 'Success' };
        //});
      } else {
        return { status: 'success', message: 'Data source is working', title: 'Success' };
      }
    }).catch(err => {
      console.log(err);
      return { status: "error", message: err.message, title: "Error" };
    });
  }

  load() {
    let deferred = this.$q.defer();
    System.import('https://apis.google.com/js/api.js').then((gapi) => {
      this.gapi = gapi;
      this.gapi.load('client:auth2', () => {
        return deferred.resolve();
      });
    });
    return deferred.promise;
  }

  initialize() {
    if (this.access == 'proxy') {
      return Promise.resolve([]);
    }
    if (this.initialized) {
      return Promise.resolve(this.gapi.auth2.getAuthInstance().currentUser.get());
    }

    return this.load().then(() => {
      return this.gapi.client.init({
        clientId: this.clientId,
        scope: this.scopes,
        discoveryDocs: this.discoveryDocs
      }).then(() => {
        let authInstance = this.gapi.auth2.getAuthInstance();
        if (!authInstance) {
          throw { message: 'failed to initialize' };
        }
        let isSignedIn = authInstance.isSignedIn.get();
        if (isSignedIn) {
          this.initialized = true;
          return authInstance.currentUser.get();
        }
        return authInstance.signIn().then(user => {
          this.initialized = true;
          return user;
        });
      }, err => {
        console.log(err);
        throw { message: 'failed to initialize' };
      });
    });
  }

  backendPluginRawRequest(params) {
    return this.backendSrv.datasourceRequest(params).then(response => {
      return {
        result: response.data.results[""].meta
      };
    }).catch(err => {
      throw {
        body: JSON.stringify({
          error: {
            message: err.data.results[""].error
          }
        })
      };
    });
  }

  performTimeSeriesQuery(target, options) {
    if (this.token === 0) {
      return this.delay((retryCount) => {
        return this.performTimeSeriesQuery(target, options);
      }, 0, Math.ceil(this.provideTokenInterval));
    }

    target = angular.copy(target);
    let params: any = {};
    params.resourceNames = [
      this.templateSrv.replace('projects/' + (target.projectId || this.defaultProjectId), options.scopedVars || {})
    ];
    params.filter = this.templateSrv.replace(target.filter, options.scopedVars || {});
    if (target.pageToken) {
      params.pageToken = target.pageToken;
    }
    params['orderBy'] = 'timestamp asc';


    this.token--;
    if (this.tokenTimer === null) {
      this.tokenTimer = setInterval(() => {
        this.provideToken();
      }, Math.max(10, Math.ceil(this.provideTokenInterval)));
    }
    return ((params) => {
      if (this.access != 'proxy') {
        return this.gapi.client.logging.entries.list(params);
      } else {
        return this.backendPluginRawRequest({
          url: '/api/tsdb/query',
          method: 'POST',
          data: {
            from: options.range.from.valueOf().toString(),
            to: options.range.to.valueOf().toString(),
            queries: [
              _.extend({
                queryType: 'raw',
                api: 'monitoring.projects.timeSeries.list',
                refId: target.refId,
                datasourceId: this.id
              }, params)
            ],
          }
        });
      }
    })(params).then(response => {
      response = response.result;
      if (!response.timeSeries) {
        return { timeSeries: [] };
      }
      if (!response.nextPageToken) {
        return response;
      }
      target.pageToken = response.nextPageToken;
      return this.performTimeSeriesQuery(target, options).then(nextResponse => {
        response.timeSeries = response.timeSeries.concat(nextResponse.timeSeries);
        return response;
      });
    }, err => {
      let e = JSON.parse(err.body);
      if (e.error.message.indexOf('The query rate is too high.') >= 0) {
        this.token = 0;
        return this.retryable(3, (retryCount) => {
          return this.delay((retryCount) => {
            return this.performTimeSeriesQuery(target, options);
          }, retryCount, this.calculateRetryWait(1000, retryCount));
        });
      }
      throw err;
    });
  }

  getMetricLabel(alias, series) {
    let aliasData = {
      metric: series.metric,
      resource: series.resource
    };
    if (!_.isUndefined(series.bucket)) {
      aliasData['bucket'] = series.bucket;
    }
    if (alias === '') {
      return JSON.stringify(aliasData);
    }
    let aliasRegex = /\{\{(.+?)\}\}/g;
    alias = alias.replace(aliasRegex, (match, g1) => {
      let matchedValue = _.property(g1)(aliasData);
      if (!_.isUndefined(matchedValue)) {
        return matchedValue;
      }
      return g1;
    });
    let aliasSubRegex = /sub\(([^,]+), "([^"]+)", "([^"]+)"\)/g;
    alias = alias.replace(aliasSubRegex, (match, g1, g2, g3) => {
      try {
        let matchedValue = _.property(g1)(aliasData);
        let labelRegex = new RegExp(g2);
        if (!_.isUndefined(matchedValue)) {
          return matchedValue.replace(labelRegex, g3);
        }
      } catch (e) {
        // if regexp compilation fails, we'll return original string below
      }
      return `sub(${g1}, "${g2}", "${g3}")`;
    });
    return alias;
  }

  convertTime(date, roundUp) {
    if (_.isString(date)) {
      date = dateMath.parse(date, roundUp);
    }
    return date.toISOString();
  };
}

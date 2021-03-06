///<reference path="../node_modules/grafana-sdk-mocks/app/headers/common.d.ts" />

import _ from 'lodash';
import moment from 'moment';
import angular from 'angular';
import * as dateMath from 'app/core/utils/datemath';
import flatten from 'app/core/utils/flatten';
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
    this.maxAvailableToken = ((instanceSettings.jsonData.quota && instanceSettings.jsonData.quota.requestsPerMinutePerUser) || 60) / 60;
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
          target.filter =
            'timestamp >= "' + this.convertTime(options.range.from, false) + '"'
            + ' AND ' +
            'timestamp <= "' + this.convertTime(options.range.to, true) + '"'
            + (target.filter ? ' AND ' : '') +
            this.templateSrv.replace(target.filter, options.scopedVars || {});
          return this.performLogQuery(target, options).then(response => {
            appEvents.emit('ds-request-response', response);
            return response;
          });
        })).then((responses: any) => {
          let entries = _.flatten(responses.filter(response => {
            return !!response.entries;
          }).map(response => {
            return response.entries;
          }));
          if (options.targets[0].format === 'table') {
            return this.transformEntriesToTable(entries);
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

  transformEntriesToTable(entries) {
    var table = new TableModel();
    var i, j;
    var metricLabels = {};

    if (entries.length === 0) {
      return table;
    }

    // Collect all labels across all metrics
    _.each(entries.slice(0, 100), (entry) => {
      let flattened = flatten(entry, null);
      for (let propName in flattened) {
        metricLabels[propName] = 1;
      }
    });

    // Sort metric labels, create columns for them and record their index
    let sortedLabels = _.keys(metricLabels).sort();
    _.each(sortedLabels, function (label, labelIndex) {
      metricLabels[label] = labelIndex + 1;
      table.columns.push({ text: label });
    });

    // Populate rows, set value to empty string when label not present.
    _.each(entries, function (entry) {
      let reordered: any = [];
      for (j = 0; j < sortedLabels.length; j++) {
        let label = sortedLabels[j];
        reordered.push(_.get(entry, label) || '');
      }
      table.rows.push(reordered);
    });

    return { data: [table] };
  }

  metricFindQuery(query) {
    return this.initialize().then(() => {
      let logsQuery = query.match(/^logs\(([^,]+)?\)/);
      if (logsQuery) {
        let projectId = logsQuery[1] || this.defaultProjectId;
        let params = {
          parent: this.templateSrv.replace(projectId)
        };
        return this.performLogsQuery(params, {}).then(response => {
          return this.$q.when(response.logNames.map(d => {
            return {
              text: d
            };
          }));
        }, err => {
          console.log(err);
          err = JSON.parse(err.body);
          throw err.error;
        });
      }

      return Promise.reject(new Error('Invalid query'));
    });
  }

  annotationQuery(options) {
    let annotation = options.annotation;
    let filter = annotation.filter || '';
    let tagKeys = annotation.tagKeys || '';
    tagKeys = tagKeys.split(',');
    let titleFormat = annotation.titleFormat || '';
    let textFormat = annotation.textFormat || '';

    let range = this.timeSrv.timeRange();
    let target: any = {
      filter: 'timestamp >= "' + this.convertTime(range.from, false) + '"'
        + ' AND ' +
        'timestamp <= "' + this.convertTime(range.to, true) + '"'
        + (filter ? ' AND ' : '') +
        this.templateSrv.replace(filter, {})
    };
    if (annotation.projectId) {
      target.projectId = annotation.projectId;
    }
    return this.initialize().then(() => {
      return this.performLogQuery(target, options).then(response => {
        let eventList = response.entries.map((event) => {
          let tags = _.chain(event)
            .filter((v, k) => {
              return _.includes(tagKeys, k);
            }).value();

          return {
            annotation: annotation,
            time: Date.parse(event.timestamp),
            title: this.getMetricLabel(titleFormat, event),
            tags: tags,
            text: this.getMetricLabel(textFormat, event)
          };
        });

        return eventList;
      });
    });
  }

  testDatasource() {
    return this.initialize().then(() => {
      if (this.defaultProjectId) {
        return this.performLogsQuery({ parent: this.defaultProjectId }, {}).then(response => {
          return { status: 'success', message: 'Data source is working', title: 'Success' };
        });
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

  performLogQuery(target, options, depth = 0) {
    if (this.token === 0) {
      return this.delay((retryCount) => {
        return this.performLogQuery(target, options, depth);
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
                api: 'logging.entries.list',
                refId: target.refId,
                datasourceId: this.id
              }, params)
            ],
          }
        });
      }
    })(params).then(response => {
      response = response.result;
      if (!response.entries) {
        return { entries: [] };
      }
      if (!response.nextPageToken) {
        return response;
      }
      // TODO: define reasonable limit
      if (depth > 3) {
        return response;
      }
      target.pageToken = response.nextPageToken;
      return this.performLogQuery(target, options, depth + 1).then(nextResponse => {
        response.entries = response.entries.concat(nextResponse.entries);
        return response;
      });
    }, err => {
      let e = JSON.parse(err.body);
      if (e.error.message.indexOf('The query rate is too high.') >= 0) {
        this.token = 0;
        return this.retryable(3, (retryCount) => {
          return this.delay((retryCount) => {
            return this.performLogQuery(target, options, depth);
          }, retryCount, this.calculateRetryWait(1000, retryCount));
        });
      }
      throw err;
    });
  }

  performLogsQuery(target, options) {
    target = angular.copy(target);
    let params: any = {};
    params.parent = this.templateSrv.replace('projects/' + (target.projectId || this.defaultProjectId), options.scopedVars || {});
    if (target.pageToken) {
      params.pageToken = target.pageToken;
    }
    return ((params) => {
      if (this.access != 'proxy') {
        return this.gapi.client.logging.projects.logs.list(params);
      } else {
        return this.backendPluginRawRequest({
          url: '/api/tsdb/query',
          method: 'POST',
          data: {
            queries: [
              _.extend({
                queryType: 'raw',
                api: 'logging.projects.logs.list',
                refId: '',
                datasourceId: this.id
              }, params)
            ],
          }
        });
      }
    })(params).then(response => {
      response = response.result;
      if (!response.logNames) {
        return { logNames: [] };
      }
      if (!response.nextPageToken) {
        return response;
      }
      target.pageToken = response.nextPageToken;
      return this.performLogsQuery(target, options).then(nextResponse => {
        response = response.logNames.concat(nextResponse.logNames);
        return response;
      });
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

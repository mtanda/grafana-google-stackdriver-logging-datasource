///<reference path="../node_modules/grafana-sdk-mocks/app/headers/common.d.ts" />
System.register(['lodash', 'angular', 'app/core/utils/datemath', 'app/core/utils/flatten', 'app/core/app_events', 'app/core/table_model'], function(exports_1) {
    var lodash_1, angular_1, dateMath, flatten_1, app_events_1, table_model_1;
    var GoogleStackdriverLoggingDatasource;
    return {
        setters:[
            function (lodash_1_1) {
                lodash_1 = lodash_1_1;
            },
            function (angular_1_1) {
                angular_1 = angular_1_1;
            },
            function (dateMath_1) {
                dateMath = dateMath_1;
            },
            function (flatten_1_1) {
                flatten_1 = flatten_1_1;
            },
            function (app_events_1_1) {
                app_events_1 = app_events_1_1;
            },
            function (table_model_1_1) {
                table_model_1 = table_model_1_1;
            }],
        execute: function() {
            System.config({
                meta: {
                    'https://apis.google.com/js/api.js': {
                        exports: 'gapi',
                        format: 'global'
                    }
                }
            });
            GoogleStackdriverLoggingDatasource = (function () {
                /** @ngInject */
                function GoogleStackdriverLoggingDatasource(instanceSettings, $q, templateSrv, timeSrv, backendSrv) {
                    this.$q = $q;
                    this.templateSrv = templateSrv;
                    this.timeSrv = timeSrv;
                    this.backendSrv = backendSrv;
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
                GoogleStackdriverLoggingDatasource.prototype.query = function (options) {
                    var _this = this;
                    return this.initialize().then(function () {
                        return Promise.all(options.targets
                            .filter(function (target) { return !target.hide; })
                            .map(function (target) {
                            target = angular_1.default.copy(target);
                            target.filter = _this.templateSrv.replace(target.filter, options.scopedVars || {});
                            return _this.performLogQuery(target, options).then(function (response) {
                                app_events_1.default.emit('ds-request-response', response);
                                return response;
                            });
                        })).then(function (responses) {
                            var entries = lodash_1.default.flatten(responses.filter(function (response) {
                                return !!response.entries;
                            }).map(function (response) {
                                return response.entries;
                            }));
                            if (options.targets[0].format === 'table') {
                                return _this.transformEntriesToTable(entries);
                            }
                        }, function (err) {
                            console.log(err);
                            err = JSON.parse(err.body);
                            app_events_1.default.emit('ds-request-error', err);
                            throw err.error;
                        });
                    });
                };
                GoogleStackdriverLoggingDatasource.prototype.provideToken = function () {
                    if (this.token < this.maxAvailableToken) {
                        var tokenCount = 1;
                        if (this.provideTokenInterval < 10) {
                            tokenCount = Math.floor(10 / this.provideTokenInterval);
                        }
                        this.token += tokenCount;
                        if (this.token === this.maxAvailableToken) {
                            clearInterval(this.tokenTimer);
                            this.tokenTimer = null;
                        }
                    }
                };
                GoogleStackdriverLoggingDatasource.prototype.delay = function (func, retryCount, wait) {
                    return new Promise(function (resolve, reject) {
                        setTimeout(function () {
                            func(retryCount).then(resolve, reject);
                        }, wait);
                    });
                };
                GoogleStackdriverLoggingDatasource.prototype.retryable = function (retryCount, func) {
                    var promise = Promise.reject({}).catch(function () { return func(retryCount); });
                    for (var i = 0; i < retryCount; i++) {
                        (function (i) {
                            promise = promise.catch(function (err) { return func(i + 1); });
                        })(i);
                    }
                    return promise;
                };
                GoogleStackdriverLoggingDatasource.prototype.calculateRetryWait = function (initialWait, retryCount) {
                    return initialWait * Math.min(10, Math.pow(2, retryCount)) +
                        Math.floor(Math.random() * 1000);
                };
                GoogleStackdriverLoggingDatasource.prototype.transformEntriesToTable = function (entries) {
                    var table = new table_model_1.default();
                    var i, j;
                    var metricLabels = {};
                    if (entries.length === 0) {
                        return table;
                    }
                    // Collect all labels across all metrics
                    lodash_1.default.each(entries.slice(0, 100), function (entry) {
                        var flattened = flatten_1.default(entry, null);
                        for (var propName in flattened) {
                            metricLabels[propName] = 1;
                        }
                    });
                    // Sort metric labels, create columns for them and record their index
                    var sortedLabels = lodash_1.default.keys(metricLabels).sort();
                    lodash_1.default.each(sortedLabels, function (label, labelIndex) {
                        metricLabels[label] = labelIndex + 1;
                        table.columns.push({ text: label });
                    });
                    // Populate rows, set value to empty string when label not present.
                    lodash_1.default.each(entries, function (entry) {
                        var reordered = [];
                        for (j = 0; j < sortedLabels.length; j++) {
                            var label = sortedLabels[j];
                            reordered.push(lodash_1.default.get(entry, label) || '');
                        }
                        table.rows.push(reordered);
                    });
                    return { data: [table] };
                };
                GoogleStackdriverLoggingDatasource.prototype.metricFindQuery = function (query) {
                    return this.initialize().then(function () {
                        return Promise.reject(new Error('Invalid query'));
                    });
                };
                GoogleStackdriverLoggingDatasource.prototype.testDatasource = function () {
                    var _this = this;
                    return this.initialize().then(function () {
                        if (_this.access === 'proxy' && _this.defaultProjectId) {
                            return { status: 'success', message: 'Data source is working', title: 'Success' };
                        }
                        else {
                            return { status: 'success', message: 'Data source is working', title: 'Success' };
                        }
                    }).catch(function (err) {
                        console.log(err);
                        return { status: "error", message: err.message, title: "Error" };
                    });
                };
                GoogleStackdriverLoggingDatasource.prototype.load = function () {
                    var _this = this;
                    var deferred = this.$q.defer();
                    System.import('https://apis.google.com/js/api.js').then(function (gapi) {
                        _this.gapi = gapi;
                        _this.gapi.load('client:auth2', function () {
                            return deferred.resolve();
                        });
                    });
                    return deferred.promise;
                };
                GoogleStackdriverLoggingDatasource.prototype.initialize = function () {
                    var _this = this;
                    if (this.access == 'proxy') {
                        return Promise.resolve([]);
                    }
                    if (this.initialized) {
                        return Promise.resolve(this.gapi.auth2.getAuthInstance().currentUser.get());
                    }
                    return this.load().then(function () {
                        return _this.gapi.client.init({
                            clientId: _this.clientId,
                            scope: _this.scopes,
                            discoveryDocs: _this.discoveryDocs
                        }).then(function () {
                            var authInstance = _this.gapi.auth2.getAuthInstance();
                            if (!authInstance) {
                                throw { message: 'failed to initialize' };
                            }
                            var isSignedIn = authInstance.isSignedIn.get();
                            if (isSignedIn) {
                                _this.initialized = true;
                                return authInstance.currentUser.get();
                            }
                            return authInstance.signIn().then(function (user) {
                                _this.initialized = true;
                                return user;
                            });
                        }, function (err) {
                            console.log(err);
                            throw { message: 'failed to initialize' };
                        });
                    });
                };
                GoogleStackdriverLoggingDatasource.prototype.backendPluginRawRequest = function (params) {
                    return this.backendSrv.datasourceRequest(params).then(function (response) {
                        return {
                            result: response.data.results[""].meta
                        };
                    }).catch(function (err) {
                        throw {
                            body: JSON.stringify({
                                error: {
                                    message: err.data.results[""].error
                                }
                            })
                        };
                    });
                };
                GoogleStackdriverLoggingDatasource.prototype.performLogQuery = function (target, options, depth) {
                    var _this = this;
                    if (depth === void 0) { depth = 0; }
                    if (this.token === 0) {
                        return this.delay(function (retryCount) {
                            return _this.performLogQuery(target, options, depth);
                        }, 0, Math.ceil(this.provideTokenInterval));
                    }
                    target = angular_1.default.copy(target);
                    var params = {};
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
                        this.tokenTimer = setInterval(function () {
                            _this.provideToken();
                        }, Math.max(10, Math.ceil(this.provideTokenInterval)));
                    }
                    return (function (params) {
                        if (_this.access != 'proxy') {
                            return _this.gapi.client.logging.entries.list(params);
                        }
                        else {
                            return _this.backendPluginRawRequest({
                                url: '/api/tsdb/query',
                                method: 'POST',
                                data: {
                                    from: options.range.from.valueOf().toString(),
                                    to: options.range.to.valueOf().toString(),
                                    queries: [
                                        lodash_1.default.extend({
                                            queryType: 'raw',
                                            api: 'logging.entries.list',
                                            refId: target.refId,
                                            datasourceId: _this.id
                                        }, params)
                                    ],
                                }
                            });
                        }
                    })(params).then(function (response) {
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
                        return _this.performLogQuery(target, options, depth + 1).then(function (nextResponse) {
                            response.entries = response.entries.concat(nextResponse.entries);
                            return response;
                        });
                    }, function (err) {
                        var e = JSON.parse(err.body);
                        if (e.error.message.indexOf('The query rate is too high.') >= 0) {
                            _this.token = 0;
                            return _this.retryable(3, function (retryCount) {
                                return _this.delay(function (retryCount) {
                                    return _this.performLogQuery(target, options, depth);
                                }, retryCount, _this.calculateRetryWait(1000, retryCount));
                            });
                        }
                        throw err;
                    });
                };
                GoogleStackdriverLoggingDatasource.prototype.getMetricLabel = function (alias, series) {
                    var aliasData = {
                        metric: series.metric,
                        resource: series.resource
                    };
                    if (!lodash_1.default.isUndefined(series.bucket)) {
                        aliasData['bucket'] = series.bucket;
                    }
                    if (alias === '') {
                        return JSON.stringify(aliasData);
                    }
                    var aliasRegex = /\{\{(.+?)\}\}/g;
                    alias = alias.replace(aliasRegex, function (match, g1) {
                        var matchedValue = lodash_1.default.property(g1)(aliasData);
                        if (!lodash_1.default.isUndefined(matchedValue)) {
                            return matchedValue;
                        }
                        return g1;
                    });
                    var aliasSubRegex = /sub\(([^,]+), "([^"]+)", "([^"]+)"\)/g;
                    alias = alias.replace(aliasSubRegex, function (match, g1, g2, g3) {
                        try {
                            var matchedValue = lodash_1.default.property(g1)(aliasData);
                            var labelRegex = new RegExp(g2);
                            if (!lodash_1.default.isUndefined(matchedValue)) {
                                return matchedValue.replace(labelRegex, g3);
                            }
                        }
                        catch (e) {
                        }
                        return "sub(" + g1 + ", \"" + g2 + "\", \"" + g3 + "\")";
                    });
                    return alias;
                };
                GoogleStackdriverLoggingDatasource.prototype.convertTime = function (date, roundUp) {
                    if (lodash_1.default.isString(date)) {
                        date = dateMath.parse(date, roundUp);
                    }
                    return date.toISOString();
                };
                ;
                return GoogleStackdriverLoggingDatasource;
            })();
            exports_1("default", GoogleStackdriverLoggingDatasource);
        }
    }
});
//# sourceMappingURL=datasource.js.map
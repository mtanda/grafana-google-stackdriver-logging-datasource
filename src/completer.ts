///<reference path="../node_modules/grafana-sdk-mocks/app/headers/common.d.ts" />

import GoogleStackdriverLoggingDatasource from "./datasource";
import _ from 'lodash';

export default class GoogleStackdriverLoggingCompleter {
  datasource: any;

  constructor(datasource, private timeSrv, target) {
    this.datasource = datasource;
  }

  getCompletions(editor, session, pos, prefix, callback) {
    callback(null, []);
  }
}

/// <reference path="../node_modules/grafana-sdk-mocks/app/headers/common.d.ts" />
export default class GoogleStackdriverLoggingCompleter {
    private timeSrv;
    datasource: any;
    constructor(datasource: any, timeSrv: any, target: any);
    getCompletions(editor: any, session: any, pos: any, prefix: any, callback: any): void;
}

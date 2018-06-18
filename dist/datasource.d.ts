/// <reference path="../node_modules/grafana-sdk-mocks/app/headers/common.d.ts" />
export default class GoogleStackdriverLoggingDatasource {
    private $q;
    private templateSrv;
    private timeSrv;
    private backendSrv;
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
    constructor(instanceSettings: any, $q: any, templateSrv: any, timeSrv: any, backendSrv: any);
    query(options: any): any;
    provideToken(): void;
    delay(func: any, retryCount: any, wait: any): Promise<{}>;
    retryable(retryCount: any, func: any): Promise<void>;
    calculateRetryWait(initialWait: any, retryCount: any): number;
    transformEntriesToTable(entries: any): any;
    metricFindQuery(query: any): any;
    testDatasource(): any;
    load(): any;
    initialize(): any;
    backendPluginRawRequest(params: any): any;
    performLogQuery(target: any, options: any, depth?: number): any;
    performLogsQuery(target: any, options: any): any;
    getMetricLabel(alias: any, series: any): any;
    convertTime(date: any, roundUp: any): any;
}

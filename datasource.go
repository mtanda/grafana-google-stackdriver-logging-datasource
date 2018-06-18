package main

import (
	"encoding/json"
	"fmt"

	"golang.org/x/net/context"
	"golang.org/x/oauth2/google"
	logging "google.golang.org/api/logging/v2"

	"github.com/grafana/grafana/pkg/components/simplejson"
	"github.com/grafana/grafana_plugin_model/go/datasource"
	plugin "github.com/hashicorp/go-plugin"
)

type GoogleStackdriverLoggingDatasource struct {
	plugin.NetRPCUnsupportedPlugin
}

var loggingService *logging.Service
var initializeError error

func init() {
	ctx := context.Background()

	googleClient, err := google.DefaultClient(ctx, logging.LoggingReadScope)
	if err != nil {
		initializeError = err
		return
	}

	service, err := logging.New(googleClient)
	if err != nil {
		initializeError = err
		return
	}

	loggingService = service
}

func (t *GoogleStackdriverLoggingDatasource) Query(ctx context.Context, tsdbReq *datasource.DatasourceRequest) (*datasource.DatasourceResponse, error) {
	var response *datasource.DatasourceResponse

	if initializeError != nil {
		return nil, initializeError
	}

	modelJson, err := simplejson.NewJson([]byte(tsdbReq.Queries[0].ModelJson))
	if err != nil {
		return &datasource.DatasourceResponse{
			Results: []*datasource.QueryResult{
				&datasource.QueryResult{
					Error: err.Error(),
				},
			},
		}, nil
	}
	switch modelJson.Get("queryType").MustString() {
	case "raw":
		api := modelJson.Get("api").MustString()
		var err error
		response, err = t.handleRawQuery(api, tsdbReq)
		if err != nil {
			return &datasource.DatasourceResponse{
				Results: []*datasource.QueryResult{
					&datasource.QueryResult{
						Error: err.Error(),
					},
				},
			}, nil
		}
	}
	return response, nil
}

func (t *GoogleStackdriverLoggingDatasource) handleRawQuery(api string, tsdbReq *datasource.DatasourceRequest) (*datasource.DatasourceResponse, error) {
	switch api {
	case "logging.entries.list":
		return t.handleEntriesList(tsdbReq)
	}

	return nil, fmt.Errorf("not supported api")
}

type EntriesListRequest struct {
	RefId         string
	ResourceNames []string
	Filter        string
	OrderBy       string
	PageSize      int64
	PageToken     string
}

func (t *GoogleStackdriverLoggingDatasource) handleEntriesList(tsdbReq *datasource.DatasourceRequest) (*datasource.DatasourceResponse, error) {
	var req EntriesListRequest
	if err := json.Unmarshal([]byte(tsdbReq.Queries[0].ModelJson), &req); err != nil {
		return nil, err
	}

	entriesListCall := loggingService.Entries.List(req.ResourceNames)
	if req.Filter != "" {
		entriesListCall = entriesListCall.Filter(req.Filter)
	}
	if req.OrderBy != "" {
		entriesListCall = entriesListCall.OrderBy(req.OrderBy)
	}
	if req.PageSize != 0 {
		entriesListCall = entriesListCall.PageSize(req.PageSize)
	}
	if req.PageToken != "" {
		entriesListCall = entriesListCall.PageToken(req.PageToken)
	}

	result, err := entriesListCall.Do()
	if err != nil {
		return nil, err
	}

	resultJson, err := json.Marshal(result)
	if err != nil {
		return nil, err
	}

	return &datasource.DatasourceResponse{
		Results: []*datasource.QueryResult{
			&datasource.QueryResult{
				MetaJson: string(resultJson),
			},
		},
	}, nil
}

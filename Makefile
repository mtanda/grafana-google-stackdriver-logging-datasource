all: grunt build

grunt:
	grunt

build:
	GOOS=linux GOARCH=amd64 go build -o ./dist/google-stackdriver-logging-plugin_linux_amd64 .
	GOOS=darwin GOARCH=amd64 go build -o ./dist/google-stackdriver-logging-plugin_darwin_amd64 .

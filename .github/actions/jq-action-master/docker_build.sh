#!/bin/bash

docker build -t "delmendo/yq-action:v${1}" .
docker build -t delmendo/yq-action:latest .
docker push delmendo/yq-action:latest
docker push "delmendo/yq-action:v${1}"

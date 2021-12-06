#!/bin/bash

git commit -a -m "${1}"
git tag -a -m "${1}" "v${2}"
git push --follow-tags

./docker_build.sh $2

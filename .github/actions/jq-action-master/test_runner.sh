#!/bin/bash
set -e
VERSION="2.0.2"
export SLACK_WEBHOOK_URL="" #Set this for testing.
export INPUT_USERNAME="Github Action"
export INPUT_ICONEMOJI=":gatsby:"
export INPUT_CHANNEL="#jobward_development"
export INPUT_HEADLINE="This is a test"
export INPUT_BODY="Starting the process to build and deploy the *Public Web Site*"
export INPUT_IMAGEURL="https://bit.ly/3d82tTU"

echo $INPUT_HEADLINE
/usr/bin/docker run --name delmendoslackactionlatest_647d79 --label c27d31 --workdir /github/workspace --rm \
 -e SLACK_WEBHOOK_URL -e INPUT_USERNAME -e INPUT_ICONEMOJI -e INPUT_CHANNEL -e INPUT_HEADLINE -e INPUT_BODY -e INPUT_IMAGEURL \
  -e HOME -e GITHUB_JOB -e GITHUB_REF -e GITHUB_SHA -e GITHUB_REPOSITORY -e GITHUB_REPOSITORY_OWNER -e GITHUB_RUN_ID  \
  -e GITHUB_RUN_NUMBER -e GITHUB_ACTOR -e GITHUB_WORKFLOW -e GITHUB_HEAD_REF -e GITHUB_BASE_REF -e GITHUB_EVENT_NAME -e GITHUB_WORKSPACE \
   -e GITHUB_ACTION -e GITHUB_EVENT_PATH -e RUNNER_OS -e RUNNER_TOOL_CACHE -e RUNNER_TEMP -e RUNNER_WORKSPACE -e ACTIONS_RUNTIME_URL \
    -e ACTIONS_RUNTIME_TOKEN -e ACTIONS_CACHE_URL -e GITHUB_ACTIONS=true -e CI=true  delmendo/slack-action:v${VERSION}


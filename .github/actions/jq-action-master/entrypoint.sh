#!/bin/bash
set -e

OUTPUT=$(eval $INPUT_CMD)

if ($INPUT_MULTILINE); then
  OUTPUT="${OUTPUT//$'\n'/'%0A'}"
  OUTPUT="${OUTPUT//$'\r'/'%0D'}"
fi

echo "::set-output name=value::$OUTPUT"

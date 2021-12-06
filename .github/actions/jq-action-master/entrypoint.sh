#!/bin/bash
set -e

OUTPUT=$(eval $INPUT_CMD)

# TODO(rosshamish): contribute this multiline support back upstream.
if ($INPUT_MULTILINE); then
  OUTPUT="${OUTPUT//$'\n'/'%0A'}"
  OUTPUT="${OUTPUT//$'\r'/'%0D'}"
fi

echo "::set-output name=value::$OUTPUT"

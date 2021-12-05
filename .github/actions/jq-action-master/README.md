# Run jq

Run jq on your data and get result as output


## Inputs
### `cmd`
**Required** This is the actual command that will be passed along

## Outputs

### `value`
This is the actual result of the command executing

## Example usage

```yaml
uses: sergeysova/jq-action@v2
with:
  cmd: jq -n env
```

## Using output

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    
      - name: Extract version from package.json
        uses: sergeysova/jq-action@v2
        id: version
        with:
          cmd: 'jq .version package.json -r'
      
      - name: Show my version
        run: 'echo "version ${{ steps.version.outputs.value }}"'
```

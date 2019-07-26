- .js files checked into server/out should be included in server/src instead, and gulp should be used to copy them into /out as a post-build task (after tsc -watch runs each time)
   - bridge.min.js, Kusto.Language.Bridge.min.js
- File replacement for formatting goes from 0,0 to Number.MAX_VALUE,MAX_VALUE - If a file happened to be bigger it wouldn't format properly. (Would also be oom exception)
- _items, Items._items
- listener.newState == 2
- .csl files with .create-or-alter function must NOT have a blank line between the .create-or-alter statement and the function name, and must NOT have a blank line between the function name and the opening {, so that the whole thing is one block
- .csl files with .create-or-alter function MUST have a blank line after the opening { and the first line of query, otherwise the whole thing is one block
- we should have settings for the formatting options, and instead of assuming the indent size from the first query block, we should
  read it from the settings and use that value.
- tests are unchanged from the original sample code and definitely don't pass
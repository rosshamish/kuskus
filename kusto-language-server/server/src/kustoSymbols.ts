import { Client as KustoClient } from "azure-kusto-data";

interface DatabaseMetadata {
  DatabaseName: string;
  PrettyName: string;
}
interface TableMetadata {
  TableName: string;
  DatabaseName: string;
  Folder: string;
  DocString: string;
}
interface TableSchema {
  TableName: string;
  Schema: string;
  DatabaseName: string;
  Folder: string;
  DocString: string;
}
interface FunctionMetadata {
  Name: string;
  Parameters: string;
  Folder: string;
  DocString: string;
}
interface ColumnInfo {
  Name: string;
  Type: string;
  CslType: string;
}

export async function getSymbolsOnCluster(
  kustoClient: KustoClient,
  defaultDatabaseName: string,
): Promise<Kusto.Language.GlobalState | null> {
  const tableMetadata = await getTableMetadata(
    kustoClient,
    defaultDatabaseName,
  );
  const functionMetadata = await getFunctionMetadata(
    kustoClient,
    defaultDatabaseName,
  );
  const globalState = Kusto.Language.GlobalState.Default;
  if (!globalState) {
    return null;
  }
  const symbols = [];
  symbols.push(
    ...(await getTableSymbols(kustoClient, defaultDatabaseName, tableMetadata)),
  );
  symbols.push(...getFunctionSymbols(functionMetadata, globalState));
  return globalState.WithDatabase(
    new Kusto.Language.Symbols.DatabaseSymbol.ctor(
      defaultDatabaseName,
      symbols,
    ),
  );
}

export async function getSymbolsOnTable(
  kustoClient: KustoClient,
  defaultDatabaseName: string,
  tableName: string,
  globalState: Kusto.Language.GlobalState,
): Promise<Kusto.Language.GlobalState | null> {
  const tableSchema = await getTableSchema(
    kustoClient,
    defaultDatabaseName,
    tableName,
  );
  const columns = getTableColumns(tableSchema);
  const newTable = new Kusto.Language.Symbols.TableSymbol.$ctor4(
    tableName,
    columns,
  );
  if (!globalState.Database) {
    return null;
  }
  return globalState.WithDatabase(globalState.Database.AddMembers([newTable]));
}

function getTableColumns(
  tableSchemas: TableSchema,
): Kusto.Language.Symbols.ColumnSymbol[] {
  const columns: Kusto.Language.Symbols.ColumnSymbol[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const schema: any = JSON.parse(tableSchemas.Schema);

  const orderedColumns: ColumnInfo[] = schema.OrderedColumns;

  orderedColumns.forEach((column) => {
    columns.push(
      new Kusto.Language.Symbols.ColumnSymbol(
        column.Name,
        getTypeSymbol(column.CslType),
        null,
        null,
        null,
        null,
      ),
    );
  });

  return columns;
}

/**
 * @param kustoClient a Kusto client from azure-kusto-data
 * @param defaultDatabaseName to run `.show xyz` queries on
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function getDatabasesOnCluster(
  kustoClient: KustoClient,
): Promise<DatabaseMetadata[]> {
  const results = await kustoClient.execute("", ".show databases");
  if (!results?.primaryResults?.[0]) {
    return [];
  }
  const databaseNames: DatabaseMetadata[] = [];
  for (const row of results.primaryResults[0].rows()) {
    databaseNames.push({
      DatabaseName: row["DatabaseName"] ?? "",
      PrettyName: row["PrettyName"] ?? "",
    });
  }
  return databaseNames;
}

/**
 * https://kusto.azurewebsites.net/docs/management/functions.html#show-functions
 * Name	String	The name of the function.
 * Parameters	String	The parameters that are required by the function.
 * Body	String	(Zero or more) Let statements followed by a valid CSL expression that is evaluated upon function invocation.
 * Folder	String	A folder that is used for UI functions categorization. This parameter does not change the way function is invoked
 * DocString	String	A description of the function - to be shown for UI purposes.
 * @param kustoClient
 * @param defaultDatabaseName
 */
function getFunctionMetadata(
  kustoClient: KustoClient,
  databaseName: string,
): Promise<FunctionMetadata[]> {
  return kustoClient
    .execute(databaseName, ".show functions")
    .then((results) => {
      if (!results?.primaryResults?.[0]) {
        return [];
      }
      const functionMetadatas: FunctionMetadata[] = [];
      for (const row of results.primaryResults[0].rows()) {
        functionMetadatas.push({
          Name: row["Name"] ?? "",
          Parameters: row["Parameters"] ?? "",
          Folder: row["Folder"] ?? "",
          DocString: row["DocString"] ?? "",
        });
      }
      return functionMetadatas;
    });
}

/**
 * https://kusto.azurewebsites.net/docs/management/tables.html#show-tables
 * TableName	String	The name of the table.
 * DatabaseName	String	The database that the table belongs to.
 * Folder	String	The table's folder.
 * DocString	String	A string documenting the table.
 *
 * TODO for each, get schema: .show table schema https://kusto.azurewebsites.net/docs/management/tables.html#show-tables
 * @param kustoClient
 * @param databaseName
 */
function getTableMetadata(
  kustoClient: KustoClient,
  databaseName: string,
): Promise<TableMetadata[]> {
  return kustoClient
    .execute(databaseName, ".show tables")
    .then((results) => {
      if (!results?.primaryResults?.[0]) {
        return [];
      }
      const tableMetadatas: TableMetadata[] = [];
      for (const row of results.primaryResults[0].rows()) {
        tableMetadatas.push({
          TableName: row["TableName"] ?? "",
          DatabaseName: row["DatabaseName"] ?? "",
          Folder: row["Folder"] ?? "",
          DocString: row["DocString"] ?? "",
        });
      }
      return tableMetadatas;
    });
}

function getTableSchema(
  kustoClient: KustoClient,
  databaseName: string,
  tableName: string,
): Promise<TableSchema> {
  return kustoClient
    .execute(databaseName, `.show table ${tableName} schema as json`)
    .then((results) => {
      if (!results?.primaryResults?.[0]) {
        throw new Error(`No schema results for table ${tableName}`);
      }
      const firstRow = results.primaryResults[0].rows().next().value;
      if (!firstRow) {
        throw new Error(`Empty schema results for table ${tableName}`);
      }
      return {
        TableName: firstRow["TableName"] ?? "",
        Schema: firstRow["Schema"] ?? "",
        DatabaseName: firstRow["DatabaseName"] ?? "",
        Folder: firstRow["Folder"] ?? "",
        DocString: firstRow["DocString"] ?? "",
      };
    });
}

async function getTableSymbols(
  kustoClient: KustoClient,
  databaseName: string,
  metadata: TableMetadata[],
): Promise<Kusto.Language.Symbols.TableSymbol[]> {
  const symbols: Kusto.Language.Symbols.TableSymbol[] = [];
  for (const m of metadata) {
    let columns: Kusto.Language.Symbols.ColumnSymbol[] = [];
    try {
      const schema = await getTableSchema(
        kustoClient,
        databaseName,
        m.TableName,
      );
      columns = getTableColumns(schema);
    } catch {
      // Fall back to table without columns if schema fetch fails
    }
    symbols.push(
      new Kusto.Language.Symbols.TableSymbol.$ctor4(m.TableName, columns),
    );
  }
  return symbols;
}

function getFunctionSymbols(
  metadata: FunctionMetadata[],
  // TODO: use globalState to get return type, signature types, etc of the functions
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  globalState: Kusto.Language.GlobalState,
): Array<Kusto.Language.Symbols.FunctionSymbol> {
  const symbols: Kusto.Language.Symbols.FunctionSymbol[] = [];

  for (const m of metadata) {
    // TODO return type, signature types etc. Will require additional calls to cluster.
    const signature = new Kusto.Language.Symbols.Signature.$ctor2(
      Kusto.Language.Symbols.ReturnTypeKind.Common,
      getParameters(m.Parameters),
    );
    symbols.push(
      new Kusto.Language.Symbols.FunctionSymbol.$ctor4(m.Name, [signature]),
    );
  }

  return symbols;
}

function getParameters(parameters: string): Kusto.Language.Symbols.Parameter[] {
  // Expected Form
  // "([param1:param1type][, param2:param2type]...)"
  const params: string[] = parameters
    .substring(1, parameters.length - 1)
    .split(",")
    .filter((s) => s !== "");
  const kParams: Kusto.Language.Symbols.Parameter[] = [];
  params.forEach((param) => kParams.push(getSingleParameter(param)));
  return kParams;
}

function getSingleParameter(
  parameter: string,
): Kusto.Language.Symbols.Parameter {
  // Expected Form
  // "param1 : param1type"

  const paramSplit = parameter.split(/[: ]+/).filter((s) => s !== "");
  return new Kusto.Language.Symbols.Parameter.$ctor2(
    paramSplit[0],
    getTypeSymbol(paramSplit[1]),
  );
}

function getTypeSymbol(
  type: string,
): Kusto.Language.Symbols.ScalarSymbol | null {
  return Kusto.Language.Symbols.ScalarSymbol.From(type);
}

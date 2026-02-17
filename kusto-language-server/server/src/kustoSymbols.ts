import KustoClient from "azure-kusto-data/types/src/client";

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
  // TODO use this functionality
  // const databasesMetadata = await getDatabasesOnCluster(kustoClient, defaultDatabaseName);
  // for (let databaseNames of databasesMetadata) {
  // 	const functionMetadatas = await getFunctionsOnDatabase(kustoClient, defaultDatabaseName);
  // }
  // for (let databaseNames of databasesMetadata) {
  // 	const tableMetadatas = await getTablesOnDatabase(kustoClient, defaultDatabaseName);
  // }
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
  symbols.push(...getTableSymbols(tableMetadata));
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
    // Add null-safety check for column and type symbol
    if (column && column.Name) {
      const typeSymbol = getTypeSymbol(column.CslType);
      // Only add column if we can determine its type
      if (typeSymbol) {
        columns.push(
          new Kusto.Language.Symbols.ColumnSymbol(
            column.Name,
            typeSymbol,
            null,
            null,
            null,
            null,
          ),
        );
      }
    }
  });

  return columns;
}

/**
 * @param kustoClient a Kusto client from azure-kusto-data
 * @param defaultDatabaseName to run `.show xyz` queries on
 */
// TODO: use this function
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getDatabasesOnCluster(
  kustoClient: KustoClient,
  defaultDatabaseName: string,
): Promise<DatabaseMetadata[]> {
  return new Promise((resolve, reject) => {
    const databaseNames: { DatabaseName: string; PrettyName: string }[] = [];
    kustoClient
      .execute(defaultDatabaseName, ".show cluster databases")
      .catch(reject)
      .then((results) => {
        if (!results) {
          return reject("void results");
        }

        console.log(results);
        if (!results.primaryResults || !results.primaryResults[0]) {
          return reject("Failed to fetch databases in cluster");
        }
        const primaryResults = results.primaryResults[0];
        // Access _rows property which contains the actual data array
        for (let i = 0; i < primaryResults._rows.length; i++) {
          databaseNames.push({
            DatabaseName: primaryResults._rows[i].DatabaseName,
            PrettyName: primaryResults._rows[i].PrettyName,
          });
        }
        return resolve(databaseNames);
      });
  });
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
  return new Promise((resolve, reject) => {
    const functionMetadatas: {
      Name: string;
      Parameters: string;
      Folder: string;
      DocString: string;
    }[] = [];
    kustoClient
      .execute(databaseName, ".show functions")
      .catch(reject)
      .then((results) => {
        if (!results) {
          return reject("void results");
        }

        console.log(results);
        if (!results.primaryResults || !results.primaryResults[0]) {
          return reject("Failed to fetch functions in cluster");
        }
        const primaryResults = results.primaryResults[0];
        // Access _rows property which contains the actual data array
        for (let i = 0; i < primaryResults._rows.length; i++) {
          functionMetadatas.push({
            Name: primaryResults._rows[i].Name,
            Parameters: primaryResults._rows[i].Parameters,
            Folder: primaryResults._rows[i].Folder,
            DocString: primaryResults._rows[i].DocString,
          });
        }
        return resolve(functionMetadatas);
      });
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
  return new Promise((resolve, reject) => {
    const tableMetadatas: {
      TableName: string;
      DatabaseName: string;
      Folder: string;
      DocString: string;
    }[] = [];
    kustoClient
      .execute(databaseName, ".show tables")
      .catch(reject)
      .then((results) => {
        if (!results) {
          return reject("void results");
        }

        console.log(results);
        if (!results.primaryResults || !results.primaryResults[0]) {
          return reject("Failed to fetch tables in cluster");
        }
        const primaryResults = results.primaryResults[0];
        // Access _rows property which contains the actual data array
        for (let i = 0; i < primaryResults._rows.length; i++) {
          tableMetadatas.push({
            TableName: primaryResults._rows[i].TableName,
            DatabaseName: primaryResults._rows[i].DatabaseName,
            Folder: primaryResults._rows[i].Folder,
            DocString: primaryResults._rows[i].DocString,
          });
        }
        return resolve(tableMetadatas);
      });
  });
}

function getTableSchema(
  kustoClient: KustoClient,
  databaseName: string,
  tableName: string,
): Promise<TableSchema> {
  return new Promise((resolve, reject) => {
    kustoClient
      .execute(databaseName, `.show table ${tableName} schema as json`)
      .catch(reject)
      .then((results) => {
        if (!results) {
          return reject("void results");
        }

        console.log(results);
        if (!results.primaryResults || !results.primaryResults[0]) {
          return reject("Failed to fetch tables in cluster");
        }
        const primaryResults = results.primaryResults[0];

        // Access _rows property which contains the actual data array
        const tableMetadata = {
          TableName: primaryResults._rows[0].TableName,
          Schema: primaryResults._rows[0].Schema,
          DatabaseName: primaryResults._rows[0].DatabaseName,
          Folder: primaryResults._rows[0].Folder,
          DocString: primaryResults._rows[0].DocString,
        };

        return resolve(tableMetadata);
      });
  });
}

function getTableSymbols(
  metadata: TableMetadata[],
): Kusto.Language.Symbols.TableSymbol[] {
  const symbols: Kusto.Language.Symbols.TableSymbol[] = [];
  for (const m of metadata) {
    symbols.push(
      new Kusto.Language.Symbols.TableSymbol.$ctor4(m.TableName, []),
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
  
  // Add null-safety checks
  if (!paramSplit || paramSplit.length < 2) {
    // Fallback: create a parameter with unknown type if parsing fails
    const paramName = paramSplit && paramSplit.length > 0 ? paramSplit[0] : "unknown";
    return new Kusto.Language.Symbols.Parameter.$ctor2(
      paramName,
      null,
    );
  }

  return new Kusto.Language.Symbols.Parameter.$ctor2(
    paramSplit[0],
    getTypeSymbol(paramSplit[1]),
  );
}

function getTypeSymbol(
  type: string,
): Kusto.Language.Symbols.ScalarSymbol | null {
  // Add null-safety check for type parameter
  if (!type || typeof type !== 'string') {
    return null;
  }
  
  try {
    return Kusto.Language.Symbols.ScalarSymbol.From(type);
  } catch (e) {
    // Gracefully handle errors when parsing type
    console.error(`Error parsing type symbol: ${type}`, e);
    return null;
  }
}

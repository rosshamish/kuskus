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

// Helper functions - defined before export functions that use them

/**
 * Pure: splits a raw parameter string "param1 : typename" into name and type parts.
 * No bridge dependency — testable in isolation.
 */
export function parseParameterParts(parameter: string): { name: string; typeStr: string } | null {
  const parts = parameter.split(/[: ]+/).filter((s) => s !== "");
  if (parts.length === 0) {
    return null;
  }
  if (parts.length < 2) {
    return { name: parts[0], typeStr: "" };
  }
  return { name: parts[0], typeStr: parts[1] };
}

/**
 * Pure: splits a raw parameters string "(p1:t1, p2:t2)" into individual parameter strings.
 * No bridge dependency — testable in isolation.
 */
export function parseRawParameters(parameters: string): string[] {
  return parameters
    .substring(1, parameters.length - 1)
    .split(",")
    .filter((s) => s !== "");
}

function getTypeSymbol(
  type: string,
): Kusto.Language.Symbols.ScalarSymbol | null {
  if (!type || typeof type !== "string") {
    return null;
  }

  try {
    return Kusto.Language.Symbols.ScalarSymbol.From(type);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(`Error parsing type symbol: ${type}`, e);
    return null;
  }
}

function getSingleParameter(
  parameter: string,
): Kusto.Language.Symbols.Parameter {
  const parsed = parseParameterParts(parameter);
  if (!parsed || !parsed.typeStr) {
    const paramName = parsed ? parsed.name : "unknown";
    return new Kusto.Language.Symbols.Parameter.$ctor2(paramName, null);
  }
  return new Kusto.Language.Symbols.Parameter.$ctor2(
    parsed.name,
    getTypeSymbol(parsed.typeStr),
  );
}

function getParameters(parameters: string): Kusto.Language.Symbols.Parameter[] {
  const kParams: Kusto.Language.Symbols.Parameter[] = [];
  parseRawParameters(parameters).forEach((param) => kParams.push(getSingleParameter(param)));
  return kParams;
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
          return reject(new Error("void results"));
        }

        // eslint-disable-next-line no-console
        console.log(results);
        if (!results.primaryResults || !results.primaryResults[0]) {
          return reject(new Error("Failed to fetch databases in cluster"));
        }
        const primaryResults = results.primaryResults[0];
        // eslint-disable-next-line no-underscore-dangle
        for (let i = 0; i < primaryResults._rows.length; i += 1) {
          databaseNames.push({
            // eslint-disable-next-line no-underscore-dangle
            DatabaseName: primaryResults._rows[i].DatabaseName,
            // eslint-disable-next-line no-underscore-dangle
            PrettyName: primaryResults._rows[i].PrettyName,
          });
        }
        return resolve(databaseNames);
      });
  });
}

/**
 * https://kusto.azurewebsites.net/docs/management/functions.html#show-functions
 * NameStringThe name of the function.
 * ParametersStringThe parameters that are required by the function.
 * BodyString(Zero or more) Let statements followed by a valid CSL expression that is evaluated upon function invocation.
 * FolderStringA folder that is used for UI functions categorization. This parameter does not change the way function is invoked
 * DocStringStringA description of the function - to be shown for UI purposes.
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
          return reject(new Error("void results"));
        }

        // eslint-disable-next-line no-console
        console.log(results);
        if (!results.primaryResults || !results.primaryResults[0]) {
          return reject(new Error("Failed to fetch functions in cluster"));
        }
        const primaryResults = results.primaryResults[0];
        // eslint-disable-next-line no-underscore-dangle
        for (let i = 0; i < primaryResults._rows.length; i += 1) {
          functionMetadatas.push({
            // eslint-disable-next-line no-underscore-dangle
            Name: primaryResults._rows[i].Name,
            // eslint-disable-next-line no-underscore-dangle
            Parameters: primaryResults._rows[i].Parameters,
            // eslint-disable-next-line no-underscore-dangle
            Folder: primaryResults._rows[i].Folder,
            // eslint-disable-next-line no-underscore-dangle
            DocString: primaryResults._rows[i].DocString,
          });
        }
        return resolve(functionMetadatas);
      });
  });
}

/**
 * https://kusto.azurewebsites.net/docs/management/tables.html#show-tables
 * TableNameStringThe name of the table.
 * DatabaseNameStringThe database that the table belongs to.
 * FolderStringThe table's folder.
 * DocStringStringA string documenting the table.
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
          return reject(new Error("void results"));
        }

        // eslint-disable-next-line no-console
        console.log(results);
        if (!results.primaryResults || !results.primaryResults[0]) {
          return reject(new Error("Failed to fetch tables in cluster"));
        }
        const primaryResults = results.primaryResults[0];
        // eslint-disable-next-line no-underscore-dangle
        for (let i = 0; i < primaryResults._rows.length; i += 1) {
          tableMetadatas.push({
            // eslint-disable-next-line no-underscore-dangle
            TableName: primaryResults._rows[i].TableName,
            // eslint-disable-next-line no-underscore-dangle
            DatabaseName: primaryResults._rows[i].DatabaseName,
            // eslint-disable-next-line no-underscore-dangle
            Folder: primaryResults._rows[i].Folder,
            // eslint-disable-next-line no-underscore-dangle
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
          return reject(new Error("void results"));
        }

        // eslint-disable-next-line no-console
        console.log(results);
        if (!results.primaryResults || !results.primaryResults[0]) {
          return reject(new Error("Failed to fetch tables in cluster"));
        }
        const primaryResults = results.primaryResults[0];

        // eslint-disable-next-line no-underscore-dangle
        const tableMetadata = {
          // eslint-disable-next-line no-underscore-dangle
          TableName: primaryResults._rows[0].TableName,
          // eslint-disable-next-line no-underscore-dangle
          Schema: primaryResults._rows[0].Schema,
          // eslint-disable-next-line no-underscore-dangle
          DatabaseName: primaryResults._rows[0].DatabaseName,
          // eslint-disable-next-line no-underscore-dangle
          Folder: primaryResults._rows[0].Folder,
          // eslint-disable-next-line no-underscore-dangle
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
  // eslint-disable-next-line no-restricted-syntax
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

  // eslint-disable-next-line no-restricted-syntax
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

// Exported functions - these depend on helpers above

export async function getSymbolsOnCluster(
  kustoClient: KustoClient,
  defaultDatabaseName: string,
): Promise<Kusto.Language.GlobalState | null> {
  // TODO use this functionality
  // const databasesMetadata = await getDatabasesOnCluster(kustoClient, defaultDatabaseName);
  // for (let databaseNames of databasesMetadata) {
  // const functionMetadatas = await getFunctionsOnDatabase(kustoClient, defaultDatabaseName);
  // }
  // for (let databaseNames of databasesMetadata) {
  // const tableMetadatas = await getTablesOnDatabase(kustoClient, defaultDatabaseName);
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
// eslint-disable-next-line new-cap
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

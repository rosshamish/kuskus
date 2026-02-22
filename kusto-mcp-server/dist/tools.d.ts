export declare function kqlValidate(query: string): object;
export declare function kqlFormat(query: string): string | null;
export declare function kqlCompletions(partialQuery: string): object[];
export declare function kqlExplainOperator(name: string): string | null;
export declare function kqlExecute(query: string, cluster: string, database: string): Promise<object>;

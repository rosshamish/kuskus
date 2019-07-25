/// <reference path='../../node_modules/monaco-editor-core/monaco.d.ts'/>

declare interface String {
    endsWith(searchString: string, length?: number ):boolean;
}

declare module System {
	export interface StringComparison {}
}

/**
 * For Some reason Bridge.Net doesn't bother to generate declarations for this one.
 */
declare module System.Text.RegularExpressions {
    export interface  Regex{
    }

    export interface Match {}
    export interface MatchCollection {}
}
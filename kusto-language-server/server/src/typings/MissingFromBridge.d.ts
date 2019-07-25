declare module System.Collections.Generic {

    export interface IReadOnlyCollection$1<T> {
        Count: number;
    }
    export function IReadOnlyCollection$1<T>(t: Bridge.TypeRef<T>): {
        prototype: IReadOnlyCollection$1<T>;
    }

    export interface IReadOnlyList$1<T> extends IReadOnlyCollection$1<T> {
        get(key: number): T;
        // TODO find a better way to access a member, since getItem conflicts
        // with SyntaxList and get doesn't work for some reason.
        _items: T[];
        Items: IReadOnlyList$1<T>;
    }

    export function IReadOnlyList$1<T>(t: Bridge.TypeRef<T>): {
        prototype: IReadOnlyList$1<T>;
    }

    export interface IReadOnlyDictionary$2<TKey, TValue> {
        get(key: TKey): TValue;
        Keys: ICollection$1<TKey>;
        Values: ICollection$1<TValue>;
        Count: number;
        containsKey(key: TKey): boolean;
        tryGetValue(key: TKey, value: { v: TValue }): boolean;
    }
    export function IReadOnlyDictionary$2<TKey, TValue>(tKey: Bridge.TypeRef<TKey>, tValue: Bridge.TypeRef<TValue>): {
        prototype: IReadOnlyDictionary$2<TKey, TValue>;
    }
}
export type ValueOf<T> = T[keyof T]

export type Pretty<T> = T extends unknown
    ? { [K in keyof T]: T[K] } & unknown
    : never
export type PrettyDeep<T> = T extends unknown
    ? {
          [K in keyof T]: T[K] extends Record<string, unknown>
              ? PrettyDeep<T[K]>
              : T[K]
      }
    : never

export type Equal<T, U> = (<G>() => G extends T ? 1 : 2) extends <
    G,
>() => G extends U ? 1 : 2
    ? true
    : false
export type isTrue<T extends true> = T

export type SliceFromStart<
    T extends unknown[],
    End extends number,
    Target extends unknown[] = [],
> = T['length'] | End extends 0
    ? []
    : Target['length'] extends End
      ? Target
      : T extends [infer A, ...infer R]
        ? SliceFromStart<R, End, [...Target, A]>
        : never

export type Fn<T> = T extends (dep: infer D) => infer F
    ? {
          arg: D
          return: F
      }
    : never


export type UnionToIntersection<U> = (
    U extends unknown
        ? (k: U) => void
        : never
) extends (k: infer I) => void
    ? I
    : never

export type NonEmptyArray<T> = [T, ...T[]]

export type DistributivePick<T, K extends keyof T> = T extends unknown
    ? Pick<T, K>
    : never
export type DistributiveJoin<T, U> = T extends unknown
    ? U extends unknown
        ? T & U
        : never
    : never
export type DistributiveOmit<T, K extends keyof T> = T extends unknown
    ? Omit<T, K>
    : never

export type Validate<T> = {
    parse: (value: unknown) => T
}

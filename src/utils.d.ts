export type KeysOfUnion<ObjectType> = ObjectType extends unknown
    ? keyof ObjectType
    : never
export type IsEqual<T, U> = (<G>() => G extends T ? 1 : 2) extends <
    G,
>() => G extends U ? 1 : 2
    ? true
    : false

export type ArrayElement<T> = T extends readonly unknown[] ? T[0] : never

export type ExactObject<ParameterType, InputType> = {
    [Key in keyof ParameterType]: Exact<
        ParameterType[Key],
        Key extends keyof InputType ? InputType[Key] : never
    >
} & Record<Exclude<keyof InputType, KeysOfUnion<ParameterType>>, never>

export type Exact<ParameterType, InputType> = IsEqual<
    ParameterType,
    InputType
> extends true
    ? ParameterType
    : // Convert union of array to array of union: A[] & B[] => (A & B)[]
      ParameterType extends unknown[]
      ? Array<Exact<ArrayElement<ParameterType>, ArrayElement<InputType>>>
      : // In TypeScript, Array is a subtype of ReadonlyArray, so always test Array before ReadonlyArray.
        ParameterType extends readonly unknown[]
        ? ReadonlyArray<
              Exact<ArrayElement<ParameterType>, ArrayElement<InputType>>
          >
        : ParameterType extends object
          ? ExactObject<ParameterType, InputType>
          : ParameterType

export type ValueOf<
    ObjectType,
    ValueType = keyof ObjectType,
> = ValueType extends keyof ObjectType ? ObjectType[ValueType] : never

export type evaluateUnion<T> = T extends unknown
    ? { [K in keyof T]: T[K] } & unknown
    : never

export type evaluate<T> = { [K in keyof T]: T[K] } & unknown

export type DistributivePick<T, K> = T extends unknown
    ? K extends keyof T
        ? Pick<T, K>
        : never
    : never

export type DistributiveOmit<T, K extends keyof T> = T extends unknown
    ? Omit<T, K>
    : never

export type SliceFromStart<
    T,
    End extends number,
    Acc extends unknown[] = [],
> = T extends unknown[]
    ? Acc['length'] extends End
        ? Acc
        : T extends [infer Head, ...infer Tail]
          ? SliceFromStart<Tail, End, [...Acc, Head]>
          : Acc
    : never

export type Slices<
    Rest extends unknown[],
    MinLength extends number = 0,
    Slice extends unknown[] = [],
    Reached extends boolean = Slice['length'] extends MinLength ? true : false,
    Acc = never,
> = Rest extends [infer H, ...infer T]
    ? [...Slice, H] extends infer X extends unknown[]
        ? Slices<
              T,
              MinLength,
              X,
              X['length'] extends MinLength ? true : Reached,
              Acc | (Reached extends true ? Slice : never)
          >
        : never
    : Acc | (Reached extends true ? Slice : never)

export type MergeIntersectionObject<T, Keys = keyof T> = {
    [K in Keys]: T[K]
}
// type t = MergeIntersectionObject<
//     { a: 'a1'; b: 1n; extra: 'extra' } | { a: 'a2'; b: 2 }
// >

export type NonEmptyArray<T> = [T, ...T[]]

export type Replace<T, U, V> = T extends U ? V : T

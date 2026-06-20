// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

// Shared DTO utilities and types used across all domains

import type { Message } from "@bufbuild/protobuf";
import type { MessageResponse as ContractMessageResponse } from "@coveritlabs/contracts";

/**
 * Recursively strips the protobuf `$typeName` marker from Message types.
 * Converts protobuf Message objects to plain JS objects.
 */
export type Plain<T> =
  T extends Message<string>
    ? { [K in keyof Omit<T, "$typeName">]: Plain<Omit<T, "$typeName">[K]> }
    : T extends Array<infer U>
      ? Array<Plain<U>>
      : T extends ReadonlyArray<infer U>
        ? ReadonlyArray<Plain<U>>
        : T extends object
          ? { [K in keyof T]: Plain<T[K]> }
          : T;

/**
 * Recursively converts object keys from snake_case to camelCase.
 * Preserves the original types of the values.
 */
type CamelCase<S extends string> = S extends `${infer P}_${infer R}` ? `${P}${Capitalize<CamelCase<R>>}` : S;

/**
 * Recursively converts all object keys in a type from snake_case to camelCase.
 * Handles nested objects and arrays.
 */
export type Camelized<T> =
  T extends Array<infer U>
    ? Array<Camelized<U>>
    : T extends ReadonlyArray<infer U>
      ? ReadonlyArray<Camelized<U>>
      : T extends object
        ? {
            [K in keyof T as K extends string ? CamelCase<K> : K]: Camelized<T[K]>;
          }
        : T;

export type DomainDTO<T> = Camelized<Plain<T>>;

// Shared domain models
export type MessageResponse = Plain<ContractMessageResponse>;

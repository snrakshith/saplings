# Utilities catalogue — v0.7.0

All original exported declarations are retained; use module subpaths or browser-safe root namespaces. The list includes types and values.

## date.ts

`DateInput`, `DateUnit`, `Weekday`, `addDays`, `addHours`, `addMilliseconds`, `addMinutes`, `addMonths`, `addQuarters`, `addSeconds`, `addWeeks`, `addYears`, `clampDate`, `compareDates`, `daysInMonth`, `differenceInCalendarDays`, `differenceInDays`, `differenceInHours`, `differenceInMilliseconds`, `differenceInMinutes`, `differenceInMonths`, `differenceInSeconds`, `differenceInWeeks`, `eachDayOfInterval`, `endOfDay`, `endOfHour`, `endOfMinute`, `endOfMonth`, `endOfQuarter`, `endOfWeek`, `endOfYear`, `epochMilliseconds`, `formatDate`, `formatDateTime`, `formatRelative`, `getAge`, `getQuarter`, `isDateAfter`, `isDateBefore`, `isISODateString`, `isLeapYear`, `isSameDay`, `isSameInstant`, `isToday`, `isValidDate`, `isWeekday`, `isWeekend`, `isWithinInterval`, `maxDate`, `minDate`, `now`, `parseISO`, `setTime`, `startOfDay`, `startOfHour`, `startOfMinute`, `startOfMonth`, `startOfQuarter`, `startOfWeek`, `startOfYear`, `subDays`, `subMonths`, `subYears`, `toDate`, `toDateKey`, `toISOString`, `toUnixSeconds`, `unixTime`

## es-toolkit.ts

`MaybePromise`, `assert`, `camelCase`, `capitalize`, `chunk`, `clamp`, `compact`, `compactMap`, `constant`, `countBy`, `debounce`, `deepClone`, `deepEqual`, `difference`, `drop`, `endsWith`, `escapeRegExp`, `flatten`, `flattenDeep`, `getPath`, `groupBy`, `identity`, `inRange`, `intersection`, `invariant`, `isArray`, `isBoolean`, `isDate`, `isFiniteNumber`, `isFunction`, `isNil`, `isNull`, `isNumber`, `isObject`, `isPlainObject`, `isPromiseLike`, `isRegExp`, `isString`, `isUndefined`, `kebabCase`, `lerp`, `lowerFirst`, `max`, `mean`, `median`, `memoize`, `min`, `noop`, `omit`, `once`, `padEnd`, `padStart`, `partition`, `pascalCase`, `pick`, `randomInt`, `range`, `retry`, `round`, `sample`, `setPath`, `shuffle`, `sleep`, `snakeCase`, `startsWith`, `sum`, `take`, `takeRight`, `throttle`, `toStringSafe`, `truncate`, `tryCatch`, `union`, `unique`, `uniqueBy`, `upperFirst`, `words`, `zip`, `zipWith`

## fp.ts

`Curried2`, `Predicate`, `Unary`, `allPass`, `anyPass`, `apply`, `applyTo`, `asyncMap`, `asyncPipe`, `complement`, `compose`, `constant`, `converge`, `convergeArray`, `curry2`, `filter`, `find`, `flip`, `flow`, `fork`, `identity`, `juxt`, `map`, `memoizeUnary`, `negate`, `partial`, `partialRight`, `pipe`, `prop`, `propEq`, `reduce`, `reject`, `sortBy`, `tap`, `thru`, `tryCatch`, `unless`, `when`

## hooks.ts

`ExternalStore`, `Unsubscribe`, `createAbortableTask`, `createAsyncState`, `createCounter`, `createDebouncedValue`, `createEventEmitter`, `createExternalStore`, `createInterval`, `createMediaQuery`, `createPreviousValue`, `createToggle`, `onDocumentVisible`, `onOnlineStatus`

## i18n.ts

`DateFormatOptions`, `I18n`, `I18nOptions`, `InterpolationValues`, `Messages`, `NumberFormatOptions`, `PluralOptions`, `TranslationTree`, `createI18n`, `formatCurrency`, `formatDate`, `formatNumber`, `getBrowserLocale`, `negotiateLocale`

## iterators.ts

`IterableMapper`, `asyncToArray`, `chunkIter`, `concatIter`, `count`, `cycle`, `dropIter`, `entries`, `enumerate`, `everyIter`, `filterAsyncIter`, `filterIter`, `findIter`, `first`, `flatMapIter`, `last`, `mapAsyncIter`, `mapIter`, `rangeIter`, `reduceIter`, `repeat`, `skipWhile`, `someIter`, `takeAsyncIter`, `takeIter`, `takeWhile`, `toArray`, `uniqueIter`, `zipIter`, `zipLongest`

## permissions.ts

`Action`, `AttributeCondition`, `AttributeValue`, `AuthorizationDecision`, `ConditionOperator`, `Effect`, `PermissionEngine`, `PermissionRequest`, `Policy`, `Principal`, `PrincipalId`, `Resource`, `ResourceType`, `createAbacPolicy`, `createRbacPolicy`, `definePolicy`, `hasAllRoles`, `hasAnyRole`, `hasRole`, `isOwner`, `ownerMatches`

## server.ts

`collectStream`, `createHealthServer`, `fileExists`, `gunzip`, `gzip`, `mapConcurrent`, `parseCookies`, `randomId`, `readJson`, `readRequestBody`, `readRequestJson`, `resolveWithin`, `safeEqual`, `sendJson`, `serializeCookie`, `setHeaderIfAbsent`, `sha256`, `sha256Base64`, `withTimeout`, `writeFileAtomic`, `writeJson`

## storage.ts

`CookieOptions`, `KeyValueStorage`, `StorageKind`, `StorageOptions`, `createCookieStore`, `createMemoryStore`, `createStorage`, `localStore`, `sessionStore`

## types.ts

`AsyncReturn`, `Awaitable`, `Brand`, `Constructor`, `DeepMutable`, `DeepPartial`, `DeepReadonly`, `EmailAddress`, `Exact`, `FunctionArgs`, `FunctionReturn`, `IsAny`, `IsNever`, `IsUnknown`, `KeysOfType`, `Merge`, `Mutable`, `MutableNonEmptyArray`, `Nil`, `NonEmptyArray`, `NonNullableDeep`, `NumberKeyOf`, `OmitByType`, `OneOf`, `Option`, `OptionalKeys`, `PartialBy`, `PathValue`, `Paths`, `PickByType`, `Primitive`, `RequiredBy`, `RequiredKeys`, `Result`, `Simplify`, `StringKeyOf`, `UUID`, `UnionToIntersection`, `ValueOf`, `XOR`, `err`, `isErr`, `isOk`, `isSome`, `none`, `ok`, `some`

## id.ts (new)

`nanoid` (cryptographically random URL-safe identifier).

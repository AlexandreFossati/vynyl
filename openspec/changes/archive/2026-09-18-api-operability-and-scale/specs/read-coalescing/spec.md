# Spec Delta

## Purpose

Avoid duplicated work when several identical read requests arrive at the same time, running the query only once and sharing the result (singleflight), without keeping a cache.

## ADDED Requirements

### Requirement: Identical concurrent reads share one execution
When several identical read calls (same operation and same parameters) are in flight at the same time, the query SHALL run only once and all the calls SHALL receive the same result. This SHALL apply to getting a product by `id` and to the listing (with the same `limit`, `offset` and `q`). Calls with different parameters SHALL NOT be coalesced.

#### Scenario: Identical simultaneous calls
- **WHEN** five listing reads with the same parameters start while the first has not finished
- **THEN** the database query runs once and all five receive the same result

#### Scenario: Different parameters
- **WHEN** simultaneous reads use different `id`s, or different `limit`/`offset`/`q`
- **THEN** each combination runs its own query

### Requirement: No cache
The result SHALL be shared only among simultaneous calls. After the execution finishes, a new identical call SHALL run the query again.

#### Scenario: Calls in sequence
- **WHEN** a read finishes and, afterwards, another identical one is made
- **THEN** the query runs again

### Requirement: Errors are shared and do not get stuck
If the shared execution fails, all the calls that were waiting on it SHALL receive the same error, and the key SHALL be released so that the next call tries again.

#### Scenario: Shared failure
- **WHEN** the query fails while several identical calls are waiting
- **THEN** all reject with the same error and a later call runs the query again

### Requirement: Writes are never coalesced
Creating, updating and removing products SHALL always run, once per call, even if identical and simultaneous.

#### Scenario: Two simultaneous creations
- **WHEN** two identical creations arrive at the same time
- **THEN** the repository is called twice (the second may fail due to a duplicate SKU, as expected)

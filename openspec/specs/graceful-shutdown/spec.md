# graceful-shutdown Specification

## Purpose

Ensure the API shuts down without interrupting in-flight requests or leaving the database open, both when receiving a system signal and on the developer's `Ctrl+C`.

## Requirements

### Requirement: Clean shutdown on signal
On receiving `SIGINT` or `SIGTERM`, the API SHALL stop accepting new connections, wait for in-flight requests to complete, close the database connection and end the process with exit code 0, recording the start and end of the shutdown. During shutdown, new connections SHALL be refused.

#### Scenario: In-flight request completes
- **WHEN** the signal arrives while a request is still being served
- **THEN** that request receives its complete response, the database is closed after it and the process exits with code 0

#### Scenario: New connections refused
- **WHEN** shutdown has already started and a client tries to connect
- **THEN** the connection is refused

#### Scenario: No in-flight requests
- **WHEN** the signal arrives with the server idle
- **THEN** the process exits quickly with code 0 and the database closed

### Requirement: Maximum shutdown time
If in-flight requests do not finish within 10 seconds, the API SHALL close the remaining connections, record the forced shutdown and exit with a non-zero code.

#### Scenario: Request that does not finish
- **WHEN** a request remains pending beyond the maximum time after the signal
- **THEN** the connections are closed, the log records the forced shutdown and the exit code is 1

### Requirement: Single shutdown
Repeated signals during shutdown SHALL be ignored: only one shutdown is executed. A failure while shutting down SHALL be recorded and result in exit code 1.

#### Scenario: Repeated signal
- **WHEN** a second signal arrives while shutdown is in progress
- **THEN** no second shutdown is started and the result is the same as for a single signal

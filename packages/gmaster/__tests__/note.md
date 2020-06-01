# Testing modes

-   With live DB. When `GMASTER_URL` and `MOCK_DB` env variables are not set, the
    tests will boot up local instance of gmaster from source code. `HASURA_URL` must point to a properly configured and running Hasura GraphQL Engine.

-   With mocked DB. This is the fastest way to run the tests, but it might miss
    certain errors related to gmaster <-> DB communication. `GMASTER_URL` must
    be NOT set, and `MOCK_DB` must be set to any non-empty value. The tests will boot up local instance of gmaster from the source code, like in the first option above.

-   Against remotely running GMaster server. When `GMASTER_URL` is set to a
    proper url for running the tests, they will connect to the server and test
    its operations using exposed GMaster API.

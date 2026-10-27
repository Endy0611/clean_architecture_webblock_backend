---
description: Check every file in contracts/ compiles, matches CATALOG.md and did not break v1
---
Check the contracts. Do not edit anything. Run these and show the real output:

1. **Protos compile.** `cd contracts/proto` then
   `protoc -I . -I <dir that holds google/protobuf/*.proto> --descriptor_set_out=/dev/null $(find webblock -name '*.proto')`.
   If `protoc` is missing, say so (do not guess). If `buf` exists also run `cd contracts && buf lint`.
2. **Event schemas are valid JSON.** For each `contracts/events/**/*.json`: `python -m json.tool <file> > /dev/null`.
3. **Catalog matches files.** List every `.proto` service/RPC and every event file, then compare with the tables in `contracts/CATALOG.md`.
   Report: contracts missing from the catalog, catalog rows without a file, and rows whose owner/consumers look wrong.
4. **v1 not broken.** If the files are committed: `git diff main -- contracts` (or `HEAD`) and look for removed/renumbered/renamed fields, removed RPCs,
   newly required event properties. If `buf` exists: `buf breaking --against '.git#branch=main,subdir=contracts'`.
5. **Consumers.** For each contract changed in the diff, `grep` the services for its names and list who uses it.

End with: **"Contracts OK"** or **"Fix first:"** and the list (file:line, why, fix). Then call the `contract-guardian` agent only if the diff changed contracts.

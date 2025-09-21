# TODO: A list of items to be completed as part of the refactoring to Web API streams.

- [ ] Reorganise tests to match new npm workspace structure for services
- [ ] Implement middleware support for pipelines
  - [ ] Decide whether we introduce a new concept of "middleware" or just use "pipeline stages"
  - [ ] Decide whether we introduce pre and post hooks for each pipeline stage
- [ ] Determine how to handle markdown. Is it built into the templates pipeline? Or is it middleware on the data pipeline?

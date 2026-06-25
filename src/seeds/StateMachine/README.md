# StateMachine seed

Place `StateMachine.webgmex` here after exporting the meta-model project.

## Create the seed

1. Start MongoDB and the WebGME server: `npm start`
2. Open http://localhost:8888 (stock UI) or use the REST API
3. Create a new project from **EmptyProject**
4. Run the **BuildMetaModel** plugin (server-side)
5. Export the project:

```bash
npm run export -- -p StateMachine -u guest -s master -f src/seeds/StateMachine/project.json
```

6. Zip `project.json` as `StateMachine.webgmex` (or run `npm run seed` once the export script is configured)

The meta-model types are defined in `src/common/meta-model.js`.

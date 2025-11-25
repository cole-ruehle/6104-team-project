docker run --rm -p 8001:8000 \
txtai service notes
===================

The project talks to a local txtai API for semantic indexing/search. This folder holds the
`app.yml` config that both the tests and the runtime rely on. The config sets:

- `embeddings.path` → `sentence-transformers/all-MiniLM-L6-v2`
- `api.port` → `8000`
- `writable: true` so `/add` is allowed

Whatever way you start txtai, make sure the Deno side can reach `http://localhost:8001` and that
your `.env` has `SEMANTIC_SERVICE_URL=http://localhost:8001`.

Running via Docker
------------------

```bash
cd /path/to/6104-team-project
docker run --rm -p 8001:8000 \
  -e CONFIG=/app/app.yml \
  -v "$PWD/semantic_search_service/app.yml:/app/app.yml" \
  neuml/txtai-cpu \
  uvicorn txtai.api.application:app --host 0.0.0.0 --port 8000
```

Keep this container running in one terminal while you run `deno test …SemanticSearchConcept.test.ts`
from another terminal.

Running natively (Python/uvicorn)
---------------------------------

```bash
cd /path/to/6104-team-project
export KMP_DUPLICATE_LIB_OK=TRUE
export CONFIG=semantic_search_service/app.yml
uvicorn txtai.api.application:app --host 0.0.0.0 --port 8001
```

Verification checklist
----------------------

1. txtai server log shows `Application startup complete.`
2. `curl http://localhost:8001/search?query=hello` returns JSON (even if empty).
3. Run the concept tests:

   ```bash
   deno test --allow-env --allow-net --allow-read --allow-write --allow-sys \
     src/concepts/SemanticSearch/SemanticSearchConcept.test.ts
   ```

4. Run the LinkedIn application test to index sample profiles end-to-end:

   ```bash
   deno test --allow-env --allow-net --allow-read --allow-write --allow-sys \
     src/concepts/SemanticSearch/SemanticSearchConceptApplication.test.ts
   ```

If those four steps succeed, SemanticSearchConcept will talk to the live txtai backend correctly.

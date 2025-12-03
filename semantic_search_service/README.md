docker run --rm -p 8001:8000 \
txtai service notes
===================

The project talks to a local txtai API for semantic indexing/search. This folder holds the
`app.yml` config that both the tests and the runtime rely on. The config sets:

- `embeddings.path` → `sentence-transformers/all-MiniLM-L6-v2`
- `api.port` → `8001`
- `writable: true` so `/add` is allowed

Whatever way you start txtai, make sure the Deno side can reach `http://localhost:8001` and that
your `.env` has `SEMANTIC_SERVICE_URL=http://localhost:8001`.

Installation
------------

Install dependencies using pip:

```bash
pip install -r requirements.txt
```

**Note:** If you installed `txtai[API]` separately, that's fine too - it includes the necessary API components. The requirements.txt uses `txtai[cpu]` which is optimized for CPU-based embeddings.

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

**Linux/Mac (bash):**
```bash
cd /path/to/6104-team-project
export KMP_DUPLICATE_LIB_OK=TRUE
export CONFIG=semantic_search_service/app.yml
uvicorn txtai.api.application:app --host 0.0.0.0 --port 8001
```

**Windows (PowerShell):**
```powershell
cd D:\6104-team-project
$env:KMP_DUPLICATE_LIB_OK = "TRUE"
$env:CONFIG = "semantic_search_service\app.yml"
uvicorn txtai.api.application:app --host 0.0.0.0 --port 8001
```

**Windows (Command Prompt):**
```cmd
cd D:\6104-team-project
set KMP_DUPLICATE_LIB_OK=TRUE
set CONFIG=semantic_search_service\app.yml
uvicorn txtai.api.application:app --host 0.0.0.0 --port 8001
```

**Or use the helper scripts:**
- PowerShell: `.\semantic_search_service\start_service.ps1`
- Batch: `semantic_search_service\start_service.bat`

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

Troubleshooting
---------------

### Common Issues on Windows

**Issue: "Module not found" or import errors**
- Make sure you've installed all dependencies: `pip install -r requirements.txt`
- If you installed `txtai[API]`, that's fine - it includes the API components
- You can also try: `pip install fastapi uvicorn[standard] txtai[cpu] sentence-transformers`

**Issue: Port already in use**
- Check if something is already running on port 8001: `netstat -ano | findstr :8001`
- Kill the process or change the port in `app.yml` and update `SEMANTIC_SERVICE_URL` in your `.env`

**Issue: "Application startup complete" doesn't appear**
- Check that the CONFIG path is correct (use absolute path if relative doesn't work)
- Verify `app.yml` exists and is valid YAML
- Check Python version: `python --version` (should be 3.8+)

**Issue: Service starts but Deno can't connect**
- Verify the service is running: open `http://localhost:8001/search?query=test` in browser
- Check Windows Firewall isn't blocking port 8001
- Ensure `SEMANTIC_SERVICE_URL=http://localhost:8001` is in your `.env` file

**Issue: Environment variables not working in PowerShell**
- Use `$env:VAR = "value"` syntax (not `export VAR=value`)
- Or use the provided `start_service.ps1` script

### Verifying Installation

Before running the service, verify your Python environment:
```powershell
python --version  # Should be 3.8 or higher
pip list | findstr txtai  # Should show txtai installed
```

### Quick Test

Once the service is running, test it in another terminal:
```powershell
curl http://localhost:8001/search?query=hello
```

Or use PowerShell's Invoke-WebRequest:
```powershell
Invoke-WebRequest -Uri "http://localhost:8001/search?query=hello" | Select-Object -ExpandProperty Content
```

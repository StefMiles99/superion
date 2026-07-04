# BE-05 — Manuals + RAG (Mock Embeddings + Mock Vector Store)

**Estado:** ⏳
**Depende de:** BE-03
**Desbloquea:** BE-06
**PRD features:** F6.1, F6.2, F6.3, F6.4, F6.5, F6.6, F6.7 (con mock embeddings)
**Stack:** backend · capas: domain + application + infrastructure + interface

## Goal

Admin sube PDF de manual; backend extrae texto, hace chunking, genera embeddings mock (deterministas: hash-based), indexa en vector store in-memory; query RAG con retrieval híbrido (BM25 + vector) + rerank mock devuelve top-k con citas. Todo versionado.

## Capas afectadas

### Domain
- `entities/manual.py` — `Manual(id, asset_model, version, status [active|archived|indexing|indexed|error], storage_path, chunk_count, index_status)`
- `entities/manual_chunk.py` — `ManualChunk(id, manual_id, page, section_path, content, embedding, token_count)`
- `value_objects/citation.py` — `Citation(manual_id, manual_version, page, section_path, chunk_id, snippet)`
- `value_objects/rag_result.py` — `RagResult(answer, citations[], confidence, abstained)`
- `ports/services.py` — `IEmbeddingService`, `IChunkerService`, `IRerankerService`
- `ports/repositories.py` — `IManualRepository`, `IManualChunkRepository`

### Application
- `use_cases/manuals/upload.py` — valida PDF, hashea, sube a storage, crea `Manual(status=pending)`, dispara indexing async
- `use_cases/manuals/index.py` — extrae texto (mock: lee bytes como latin-1, parte por páginas ficticias), chunking, embeddings mock, persiste chunks, marca indexed
- `use_cases/manuals/list.py`, `get.py`, `reindex.py`, `archive.py`
- `use_cases/rag/query.py` — recibe `(question, asset_id, manual_version?)`, hace retrieval híbrido, rerank, devuelve `RagResult`
- `dto/manual.py`, `dto/rag.py`

### Infrastructure
- `services/pdf_extractor.py` — `MockPdfExtractor` (extrae texto página-por-página de bytes mock: divide por `\f` form-feed, cada página numerada; suficiente para tests E2E con PDFs dummy)
- `services/chunker.py` — chunking jerárquico simple: cada página → chunks de N chars (default 512) con overlap 64; mantiene `section_path = "page_{n}"`
- `services/embedding_service.py` — `MockEmbeddingService` que devuelve vector de 384 floats deterministas basado en hash del texto
- `services/reranker.py` — `MockReranker` que devuelve los mismos candidatos en el mismo orden
- `persistence/in_memory/manual_repository.py`, `manual_chunk_repository.py` con índice HNSW simulado (numpy cosine)
- `persistence/supabase/manual_repository.py` stubs

### Interface
- `http/routers/manuals.py` — `GET /v1/manuals`, `POST /v1/manuals` (multipart), `GET /v1/manuals/{id}`, `POST /v1/manuals/{id}/reindex`, `DELETE /v1/manuals/{id}` (archive), `GET /v1/manuals/{id}/search?q=...` (debug RAG)
- `http/exception_handlers.py` — añadir `MANUAL_NOT_FOUND`, `MANUAL_INVALID_PDF`

## Switch vía .env

```
EMBEDDING=mock|openrouter
EMBEDDING_DIM=384
RERANKER=mock|openrouter
VECTOR_STORE=memory|pgvector
CHUNK_SIZE=512
CHUNK_OVERLAP=64
RAG_TOP_K=8
RAG_TOP_N=3
```

## Tests que se escriben PRIMERO

### Unit
1. `tests/unit/domain/test_manual_entity.py` — versionado, status transitions
2. `tests/unit/domain/test_citation.py` — shape inmutable
3. `tests/unit/application/test_chunker.py` — chunks contiguos, section_path correcto
4. `tests/unit/application/test_mock_embedding.py` — determinista
5. `tests/unit/application/test_rag_query.py` — retrieve top-k, rerank, abstención si score < umbral
6. `tests/unit/application/test_upload_manual.py` — happy path, PDF inválido, replaces_manual_id archiva anterior

### Integration
7. `tests/integration/test_manuals_router.py` — upload, list, get, archive
8. `tests/integration/test_indexing_flow.py` — upload → pending → indexing → indexed → chunks.count > 0
9. `tests/integration/test_rag_endpoint.py` — query con cita

### E2E
10. `tests/e2e/test_rag_e2e.py` — login admin → upload PDF dummy → indexa → query → recibe citations

## Implementación mínima para verde

- `MockPdfExtractor`: trata bytes como latin-1, divide por `\f` (form feed). Si no hay `\f`, todo el contenido es página 1.
- `MockEmbeddingService`: `text → hashlib.sha384(text.encode()).digest() → 384 floats normalizados`. Determinista, suficiente para cosine sim.
- `InMemoryVectorStore`: numpy array por manual_id; query = top-k por cosine.
- `InMemoryManualChunkRepository`: BM25 simple: split words lowercase, contar tf; score = sum tf en query. Hybrid = 0.5*vector + 0.5*bm25 normalizado.
- Indexing async: `asyncio.create_task` que duerme 50 ms (simula trabajo) y luego persiste chunks.
- Abstención: si `max(final_score) < 0.3` → `abstained=True`, sin citations.

## Archivos a crear/modificar

```
backend/src/domain/entities/manual.py
backend/src/domain/entities/manual_chunk.py
backend/src/domain/value_objects/citation.py
backend/src/domain/value_objects/rag_result.py
backend/src/domain/ports/services.py                       # MODIFY
backend/src/domain/ports/repositories.py                   # MODIFY
backend/src/application/use_cases/manuals/upload.py
backend/src/application/use_cases/manuals/index.py
backend/src/application/use_cases/manuals/list.py
backend/src/application/use_cases/manuals/get.py
backend/src/application/use_cases/manuals/reindex.py
backend/src/application/use_cases/manuals/archive.py
backend/src/application/use_cases/rag/query.py
backend/src/application/dto/manual.py
backend/src/application/dto/rag.py
backend/src/infrastructure/services/pdf_extractor.py
backend/src/infrastructure/services/chunker.py
backend/src/infrastructure/services/embedding_service.py
backend/src/infrastructure/services/reranker.py
backend/src/infrastructure/persistence/in_memory/manual_repository.py
backend/src/infrastructure/persistence/in_memory/manual_chunk_repository.py
backend/src/infrastructure/persistence/supabase/manual_repository.py          # stub
backend/src/infrastructure/persistence/supabase/manual_chunk_repository.py   # stub
backend/src/infrastructure/factories.py                                      # MODIFY
backend/src/interface/http/routers/manuals.py
backend/src/interface/http/exception_handlers.py                              # MODIFY
```

## E2E test scenario

```bash
# 1. crear PDF dummy con páginas separadas por \f
printf 'Pagina 1: torque 85 Nm\n\fPagina 2: valvula V-12\n\fPagina 3: limpiar filtro' > /tmp/manual.pdf

# 2. login admin
ADMIN_TOKEN=$(curl -s -X POST .../v1/auth/login -d '{...rag_admin...}' | jq -r .access_token)

# 3. upload
curl -X POST .../v1/manuals \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -F "file=@/tmp/manual.pdf" \
  -F "title=Atlas Copco GA-37" \
  -F "asset_model=Atlas Copco GA-37"
# esperado: 202 {manual_id, index_status:"pending"}

# 4. esperar indexación (polling o WS admin:manuals)
sleep 0.2
curl .../v1/manuals/$MID -H "Authorization: Bearer $ADMIN_TOKEN"
# esperado: 200, index_status:"indexed", chunk_count:3

# 5. query debug
curl ".../v1/manuals/$MID/search?q=torque" -H "Authorization: Bearer $ADMIN_TOKEN"
# esperado: 200, lista de chunks con score

# 6. RAG query vía tool (lo conectará BE-06)
curl -X POST .../v1/internal/rag/query \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"question":"¿cuál es el torque?","asset_model":"Atlas Copco GA-37"}'
# esperado: 200 {answer:"El torque es 85 Nm", citations:[{page:1,...}], confidence:0.8}
```

## Definition of Done

- [ ] `pytest -q` pasa 100 %
- [ ] Cumple `integration_contracts.md` §2.6 (parcial)
- [ ] Upload PDF + indexación async (no bloquea request)
- [ ] Chunks con `section_path` y `page` correctos
- [ ] Embeddings mock deterministas (mismo texto → mismo vector)
- [ ] Retrieval híbrido (vector + BM25) funcional
- [ ] Citation shape coincide con `integration_contracts.md` §12.4
- [ ] Abstención si confianza < umbral configurable
- [ ] Versionado: nuevo upload con `replaces_manual_id` archiva el anterior
- [ ] Endpoint debug `/search` para inspección
- [ ] Stub `SupabaseManualRepository` con `NotImplementedError`

## Notas

- El mock PDF extractor NO es realista; suficiente para tests. El extractor real (PyMuPDF) llega en BE-08 hardening si se requiere.
- El embedding service mock usa 384 dims (no 1536) por simplicidad; configurable en env.
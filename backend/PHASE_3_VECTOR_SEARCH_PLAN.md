# Phase 3: Vector Search Implementation Plan

## 🎯 Objective
Enable semantic search using embeddings to understand user intent beyond keyword matching.

**Example**: User searches "healthy breakfast options" → Returns oats, smoothies, fruits (not just items with those exact words)

---

## ✅ Prerequisites (Already Met!)

- ✅ OpenSearch 2.13 running
- ✅ k-NN plugin installed
- ✅ ML plugin installed  
- ✅ Search API working (port 3100)
- ✅ Phase 1 & 2 complete (keyword search + UI)

---

## 📋 Implementation Steps

### Step 1: Choose Embedding Model ✅ (15 min)

**Options**:
1. **sentence-transformers/all-MiniLM-L6-v2** (Recommended)
   - Dimensions: 384
   - Size: ~80MB
   - Speed: Very fast
   - Quality: Good for general search
   
2. **sentence-transformers/all-mpnet-base-v2**
   - Dimensions: 768
   - Size: ~420MB
   - Speed: Slower
   - Quality: Better accuracy

3. **OpenAI text-embedding-ada-002**
   - Dimensions: 1536
   - Cost: $0.0001 per 1K tokens
   - Quality: Excellent
   - Latency: ~50-200ms

**Decision**: Start with **all-MiniLM-L6-v2** (fast, free, good quality)

---

### Step 2: Set Up Embedding Service (30 min)

**Create Python embedding service**:

```python
# /home/ubuntu/Devs/Search/embedding-service.py
from sentence_transformers import SentenceTransformer
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uvicorn

app = FastAPI()
model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')

class EmbedRequest(BaseModel):
    texts: list[str]

class EmbedResponse(BaseModel):
    embeddings: list[list[float]]
    dimensions: int
    model: str

@app.post("/embed", response_model=EmbedResponse)
async def embed_texts(request: EmbedRequest):
    try:
        embeddings = model.encode(request.texts).tolist()
        return {
            "embeddings": embeddings,
            "dimensions": len(embeddings[0]),
            "model": "all-MiniLM-L6-v2"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health():
    return {"ok": True, "model": "all-MiniLM-L6-v2", "dimensions": 384}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=3101)
```

**Install dependencies**:
```bash
pip install sentence-transformers fastapi uvicorn
```

**Start service**:
```bash
python3 embedding-service.py
# Or use PM2:
pm2 start embedding-service.py --name embedding-service --interpreter python3
```

---

### Step 3: Create Vector Indices (45 min)

**3.1: Create new index with k-NN mapping**:

```json
PUT /food_items_v2
{
  "settings": {
    "index": {
      "knn": true,
      "knn.algo_param.ef_search": 100
    },
    "analysis": {
      "analyzer": {
        "edge_ngram_analyzer": {
          "type": "custom",
          "tokenizer": "edge_ngram_tokenizer",
          "filter": ["lowercase"]
        }
      },
      "tokenizer": {
        "edge_ngram_tokenizer": {
          "type": "edge_ngram",
          "min_gram": 2,
          "max_gram": 10,
          "token_chars": ["letter", "digit"]
        }
      }
    }
  },
  "mappings": {
    "properties": {
      "id": {"type": "long"},
      "name": {
        "type": "text",
        "fields": {
          "keyword": {"type": "keyword"},
          "ngram": {
            "type": "text",
            "analyzer": "edge_ngram_analyzer"
          }
        }
      },
      "description": {"type": "text"},
      "category_name": {"type": "text"},
      "price": {"type": "double"},
      "veg": {"type": "boolean"},
      "rating": {"type": "double"},
      "store_name": {"type": "text"},
      "store_location": {"type": "geo_point"},
      
      "name_vector": {
        "type": "knn_vector",
        "dimension": 384,
        "method": {
          "name": "hnsw",
          "space_type": "cosinesimil",
          "engine": "nmslib",
          "parameters": {
            "ef_construction": 128,
            "m": 16
          }
        }
      },
      
      "description_vector": {
        "type": "knn_vector",
        "dimension": 384,
        "method": {
          "name": "hnsw",
          "space_type": "cosinesimil",
          "engine": "nmslib",
          "parameters": {
            "ef_construction": 128,
            "m": 16
          }
        }
      },
      
      "combined_vector": {
        "type": "knn_vector",
        "dimension": 384,
        "method": {
          "name": "hnsw",
          "space_type": "cosinesimil",
          "engine": "nmslib",
          "parameters": {
            "ef_construction": 128,
            "m": 16
          }
        }
      }
    }
  }
}
```

**3.2: Repeat for other modules**:
- `ecom_items_v2`
- `rooms_v2`
- `movies_v2`
- `services_v2`

---

### Step 4: Generate Embeddings for Existing Data (1-2 hours)

**4.1: Create embedding generation script**:

```python
# /home/ubuntu/Devs/Search/generate-embeddings.py
import requests
import time
from opensearchpy import OpenSearch

# Connect to OpenSearch
os_client = OpenSearch(
    hosts=[{'host': 'localhost', 'port': 9200}],
    http_compress=True,
    use_ssl=False,
    verify_certs=False
)

EMBEDDING_SERVICE_URL = "http://localhost:3101/embed"
BATCH_SIZE = 100

def get_embedding(text: str) -> list[float]:
    """Get embedding for single text"""
    response = requests.post(
        EMBEDDING_SERVICE_URL,
        json={"texts": [text]}
    )
    return response.json()["embeddings"][0]

def get_embeddings_batch(texts: list[str]) -> list[list[float]]:
    """Get embeddings for batch of texts"""
    response = requests.post(
        EMBEDDING_SERVICE_URL,
        json={"texts": texts}
    )
    return response.json()["embeddings"]

def generate_embeddings_for_index(source_index: str, target_index: str):
    """Generate embeddings for all documents in an index"""
    
    # Scroll through all documents
    query = {"query": {"match_all": {}}}
    page = os_client.search(
        index=source_index,
        scroll='2m',
        size=BATCH_SIZE,
        body=query
    )
    
    scroll_id = page['_scroll_id']
    scroll_size = len(page['hits']['hits'])
    
    processed = 0
    batch_docs = []
    
    while scroll_size > 0:
        for hit in page['hits']['hits']:
            doc = hit['_source']
            doc_id = hit['_id']
            
            # Prepare text for embedding
            name = doc.get('name', '')
            description = doc.get('description', '')
            category = doc.get('category_name', '')
            
            # Combined text for semantic search
            combined_text = f"{name}. {description}. Category: {category}"
            
            batch_docs.append({
                'id': doc_id,
                'doc': doc,
                'name_text': name,
                'description_text': description,
                'combined_text': combined_text
            })
            
            # Process batch
            if len(batch_docs) >= BATCH_SIZE:
                process_batch(batch_docs, target_index)
                processed += len(batch_docs)
                print(f"Processed {processed} documents...")
                batch_docs = []
        
        # Get next batch
        page = os_client.scroll(scroll_id=scroll_id, scroll='2m')
        scroll_id = page['_scroll_id']
        scroll_size = len(page['hits']['hits'])
    
    # Process remaining
    if batch_docs:
        process_batch(batch_docs, target_index)
        processed += len(batch_docs)
    
    print(f"✅ Total processed: {processed} documents")

def process_batch(batch_docs: list, target_index: str):
    """Process a batch of documents"""
    
    # Extract texts
    name_texts = [doc['name_text'] for doc in batch_docs]
    description_texts = [doc['description_text'] for doc in batch_docs]
    combined_texts = [doc['combined_text'] for doc in batch_docs]
    
    # Get embeddings in batches
    name_embeddings = get_embeddings_batch(name_texts)
    description_embeddings = get_embeddings_batch(description_texts)
    combined_embeddings = get_embeddings_batch(combined_texts)
    
    # Bulk index
    bulk_body = []
    for i, batch_doc in enumerate(batch_docs):
        doc = batch_doc['doc']
        doc['name_vector'] = name_embeddings[i]
        doc['description_vector'] = description_embeddings[i]
        doc['combined_vector'] = combined_embeddings[i]
        
        bulk_body.append({'index': {'_index': target_index, '_id': batch_doc['id']}})
        bulk_body.append(doc)
    
    os_client.bulk(body=bulk_body)

if __name__ == "__main__":
    modules = [
        ('food_items_v1760444638', 'food_items_v2'),
        ('ecom_items', 'ecom_items_v2'),
        ('rooms', 'rooms_v2'),
        ('movies', 'movies_v2'),
        ('services', 'services_v2')
    ]
    
    for source, target in modules:
        print(f"\n🔄 Processing {source} → {target}")
        try:
            generate_embeddings_for_index(source, target)
        except Exception as e:
            print(f"❌ Error: {e}")
```

**Run**:
```bash
python3 generate-embeddings.py
```

---

### Step 5: Update Search API for Hybrid Search (1 hour)

**5.1: Add vector search to Search API**:

```typescript
// /home/ubuntu/Devs/Search/src/search/search.service.ts

async hybridSearch(params: {
  module: string;
  query: string;
  filters: any;
  size: number;
  useVector: boolean;
}): Promise<SearchResponse> {
  const { module, query, filters, size, useVector } = params;
  
  if (!useVector) {
    // Use existing keyword search
    return this.keywordSearch(params);
  }
  
  // Get query embedding
  const embeddingResponse = await fetch('http://localhost:3101/embed', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ texts: [query] })
  });
  const { embeddings } = await embeddingResponse.json();
  const queryVector = embeddings[0];
  
  // Build hybrid query (keyword + vector)
  const searchBody = {
    size,
    query: {
      bool: {
        should: [
          // Keyword search (40% weight)
          {
            multi_match: {
              query,
              fields: ['name^3', 'description', 'category_name^2'],
              type: 'best_fields',
              fuzziness: 'AUTO',
              boost: 0.4
            }
          },
          
          // Vector search (60% weight)
          {
            script_score: {
              query: { match_all: {} },
              script: {
                source: "cosineSimilarity(params.query_vector, 'combined_vector') + 1.0",
                params: { query_vector: queryVector }
              },
              boost: 0.6
            }
          }
        ],
        
        // Apply filters
        filter: this.buildFilters(filters)
      }
    }
  };
  
  const response = await this.opensearch.search({
    index: this.getIndexName(module, true), // Use v2 index
    body: searchBody
  });
  
  return this.formatResponse(response);
}
```

**5.2: Add vector search endpoint**:

```typescript
// search.controller.ts
@Get('/search/:module/semantic')
async semanticSearch(
  @Param('module') module: string,
  @Query('q') query: string,
  @Query() filters: any
) {
  return this.searchService.hybridSearch({
    module,
    query,
    filters,
    size: Number(filters.size) || 20,
    useVector: true
  });
}
```

---

### Step 6: Update Frontend for Semantic Toggle (30 min)

**6.1: Add semantic search toggle to SearchBar**:

```tsx
// SearchBar.tsx
const [useSemanticSearch, setUseSemanticSearch] = useState(false);

// In filters panel:
<div className="flex items-center gap-2">
  <Switch
    checked={useSemanticSearch}
    onCheckedChange={setUseSemanticSearch}
  />
  <Label>Semantic Search (AI-powered)</Label>
</div>
```

**6.2: Update API client**:

```typescript
// search.ts
export async function searchItems(
  module: Module,
  query: string,
  filters: SearchFilters,
  useSemanticSearch = false
): Promise<SearchResponse> {
  const endpoint = useSemanticSearch 
    ? `/search/${module}/semantic`
    : `/search/${module}`;
  
  // ... rest of the code
}
```

---

### Step 7: Test & Compare (30 min)

**Test Cases**:

1. **Keyword vs Semantic - Synonyms**:
   ```
   Query: "healthy breakfast"
   
   Keyword Results:
   - Items with "healthy" or "breakfast" in text
   
   Semantic Results:
   - Oats, smoothies, fruits, yogurt (understands concept)
   ```

2. **Keyword vs Semantic - Intent**:
   ```
   Query: "something spicy and crunchy"
   
   Keyword Results:
   - Limited, needs exact words
   
   Semantic Results:
   - Chips, pakoras, fried items, spicy snacks
   ```

3. **Hybrid - Best of Both**:
   ```
   Query: "margherita pizza"
   
   Keyword: Exact match (good)
   Semantic: Similar pizzas (good)
   Hybrid: Margherita first, then similar (best!)
   ```

---

## 📊 Performance Considerations

### Vector Index Size
- **384 dimensions** × 4 bytes (float32) = 1.5KB per vector
- **3 vectors per item** (name, description, combined) = 4.5KB
- **100K items** = ~450MB for vectors
- **Total with metadata**: ~1-2GB per index

### Search Latency
- **Keyword only**: 20-50ms
- **Vector only**: 50-100ms  
- **Hybrid**: 80-150ms
- **With filters**: +20-30ms

### Strategies
1. **Cache hot queries** (Redis)
2. **Pre-compute popular embeddings**
3. **Use smaller model for speed** (MiniLM vs MPNet)
4. **Adjust ef_search** (higher = accurate but slower)

---

## 🎯 Success Metrics

### Accuracy Improvements
- **Synonym handling**: 90%+ (vs 20% keyword)
- **Intent understanding**: 85%+ (vs 10% keyword)
- **Related items**: 95%+ (vs 30% keyword)

### User Experience
- **Query reformulations**: -50% (users find what they want faster)
- **No results**: -70% (semantic finds similar items)
- **Click-through rate**: +40% (better relevance)

---

## 🚀 Rollout Plan

### Phase 3A: Backend Setup (Week 1)
- Day 1: Set up embedding service
- Day 2: Create vector indices
- Day 3-4: Generate embeddings (batch process)
- Day 5: Update Search API

### Phase 3B: Frontend Integration (Week 1)
- Day 6: Add semantic toggle to UI
- Day 7: Test and polish

### Phase 3C: Testing & Optimization (Week 2)
- A/B testing: keyword vs semantic vs hybrid
- Performance tuning
- Query analysis

### Phase 3D: Production (Week 2)
- Deploy to production
- Monitor metrics
- Gradual rollout (10% → 50% → 100%)

---

## 🔧 Monitoring & Maintenance

### Metrics to Track
1. **Search latency** (p50, p95, p99)
2. **Embedding service uptime**
3. **Vector index health**
4. **Search quality** (CTR, dwell time)
5. **Cost** (if using OpenAI)

### Ongoing Tasks
1. **Re-index monthly** (new items, updated descriptions)
2. **Model updates** (newer embedding models)
3. **Query analysis** (what users search for)
4. **Feedback loop** (user clicks → improve embeddings)

---

## 💡 Future Enhancements (Phase 4+)

1. **Multi-modal Search**: Images + text
2. **Personalized Embeddings**: User preferences in vector space
3. **Cross-lingual**: Multilingual embeddings (Hindi, Marathi)
4. **Real-time Embeddings**: CDC pipeline for instant indexing
5. **Recommendation Engine**: Similar items based on vectors

---

## 📚 Resources

**Documentation**:
- OpenSearch k-NN: https://opensearch.org/docs/latest/search-plugins/knn/
- Sentence Transformers: https://www.sbert.net/
- HNSW Algorithm: https://arxiv.org/abs/1603.09320

**Models**:
- HuggingFace: https://huggingface.co/sentence-transformers
- OpenAI Embeddings: https://platform.openai.com/docs/guides/embeddings

**Tools**:
- Embedding Service: FastAPI + sentence-transformers
- Vector DB: OpenSearch with k-NN plugin
- Frontend: React + TypeScript

---

**Next Step**: Start with Step 2 (Set Up Embedding Service) 🚀

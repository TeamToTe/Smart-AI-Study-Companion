# Backend Architecture: YouTube Transcription & Translation Pipeline

This document describes the backend architecture of the **Smart AI Study Companion**, which is built on FastAPI, Celery, Redis, and Supabase.

---

## 1. High-Level Component Diagram

This diagram shows the main components of the backend system, their communication pathways, and interactions with external APIs.

```mermaid
graph TD
    %% Styling
    classDef client fill:#f9f,stroke:#333,stroke-width:2px;
    classDef api fill:#bbf,stroke:#333,stroke-width:2px;
    classDef worker fill:#f96,stroke:#333,stroke-width:2px;
    classDef cache fill:#bfb,stroke:#333,stroke-width:1px;
    classDef external fill:#ddd,stroke:#333,stroke-width:1px;

    %% Nodes
    Client["User Client / Frontend"]:::client
    
    subgraph FastAPI_Server ["FastAPI Application (Web Server)"]
        Router["API Routers (api/transcribe, api/chat, api/glossary)"]:::api
        Auth["Auth Helper (verify JWT)"]:::api
        DBService["Database Service (db_service)"]:::api
    end

    subgraph Redis_Queue ["Message Broker & Store"]
        RedisBroker["Redis Broker (Celery Queue)"]:::cache
        RedisLimiter["Redis Token Bucket Rate Limiter"]:::cache
    end

    subgraph Celery_Pool ["Celery Background Workers"]
        Worker["Celery Worker Process"]:::worker
        TaskPipeline["Task Pipeline Orchestration"]:::worker
    end

    subgraph External_Services ["External Services & Databases"]
        Supabase["Supabase DB & Auth Service"]:::external
        YouTube["YouTube (Subtitle download via yt-dlp)"]:::external
        Gemini["Gemini API (STT transcription fallback)"]:::external
        Groq["Groq API (Llama translation)"]:::external
    end

    %% Interactions
    Client -->|1. POST Request with JWT| Router
    Router -->|2. Verify Token| Auth
    Auth -->|Fetch keys / Verify| Supabase
    Router -->|3. Query Session Limit| DBService
    DBService -->|Get sessions| Supabase
    
    Router -->|4. Push task chain / Read Status| RedisBroker
    RedisBroker -->|5. Fetch Tasks| Worker
    Worker --> TaskPipeline
    
    TaskPipeline -->|Download Subs| YouTube
    TaskPipeline -->|Fallback STT| Gemini
    TaskPipeline -->|Acquire Rate Limit Tokens| RedisLimiter
    TaskPipeline -->|Translate batches| Groq
    
    Client -->|6. Poll Task Status| Router
```

---

## 2. Asynchronous Task Execution Pipeline (Celery Chord)

When a user submits a YouTube URL via `POST /api/transcriptions/async`, the backend handles the job asynchronously to prevent request timeouts and support concurrent requests. The task is broken down into parallelized sub-tasks using a Celery chain and chord workflow.

```mermaid
sequenceDiagram
    autonumber
    actor Client as User Client
    participant API as FastAPI Web Server
    participant Redis as Redis Queue & State
    participant Worker as Celery Worker
    participant Ext as External APIs (YouTube/Gemini/Groq)

    Client->>API: POST /api/transcriptions/async (YouTube URL + JWT)
    Note over API: 1. Validate JWT<br/>2. Validate video duration<br/>3. Verify upload limit via Supabase
    API->>Redis: Check Cache (cached_video_id) or Storage (task_id.json)
    alt Cache/Storage Hit
        Redis-->>API: Return Cached Result
        API-->>Client: 200 OK (SUCCESS status + cached data)
    else Cache/Storage Miss
        Note over API: Generate Task IDs for Chain:<br/>- get_transcript_task (get_transcript_task_id)<br/>- orchestrate_translation_task (orchestrate_task_id)
        API->>Redis: Set time_start:{orchestrate_task_id} & Enqueue Chain
        API-->>Client: 202 Accepted (task_id = orchestrate_task_id)
    end

    activate Worker
    Redis->>Worker: Execute get_transcript_task(youtube_url)
    Worker->>Redis: Update Progress to 10%
    Worker->>Ext: Try yt-dlp subtitle download
    alt Subtitles exist
        Ext-->>Worker: Return subtitle segments
    else Subtitles missing
        Worker->>Ext: Download audio & upload to Gemini STT
        Ext-->>Worker: Return transcription segments
    end
    Worker->>Redis: Update Progress to 30%
    Worker-->>Redis: Return transcription dict

    Redis->>Worker: Execute orchestrate_translation_task(transcription_dict)
    Note over Worker: Divide segments into batches (size = 20)<br/>Set progress:total = total_batches<br/>Replace execution with chord: group(translate_batch_task) | merge_translation_task
    Worker->>Redis: Enqueue translation batch tasks in parallel

    par Batch 1 to N
        Redis->>Worker: Execute translate_batch_task(batch_segments)
        loop Rate Limiter Check
            Worker->>Redis: RedisTokenBucketRateLimiter.acquire("groq", tokens=1)
            alt Tokens available
                Redis-->>Worker: Allowed
            else Rate limited
                Redis-->>Worker: Denied
                Note over Worker: Raise self.retry(countdown=5)
            end
        end
        Worker->>Ext: POST to Groq Chat Completion (Llama Model)
        Ext-->>Worker: Return translated segments
        Worker->>Redis: Increment progress:completed & update overall progress (35% to 95%)
        Worker-->>Redis: Return translated batch segments
    end

    Redis->>Worker: Execute merge_translation_task(results)
    Note over Worker: Recombine translated segments in order<br/>Write final JSON to app/storage/{task_id}.json
    Worker->>Redis: Update Progress to 100%, Set Task State = SUCCESS
    deactivate Worker

    loop Client Polling
        Client->>API: GET /api/tasks/{task_id}
        API->>Redis: Query task state & progress / Check local storage
        Redis-->>API: Return status (PENDING / SUCCESS / FAILURE) + progress %
        API-->>Client: Response (e.g. status: SUCCESS, progress: 100, result: data)
    end
```

---

## 3. Distributed Rate Limiting (Redis Token Bucket)

To prevent hitting the Rate Limits of translation services (e.g., Groq's RPM/TPM), the system coordinates requests via a globally shared token bucket algorithm implemented in Redis.

```mermaid
graph TD
    %% Styling
    classDef worker fill:#f96,stroke:#333,stroke-width:2px;
    classDef redis fill:#bfb,stroke:#333,stroke-width:1px;
    classDef groq fill:#ddd,stroke:#333,stroke-width:1px;

    %% Nodes
    W1["Celery Worker - Process A"]:::worker
    W2["Celery Worker - Process B"]:::worker
    
    subgraph Redis_Limiter ["Redis Distributed Limiter"]
        Lua["Lua script (Atomic operation)"]:::redis
        BucketKey["rate_limit:groq (Hash) <br/>last_updated: timestamp<br/>tokens: current count"]:::redis
    end
    
    GroqAPI["Groq translation API"]:::groq

    %% Flows
    W1 -->|1. acquire('groq', requested=1)| Lua
    W2 -->|1. acquire('groq', requested=1)| Lua
    Lua -->|2. Check capacity & fill tokens| BucketKey
    BucketKey -->|3. Return updated tokens| Lua
    
    Lua -->|4a. Allowed (Tokens >= 1)| W1
    Lua -->|4b. Denied (Tokens < 1)| W2
    
    W1 -->|5. Make API Request| GroqAPI
    Note over W2: Retry task in 5s (countdown=5)<br/>Re-enters Celery queue
```

---

## 4. Key Architectural Tradeoffs & Decisions

### 4.1. Asynchronous Tasks vs. Synchronous Endpoints
* **Tradeoff**: Running heavy downloads, STT fallback, and batch translation synchronously in FastAPI workers would block execution, leading to client timeouts and a low limit on concurrent active users.
* **Decision**: Decompose the operation into a Celery background chain. FastAPI responds immediately with `202 Accepted` and a `task_id`, and the client polls the status. This enables scaling to multiple concurrent requests without thread starvation.

### 4.2. Celery Canvas Chord vs. Single Large Task
* **Tradeoff**: Running all translations in a single loop inside one worker is simple but slow. It doesn't scale to long videos and fails to utilize concurrency.
* **Decision**: Use a Celery `chord` dynamically spawned in `orchestrate_translation_task`. This processes chunks of 20 segments in parallel across multiple worker processes, utilizing multiple Groq connections concurrently while checking the central rate limiter.

### 4.3. Redis Rate Limiter via Lua Script vs. Python Checks
* **Tradeoff**: Standard Python rate-limiting checks are susceptible to race conditions when multiple workers run in parallel.
* **Decision**: Use a Lua script executed atomically inside Redis. This ensures thread-safe check-and-set operations on the rate-limit token bucket across all distributed Celery worker processes.

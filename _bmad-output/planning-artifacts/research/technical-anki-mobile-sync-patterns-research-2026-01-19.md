---
stepsCompleted: [1, 2, 3, 4, 5]
inputDocuments: []
workflowType: 'research'
lastStep: 1
research_type: 'technical'
research_topic: 'Anki Mobile Sync Architectural Patterns'
research_goals: 'Identify architectural patterns for bidirectional sync between third-party mobile apps and Anki; evaluate public AnkiWeb API availability; assess Anki Sync Protocol reverse-engineering feasibility; analyze file-based .apkg import/export as alternative with pros/cons'
user_name: 'Tobias'
date: '2026-01-19'
web_research_enabled: true
source_verification: true
---

# Research Report: Technical - Anki Mobile Sync Architectural Patterns

**Date:** 2026-01-19
**Author:** Tobias
**Research Type:** Technical

---

## Technical Research Scope Confirmation

**Research Topic:** Anki Mobile Sync Architectural Patterns
**Research Goals:** Identify architectural patterns for bidirectional sync between third-party mobile apps and Anki; evaluate public AnkiWeb API availability; assess Anki Sync Protocol reverse-engineering feasibility; analyze file-based .apkg import/export as alternative with pros/cons

**Technical Research Scope:**

- Architecture Analysis - sync patterns, data flow, conflict resolution strategies
- Implementation Approaches - AnkiWeb API (if exists), Sync Protocol internals, .apkg file format
- Technology Stack - Anki ecosystem, AnkiDroid/AnkiMobile internals, relevant libraries
- Integration Patterns - REST APIs, protocol buffers, file-based interchange
- Feasibility Assessment - Pros/cons matrix for each approach

**Research Methodology:**

- Current web data with rigorous source verification
- Multi-source validation for critical technical claims
- Confidence level framework for uncertain information
- Comprehensive technical coverage with architecture-specific insights

**Scope Confirmed:** 2026-01-19

---

## Technology Stack Analysis

### Anki Core Architecture

Anki is built on a hybrid architecture combining multiple technologies:

**Core Languages:**
- **Rust** - Modern Anki (2.1+) has its core logic in Rust (`rslib`), providing the scheduling engine, sync protocol, and database operations
- **Python** - The desktop application UI and add-on system remain in Python (PyQt)
- **TypeScript/Svelte** - Modern card editor and some UI components
- **Kotlin/Java** - AnkiDroid (Android client)
- **Swift/Objective-C** - AnkiMobile (iOS client, closed source)

**Database:**
- **SQLite** - All Anki data is stored in SQLite databases (`.anki2`, `.anki21`, `.anki21b` formats)
- Schema version 18 (current) stores configuration as Protobuf messages in BLOB columns
- Foreign keys are disabled in the database schema

_Source: [Anki Source Code](https://github.com/ankitects/anki), [AnkiDroid Backend](https://github.com/ankidroid/Anki-Android-Backend)_

### Anki Ecosystem Components

| Component | Platform | Sync Support | Third-Party API |
|-----------|----------|--------------|-----------------|
| Anki Desktop | Windows/Mac/Linux | AnkiWeb | AnkiConnect (add-on) |
| AnkiMobile | iOS | AnkiWeb | None (closed source) |
| AnkiDroid | Android | AnkiWeb | ContentProvider API |
| AnkiWeb | Web | Central sync server | No public API |

### AnkiWeb Sync Protocol

**Critical Finding: No Public AnkiWeb API**

As of 2025-2026, there is **no official public API documentation** for the AnkiWeb sync protocol. The Anki team has explicitly stated that simplicity is a design goal and PRs adding REST APIs are unlikely to be accepted.

**Protocol Evolution:**
- Original protocol: HTTP POST with multipart/form-data and JSON
- Modern protocol: **Protobuf** (Protocol Buffers) binary serialization
- Protocol definition files: `rslib/backend.proto` in Anki source

**Key Protocol Endpoints (Reverse-Engineered):**
- `/sync/hostKey` - Authentication, returns session key
- Sync operations use `s` parameter (random sync key) and `cv` parameter (client version)
- Responses historically JSON, now Protobuf

_Sources: [Anki Sync Protocol Wiki](https://github.com/Catchouli/learny/wiki/Anki-sync-protocol), [Anki Forums Discussion](https://forums.ankiweb.net/t/anki-public-api/22741), [Anki Manual - Sync Server](https://docs.ankiweb.net/sync-server.html)_

### .apkg File Format

**Structure:** ZIP archive containing:

| File | Description |
|------|-------------|
| `collection.anki2` | SQLite database (legacy format) |
| `collection.anki21` | SQLite database (Anki 2.1+) |
| `collection.anki21b` | SQLite + zstd compression (modern) |
| `media` | JSON mapping: `{int: filename}` |
| `1`, `2`, `3`... | Media files (renamed to integers) |

**Database Tables:**
- `notes` - Note content (`flds` column contains fields)
- `cards` - Card instances linked to notes
- `col` - Collection metadata (decks stored as JSON in `decks` column)
- `revlog` - **Review history/scheduling data**
- `graves` - Deleted item tracking

**Important:** No official specification exists - format is reverse-engineered from source code.

_Sources: [Anki's .apkg Format](https://brandur.org/fragments/apkg), [Understanding the Anki APKG Format](https://eikowagenknecht.com/posts/understanding-the-anki-apkg-format/), [ankisync2 PyPI](https://pypi.org/project/ankisync2/)_

### AnkiDroid ContentProvider API

AnkiDroid exposes a **ContentProvider-based API** for third-party Android apps:

**Capabilities:**
- Add notes in bulk without user intervention
- Access the review queue (used by AnkiDroid-Wear)
- Custom note models for formatting
- Read deck structure

**Limitations:**
- Requires Android permission: `com.ichi2.anki.permission.READ_WRITE_DATABASE`
- Android-only (no iOS equivalent)
- User must have AnkiDroid installed
- Limited to local operations (not a sync solution)

**Integration:**
```gradle
implementation 'com.github.ankidroid:Anki-Android:api-v1.1.0'
```

_Sources: [AnkiDroid API Wiki](https://github.com/ankidroid/Anki-Android/wiki/AnkiDroid-API), [Third-Party Apps List](https://github.com/ankidroid/Anki-Android/wiki/Third-Party-Apps), [API Sample Project](https://github.com/ankidroid/apisample)_

### AnkiMobile (iOS) Integration Options

**Critical Finding: Extremely Limited**

AnkiMobile is closed-source with no third-party API or add-on support.

**Available Methods:**
- File-based import/export via iOS Share Sheet
- Collection transfer via AirDrop
- iTunes File Sharing for `.colpkg` import
- AnkiWeb sync (user-initiated only)

_Source: [AnkiMobile Collection Transfer Manual](https://docs.ankimobile.net/collection-transfer.html)_

### Libraries for Programmatic Anki Data Manipulation

| Library | Language | Purpose | Limitations |
|---------|----------|---------|-------------|
| **genanki** | Python | Create .apkg files | Create-only, no read/edit |
| **ankisync2** | Python | Read/edit .apkg and .anki2 | Direct SQLite manipulation |
| **anki-apkg-parser** | Node.js | Parse .apkg files | Read-only |
| **Anki-Android-Backend** | Kotlin/Rust | JNI bridge to Anki Rust core | Android-only |

**genanki Key Features:**
- Create decks, notes, cards programmatically
- GUID management for stable updates on re-import
- Media file packaging
- MIT licensed, not affiliated with Anki project

_Sources: [genanki GitHub](https://github.com/kerrickstaley/genanki), [ankisync2 GitHub](https://github.com/patarapolw/ankisync2), [anki-apkg-parser GitHub](https://github.com/74Genesis/anki-apkg-parser)_

### Review History & Scheduling Data

**FSRS (Free Spaced Repetition Scheduler):**
- Modern Anki uses FSRS algorithm (21 parameters)
- Memory state: Stability (S) and Difficulty (D)
- Review history stored in `revlog` table

**Data Export:**
- "Include scheduling information" checkbox preserves review history
- "Support older Anki versions" for compatibility
- FSRS optimizer can export review history datasets

**Critical for Your Use Case:**
- The `revlog` table contains all review history
- Bidirectional sync requires merging `revlog` entries correctly
- Conflict resolution is complex for scheduling data

_Sources: [FSRS4Anki GitHub](https://github.com/open-spaced-repetition/fsrs4anki), [ABC of FSRS Wiki](https://github.com/open-spaced-repetition/fsrs4anki/wiki/abc-of-fsrs)_

### Third-Party Sync Server Implementations

| Project | Language | Status | Notes |
|---------|----------|--------|-------|
| **anki-sync-server-rs** | Rust | Active | Tracks official protocol |
| **ankicommunity-sync-server** | Python | Active | Originally by David Snopek |
| **Built-in sync server** | Rust | Official | Bundled with Anki Desktop |

**Warning:** Third-party sync servers tend to break when Anki updates the protocol. No official testing against them.

_Sources: [anki-sync-server-rs GitHub](https://github.com/ankicommunity/anki-sync-server-rs), [ankicommunity-sync-server GitHub](https://github.com/ankicommunity/ankicommunity-sync-server)_

---

## Integration Patterns Analysis

### Overview: Four Integration Approaches

Based on the research, there are **four viable architectural approaches** for syncing a third-party mobile app with Anki:

| Approach | Complexity | iOS Support | Android Support | Bidirectional | Reliability |
|----------|------------|-------------|-----------------|---------------|-------------|
| **1. AnkiWeb Protocol (Reverse-Engineered)** | Very High | Yes | Yes | Yes | Low (breaks on updates) |
| **2. Self-Hosted Sync Server** | High | Yes | Yes | Yes | Medium |
| **3. File-Based (.apkg Import/Export)** | Medium | Limited | Better | Partial | High |
| **4. Platform-Specific APIs** | Medium | None | Yes (ContentProvider) | Partial | High |

---

### Approach 1: AnkiWeb Sync Protocol Integration

**Pattern:** Direct integration with AnkiWeb using reverse-engineered protocol

**How It Works:**
1. Your app authenticates with AnkiWeb using user credentials
2. Implements the Protobuf-based sync protocol
3. Sends/receives sync operations directly to/from AnkiWeb

**Technical Requirements:**
- Implement Protobuf message parsing (`.proto` files from Anki source)
- Handle authentication flow (`/sync/hostKey` endpoint)
- Implement conflict resolution logic
- Track protocol changes in Anki releases

**Risks:**
- **No official documentation** - entirely reverse-engineered
- **Protocol changes frequently** - breaks on Anki updates
- **No testing against third-party clients** - official position
- **Potential ToS issues** - using undocumented API

**Confidence Level:** [Low] - High risk of breakage

_Sources: [Anki Sync Protocol Wiki](https://github.com/Catchouli/learny/wiki/Anki-sync-protocol), [Anki Forums](https://forums.ankiweb.net/t/anki-public-api/22741)_

---

### Approach 2: Self-Hosted Sync Server

**Pattern:** Deploy your own Anki sync server, configure users' Anki clients to sync with it

**How It Works:**
1. Deploy `anki-sync-server-rs` or built-in Anki sync server
2. Users configure their Anki clients to point to your server
3. Your app syncs with the same server
4. All clients converge through shared server

**Server Options:**

| Option | Setup | Maintenance |
|--------|-------|-------------|
| Built-in (Anki Desktop bundled) | Easy | Auto-updates with Anki |
| anki-sync-server-rs (Rust) | Medium | Must track protocol changes |
| ankicommunity-sync-server (Python) | Medium | Community-maintained |

**User Requirements:**
- Users must configure custom sync server in all their Anki clients
- HTTPS reverse proxy recommended (security)
- Users trust your server with their data

**Advantages:**
- Full bidirectional sync
- Works with all platforms (Desktop, AnkiDroid, AnkiMobile)
- You control the sync protocol on your server side

**Disadvantages:**
- Complex infrastructure (server hosting, HTTPS, uptime)
- User onboarding friction (configure custom server)
- Still vulnerable to protocol changes on client side

**Confidence Level:** [Medium] - Viable but operationally complex

_Sources: [Anki Sync Server Manual](https://docs.ankiweb.net/sync-server.html), [anki-sync-server-rs GitHub](https://github.com/ankicommunity/anki-sync-server-rs)_

---

### Approach 3: File-Based Sync (.apkg Import/Export)

**Pattern:** Generate/consume `.apkg` files that users manually transfer

**How It Works:**
1. Your app generates `.apkg` files with cards and scheduling data
2. User imports `.apkg` into their Anki client
3. User exports `.apkg` from Anki client
4. Your app parses exported `.apkg` to sync back

**Data Flow:**
```
Your App → Generate .apkg → User Transfer → Anki Import
Anki Export → User Transfer → Parse .apkg → Your App
```

**iOS File Transfer Methods:**

| Method | User Experience | Automation |
|--------|----------------|------------|
| iOS Share Sheet | Tap to share | Manual |
| AirDrop | Quick transfer | Manual |
| Files app (iCloud/local) | Browse & select | Manual |
| iTunes File Sharing | Connect to computer | Manual |

**Android File Transfer Methods:**

| Method | User Experience | Automation |
|--------|----------------|------------|
| ContentProvider API | Background access | Automatic (for writes) |
| Share Intent | Tap to share | Manual |
| File system access | Browse & select | Manual |

**Key Technical Considerations:**

1. **GUID Stability:** Use stable GUIDs (not hash of content) so re-imports update rather than duplicate cards

2. **Scheduling Data:** Include `revlog` table entries when exporting to preserve review history

3. **Conflict Resolution for Scheduling:**
   - **Last-Writer-Wins:** Latest `revlog` entry timestamp wins
   - **Merge Strategy:** Concatenate `revlog` entries, let FSRS recalculate
   - **User Choice:** Prompt user on conflict

4. **Format Versions:** Support multiple `.anki2`/`.anki21`/`.anki21b` formats

**Libraries for Implementation:**

| Task | Library | Language |
|------|---------|----------|
| Create .apkg | genanki | Python |
| Read/Write .apkg | ankisync2 | Python |
| Parse .apkg | anki-apkg-parser | Node.js |
| Direct SQLite | Any SQLite library | Any |

**Confidence Level:** [High] - Most reliable, but worst UX

_Sources: [genanki GitHub](https://github.com/kerrickstaley/genanki), [Understanding APKG Format](https://eikowagenknecht.com/posts/understanding-the-anki-apkg-format/)_

---

### Approach 4: Platform-Specific APIs

**Pattern:** Use native APIs where available (Android only)

#### Android: AnkiDroid ContentProvider API

**Capabilities:**
- Add notes/cards in bulk (background, no user interaction)
- Read deck structure and card content
- Access review queue
- Trigger sync to AnkiWeb

**Integration Example:**
```kotlin
// Add to build.gradle
implementation 'com.github.ankidroid:Anki-Android:api-v1.1.0'

// Permission required
<uses-permission android:name="com.ichi2.anki.permission.READ_WRITE_DATABASE"/>
```

**Workflow:**
1. Your app writes cards via ContentProvider
2. Trigger AnkiDroid sync (1-minute minimum interval)
3. AnkiDroid syncs with AnkiWeb
4. User reviews in AnkiDroid
5. AnkiDroid syncs back to AnkiWeb
6. Your app... **cannot read review data back easily**

**Critical Limitation:** The ContentProvider API is primarily **write-oriented**. Reading back review history (`revlog`) for bidirectional sync is not well-supported.

**Confidence Level:** [High for Android writes, Low for bidirectional]

_Sources: [AnkiDroid API Wiki](https://github.com/ankidroid/Anki-Android/wiki/AnkiDroid-API), [API Sample](https://github.com/ankidroid/apisample)_

#### iOS: No API Available

AnkiMobile is **closed-source** with **no third-party API** and **no add-on support**.

The only integration path is file-based (Approach 3).

_Source: [AnkiMobile Manual](https://docs.ankimobile.net/)_

---

### Offline-First Architecture Patterns

For your requirement of **offline-first with periodic sync**, consider these patterns:

#### Local-First Data Architecture

**Pattern:** Your app maintains its own SQLite database, syncs periodically with Anki via file exchange.

```
┌─────────────────────────────────────────────────────────────┐
│                     YOUR MOBILE APP                          │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  Local       │    │  Sync        │    │  .apkg       │  │
│  │  SQLite DB   │◄──►│  Engine      │◄──►│  Generator/  │  │
│  │  (offline)   │    │              │    │  Parser      │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│                              │                              │
└──────────────────────────────│──────────────────────────────┘
                               │
                        Manual Transfer
                               │
                               ▼
                    ┌──────────────────┐
                    │  Anki Client     │
                    │  (AnkiDroid/     │
                    │   AnkiMobile)    │
                    └──────────────────┘
                               │
                          AnkiWeb Sync
                               │
                               ▼
                    ┌──────────────────┐
                    │    AnkiWeb       │
                    └──────────────────┘
```

#### Conflict Resolution for Scheduling Data

**Challenge:** Bidirectional sync of `revlog` (review history) requires careful conflict handling.

**Strategies:**

| Strategy | When to Use | Trade-off |
|----------|-------------|-----------|
| **Last-Writer-Wins** | Simple cases | May lose review data |
| **Timestamp Merge** | Append all `revlog` entries by timestamp | Safest, most data preserved |
| **Recalculate State** | Merge `revlog`, let FSRS recompute intervals | Complex but accurate |
| **User Prompt** | On detected conflict | Best UX but interrupts flow |

**Recommendation:** For `revlog` data, use **timestamp merge** - append all review entries sorted by timestamp, ensuring no review history is lost. The FSRS algorithm can handle duplicate or out-of-order entries gracefully.

_Sources: [Offline-First Architecture](https://www.innovationm.com/blog/react-native-offline-first-architecture-sqlite-local-database-guide/), [Conflict Resolution Strategies](https://mobterest.medium.com/conflict-resolution-strategies-in-data-synchronization-2a10be5b82bc)_

---

### iOS-Specific Integration Challenges

**The iOS Sandbox Problem:**

iOS apps are sandboxed - they cannot directly access another app's data. Cross-app data exchange requires:

1. **Document Picker (UIDocumentPickerViewController):** User selects files from iCloud/local storage
2. **Share Extension:** Your app appears in share sheet when user shares from AnkiMobile
3. **App Groups:** Only works for apps with same team ID (not applicable for third-party)

**Practical iOS Workflow:**

```
1. User exports .colpkg from AnkiMobile
2. User shares to your app via Share Sheet
3. Your app parses the collection
4. User creates/reviews cards in your app
5. Your app generates .apkg
6. User imports .apkg into AnkiMobile
7. AnkiMobile syncs with AnkiWeb
```

**UX Impact:** iOS users will have a significantly more manual workflow compared to potential Android users.

_Sources: [iOS Document Provider](https://developer.apple.com/library/archive/documentation/General/Conceptual/ExtensibilityPG/FileProvider.html), [Cross-App Data Sharing](https://medium.com/@dinesh.kachhot/different-ways-to-share-data-between-apps-de75a0a46d4a)_

---

### Data Format Compatibility

**Supporting Multiple Anki Versions:**

| Format | Anki Version | Notes |
|--------|--------------|-------|
| `.anki2` | Pre-2.1 | Legacy, rare |
| `.anki21` | 2.1+ | Most common |
| `.anki21b` | Recent | zstd compressed, Protobuf config |
| `.colpkg` | All | Full collection (all decks) |
| `.apkg` | All | Deck package (subset) |

**Recommendation:** Support `.anki21` as primary format, with `.anki21b` as fallback. Use zstd decompression library for modern format support.

---

## Architectural Patterns: Android-First MVP

> **Scope Update:** Focus on Android-first for MVP validation. iOS deferred to future phase.

### Recommended Architecture: Hybrid ContentProvider + File-Based

For your Android MVP, the optimal architecture combines:

1. **AnkiDroid ContentProvider** for seamless card creation (writes)
2. **File-based .apkg export** for reading review data back (reads)
3. **Local SQLite database** for offline-first operation

```
┌─────────────────────────────────────────────────────────────────────┐
│                    YOUR ANDROID APP (React Native/Flutter)          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────┐   ┌────────────────┐   ┌────────────────┐       │
│  │   UI Layer     │   │  Business      │   │  Data Layer    │       │
│  │   (JS/Dart)    │◄─►│  Logic         │◄─►│  Repository    │       │
│  └────────────────┘   └────────────────┘   └────────────────┘       │
│                                                    │                 │
│                              ┌─────────────────────┼─────────────┐   │
│                              │                     │             │   │
│                              ▼                     ▼             ▼   │
│                    ┌──────────────┐    ┌──────────────┐  ┌──────────┐│
│                    │ Local SQLite │    │ Native Bridge│  │  .apkg   ││
│                    │ (offline DB) │    │ Module       │  │  Parser  ││
│                    └──────────────┘    └──────────────┘  └──────────┘│
│                                               │                      │
└───────────────────────────────────────────────│──────────────────────┘
                                                │
                                    ┌───────────┴───────────┐
                                    │                       │
                                    ▼                       ▼
                         ┌──────────────────┐    ┌──────────────────┐
                         │ AnkiDroid        │    │ File System      │
                         │ ContentProvider  │    │ (.apkg export)   │
                         │ (WRITE cards)    │    │ (READ reviews)   │
                         └──────────────────┘    └──────────────────┘
                                    │
                                    ▼
                         ┌──────────────────┐
                         │   AnkiWeb Sync   │
                         │   (user-triggered)│
                         └──────────────────┘
```

---

### Native Bridge Module Architecture

For React Native or Flutter, you'll need a **native bridge module** to access AnkiDroid's ContentProvider.

#### React Native Bridge Pattern

```
┌─────────────────────────────────────────────────────────┐
│                 JavaScript Layer                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │ import { AnkiDroidBridge } from './native';     │    │
│  │ await AnkiDroidBridge.addNote(deckId, note);    │    │
│  └─────────────────────────────────────────────────┘    │
└────────────────────────┬────────────────────────────────┘
                         │ Async Bridge (JSON serialization)
                         ▼
┌─────────────────────────────────────────────────────────┐
│              Native Module (Kotlin/Java)                 │
│  ┌─────────────────────────────────────────────────┐    │
│  │ class AnkiDroidModule : ReactContextBaseJava... │    │
│  │   @ReactMethod                                  │    │
│  │   fun addNote(deckId: Long, note: ReadableMap)  │    │
│  └─────────────────────────────────────────────────┘    │
└────────────────────────┬────────────────────────────────┘
                         │ ContentResolver
                         ▼
┌─────────────────────────────────────────────────────────┐
│            AnkiDroid ContentProvider                     │
│  URI: content://com.ichi2.anki.flashcards/...           │
└─────────────────────────────────────────────────────────┘
```

**Key Implementation Points:**

1. **Permission Request:** Request `READ_WRITE_DATABASE` at runtime
2. **Async Operations:** All ContentProvider calls must be async
3. **Error Handling:** Handle case where AnkiDroid is not installed
4. **Fallback:** If ContentProvider unavailable, fall back to file-based

_Sources: [React Native Bridge Tutorial](https://mateusz1913.github.io/rnbridgingtutorial/docs/getting-started), [Android Native Modules](https://reactnative.dev/docs/legacy/native-modules-android)_

#### Flutter Platform Channel Pattern

```dart
// Dart side
class AnkiDroidChannel {
  static const platform = MethodChannel('com.yourapp/ankidroid');

  Future<bool> addNote(String deckName, Map<String, String> fields) async {
    return await platform.invokeMethod('addNote', {
      'deck': deckName,
      'fields': fields,
    });
  }
}

// Kotlin side (MainActivity.kt)
class MainActivity : FlutterActivity() {
  override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
    MethodChannel(flutterEngine.dartExecutor.binaryMessenger, "com.yourapp/ankidroid")
      .setMethodCallHandler { call, result ->
        when (call.method) {
          "addNote" -> {
            // Call AnkiDroid ContentProvider
            result.success(addNoteToAnki(call.arguments))
          }
        }
      }
  }
}
```

_Source: [Flutter Platform Channels](https://www.synoverge.com/blog/flutter-and-react-native-bridge-architecture-guide/)_

---

### Local-First Data Architecture for MVP

**Design Principle:** Your app is the source of truth locally; Anki is the sync target.

#### Database Schema Design

```sql
-- Your app's local SQLite schema

-- Cards created in your app
CREATE TABLE local_cards (
  id TEXT PRIMARY KEY,           -- UUID
  anki_note_id INTEGER,          -- NULL until synced to Anki
  deck_name TEXT NOT NULL,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  tags TEXT,                     -- JSON array
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  sync_status TEXT DEFAULT 'pending'  -- 'pending', 'synced', 'conflict'
);

-- Review history (imported from Anki)
CREATE TABLE imported_reviews (
  id INTEGER PRIMARY KEY,
  card_id TEXT NOT NULL,
  anki_card_id INTEGER,
  review_time INTEGER NOT NULL,  -- Unix timestamp
  ease INTEGER,                  -- 1-4 rating
  interval INTEGER,              -- Days until next review
  type INTEGER,                  -- 0=learn, 1=review, 2=relearn, 3=cram
  imported_at INTEGER NOT NULL,
  FOREIGN KEY (card_id) REFERENCES local_cards(id)
);

-- Sync metadata
CREATE TABLE sync_state (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
-- e.g., ('last_export_time', '1705654321')
-- e.g., ('last_import_time', '1705654400')
```

#### Sync State Machine

```
┌─────────────┐    Create Card    ┌─────────────┐
│   PENDING   │ ◄──────────────── │   (User)    │
└──────┬──────┘                   └─────────────┘
       │
       │ Push to AnkiDroid (ContentProvider)
       ▼
┌─────────────┐
│   SYNCED    │ ◄─── Success
└──────┬──────┘
       │
       │ User reviews in Anki, exports .apkg
       ▼
┌─────────────┐
│  REVIEWED   │ ◄─── Import .apkg, merge revlog
└─────────────┘
```

_Sources: [Offline-First Architecture](https://www.innovationm.com/blog/react-native-offline-first-architecture-sqlite-local-database-guide/), [SQLite Sync Strategies](https://www.sqliteforum.com/p/building-offline-first-applications)_

---

### MVP Validation Architecture

**Goal:** Validate the core hypothesis with minimum complexity.

#### Phase 1: One-Way Sync (Your App → Anki)

| Feature | Implementation | Complexity |
|---------|---------------|------------|
| Create cards locally | SQLite + UI | Low |
| Push to AnkiDroid | ContentProvider API | Medium |
| Trigger Anki sync | ContentProvider API | Low |
| **Total MVP Scope** | | **Low-Medium** |

**User Flow:**
1. User creates cards in your app
2. User taps "Sync to Anki"
3. Your app pushes cards via ContentProvider
4. Your app triggers AnkiDroid sync
5. User reviews in AnkiDroid

**What You're Validating:**
- Do users want to create cards in your app vs. Anki directly?
- Is the ContentProvider integration smooth enough?
- Does the UX feel native?

#### Phase 2: Bidirectional Sync (Add Review Import)

| Feature | Implementation | Complexity |
|---------|---------------|------------|
| Export from AnkiDroid | User exports .apkg manually | Low (user action) |
| Parse .apkg | SQLite + ZIP library | Medium |
| Merge review history | Timestamp-based merge | Medium |
| Show review stats | UI | Low |
| **Total Phase 2 Scope** | | **Medium** |

**User Flow:**
1. User exports deck from AnkiDroid (Share → Your App)
2. Your app parses .apkg, extracts `revlog`
3. Merge review data with local cards
4. Display review statistics/progress

---

### Technology Stack Recommendation for MVP

| Layer | Recommendation | Rationale |
|-------|---------------|-----------|
| **Framework** | React Native or Flutter | Cross-platform foundation for future iOS |
| **Local DB** | SQLite (expo-sqlite / sqflite) | Matches Anki's format, easy .apkg parsing |
| **State Management** | Redux/Zustand (RN) or Riverpod (Flutter) | Simple, debuggable |
| **Native Bridge** | Custom Kotlin module | AnkiDroid ContentProvider access |
| **File Parsing** | JSZip + custom SQLite reader | .apkg is ZIP + SQLite |

#### React Native Specific

```javascript
// Recommended packages
{
  "expo-sqlite": "^14.0.0",      // Local database
  "expo-file-system": "^17.0.0", // File access for .apkg
  "jszip": "^3.10.0",            // Unzip .apkg files
  "react-native-share": "^10.0.0" // Receive shared files
}
```

#### Flutter Specific

```yaml
# Recommended packages
dependencies:
  sqflite: ^2.3.0           # Local database
  path_provider: ^2.1.0     # File paths
  archive: ^3.4.0           # Unzip .apkg files
  receive_sharing_intent: ^1.6.0  # Receive shared files
```

---

### AnkiDroid ContentProvider API: Implementation Guide

**Contract Constants:**

```kotlin
object AnkiDroidContract {
    const val AUTHORITY = "com.ichi2.anki.flashcards"

    object Note {
        val CONTENT_URI = Uri.parse("content://$AUTHORITY/notes")
        const val MID = "mid"        // Model ID
        const val FLDS = "flds"      // Fields (separated by 0x1f)
        const val TAGS = "tags"      // Space-separated tags
    }

    object Deck {
        val CONTENT_URI = Uri.parse("content://$AUTHORITY/decks")
        const val DECK_NAME = "deck_name"
        const val DECK_ID = "deck_id"
    }
}
```

**Adding a Note:**

```kotlin
fun addNoteToAnki(
    context: Context,
    deckName: String,
    modelName: String,
    fields: List<String>,
    tags: Set<String>
): Long? {
    val resolver = context.contentResolver

    // 1. Get or create deck
    val deckId = getOrCreateDeck(resolver, deckName)

    // 2. Get model ID
    val modelId = getModelId(resolver, modelName)

    // 3. Insert note
    val values = ContentValues().apply {
        put(AnkiDroidContract.Note.MID, modelId)
        put(AnkiDroidContract.Note.FLDS, fields.joinToString("\u001f"))
        put(AnkiDroidContract.Note.TAGS, tags.joinToString(" "))
    }

    val noteUri = resolver.insert(AnkiDroidContract.Note.CONTENT_URI, values)
    return noteUri?.lastPathSegment?.toLongOrNull()
}
```

**Triggering Sync:**

```kotlin
fun triggerAnkiSync(context: Context) {
    val intent = Intent().apply {
        action = "com.ichi2.anki.DO_SYNC"
        component = ComponentName(
            "com.ichi2.anki",
            "com.ichi2.anki.IntentHandler"
        )
    }
    context.sendBroadcast(intent)
}
```

_Sources: [AnkiDroid API Wiki](https://github.com/ankidroid/Anki-Android/wiki/AnkiDroid-API), [Content Provider Basics](https://developer.android.com/guide/topics/providers/content-provider-basics)_

---

### Error Handling & Edge Cases

| Scenario | Detection | Handling |
|----------|-----------|----------|
| AnkiDroid not installed | `PackageManager` check | Show install prompt |
| Permission denied | ContentResolver throws | Request permission, show rationale |
| AnkiDroid version too old | API version check | Show upgrade prompt |
| No decks exist | Empty cursor | Prompt to create deck first |
| Sync in progress | AnkiDroid busy | Retry with backoff |
| Network unavailable | ConnectivityManager | Queue for later sync |

---

### Security Considerations

1. **User Credentials:** Never store AnkiWeb credentials - let AnkiDroid handle auth
2. **Local Data:** Encrypt sensitive card content if needed (SQLCipher)
3. **ContentProvider Permission:** Only request when needed, explain why
4. **File Access:** Use scoped storage (Android 10+)

---

## Executive Summary & Recommendations

### Research Questions Answered

| Question | Answer | Confidence |
|----------|--------|------------|
| **Is there a public AnkiWeb API?** | **No.** No public API exists. Anki team has explicitly stated they won't add one. | High |
| **Is reverse-engineering the Sync Protocol the only way?** | **No.** There are alternatives: file-based (.apkg) and platform-specific APIs (AnkiDroid ContentProvider). | High |
| **Can file-based .apkg work as alternative?** | **Yes.** Most reliable approach, works cross-platform, preserves scheduling data. | High |
| **What's the best approach for Android-first MVP?** | **Hybrid:** ContentProvider for writes + file-based for reads. | High |

---

### Approach Comparison Matrix

| Criteria | AnkiWeb Protocol | Self-Hosted Server | File-Based (.apkg) | AnkiDroid API |
|----------|-----------------|-------------------|-------------------|---------------|
| **Implementation Complexity** | Very High | High | Medium | Low-Medium |
| **Reliability** | Low (breaks on updates) | Medium | High | High |
| **User Experience** | Seamless | Seamless (after setup) | Manual steps | Seamless (writes) |
| **Bidirectional Sync** | Yes | Yes | Yes (manual) | Partial |
| **iOS Support** | Yes | Yes | Yes | No |
| **Android Support** | Yes | Yes | Yes | Yes |
| **Maintenance Burden** | High | High | Low | Low |
| **MVP Suitability** | Poor | Poor | Good | Good |

---

### Recommended Approach: Hybrid (Android-First)

**Primary Strategy:** Combine AnkiDroid ContentProvider API (for automated writes) with file-based .apkg parsing (for reading review data).

```
┌──────────────────────────────────────────────────────────────┐
│              RECOMMENDED ARCHITECTURE                         │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  WRITE PATH (Automated):                                      │
│  Your App → ContentProvider API → AnkiDroid → AnkiWeb        │
│                                                               │
│  READ PATH (User-initiated):                                  │
│  AnkiDroid Export → .apkg file → Your App parses             │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

**Why This Approach:**
1. **Low risk** - No dependency on undocumented protocols
2. **Fast to build** - ContentProvider API is well-documented
3. **Reliable** - File format is stable, won't break
4. **Validates core value** - Tests if users want your app's card creation UX

---

### Pros & Cons Summary

#### File-Based Approach (.apkg)

| Pros | Cons |
|------|------|
| Most reliable - format is stable | Manual user steps required |
| Full scheduling data preserved (`revlog`) | Worse UX than seamless sync |
| Works on all platforms | Conflict resolution complexity |
| No authentication needed | User must export/import manually |
| No API rate limits | |

#### AnkiDroid ContentProvider API

| Pros | Cons |
|------|------|
| Automated card creation | Android-only |
| No user interaction needed | Write-oriented (read is limited) |
| Can trigger AnkiWeb sync | Requires permission grant |
| Well-documented API | Depends on AnkiDroid being installed |
| 1-minute sync interval limit | |

#### AnkiWeb Protocol (Reverse-Engineered)

| Pros | Cons |
|------|------|
| Seamless bidirectional sync | No documentation |
| Works on all platforms | Breaks when Anki updates |
| Best UX if it works | High maintenance burden |
| | Potential ToS issues |
| | Protobuf complexity |

---

### Implementation Roadmap

#### Phase 1: MVP Validation (Recommended Start)

**Goal:** Validate that users want to create cards in your app

| Task | Effort | Priority |
|------|--------|----------|
| Set up React Native/Flutter project | Low | P0 |
| Create local SQLite database | Low | P0 |
| Build card creation UI | Medium | P0 |
| Implement Kotlin native bridge | Medium | P0 |
| Integrate AnkiDroid ContentProvider | Medium | P0 |
| Add "Sync to Anki" button | Low | P0 |
| **Total Phase 1** | **~2-3 sprints** | |

**Deliverable:** Users can create cards in your app → push to AnkiDroid → review in Anki

#### Phase 2: Bidirectional Sync

**Goal:** Complete the feedback loop with review data

| Task | Effort | Priority |
|------|--------|----------|
| Implement .apkg file parser | Medium | P1 |
| Add Share Intent receiver | Low | P1 |
| Parse `revlog` table | Medium | P1 |
| Merge review data with local cards | Medium | P1 |
| Display review statistics | Low | P1 |
| **Total Phase 2** | **~2 sprints** | |

**Deliverable:** Users can see their review progress from Anki in your app

#### Phase 3: Polish & iOS (Future)

| Task | Effort | Priority |
|------|--------|----------|
| iOS file-based integration | Medium | P2 |
| Conflict resolution UI | Medium | P2 |
| Background sync optimization | Medium | P2 |
| Advanced scheduling features | High | P2 |

---

### Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| AnkiDroid API changes | Low | Medium | Pin to API version, monitor releases |
| .apkg format changes | Very Low | High | Follow Anki releases, test with new versions |
| User adoption friction | Medium | High | Minimize manual steps, clear onboarding |
| ContentProvider permission denial | Low | Medium | Clear rationale, fallback to file-based |
| AnkiDroid not installed | Medium | Medium | Detect and prompt install |

---

### Technology Stack Decision

**Recommended for MVP:**

| Component | Choice | Alternative |
|-----------|--------|-------------|
| Framework | **React Native** (Expo) | Flutter |
| Local DB | **expo-sqlite** | WatermelonDB |
| State | **Zustand** | Redux Toolkit |
| Native Bridge | **Custom Kotlin module** | - |
| File Parsing | **JSZip + sql.js** | - |

**Why React Native:**
- Faster iteration for MVP
- Large ecosystem
- Easier to find developers
- Expo simplifies native module integration

---

### Key Resources

**Official Documentation:**
- [AnkiDroid API Wiki](https://github.com/ankidroid/Anki-Android/wiki/AnkiDroid-API)
- [AnkiDroid API Sample](https://github.com/ankidroid/apisample)
- [Anki Manual - Sync Server](https://docs.ankiweb.net/sync-server.html)

**Libraries:**
- [genanki (Python)](https://github.com/kerrickstaley/genanki) - Create .apkg files
- [anki-apkg-parser (Node.js)](https://github.com/74Genesis/anki-apkg-parser) - Parse .apkg files

**Reference Implementations:**
- [anki-sync-server-rs](https://github.com/ankicommunity/anki-sync-server-rs) - Rust sync server
- [Anki Sync Protocol Wiki](https://github.com/Catchouli/learny/wiki/Anki-sync-protocol) - Protocol documentation

**Third-Party Apps Using AnkiDroid API:**
- [Third-Party Apps List](https://github.com/ankidroid/Anki-Android/wiki/Third-Party-Apps) - Examples of integrations

---

### Success Metrics for MVP

| Metric | Target | Measurement |
|--------|--------|-------------|
| Card creation → Anki sync success rate | >95% | Analytics |
| User completes first sync | >70% of installs | Funnel tracking |
| Time to first card in Anki | <2 minutes | User testing |
| ContentProvider permission grant rate | >80% | Analytics |
| User retention (D7) | >30% | Analytics |

---

### Final Recommendation

**Start with Phase 1 (One-Way Sync):**

1. Build the AnkiDroid ContentProvider integration first
2. Validate that users want your card creation experience
3. Don't over-engineer bidirectional sync until you have users
4. File-based import can be added incrementally in Phase 2

**Key Insight:** The hardest part isn't technical - it's whether users will prefer creating cards in your app over Anki's native UI. Validate that first.

---

## Research Metadata

| Field | Value |
|-------|-------|
| **Research Type** | Technical |
| **Topic** | Anki Mobile Sync Architectural Patterns |
| **Date** | 2026-01-19 |
| **Author** | Tobias |
| **Scope** | Android-first MVP validation |
| **Confidence Level** | High (multiple sources verified) |

---

**Research Complete.**

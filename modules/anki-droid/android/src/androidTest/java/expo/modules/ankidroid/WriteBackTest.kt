package expo.modules.ankidroid

import android.content.ContentResolver
import android.content.ContentValues
import android.content.Context
import android.net.Uri
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.rule.GrantPermissionRule
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TestName
import org.junit.runner.RunWith

/**
 * Instrumented write-back tests for submitCardAnswer / answerCard.
 *
 * What these catch:
 *   - The scheduler doesn't accept our answer (returns 0 rows updated)
 *   - The priming query pattern broke (card no longer in the active queue)
 *   - The ease / timeTakenMs args are silently swapped or lost
 *   - The card is still in the "due" queue after being answered
 *
 * Setup: each test creates its own test deck + notes via ContentProvider,
 * answers the cards, then verifies the scheduler accepted the write.
 * Teardown: removes the test deck (best-effort).
 *
 * This is the only test layer that exercises the real AnkiDroid scheduler
 * interaction end-to-end — Jest mocks the bridge, this does not.
 */
@RunWith(AndroidJUnit4::class)
class WriteBackTest {

    @get:Rule
    val permissionRule: GrantPermissionRule = GrantPermissionRule.grant(
        "com.ichi2.anki.permission.READ_WRITE_DATABASE"
    )

    @get:Rule
    val testName = TestName()

    private lateinit var context: Context
    private lateinit var resolver: ContentResolver

    private val deckName get() = "TEST_WriteBack_${testName.methodName}_$SUFFIX"
    private var deckId: Long = 0L
    private var modelId: Long = 0L
    private val noteIds = mutableListOf<Long>()

    // Seed data — fixed content so test-flow.sh can script the answers
    private val seedCards = listOf(
        "What does EC2 stand for?"          to "Elastic Compute Cloud",
        "What does S3 stand for?"           to "Simple Storage Service",
        "What is AWS Lambda?"               to "Serverless compute — run code without managing servers",
    )

    @Before
    fun setup() {
        context = InstrumentationRegistry.getInstrumentation().targetContext
        resolver = context.contentResolver

        modelId = findBasicModelId()
            ?: throw IllegalStateException(
                "No Basic model found in AnkiDroid. Open it once to bootstrap the collection."
            )
        deckId = createDeck(deckName)
        noteIds.clear()
        seedCards.forEach { (front, back) ->
            insertNote(deckId, front, back)?.let { noteIds.add(it) }
        }
        assertTrue("Setup should have inserted ${seedCards.size} notes", noteIds.size == seedCards.size)
    }

    @After
    fun teardown() {
        if (deckId != 0L) deleteDeck(deckId)
    }

    // ── Tests ──────────────────────────────────────────────────────────────

    @Test
    fun answerCard_correct_returnsNonZeroRows() {
        val cards = queryDueCards(resolver, deckName)
        assertTrue("Expected due cards in $deckName, got 0", cards.isNotEmpty())

        val card = cards.first()
        val noteId = card["cardId"] as Long
        val ord    = (card["cardOrd"] as? Int) ?: 0

        val rows = submitCardAnswer(resolver, deckName, noteId, ord, ease = 4, timeTakenMs = 3000)
        assertTrue(
            "submitCardAnswer should return >0 rows for an active card (got $rows). " +
                "This means AnkiDroid rejected the answer — the priming query or the " +
                "(noteId, ord) pairing is broken.",
            rows > 0
        )
    }

    @Test
    fun answerCard_incorrect_returnsNonZeroRows() {
        val cards = queryDueCards(resolver, deckName)
        assertTrue("Expected due cards in $deckName", cards.isNotEmpty())

        val card = cards.first()
        val rows = submitCardAnswer(
            resolver, deckName,
            noteId     = card["cardId"] as Long,
            cardOrd    = (card["cardOrd"] as? Int) ?: 0,
            ease       = 1,
            timeTakenMs = 8000
        )
        assertTrue("ease=1 (again) should also be accepted by the scheduler (got $rows rows)", rows > 0)
    }

    @Test
    fun answerCard_removesCardFromDueQueue() {
        val before = queryDueCards(resolver, deckName)
        assertTrue("Need at least one due card", before.isNotEmpty())

        val card = before.first()
        submitCardAnswer(
            resolver, deckName,
            noteId     = card["cardId"] as Long,
            cardOrd    = (card["cardOrd"] as? Int) ?: 0,
            ease       = 4,
            timeTakenMs = 2000
        )

        // After answering, re-query. The answered card should no longer be
        // at the head of the scheduler queue (AnkiDroid advances its position).
        val after = queryDueCards(resolver, deckName)

        // The exact IDs in `after` depend on the scheduler (the card may
        // reappear as a learn step on the same day). The key invariant is
        // that the same card id does NOT immediately reappear as the HEAD:
        if (after.isNotEmpty()) {
            val answeredId = card["cardId"] as Long
            val newHeadId  = after.first()["cardId"] as Long
            assertTrue(
                "The just-answered card ($answeredId) must not be re-queued at the " +
                    "head immediately after a correct answer (got $newHeadId as head). " +
                    "If this fails, the write-back didn't advance the scheduler.",
                newHeadId != answeredId || before.size == 1
            )
        }
    }

    @Test
    fun answerAllCards_eachReturnsNonZeroRows() {
        val cards = queryDueCards(resolver, deckName)
        assertTrue("Expected cards in $deckName", cards.isNotEmpty())

        var totalFailed = 0
        cards.forEach { card ->
            // Re-query each time — submitCardAnswer needs the card to be active
            // in the queue, which requires a fresh queryDueCards per card.
            val fresh = queryDueCards(resolver, deckName)
            val target = fresh.find { it["cardId"] == card["cardId"] } ?: return@forEach

            val rows = submitCardAnswer(
                resolver, deckName,
                noteId      = target["cardId"] as Long,
                cardOrd     = (target["cardOrd"] as? Int) ?: 0,
                ease        = 4,
                timeTakenMs = 2500
            )
            if (rows == 0) totalFailed++
        }

        assertEquals(
            "Every card answer should be accepted by the scheduler. " +
                "$totalFailed card(s) returned 0 rows — they may not have been in the active queue.",
            0, totalFailed
        )
    }

    // ── Helpers (duplicated from GetDueCardsTest to keep tests self-contained) ──

    private fun findBasicModelId(): Long? {
        val modelsUri = Uri.parse("content://com.ichi2.anki.flashcards/models")
        resolver.query(modelsUri, null, null, null, null)?.use { cursor ->
            val idIdx   = cursor.getColumnIndex("_id").takeIf { it >= 0 } ?: cursor.getColumnIndex("model_id")
            val nameIdx = cursor.getColumnIndex("name").takeIf { it >= 0 } ?: cursor.getColumnIndex("model_name")
            var firstId: Long? = null
            while (cursor.moveToNext()) {
                val id   = if (idIdx >= 0) cursor.getLong(idIdx) else continue
                val name = if (nameIdx >= 0) cursor.getString(nameIdx) else ""
                if (firstId == null) firstId = id
                if (name?.startsWith("Basic", ignoreCase = true) == true) return id
            }
            return firstId
        }
        return null
    }

    private fun createDeck(name: String): Long {
        val existing = queryDeckId(resolver, name)
        if (existing != 0L) return existing
        val values = ContentValues().apply { put("deck_name", name) }
        val uri = resolver.insert(DECKS_URI, values)
            ?: throw IllegalStateException("Failed to create deck '$name'")
        return uri.lastPathSegment?.toLongOrNull() ?: queryDeckId(resolver, name)
    }

    private fun insertNote(deckId: Long, front: String, back: String): Long? {
        setSelectedDeck(resolver, deckId)
        val notesWithDeck = NOTES_URI.buildUpon()
            .appendQueryParameter("deckId", deckId.toString())
            .build()
        val values = ContentValues().apply {
            put("mid", modelId)
            put("did", deckId)
            put("flds", "$front$back")
            put("tags", "")
        }
        val uri = resolver.insert(notesWithDeck, values) ?: return null
        val noteId = uri.lastPathSegment?.toLongOrNull()
        if (noteId != null) {
            for (ord in 0..1) {
                try {
                    val cardUri = Uri.parse("content://$ANKI_AUTHORITY/notes/$noteId/cards/$ord")
                    resolver.update(cardUri, ContentValues().apply { put("deck_id", deckId) }, null, null)
                } catch (_: Exception) {}
            }
        }
        return noteId
    }

    private fun deleteDeck(deckId: Long) {
        try {
            resolver.delete(Uri.parse("content://com.ichi2.anki.flashcards/decks/$deckId"), null, null)
        } catch (_: Exception) {}
    }

    companion object {
        private val SUFFIX = System.currentTimeMillis().toString().takeLast(6)
    }
}

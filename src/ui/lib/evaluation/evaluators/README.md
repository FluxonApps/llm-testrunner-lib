# Evaluation Approaches

This directory contains multiple evaluation strategies used to compare a model's response with the expected output. Each evaluator focuses on a different interpretation of "matching" — from exact string checks to meaning-based similarity.

## Currently Supported Evaluation Approaches

| Approach     | File / Module            | What It Measures                                      | When to Use                                                                      |
| ------------ | ------------------------ | ----------------------------------------------------- | -------------------------------------------------------------------------------- |
| **Exact**    | `exact/exact.ts`         | Direct keyword / source link presence (string match)  | Strict correctness checks where exact wording matters                            |
| **ROUGE-1**  | `rouge1-evaluator.ts`    | Overlap of individual words (unigram similarity)      | When responses may paraphrase slightly but should share key wording              |
| **ROUGE-L**  | `rougeL-evaluator.ts`    | Longest Common Subsequence (LCS) based similarity     | When evaluating responses that preserve overall phrasing or structural coherence |
| **Semantic** | `semantic/index.ts`      | Meaning similarity using embeddings + cosine distance | When exact words _don't matter_, only the conveyed meaning                       |
| **BLEU**     | `bleu/bleu-evaluator.ts` | Precision of n-grams (1-4 grams) between texts        | When evaluating translation quality or n-gram precision                          |

---

## 1. Exact Matching

**How it works:**

- Converts both keyword and response to lowercase.
- Marks a keyword as `found` if it appears **verbatim** in the response.
- Passes **only if all** keywords and source links are found.

**Use when:**

- The wording must match precisely.
- Ideal for structured / factual / template-based answers.

---

## 2. ROUGE-1 Evaluation

**How it works:**

- Computes **ROUGE-1** scores, which measure **word overlap** between expected keyword and response.
- A keyword passes if its ROUGE-1 score ≥ threshold (default: `DEFAULT_ROUGE_PASS_SCORE`).
- The test passes only if **every keyword** passes.

**Why use it:**

- Useful when the model may paraphrase but should retain key vocabulary.
- Example: `"global warming"` vs `"warming of the globe"` → still similar.

---

## 3. ROUGE-L Evaluation

**How it works:**

- Computes **ROUGE-L** scores using the **Longest Common Subsequence (LCS)** between expected keyword and response.
- Converts both texts to lowercase and splits into word tokens.
- Calculates F1 score from precision and recall based on LCS length.
- A keyword passes if its ROUGE-L score ≥ threshold (default: `DEFAULT_ROUGE_PASS_SCORE`).
- The test passes only if **every keyword** passes.

**Why use it:**

- Useful when word order and sequence matter more than just word overlap.
- Better than ROUGE-1 for capturing sentence-level structure.
- Example: `"the cat sat"` vs `"sat the cat"` → ROUGE-1 might match all words, but ROUGE-L considers the sequence.

---

## 4. Semantic Evaluation (Embedding-Based)

**How it works:**

- Uses transformer embeddings (`FeatureExtractionPipeline` from `@xenova/transformers`).
- Computes **cosine similarity** between:
  - Each expected keyword, and
  - Every word in the response.
- Keyword is marked `found` if similarity ≥ `DEFAULT_SEMANTIC_PASS_SCORE`.

**Example:**

| Keyword   | Response Word | Similarity | Found? |
| --------- | ------------- | ---------- | ------ |
| `car`     | `vehicle`     | 0.92       | ✅ Yes |
| `illness` | `disease`     | 0.88       | ✅ Yes |

**Why use it:**

- Works when wording differs but meaning is preserved.
- Best when evaluating conceptual or descriptive answers.

---

## 5. BLEU Evaluation

**How it works:**

- Computes **BLEU** scores, which measure the **precision of n-grams** (typically 1-4 grams) between expected keyword and response.
- Pre-processes text by converting to lowercase and normalizing whitespace for case-insensitive matching.
- A keyword passes if its BLEU score ≥ threshold (default: `DEFAULT_BLEU_PASS_SCORE`).
- The test passes only if **every keyword** passes.
- **Note:** BLEU requires keywords with 4+ words to produce meaningful 4-gram scores.

**Why use it:**

- Useful for evaluating translation quality or when n-gram precision is important.
- Measures how well the candidate text matches the reference in terms of n-gram overlap.
- Example: `"the cat sat on the bed"` vs `"cat sat on the"` → partial match based on n-gram overlap.

---

## Pass/Fail Logic Across Evaluations

All evaluators follow the **same pass condition**:

> **A test is marked as passed only if _every_ expected keyword is matched according to the evaluation method.**

The `evaluationApproachResult.score` provides a **confidence / quality measure**, but does _not_ determine pass/fail by itself.

---

## Summary

| Approach | Matching Style       | Tolerates Paraphrasing | Understands Synonyms | Performance Cost            |
| -------- | -------------------- | ---------------------- | -------------------- | --------------------------- |
| Exact    | Literal string match | ❌ No                  | ❌ No                | ✅ Fast                     |
| ROUGE-1  | Word overlap         | ✅ Moderate            | ❌ No                | ✅ Fast                     |
| ROUGE-L  | LCS-based sequence   | ✅ Moderate–High       | ❌ No                | ⚠️ Slightly slower than R-1 |
| Semantic | Embedding similarity | ✅ Yes                 | ✅ Yes               | ⚠️ Requires model loading   |
| BLEU     | N-gram precision     | ✅ Moderate            | ❌ No                | ✅ Fast                     |

---

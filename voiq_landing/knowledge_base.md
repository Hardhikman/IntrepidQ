# VoIQ Help System Knowledge Base

This Knowledge Base focuses on the VoIQ Android Play Store app, its features, and how to use them, drawing exclusively from the provided documentation.

---

## Question: What is the VoIQ Android app?
**Answer**: The VoIQ Android app is a privacy-first vocabulary tutor built with Jetpack Compose and Gemini AI. It provides a mobile experience for learning and managing vocabulary.
**Source**: README.md (VoIQ Android App), android_architecture.md

---

## Question: What are the main sections or tabs of the VoIQ Android app?
**Answer**: The VoIQ Android app is organized into five mission-focused tabs:
*   **Quiz**: Your primary learning workspace with a built-in guide for conversational learning.
*   **Manage**: Centralized database control for vocabulary maintenance and edits.
*   **Stats**: Live performance analytics with on-demand category filtering.
*   **Backup & Sync**: Effortless batch importing for new vocabulary from files and secure CSV exports.
*   **Settings**: Manages application-specific configurations, such as the Gemini API Key.
**Source**: README.md (VoIQ Android App), android_architecture.md, usage.md, Feature_Audit.md

---

## Question: What are the basic requirements to run the VoIQ Android app?
**Answer**: To run the VoIQ Android app, you need:
*   Android Studio (Iguana or later)
*   Kotlin 1.9+
*   Minimum SDK 26 (Android 8.0)
*   Gradle 8.2+
*   A Google AI Studio key (Gemini) added in the app's Settings tab.
**Source**: README.md (VoIQ Android App), android_architecture.md

---

## Question: Does the Android app require an internet connection after initial setup?
**Answer**: No. The Android app manages all history and AI clues locally in a Room database. No backend server is required after the initial build, making it offline-first.
**Source**: usage.md, android_architecture.md

---

### Use Cases & Learning Strategies

## Question: What types of content can I learn with VoIQ?
**Answer**: VoIQ is a "Universal Tutor" and supports any content you import or back up. Common use cases include:
*   **Vocabulary Building**: Standard word-meaning pairs.
*   **Phrases & Idioms**: For memorizing common expressions.
*   **Quotes Collection**: Memorizing famous lines and their authors.
*   **General Knowledge**: Learning facts, dates, and historical events.
*   **Books & Learnings**: Capturing key insights and keywords from specific topics.
*   **Q&A**: Using the "Word" column for questions and "Meaning" for answers.

## Question: How do AI Clues adapt to different topics (like Quotes or Facts)?
**Answer**: The AI uses a **Universal Strategy Toolkit** that chooses the best way to help based on your category:
1.  **SCENARIO**: Provides a real-world example where the answer fits (Best for Phrases).
2.  **ANALOGY**: Compares the answer to a common object or experience (Best for Books/Concepts).
3.  **CONTRAST**: Describes what the answer is NOT or its polar opposite (Best for Vocab/Facts).
This ensures clues are helpful regardless of whether you are studying history or a new language.
**Source**: Quiz_Feature.md, GeminiClient.kt

---

### Quiz Tab Features

---

## Question: How do I start a new quiz in the VoIQ Android app?
**Answer**: To start a new quiz, navigate to the Quiz tab and follow the advanced 7-step guided setup flow:
1.  **Category**: Select one or more vocabulary categories.
2.  **Mode**: Choose your quiz mode (MCQ, Dictation, or Learn).
3.  **Order**: Select the order of words (Random, A→Z, Z→A, or Letter-wise).
4.  **Letter** (if Letter-wise selected): Choose a starting letter, with word counts displayed for each.
5.  **Study Target**: Choose what you want to be tested on (e.g., Word, Meaning, Synonym).
6.  **Display Selection**: Choose how the question is presented (e.g., Text, Synonym, Antonym).
7.  **Timer**: Select a timer duration (7s, 10s, 20s) or turn it off.
After setup, you can review a summary and start the quiz.
**Source**: README.md (VoIQ Android App), Quiz_Feature.md

---

## Question: What are the different quiz modes available in the Android app?
**Answer**: The VoIQ Android app offers three quiz modes:
*   **MCQ (Multiple Choice Questions)**: Provides 4 options, and you answer A/B/C/D.
*   **Dictation**: You type your answer, and the app uses fuzzy matching to handle minor typos.
*   **Learn**: A flashcard-style study mode with a timed reveal of the answer.
**Source**: README.md (VoIQ Android App), usage.md, Quiz_Feature.md

---

## Question: How many types of questions are available?
**Answer**: There are 12 semantic question types that combine words, meanings, synonyms, and antonyms for comprehensive testing.
**Source**: README.md, Quiz_Feature.md

---

## Question: How does the quiz setup's "Smart Filtering" work?
**Answer**: During quiz setup, options for Study Target, Display Selection, and Letter-wise ordering show real-time word counts. They also auto-disable if there's no available data (e.g., the Synonym option is disabled if your words don't have synonyms).
**Source**: README.md (VoIQ Android App), Quiz_Feature.md

---

## Question: What is "Finite Quiz Flow"?
**Answer**: Finite Quiz Flow means the quiz progresses through all words in the selected queue without looping infinitely, ensuring you cover all your chosen vocabulary.
**Source**: README.md (VoIQ Android App), Feature_Audit.md

---

## Question: How does the app track my quiz performance?
**Answer**: During a quiz, a live score display shows your current progress (e.g., "8/10 (80%)"). Session statistics for correct and total attempts are tracked.
**Source**: README.md (VoIQ Android App), Feature_Audit.md

---

## Question: Can I review my wrong answers after a quiz?
**Answer**: Yes, after a quiz ends, you have the option to "Review Wrong Answers" (`[🔄 Review]`). This re-tests only the words you failed in that session, preserving clues and options.
**Source**: README.md (VoIQ Android App), usage.md, Feature_Audit.md

---

## Question: What is the "Latest-Aware" logic for failed words in review?
**Answer**: The "Latest-Aware" logic means that only words where your most recent attempt was incorrect will appear in the "Failed Words List" or a review session. If you subsequently answer a previously failed word correctly, it will be removed from the review list.
**Source**: usage.md, Quiz_Feature.md

---

## Question: How does the timer work during a quiz?
**Answer**: The app features a live, configurable timer (7s, 10s, 20s). It has a color-coded countdown:
*   Green: > 50% time remaining.
*   Yellow: 50% to 10% time remaining.
*   Red: < 10% time remaining.
The timer also triggers the auto-reveal of AI clues at the halfway mark.
**Source**: README.md (VoIQ Android App), Quiz_Feature.md

---

## Question: What are AI Clues and how are they delivered?
**Answer**: AI Clues are automatically generated hints (etymology, mnemonics, and semantic hints) powered by Gemini AI. They appear as a floating ClueCard that slides down at the halfway point of the quiz timer, providing contextual intelligence to aid retention.
**Source**: README.md, README.md (VoIQ Android App), usage.md, Quiz_Feature.md

---

## Question: How does Dictation mode handle typos?
**Answer**: Dictation mode uses Fuzzy Matching with an 85% Levenshtein distance threshold to tolerate minor typos in your typed answers.
**Source**: README.md, Quiz_Feature.md

---

## Question: What happens if my selected category has fewer than 4 words for an MCQ quiz?
**Answer**: If a category has fewer than 4 words, MCQ mode will be disabled with a warning ("⚠️ Need 4+ words"). You will need to use Dictation or Learn mode instead.
**Source**: usage.md

---

## Question: What happens if I select multiple categories and one has only 1 word?
**Answer**: The app will use cross-category distractors. When that single word appears in a quiz, its multiple-choice options will be drawn from the other selected categories.
**Source**: usage.md

---

### Manage Tab Features

---

## Question: What can I do in the Manage tab?
**Answer**: The Manage tab is your control center for your vocabulary database. It allows you to view, search, filter, add, edit, and delete words and categories using an interactive word explorer and a natural language management assistant.
**Source**: README.md (VoIQ Android App), usage.md, Word_Management.md

---

## Question: How can I view my vocabulary words in the Manage tab?
**Answer**: The Manage tab features a "Full Word Table" that displays words in 5 columns: Word, Meaning, Synonyms, Antonyms, and Category. The table supports horizontal scrolling for comprehensive viewing.
**Source**: README.md (VoIQ Android App), Word_Management.md

---

## Question: Can I filter and search for words in the Manage tab?
**Answer**: Yes, you can use a dropdown menu to filter words by category. You can also use the search bar to find words by their word text or meaning text.
**Source**: README.md (VoIQ Android App), Word_Management.md

---

## Question: What is the "Floating Assistant" in the Manage tab?
**Answer**: The "Floating Assistant," labeled "Ask VoIQ," is a chat-based interface that handles administrative tasks via natural language commands. It appears as a Floating Action Button (FAB) that expands into a chat panel.
**Source**: README.md (VoIQ Android App), usage.md, Word_Management.md

---

## Question: What commands can I use with the Management Assistant?
**Answer**: The Management Assistant (chatbot) can handle commands such as:
*   `add`: To add a new word (which opens a dialog).
*   `modify`/`edit`: To change details of a selected word.
*   `move`: Support for future category changes (currently helps identify the word's category).
*   `delete`: To remove a selected word from the database.
*   `delete category [Name]`: To remove an entire category and all its words.
*   `search`: Advice on how to use the search bar.
*   `cancel`: To clear the current word selection.
A command cheatsheet is available via the "💡 How to Use Management" toggle.
**Source**: README.md (VoIQ Android App), usage.md, Word_Management.md

---

## Question: How does the "Smart Add" feature work when adding words?
**Answer**: When adding a new word, the "Smart Add" feature (indicated by an `AutoAwesome` icon) can auto-populate word details (meaning, synonyms, antonyms) by looking up the word via Dictionary and Datamuse APIs.

**Important Limitation**: Smart Add is designed for **standard English vocabulary words only**. It will NOT work for:
- Phrases or Idioms (e.g., "break the ice")
- Quotes (e.g., "To be or not to be")
- Q&A pairs or General Knowledge facts
- Domain-specific technical terms

For these use cases, you should enter content manually or use the **Backup & Sync** feature with an Excel/CSV file.
**Source**: README.md (VoIQ Android App), Word_Management.md

---

## Question: How do I delete words or categories?
**Answer**: In the Manage tab, you can delete data in two ways:
1.  **Individual Words**: Click a row in the table to select it, then use the "Delete Selected" button or type `delete` in the Assistant.
2.  **Entire Categories**: Select a category in the filter dropdown, click the **Delete Category (Red Trash Icon)** button that appears, and confirm in the dialog. Alternatively, type `delete category [Name]` in the Floating Assistant.
<WARNING>: Category deletion removes all associated words and attempt history permanently.
**Source**: usage.md, Word_Management.md

---

### Stats Tab Features

---

## Question: What information is displayed on the Stats tab?
**Answer**: The Stats tab provides a "Performance Dashboard" with real-time analytics for the selected month and category, including:
*   **Accuracy**: Your percentage of correct answers.
*   **Correct/Failed Counts**: The number of successful and unsuccessful attempts.
*   **Total Attempts**: The sum of all questions answered.
It also features a **Monthly Calendar View** for activity tracking and a **Failed Words List** for targeted practice.
**Source**: StatsScreen.kt, StatsViewModel.kt, Stats_Analytics.md

---

## Question: How can I track my study activity over time?
**Answer**: The Stats tab includes an interactive "Monthly Calendar View" that tracks your activity, showing daily attempt history. Days with attempts are highlighted with a feature-colored dot.
**Source**: README.md (VoIQ Android App), Stats_Analytics.md

---

## Question: Are word details always visible in the stats?
**Answer**: No. In the "Date Detail Section" of the Stats tab, word details (meaning, synonyms, antonyms) are hidden by default with masked columns (e.g., `●●●●●●●●`). Tapping a row reveals the visibility for all columns in that specific row.
**Source**: README.md (VoIQ Android App), Stats_Analytics.md

---

## Question: Can I filter the statistics by category?
**Answer**: Yes, the Stats tab includes a Category Filter dropdown that allows you to filter all displayed statistics and charts by specific vocabulary categories or view overall performance across all vocabulary if the filter is left empty.
**Source**: README.md (VoIQ Android App), Stats_Analytics.md

---

## Question: How is Monthly Accuracy calculated?
**Answer**: Monthly Accuracy is calculated by aggregating all attempts within the currently focused month and category. The formula is `(monthly_correct_count / monthly_total_attempts) * 100`.
**Source**: Stats_Analytics.md

---

## Question: Can I share my stats as an image?
**Answer**: Yes! The Stats tab has a **"Share Report"** button located next to the "Monthly Performance" title. Tapping it captures a clean "Report Card" image of your statistics (Accuracy, Correct, Failed, Total) and opens the Android share sheet. You can then share to WhatsApp, Instagram, or any other app.
**Source**: StatsScreen.kt, Stats_Analytics.md

---

## Question: What if I have many questions on a single day?
**Answer**: The "Date Detail Section" uses **Pagination** for performance. It initially displays 20 questions. If there are more, a **"Load More (X remaining)"** button appears at the bottom. Tapping it reveals the next 20 questions.
**Source**: StatsScreen.kt, Stats_Analytics.md

---

### Backup & Sync Tab Features

---

## Question: What file formats are supported for Backup & Sync?
**Answer**: The VoIQ Android app supports importing from Excel (.xlsx) and CSV (.csv) files, and exporting your entire database to a standard CSV (.csv) file.
**Source**: README.md, README.md (VoIQ Android App), usage.md, Feature_Audit.md

---

## Question: How do I export my vocabulary for backup?
**Answer**: In the **Backup & Sync** tab, tap the "Export CSV" button. You can then choose a save location and filename on your device using the standard Android file explorer.
**Source**: BackupScreen.kt, BackupViewModel.kt

## Question: Does the column order matter in my backup/import file?
**Answer**: No, the app features "Smart Header Detection" and auto-detects column names based on recognized headers, regardless of their position in the file.
**Source**: README.md (VoIQ Android App), usage.md, Feature_Audit.md

---

## Question: How does the app assign categories during Backup & Sync if my file doesn't have a category column?
**Answer**: If your import file does not contain a dedicated "Category" column, the app will automatically use the normalized filename as the default category for all words in that file (e.g., `history.xlsx` becomes "History").
**Source**: README.md (VoIQ Android App), usage.md, Feature_Audit.md

---

## Question: What column headers does the app recognize for importing?
**Answer**: The app recognizes a range of case-insensitive headers:
*   **Word**: `word`, `words`, `vocabulary`, `term`, `question`, `phrase`
*   **Meaning**: `meaning`, `definition`, `description`, `answer`
*   **Synonyms**: `synonym`, `synonyms`, `similar`, `similar words`, `related words`
*   **Antonyms**: `antonym`, `antonyms`, `opposite`, `opposite words`
*   **Category**: `category`, `type`, `group`, `tag`, `cat`
**Source**: usage.md, Feature_Audit.md

---

## Question: Can I include multiple sentences or long text across different columns in my import file?
**Answer**: Yes. The VoIQ database uses a flexible `TEXT` data type for all vocabulary fields (Word, Meaning, Synonyms, and Antonyms), which supports thousands of characters. You can safely import long quotes, multiple sentences, or paragraphs.
*   **Note on UI**: To keep the interface clean, the app may visually truncate extremely long text to 1-2 lines in certain list views (like the Word Table or Stats), but the full content is preserved in the database.
**Source**: usage.md

---

## Question: How does the app handle category names with different casing during Backup & Sync?
**Answer**: The app uses "Case-Insensitive Grouping." It normalizes category names (trims whitespace, converts to lowercase, then capitalizes the first letter) to merge categories with different casings. This ensures that when you export and re-import data, your category structure remains clean.
**Source**: README.md (VoIQ Android App), Word_Management.md, Feature_Audit.md

---

## Question: Which columns are required for a successful vocabulary Backup/Sync?
**Answer**: The "Word" and "Meaning" columns are required for a successful import. Synonyms and Antonyms are optional.
**Source**: usage.md, Feature_Audit.md

---

### Settings Tab Features

---

## Question: What can I configure in the Settings tab?
**Answer**: The Settings tab allows you to configure your **App Theme** (Light, Dark, or System Default) and securely store your **Gemini API Key** using EncryptedSharedPreferences. It also provides a "Test Connection" feature to verify your API key.
**Source**: SettingsScreen.kt, PrefsManager.kt, Feature_Audit.md

## Question: Does the app support Dark Mode?
**Answer**: Yes! VoIQ supports a fully reactive Dynamic Theme System. You can choose between:
*   **Light**: A clean, high-contrast slate and indigo theme.
*   **Dark**: A premium, indigo-centric dark theme (default).
*   **System Default**: Automatically follows your device's global theme settings.
You can switch themes in the Settings tab, and the change will instantly apply across the entire application.
**Source**: Colors.kt, Theme.kt, SettingsScreen.kt

---
### Technical Troubleshooting & Security

## Question: Does VoIQ handle typos during a quiz?
**Answer**: Yes. In Dictation mode, the app uses a **Fuzzy Matching** algorithm (Levenshtein distance). Small typos or character swaps are detected, and as long as the answer is sufficiently close, it will be marked as correct to keep your learning flow smooth.
**Source**: Quiz_Feature.md, FuzzyMatcher.kt

## Question: Is my Gemini API key secure?
**Answer**: Absolutely. VoIQ uses **EncryptedSharedPreferences**, which leverages the Android Keystore system (MasterKey) to encrypt your API key at rest. It is never stored in plain text or synced outside your device.
**Source**: Data_Layer.md, PrefsManager.kt, Build_System.md

## Question: If I delete a word, what happens to my study history?
**Answer**: The database uses **Cascade Deletion**. When a word is removed, all associated attempt records and statistics for that specific word are automatically purged to keep the database consistent and accurate.
**Source**: Data_Layer.md, Attempt.kt

## Question: Why are some Quiz Target or Display options disabled?
**Answer**: The app performs **Live Data Availability Checks**. For example, if your selected categories don't have any synonyms defined, the "Synonym" mode will be auto-disabled in the setup flow to prevent empty or broken questions.
**Source**: Quiz_Feature.md, WordDao.kt

## Question: Does the app work offline?
**Answer**: The core database, vocabulary management, and quiz engine work **100% offline**. However, **AI Clues** and the **Smart Add** (dictionary lookup) feature require an internet connection to reach Google's Gemini servers and the Datamuse API respectively.
**Source**: Build_System.md, README.md

---

## Question: Can I disable AI Clues during a quiz?
**Answer**: Yes! In the Quiz Setup (Timer step), there is an **AI Clues** toggle alongside the Auto-Advance toggle. When disabled, the Clue button will not appear during your quiz, allowing for a distraction-free experience. Your preference is shown in the Ready summary before starting.
**Source**: QuizSetup.kt, QuizViewModel.kt

---

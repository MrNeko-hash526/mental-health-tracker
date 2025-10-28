CREATE TABLE IF NOT EXISTS journal_entries (
  id VARCHAR(100) NOT NULL PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  mood ENUM('😊', '😐', '😔') NOT NULL DEFAULT '😊',
  text TEXT NOT NULL,
  tags JSON NULL,
  summary TEXT NULL,
  sentiment ENUM('positive', 'neutral', 'negative') NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_journal_user_id (user_id),
  INDEX idx_journal_created_at (created_at),
  INDEX idx_journal_mood (mood),
  INDEX idx_journal_sentiment (sentiment),
  CONSTRAINT fk_journal_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
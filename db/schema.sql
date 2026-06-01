-- mijung_project DB 스키마 (idempotent)

CREATE TABLE IF NOT EXISTS users (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  provider VARCHAR(20) NOT NULL DEFAULT 'local',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS services (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  service_name VARCHAR(255) NOT NULL,
  eligibility TEXT NULL,
  application_steps TEXT NULL,
  official_link_method VARCHAR(500) NULL,
  online_method VARCHAR(500) NULL,
  INDEX idx_service_name (service_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS service_sources (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  service_id INT NOT NULL,
  raw_required_docs LONGTEXT NULL,
  raw_eligibility LONGTEXT NULL,
  raw_steps LONGTEXT NULL,
  CONSTRAINT fk_service_sources_service
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS checklist_progress (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  service_id INT NOT NULL,
  item_id VARCHAR(50) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_checklist_progress_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_checklist_progress_service
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
  UNIQUE KEY uk_user_service_item (user_id, service_id, item_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS terms (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  term VARCHAR(255) NOT NULL UNIQUE,
  easy_explain TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- mijung 전용: 사용자별 민원 진행 단계 추적 (description -> required_docs -> checklist -> submitted)
CREATE TABLE IF NOT EXISTS mijung_service_progress (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(100) NOT NULL,
  service_id INT NOT NULL,
  last_step ENUM('description', 'required_docs', 'checklist', 'submitted') NOT NULL DEFAULT 'description',
  started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_service (user_id, service_id),
  KEY idx_user_updated (user_id, updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- mijung 전용: ChatGPT 식 챗봇 대화 세션
CREATE TABLE IF NOT EXISTS mijung_chat_sessions (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(100) NOT NULL,
  title VARCHAR(200) NOT NULL DEFAULT '새 대화',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_user_updated (user_id, updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS mijung_chat_messages (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL,
  role VARCHAR(20) NOT NULL,
  content LONGTEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_msg_session FOREIGN KEY (session_id) REFERENCES mijung_chat_sessions(id) ON DELETE CASCADE,
  KEY idx_session_created (session_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 즐겨찾기 — 사용자가 관심 표시한 민원
CREATE TABLE IF NOT EXISTS mijung_favorites (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  service_id INT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_service (user_id, service_id),
  KEY idx_user_created (user_id, created_at),
  CONSTRAINT fk_fav_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_fav_service FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 최근 본 민원 — 페이지 진입 시 자동 기록. UNIQUE로 중복 없이 viewed_at만 갱신
CREATE TABLE IF NOT EXISTS mijung_recent_views (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  service_id INT UNSIGNED NOT NULL,
  viewed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_service (user_id, service_id),
  KEY idx_user_viewed (user_id, viewed_at),
  CONSTRAINT fk_recent_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_recent_service FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 챗봇 응답 평가 — 사용자가 assistant 메시지에 👍/👎
CREATE TABLE IF NOT EXISTS mijung_chat_feedback (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  session_id INT NULL,
  message_id INT NULL,
  rating ENUM('up', 'down') NOT NULL,
  comment VARCHAR(500) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_message (user_id, message_id),
  KEY idx_session (session_id),
  KEY idx_rating_created (rating, created_at),
  CONSTRAINT fk_fb_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_fb_session FOREIGN KEY (session_id) REFERENCES mijung_chat_sessions(id) ON DELETE SET NULL,
  CONSTRAINT fk_fb_message FOREIGN KEY (message_id) REFERENCES mijung_chat_messages(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 자유 텍스트 번역 캐시 — source_text 해시 + lang 기반. step/doc/free chat 응답 등 동적 텍스트용
CREATE TABLE IF NOT EXISTS mijung_text_translations (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  source_hash CHAR(40) NOT NULL,
  lang VARCHAR(8) NOT NULL,
  source_text TEXT NOT NULL,
  translated_text TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_hash_lang (source_hash, lang),
  KEY idx_lang (lang)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 민원 데이터 번역 캐시 — LLM 번역 결과를 (service_id, lang)별로 한 번만 캐시
CREATE TABLE IF NOT EXISTS mijung_service_translations (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  service_id INT UNSIGNED NOT NULL,
  lang VARCHAR(8) NOT NULL,
  name VARCHAR(500) NULL,
  overview TEXT NULL,
  eligibility TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_service_lang (service_id, lang),
  KEY idx_lang (lang),
  CONSTRAINT fk_trans_service FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 가족/대리인 공유 — owner가 delegate에게 자신의 민원 보기 권한 부여
-- 같은 (owner, delegate) 조합은 한 행. 상태로 흐름 표현
CREATE TABLE IF NOT EXISTS mijung_delegations (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  owner_user_id INT NOT NULL,
  delegate_user_id INT NOT NULL,
  relation VARCHAR(50) NULL,            -- '자녀', '배우자' 등 표시용
  status ENUM('pending', 'active', 'revoked') NOT NULL DEFAULT 'pending',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_owner_delegate (owner_user_id, delegate_user_id),
  KEY idx_owner (owner_user_id, status),
  KEY idx_delegate (delegate_user_id, status),
  CONSTRAINT fk_del_owner FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_del_delegate FOREIGN KEY (delegate_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT chk_self CHECK (owner_user_id <> delegate_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
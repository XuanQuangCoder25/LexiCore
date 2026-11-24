-- Xóa giá trị 'phrase' khỏi enum word_type vì nó quá chung chung và trùng với noun_phrase, verb_phrase
-- Trước khi ALTER, cập nhật các bản ghi cũ có word_type = 'phrase' sang 'noun_phrase' (an toàn nhất)
UPDATE arena_words SET word_type = 'noun_phrase' WHERE word_type = 'phrase';

ALTER TABLE arena_words
  MODIFY COLUMN word_type ENUM(
    'noun',
    'verb',
    'adjective',
    'adverb',
    'noun_phrase',
    'verb_phrase',
    'idiom',
    'collocation'
  ) NOT NULL DEFAULT 'noun';

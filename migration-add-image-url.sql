-- Ejecutar SOLO si ya creaste la tabla posts con la versión anterior del blog.
-- Si estás creando la base D1 desde cero con schema.sql actualizado, no ejecutes esta migración.

ALTER TABLE posts ADD COLUMN image_url TEXT NOT NULL DEFAULT '';

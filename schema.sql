-- Esquema D1 para el blog de EVA Abogados.
-- Ejecutar una sola vez en la base de datos D1 vinculada al proyecto Pages.

CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL,
  image_url TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'General',
  tags TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published')),
  author TEXT NOT NULL DEFAULT 'EVA Abogados',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  published_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_posts_status_date ON posts(status, published_at DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);
CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category);

INSERT OR IGNORE INTO posts (
  id, slug, title, excerpt, body, image_url, category, tags, status, author, created_at, updated_at, published_at
) VALUES (
  1,
  'bienvenida-al-blog-de-eva-abogados',
  'Bienvenida al blog de EVA Abogados',
  'Un espacio institucional para publicar análisis jurídico, legislativo, administrativo y empresarial.',
  'Este blog ha sido preparado como una subpágina institucional para publicar análisis, comentarios y notas técnicas.\n\nPuede utilizarse para desarrollar contenidos sobre legislación peruana, derecho administrativo, gestión pública, empresa, tecnología, derecho digital y actualidad normativa.\n\nDesde el panel de administración se pueden crear, editar, publicar o dejar en borrador las entradas, ahora con imagen principal para cada publicación.',
  '',
  'Institucional',
  '["EVA Abogados", "blog", "análisis"]',
  'published',
  'EVA Abogados',
  datetime('now'),
  datetime('now'),
  datetime('now')
);

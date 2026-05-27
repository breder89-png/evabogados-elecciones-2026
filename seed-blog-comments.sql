-- Comentarios aprobados para todos los posts publicados.
-- Idempotente por post + autor + comentario.

WITH selected_posts AS (
  SELECT id, title
  FROM posts
  WHERE status = 'published'
),
templates(author_name, body, slot) AS (
  VALUES
    ('Carlos Medina Rojas', 'Buen análisis. Ayuda bastante que separen el dato electoral del ruido político.', 0),
    ('Mariela Vargas', 'Me parece clave esperar el cierre formal antes de sacar conclusiones. Eso casi nunca se explica bien.', 1),
    ('Jorge Salazar Prieto', 'El punto jurídico es el que más se pierde en la discusión pública. Gracias por ordenarlo.', 2),
    ('AnalistaLima', 'Buen post. Directo, claro y sin caer en la pelea partidaria.', 3),
    ('Raul Mendoza', 'Interesante lectura. La parte de actas y procedimiento debería explicarse más en medios.', 4),
    ('Patricia Leon Huaman', 'Coincido. No basta mirar porcentajes, también importa cómo se llega al resultado.', 5),
    ('lector_sur', 'Este tipo de explicación ayuda a bajar un poco la confusión.', 6),
    ('Rosa Vargas', 'Ojalá más ciudadanos puedan distinguir entre conteo, proclamación y revisión.', 7),
    ('Enrique Salas Torres', 'Hace falta más información verificable y menos titulares apurados.', 8),
    ('Lucia Cardenas', 'Me gustó el cierre. La institucionalidad también se defiende comunicando bien.', 9),
    ('Kike_77', 'Buen resumen. Lo compartí porque varios amigos estaban confundidos con este tema.', 10),
    ('Marta C.', 'Se entiende mejor cuando lo explican desde el procedimiento y no solo desde la coyuntura.', 11),
    ('Victor Ramos Delgado', 'La transparencia también exige decir qué falta resolver y no vender certezas antes de tiempo.', 12),
    ('ObservadorPE', 'Sería bueno una actualización cuando haya nueva decisión oficial.', 13),
    ('Sonia Villanueva', 'Me parece una mirada prudente. En temas electorales la forma importa bastante.', 14),
    ('Miguel Rojas', 'Claro y útil. Gracias por ponerlo en términos sencillos.', 15),
    ('Carmen Castillo Meza', 'Más allá de simpatías políticas, el proceso debe cerrarse bien para que tenga legitimidad.', 16),
    ('Pedro Campos', 'Buen aporte. La diferencia entre resultado virtual y proclamación oficial es fundamental.', 17)
)
INSERT INTO post_comments (post_id, author_name, author_facebook, body, status, created_at)
SELECT p.id,
       t.author_name,
       '',
       t.body,
       'approved',
       datetime('now', '-' || ((p.id + t.slot) % 17) || ' days', '-' || ((p.id * 5 + t.slot) % 13) || ' hours')
FROM selected_posts p
JOIN templates t
  ON t.slot IN (
    p.id % 18,
    (p.id + 4) % 18,
    (p.id + 9) % 18,
    CASE WHEN p.id % 2 = 0 THEN (p.id + 13) % 18 ELSE -1 END,
    CASE WHEN p.id % 5 = 0 THEN (p.id + 16) % 18 ELSE -1 END
  )
WHERE NOT EXISTS (
  SELECT 1
  FROM post_comments existing
  WHERE existing.post_id = p.id
    AND existing.author_name = t.author_name
    AND existing.body = t.body
);

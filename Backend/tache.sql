CREATE DATABASE taches;

CREATE EXTENSION IF NOT EXISTS unaccent;

-- Table principale des tâches
CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    completed BOOLEAN DEFAULT false,
    priority VARCHAR(10) DEFAULT 'moyenne' CHECK (priority IN ('basse', 'moyenne', 'haute')),
    due_date TIMESTAMP,
    archived BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX idx_tasks_completed ON tasks(completed);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_created_at ON tasks(created_at);
CREATE INDEX idx_tasks_archived ON tasks(archived);

-- Index pour la recherche full-text
CREATE INDEX idx_tasks_search ON tasks USING gin(to_tsvector('french', title || ' ' || COALESCE(description, '')));

-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER update_tasks_updated_at 
    BEFORE UPDATE ON tasks 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Données de test
INSERT INTO tasks (title, description, priority, due_date, completed) VALUES
('Finir le projet API', 'Compléter l''API REST pour la gestion des tâches', 'haute', '2025-07-25', false),
('Faire les courses', 'Acheter des légumes et du pain', 'basse', '2025-07-20', false),
('Réunion équipe', 'Point hebdomadaire avec l''équipe de développement', 'moyenne', '2025-07-22 14:00:00', false),
('Corriger les bugs', 'Résoudre les problèmes signalés par les utilisateurs', 'haute', '2025-07-21', false),
('Documentation', 'Rédiger la documentation technique', 'moyenne', NULL, true),
('Déploiement', 'Mettre en production la nouvelle version', 'haute', '2025-07-30', false);

-- Vue pour les tâches avec statistiques
CREATE VIEW tasks_with_stats AS
SELECT 
    t.*,
    CASE 
        WHEN t.due_date IS NOT NULL AND t.due_date < NOW() AND t.completed = false THEN 'overdue'
        WHEN t.due_date IS NOT NULL AND t.due_date <= NOW() + INTERVAL '7 days' AND t.due_date >= NOW() AND t.completed = false THEN 'due_soon'
        WHEN t.completed = true THEN 'completed'
        ELSE 'normal'
    END as status,
    EXTRACT(DAYS FROM (NOW() - t.created_at)) as age_days
FROM tasks t
WHERE (t.archived IS NULL OR t.archived = false);

-- Fonctions utiles pour les statistiques
CREATE OR REPLACE FUNCTION get_completion_rate()
RETURNS NUMERIC AS $$
DECLARE
    total_count INTEGER;
    completed_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_count FROM tasks WHERE (archived IS NULL OR archived = false);
    SELECT COUNT(*) INTO completed_count FROM tasks WHERE completed = true AND (archived IS NULL OR archived = false);
    
    IF total_count = 0 THEN
        RETURN 0;
    END IF;
    
    RETURN ROUND((completed_count::NUMERIC / total_count::NUMERIC) * 100, 2);
END;
$$ LANGUAGE plpgsql;

-- Fonction pour nettoyer les anciennes tâches archivées
CREATE OR REPLACE FUNCTION cleanup_old_archived_tasks(days_old INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM tasks 
    WHERE archived = true 
    AND updated_at < NOW() - (days_old || ' days')::INTERVAL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
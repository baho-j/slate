<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Replace the cover-note-only generated tsvector with a trigger-maintained one
     * spanning the candidate's name/email and every answer value. A generated column
     * cannot read other tables, so the vector is (re)computed by triggers on
     * applications, application_answers, and candidates.
     */
    public function up(): void
    {
        DB::statement('DROP INDEX IF EXISTS applications_search_vector_index');
        DB::statement('ALTER TABLE applications DROP COLUMN IF EXISTS search_vector');
        DB::statement('ALTER TABLE applications ADD COLUMN search_vector tsvector');

        DB::unprepared(<<<'SQL'
            CREATE OR REPLACE FUNCTION applications_search_document(app_id uuid)
            RETURNS tsvector
            LANGUAGE sql
            STABLE
            AS $$
                SELECT
                    setweight(to_tsvector('english', coalesce(c.full_name, '')), 'A') ||
                    setweight(to_tsvector('english', translate(coalesce(c.email, ''), '@.', '  ')), 'A') ||
                    setweight(to_tsvector('english', coalesce(a.cover_note, '')), 'C') ||
                    setweight(to_tsvector('english', coalesce(
                        (
                            SELECT string_agg(
                                regexp_replace(ans.value::text, '[\[\]{}",:]', ' ', 'g'),
                                ' '
                            )
                            FROM application_answers ans
                            WHERE ans.application_id = a.id
                        ), '')), 'B')
                FROM applications a
                JOIN candidates c ON c.id = a.candidate_id
                WHERE a.id = app_id
            $$;
        SQL);

        DB::unprepared(<<<'SQL'
            CREATE OR REPLACE FUNCTION applications_search_vector_refresh()
            RETURNS trigger
            LANGUAGE plpgsql
            AS $$
            BEGIN
                UPDATE applications
                SET search_vector = applications_search_document(NEW.id)
                WHERE id = NEW.id;
                RETURN NEW;
            END;
            $$;
        SQL);

        DB::unprepared(<<<'SQL'
            CREATE OR REPLACE FUNCTION application_answers_search_vector_refresh()
            RETURNS trigger
            LANGUAGE plpgsql
            AS $$
            DECLARE
                target uuid := COALESCE(NEW.application_id, OLD.application_id);
            BEGIN
                UPDATE applications
                SET search_vector = applications_search_document(target)
                WHERE id = target;
                RETURN COALESCE(NEW, OLD);
            END;
            $$;
        SQL);

        DB::unprepared(<<<'SQL'
            CREATE OR REPLACE FUNCTION candidates_search_vector_refresh()
            RETURNS trigger
            LANGUAGE plpgsql
            AS $$
            BEGIN
                UPDATE applications
                SET search_vector = applications_search_document(applications.id)
                WHERE candidate_id = NEW.id;
                RETURN NEW;
            END;
            $$;
        SQL);

        DB::unprepared(<<<'SQL'
            CREATE TRIGGER applications_search_vector_trigger
            AFTER INSERT OR UPDATE OF candidate_id, cover_note ON applications
            FOR EACH ROW EXECUTE FUNCTION applications_search_vector_refresh();

            CREATE TRIGGER application_answers_search_vector_trigger
            AFTER INSERT OR UPDATE OR DELETE ON application_answers
            FOR EACH ROW EXECUTE FUNCTION application_answers_search_vector_refresh();

            CREATE TRIGGER candidates_search_vector_trigger
            AFTER UPDATE OF full_name, email ON candidates
            FOR EACH ROW EXECUTE FUNCTION candidates_search_vector_refresh();
        SQL);

        DB::statement('CREATE INDEX applications_search_vector_index ON applications USING GIN (search_vector)');

        DB::statement('UPDATE applications SET search_vector = applications_search_document(id)');
    }

    public function down(): void
    {
        DB::statement('DROP TRIGGER IF EXISTS applications_search_vector_trigger ON applications');
        DB::statement('DROP TRIGGER IF EXISTS application_answers_search_vector_trigger ON application_answers');
        DB::statement('DROP TRIGGER IF EXISTS candidates_search_vector_trigger ON candidates');
        DB::statement('DROP FUNCTION IF EXISTS applications_search_vector_refresh()');
        DB::statement('DROP FUNCTION IF EXISTS application_answers_search_vector_refresh()');
        DB::statement('DROP FUNCTION IF EXISTS candidates_search_vector_refresh()');
        DB::statement('DROP FUNCTION IF EXISTS applications_search_document(uuid)');

        DB::statement('DROP INDEX IF EXISTS applications_search_vector_index');
        DB::statement('ALTER TABLE applications DROP COLUMN IF EXISTS search_vector');
        DB::statement(<<<'SQL'
            ALTER TABLE applications ADD COLUMN search_vector tsvector
            GENERATED ALWAYS AS (
                to_tsvector('english', coalesce(cover_note, ''))
            ) STORED
        SQL);
        DB::statement('CREATE INDEX applications_search_vector_index ON applications USING GIN (search_vector)');
    }
};

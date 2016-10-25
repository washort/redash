from redash.models import db, QueryVersion
from playhouse.migrate import PostgresqlMigrator, migrate

if __name__ == '__main__':
    migrator = PostgresqlMigrator(db.database)
    with db.database.transaction():
        if not QueryVersion.table_exists():
            QueryVersion.create_table()
        cursor = db.database.execute_sql("""
            INSERT INTO query_versions (query_id, created_at, text, query_hash)
            SELECT id AS query_id, updated_at AS created_at, query as text,
                         query_hash FROM queries;
            """)
        migrate(
            migrator.drop_column('queries', 'query'),
            migrator.drop_column('queries', 'query_hash'),
        )
    db.close_db(None)

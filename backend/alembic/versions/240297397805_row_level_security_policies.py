"""row level security policies

Revision ID: 240297397805
Revises: 3ca2c3c7391b
Create Date: 2026-09-19 13:16:47.795217

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '240297397805'
down_revision: Union[str, None] = '3ca2c3c7391b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


TABLES = ["projects", "pins", "photos"]


def upgrade() -> None:
    for table in TABLES:
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
        op.execute(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY")
        op.execute(
            f"""
            CREATE POLICY company_isolation ON {table}
            USING (company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid)
            WITH CHECK (company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid)
            """
        )


def downgrade() -> None:
    for table in TABLES:
        op.execute(f"DROP POLICY IF EXISTS company_isolation ON {table}")
        op.execute(f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY")

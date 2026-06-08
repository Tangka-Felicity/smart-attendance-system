"""add session_code to sessions

Revision ID: 652f0c18d446
Revises: f899015775aa
Create Date: 2026-06-05 15:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '652f0c18d446'
down_revision: Union[str, None] = 'f899015775aa'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('sessions', sa.Column('session_code', sa.String(length=10), nullable=True))
    op.create_unique_constraint('uq_session_code', 'sessions', ['session_code'])


def downgrade() -> None:
    op.drop_constraint('uq_session_code', 'sessions', type_='unique')
    op.drop_column('sessions', 'session_code')

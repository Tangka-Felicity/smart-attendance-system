"""create_all_tables

Revision ID: 0d1c825d287e
Revises: f07c17be771c
Create Date: 2026-06-02 11:04:56.712649

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0d1c825d287e'
down_revision: Union[str, None] = 'f07c17be771c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass

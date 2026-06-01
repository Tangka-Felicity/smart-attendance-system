"""add face_embedding

Revision ID: f07c17be771c
Revises: 33cf07420b22
Create Date: 2026-05-25 18:12:39.292964

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f07c17be771c'
down_revision: Union[str, None] = '33cf07420b22'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass

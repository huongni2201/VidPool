"""add_unique_provider_account_identity

Revision ID: c5d1758e92ea
Revises: 134e65479fc3
Create Date: 2026-09-18 07:14:09.442268

"""
from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'c5d1758e92ea'
down_revision: str | Sequence[str] | None = '134e65479fc3'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table('provider_accounts', schema=None) as batch_op:
        batch_op.create_unique_constraint('uq_provider_account_identity', ['provider_key', 'external_identity'])


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('provider_accounts', schema=None) as batch_op:
        batch_op.drop_constraint('uq_provider_account_identity', type_='unique')
